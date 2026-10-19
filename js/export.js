// Export Engine using html2canvas for Card Forge

(function () {
    // 600 dpi: same physical size as the printer's 822 × 1122 px @ 300 dpi
    // minimum (63.5 × 88.9 mm trim + 3 mm bleed), at twice the resolution.
    const PRINT_DPI = 600;
    const PRINT_TRIM_WIDTH = 1500;
    const PRINT_TRIM_HEIGHT = 2100;
    const PRINT_BLEED = 72;
    const PRINT_CANVAS_WIDTH = PRINT_TRIM_WIDTH + PRINT_BLEED * 2; // 1644
    const PRINT_CANVAS_HEIGHT = PRINT_TRIM_HEIGHT + PRINT_BLEED * 2; // 2244
    const PNG_PIXELS_PER_METER = Math.round(PRINT_DPI / 0.0254);

    function getFrameColor() {
        const state = window.AppState || {};
        if (state.accentColor) return state.accentColor;
        return "#6B4A2B";
    }

    function sanitizeFilename(title, suffix = "", extension = "png") {
        const isAction = (window.AppState || {}).cardType === "action";
        const typeSuffix = isAction ? "-action" : "";
        if (!title || typeof title !== "string")
            return `${isAction ? "action" : "main"}-card${suffix}.${extension}`;
        const clean = title
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        return `${clean || (isAction ? "action" : "friend")}${typeSuffix}${suffix}.${extension}`;
    }

    // Faces and name of the card type currently shown (only that type exports).
    function getExportTarget() {
        const state = window.AppState || {};
        const faces = window.getActiveFaces();
        return {
            front: faces.front || document.getElementById("card"),
            back: faces.back,
            title: faces.type === "action" ? state.actionTitle : state.title,
        };
    }

    function addPngResolution(dataUrl) {
        const parts = dataUrl.split(",");
        if (parts.length !== 2 || typeof atob !== "function" || typeof btoa !== "function") {
            return dataUrl;
        }

        const png = atob(parts[1]);
        if (
            png.length < 33 ||
            png.charCodeAt(0) !== 0x89 ||
            png.slice(1, 4) !== "PNG" ||
            png.slice(12, 16) !== "IHDR"
        ) {
            return dataUrl;
        }

        const resolution = new Uint8Array(9);
        const view = new DataView(resolution.buffer);
        view.setUint32(0, PNG_PIXELS_PER_METER);
        view.setUint32(4, PNG_PIXELS_PER_METER);
        resolution[8] = 1;

        const chunkData = new Uint8Array(13);
        chunkData.set([0x70, 0x48, 0x59, 0x73]);
        chunkData.set(resolution, 4);
        let crc = 0xffffffff;
        for (const byte of chunkData) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit += 1) {
                crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
            }
        }
        crc = (crc ^ 0xffffffff) >>> 0;

        const chunk = new Uint8Array(21);
        const chunkView = new DataView(chunk.buffer);
        chunkView.setUint32(0, 9);
        chunk.set(chunkData, 4);
        chunkView.setUint32(17, crc);

        const ihdrEnd = 8 + 25;
        const output =
            png.slice(0, ihdrEnd) +
            String.fromCharCode(...chunk) +
            png.slice(ihdrEnd);
        return `${parts[0]},${btoa(output)}`;
    }

    function createPrintCanvas(faceCanvas, frameColor) {
        const canvas = document.createElement("canvas");
        canvas.width = PRINT_CANVAS_WIDTH;
        canvas.height = PRINT_CANVAS_HEIGHT;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = frameColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            faceCanvas,
            PRINT_BLEED,
            PRINT_BLEED,
            PRINT_TRIM_WIDTH,
            PRINT_TRIM_HEIGHT,
        );
        return canvas;
    }

    function downloadCanvas(canvas, filename) {
        downloadHref(addPngResolution(canvas.toDataURL("image/png")), filename);
    }

    function downloadHref(href, filename) {
        const link = document.createElement("a");
        link.download = filename;
        link.href = href;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // html2canvas draws an inline <svg> by serialising it into a standalone
    // image: stylesheet rules are lost (so `currentColor` turns black) and the
    // lattice lands offset from where the browser shows it. For export, paint
    // the back hex lattice from the same <pattern> onto a canvas and swap it
    // in as a plain PNG background, which html2canvas places exactly.
    function flattenHexOverlay(root, doc, scale) {
        const view = doc && doc.defaultView;
        if (!root.querySelector || !view || !view.getComputedStyle) return;
        const svg = root.querySelector(".catan-hex-overlay");
        const pattern = svg && svg.querySelector("pattern");
        const tile = pattern && pattern.querySelector("path");
        if (!tile || typeof Path2D === "undefined") return;

        const rect = svg.getBoundingClientRect();
        const tileW = parseFloat(pattern.getAttribute("width"));
        const tileH = parseFloat(pattern.getAttribute("height"));
        const canvas = doc.createElement("canvas");
        canvas.width = Math.ceil(rect.width * scale);
        canvas.height = Math.ceil(rect.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(scale, scale);
        ctx.strokeStyle = view.getComputedStyle(svg).color;
        ctx.lineWidth = parseFloat(tile.getAttribute("stroke-width")) || 1;
        const hex = new Path2D(tile.getAttribute("d"));
        for (let y = 0; y < rect.height; y += tileH) {
            for (let x = 0; x < rect.width; x += tileW) {
                ctx.save();
                ctx.translate(x, y);
                ctx.stroke(hex);
                ctx.restore();
            }
        }

        const layer = doc.createElement("div");
        layer.className = svg.getAttribute("class");
        layer.setAttribute("aria-hidden", "true");
        layer.style.backgroundImage = `url("${canvas.toDataURL("image/png")}")`;
        layer.style.backgroundSize = "100% 100%";
        layer.style.backgroundRepeat = "no-repeat";
        svg.parentNode.replaceChild(layer, svg);
    }

    // Temporarily lift a card face out of the 3D flipper so html2canvas
    // can capture a flat, fully visible render.
    async function captureFace(faceEl, h2c) {
        if (!faceEl) return null;

        const primary = getFrameColor();

        const parent = faceEl.parentNode || faceEl.parentElement || null;
        const nextSibling = faceEl.nextSibling;
        const savedCssText = faceEl.style ? faceEl.style.cssText : "";
        const hadExportClass =
            !!faceEl.classList && faceEl.classList.contains("card--exporting");

        const offscreen = document.createElement("div");
        offscreen.style.cssText = [
            "position:fixed",
            "top:0",
            "left:-10000px",
            "width:350px",
            "height:490px",
            "overflow:hidden",
            "pointer-events:none",
            "z-index:0",
            "transform:none",
            "transform-style:flat",
            "perspective:none",
            "backface-visibility:visible",
            "-webkit-backface-visibility:visible",
        ].join(";");
        document.body.appendChild(offscreen);
        offscreen.appendChild(faceEl);

        if (faceEl.classList) {
            faceEl.classList.add("card--exporting");
        }
        if (faceEl.style) {
            faceEl.style.position = "relative";
            faceEl.style.inset = "auto";
            faceEl.style.left = "0";
            faceEl.style.top = "0";
            faceEl.style.transform = "none";
            faceEl.style.webkitTransform = "none";
            faceEl.style.backfaceVisibility = "visible";
            faceEl.style.webkitBackfaceVisibility = "visible";
            faceEl.style.opacity = "1";
            faceEl.style.width = "350px";
            faceEl.style.height = "490px";
            faceEl.style.display = "flex";
            faceEl.style.backgroundColor = primary;
        }

        try {
            await new Promise((resolve) => setTimeout(resolve, 50));

            const canvas = await h2c(faceEl, {
                scale: PRINT_TRIM_WIDTH / 350,
                useCORS: true,
                allowTaint: false,
                backgroundColor: primary,
                width: 350,
                height: 490,
                logging: false,
                onclone: function (clonedDoc) {
                    const cloned =
                        (faceEl.id &&
                            clonedDoc.getElementById &&
                            clonedDoc.getElementById(faceEl.id)) ||
                        null;
                    if (!cloned || !cloned.style) return;
                    cloned.style.transform = "none";
                    cloned.style.webkitTransform = "none";
                    cloned.style.backfaceVisibility = "visible";
                    cloned.style.webkitBackfaceVisibility = "visible";
                    cloned.style.opacity = "1";
                    cloned.style.position = "relative";
                    cloned.style.backgroundColor = primary;
                    if (cloned.classList) {
                        cloned.classList.add("card--exporting");
                    }
                    flattenHexOverlay(cloned, clonedDoc, PRINT_TRIM_WIDTH / 350);
                },
            });
            return canvas;
        } finally {
            if (faceEl.classList && !hadExportClass) {
                faceEl.classList.remove("card--exporting");
            }
            if (faceEl.style) {
                faceEl.style.cssText = savedCssText;
            }
            if (parent) {
                if (nextSibling) {
                    parent.insertBefore(faceEl, nextSibling);
                } else {
                    parent.appendChild(faceEl);
                }
            }
            if (offscreen.parentNode) {
                offscreen.parentNode.removeChild(offscreen);
            }
        }
    }

    // Export front and back as two separate 600 dpi PNGs (1644 × 2244 px with bleed).
    window.exportPrintSheet = async function () {
        const {
            front: cardFront,
            back: cardBack,
            title,
        } = getExportTarget();
        const downloadBtn =
            document.getElementById("download-sheet-btn") ||
            document.getElementById("download-btn");
        if (!cardFront) return;

        if (typeof window.hidePopover === "function") {
            window.hidePopover();
        }

        let originalBtnHtml = "";
        if (downloadBtn) {
            originalBtnHtml = downloadBtn.innerHTML;
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = `
        <svg class="btn-spinner" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12" stroke-linecap="round"></circle>
        </svg>
        <span class="btn-text">Preparing Print Files...</span>
      `;
        }

        try {
            const h2c =
                window.html2canvas ||
                (typeof html2canvas !== "undefined" ? html2canvas : null);
            if (typeof h2c !== "function") {
                throw new Error("html2canvas library is not loaded");
            }

            // 1. Capture Front face
            const frontCanvas = await captureFace(cardFront, h2c);

            // 2. Capture the back face when present
            const backCanvas = cardBack ? await captureFace(cardBack, h2c) : null;

            // One PNG per face. Pause between downloads so the browser
            // doesn't drop the second one.
            const primary = getFrameColor();
            const files = [
                [frontCanvas, "-front"],
                [backCanvas, "-back"],
            ].filter(([faceCanvas]) => faceCanvas);
            for (let i = 0; i < files.length; i += 1) {
                const [faceCanvas, suffix] = files[i];
                if (i > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 400));
                }
                downloadCanvas(
                    createPrintCanvas(faceCanvas, primary),
                    sanitizeFilename(title, suffix, "png"),
                );
            }
        } catch (err) {
            console.error("Failed to export print files:", err);
            if (typeof window.alert === "function") {
                window.alert("Could not export print files. Please try again.");
            }
        } finally {
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalBtnHtml;
            }
        }
    };

    // Export Single Face as PNG ('front' | 'back')
    window.exportCardAsPng = async function (face) {
        const {
            front: cardFront,
            back: cardBack,
            title,
        } = getExportTarget();

        let targetEl = cardFront;
        let suffix = "-card";
        if (face === "back" && cardBack) {
            targetEl = cardBack;
            suffix = "-back";
        } else if (face === "front" && cardFront) {
            targetEl = cardFront;
            suffix = "-front";
        } else if (!face) {
            if (window.AppState && window.AppState.isFlipped && cardBack) {
                targetEl = cardBack;
                suffix = "-back";
            } else {
                targetEl = cardFront;
                suffix = "-card";
            }
        }

        if (!targetEl) return;

        if (typeof window.hidePopover === "function") {
            window.hidePopover();
        }

        try {
            const h2c =
                window.html2canvas ||
                (typeof html2canvas !== "undefined" ? html2canvas : null);
            if (typeof h2c !== "function") {
                throw new Error("html2canvas library is not loaded");
            }

            const faceCanvas = await captureFace(targetEl, h2c);
            const canvas = createPrintCanvas(faceCanvas, getFrameColor());
            const filename = sanitizeFilename(title, suffix);

            downloadCanvas(canvas, filename);
        } catch (err) {
            console.error("Failed to export card face:", err);
            if (typeof window.alert === "function") {
                window.alert("Could not export card. Please try again.");
            }
        }
    };

    // Wire buttons on DOM ready
    function initExport() {
        const sheetBtn = document.getElementById("download-sheet-btn");
        if (sheetBtn) {
            sheetBtn.addEventListener("click", function (e) {
                e.preventDefault();
                window.exportPrintSheet();
            });
        }

        const frontBtn = document.getElementById("download-front-btn");
        if (frontBtn) {
            frontBtn.addEventListener("click", function (e) {
                e.preventDefault();
                window.exportCardAsPng("front");
            });
        }

        const backBtn = document.getElementById("download-back-btn");
        if (backBtn) {
            backBtn.addEventListener("click", function (e) {
                e.preventDefault();
                window.exportCardAsPng("back");
            });
        }

        // Compatibility alias button
        const legacyBtn = document.getElementById("download-btn");
        if (legacyBtn) {
            legacyBtn.addEventListener("click", function (e) {
                e.preventDefault();
                window.exportCardAsPng();
            });
        }
    }

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initExport);
        } else {
            initExport();
        }
    }
})();
