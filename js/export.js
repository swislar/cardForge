// Export Engine using html2canvas for Card Forge

(function () {
    function sanitizeFilename(title, suffix = "") {
        if (!title || typeof title !== "string")
            return `friend-card${suffix}.png`;
        const clean = title
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        return `${clean || "friend"}${suffix}.png`;
    }

    // Temporarily lift a card face out of the 3D flipper so html2canvas
    // can capture a flat, fully visible render.
    async function captureFace(faceEl, h2c) {
        if (!faceEl) return null;

        const state = window.AppState || {};
        const arch =
            typeof window.getArchetype === "function"
                ? window.getArchetype(state.archetypeId)
                : {};
        const primary =
            state.primaryColor || (arch && arch.primary) || "#92400E";

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
                scale: 2,
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

    // Export Double-Sided Physical Print Sheet (Front + Back side-by-side with fold/cut line)
    window.exportPrintSheet = async function () {
        const cardFront =
            document.getElementById("card-front") ||
            document.getElementById("card");
        const cardBack = document.getElementById("card-back");
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
        <span class="btn-text">Forging Sheet...</span>
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

            // 2. Capture Back face (or fallback)
            const backCanvas = cardBack
                ? await captureFace(cardBack, h2c)
                : frontCanvas;

            // 3. Compose Print Sheet
            const cardW = (frontCanvas && frontCanvas.width) || 700;
            const cardH = (frontCanvas && frontCanvas.height) || 980;
            const padX = 50;
            const padY = 50;
            const gutter = 80;

            const sheetW = padX * 2 + cardW * 2 + gutter;
            const sheetH = padY * 2 + cardH;

            const sheet = document.createElement("canvas");
            sheet.width = sheetW;
            sheet.height = sheetH;
            const ctx = sheet.getContext("2d");

            // White cardstock background
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, sheetW, sheetH);

            const frontX = padX;
            const frontY = padY;
            const backX = padX + cardW + gutter;
            const backY = padY;
            const foldX = padX + cardW + gutter / 2;

            // Draw Front & Back
            if (frontCanvas)
                ctx.drawImage(frontCanvas, frontX, frontY, cardW, cardH);
            if (backCanvas)
                ctx.drawImage(backCanvas, backX, backY, cardW, cardH);

            // Card bounding outlines
            ctx.strokeStyle = "#E5E7EB";
            ctx.lineWidth = 1;
            ctx.strokeRect(frontX, frontY, cardW, cardH);
            ctx.strokeRect(backX, backY, cardW, cardH);

            // Center fold dashed line
            if (ctx.setLineDash) {
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([8, 6]);
                ctx.strokeStyle = "#9CA3AF";
                ctx.lineWidth = 2;
                ctx.moveTo(foldX, padY - 20);
                ctx.lineTo(foldX, sheetH - padY + 20);
                ctx.stroke();
                ctx.restore();
            }

            // Cut / Fold Guide text
            ctx.fillStyle = "#6B7280";
            ctx.font = "bold 15px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText("✂  FOLD OR CUT LINE  ✂", foldX, padY - 24);

            ctx.textBaseline = "top";
            ctx.fillText("✂  FOLD OR CUT LINE  ✂", foldX, sheetH - padY + 24);

            // Sheet labels
            ctx.font = "bold 14px sans-serif";
            ctx.fillStyle = "#4B5563";
            ctx.textAlign = "left";
            ctx.fillText("FRONT FACE (Standard TCG)", frontX, padY - 24);
            ctx.fillText(
                "BACK FACE (Personal Memoir Letter)",
                backX,
                padY - 24,
            );

            ctx.font = "12px sans-serif";
            ctx.fillStyle = "#9CA3AF";
            ctx.textAlign = "center";
            ctx.fillText(
                "Created with Card Forge • Standard Playing Card Dimensions (63.5 × 88.9 mm)",
                sheetW / 2,
                sheetH - 16,
            );

            // Download
            const title = window.AppState ? window.AppState.title : "friend";
            const filename = sanitizeFilename(title, "-print-sheet");

            const link = document.createElement("a");
            link.download = filename;
            link.href = sheet.toDataURL("image/png");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Failed to export print sheet:", err);
            if (typeof window.alert === "function") {
                window.alert("Could not export print sheet. Please try again.");
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
        const cardFront =
            document.getElementById("card-front") ||
            document.getElementById("card");
        const cardBack = document.getElementById("card-back");

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

            const canvas = await captureFace(targetEl, h2c);
            const title = window.AppState ? window.AppState.title : "friend";
            const filename = sanitizeFilename(title, suffix);

            const link = document.createElement("a");
            link.download = filename;
            link.href = canvas.toDataURL("image/png");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
