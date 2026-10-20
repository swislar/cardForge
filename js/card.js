// Card Rendering Engine for Card Forge (Two-Sided 3D Canvas)
// Depends on js/color.js and js/app.js. Re-renders whenever the state store changes.

(function () {
    const { hexToRgba, getBaseTextColor } = window.CardColor;

    const SVG_NS = "http://www.w3.org/2000/svg";
    const TITLE_FONT = "'Cinzel', serif";
    const BODY_FONT = "'Outfit', sans-serif";
    const LETTER_FONT = 'Georgia, "Times New Roman", serif';
    const DEFAULT_RESOURCE_COLOR = "#A8D26B";
    const RATING_SEGMENTS = 10;
    const RATING_HEX_POINTS =
        "4.5,0.5 15.5,0.5 19.5,6 15.5,11.5 4.5,11.5 0.5,6";
    const HEX_TILE_POINTS = "10,0.8 19.2,6 19.2,16 10,21.2 0.8,16 0.8,6";
    // Simple glyphs drawn on a 20x22 pointy-top hex tile.
    const RESOURCE_GLYPHS = {
        brick: [
            ["rect", { x: 4.5, y: 7, width: 5, height: 3.3 }],
            ["rect", { x: 10.5, y: 7, width: 5, height: 3.3 }],
            ["rect", { x: 7.5, y: 11.3, width: 5, height: 3.3 }],
            ["rect", { x: 4.5, y: 11.3, width: 2, height: 3.3 }],
            ["rect", { x: 13.5, y: 11.3, width: 2, height: 3.3 }],
        ],
        lumber: [
            [
                "polygon",
                { points: "10,4 15,11 12.5,11 15.5,15.5 4.5,15.5 7.5,11 5,11" },
            ],
            ["rect", { x: 9, y: 15.5, width: 2, height: 2.8 }],
        ],
        wool: [
            ["circle", { cx: 7.6, cy: 11.4, r: 2.9 }],
            ["circle", { cx: 10.4, cy: 9.6, r: 3.1 }],
            ["circle", { cx: 12.8, cy: 11.6, r: 2.8 }],
            ["circle", { cx: 10, cy: 13, r: 3 }],
            ["rect", { x: 8, y: 15, width: 1.3, height: 3 }],
            ["rect", { x: 11, y: 15, width: 1.3, height: 3 }],
        ],
        grain: [
            ["rect", { x: 9.4, y: 6, width: 1.2, height: 12 }],
            [
                "ellipse",
                {
                    cx: 8.2,
                    cy: 8.6,
                    rx: 1.3,
                    ry: 2.3,
                    transform: "rotate(-30 8.2 8.6)",
                },
            ],
            [
                "ellipse",
                {
                    cx: 11.8,
                    cy: 8.6,
                    rx: 1.3,
                    ry: 2.3,
                    transform: "rotate(30 11.8 8.6)",
                },
            ],
            [
                "ellipse",
                {
                    cx: 8.2,
                    cy: 12.4,
                    rx: 1.3,
                    ry: 2.3,
                    transform: "rotate(-30 8.2 12.4)",
                },
            ],
            [
                "ellipse",
                {
                    cx: 11.8,
                    cy: 12.4,
                    rx: 1.3,
                    ry: 2.3,
                    transform: "rotate(30 11.8 12.4)",
                },
            ],
            ["ellipse", { cx: 10, cy: 5.4, rx: 1.1, ry: 1.9 }],
        ],
        ore: [["polygon", { points: "3.5,16 8.5,6.5 11,10.5 13,8 16.5,16" }]],
    };

    function byId(id) {
        return document.getElementById(id);
    }

    // Builds an inline SVG hex tile (resource colour + glyph). Inline SVG keeps
    // the icon crisp in print and exportable by html2canvas, unlike emoji.
    function renderResourceIcon(container, resourceItem, strokeColor) {
        if (
            !container ||
            !resourceItem ||
            typeof document.createElementNS !== "function"
        )
            return;
        const glyphColor = getBaseTextColor(resourceItem.color);
        const cacheKey = `${resourceItem.id}|${strokeColor}|${glyphColor}`;
        if (container._iconKey === cacheKey) return;
        container._iconKey = cacheKey;
        container.textContent = "";

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 20 22");
        svg.setAttribute("aria-hidden", "true");
        const tile = document.createElementNS(SVG_NS, "polygon");
        tile.setAttribute("points", HEX_TILE_POINTS);
        tile.setAttribute("fill", resourceItem.color);
        tile.setAttribute("stroke", strokeColor);
        tile.setAttribute("stroke-width", "1.4");
        svg.appendChild(tile);
        (RESOURCE_GLYPHS[resourceItem.id] || []).forEach(([tag, attrs]) => {
            const shape = document.createElementNS(SVG_NS, tag);
            Object.keys(attrs).forEach((name) =>
                shape.setAttribute(name, String(attrs[name])),
            );
            shape.setAttribute("fill", glyphColor);
            svg.appendChild(shape);
        });
        container.appendChild(svg);
    }

    window.computePhotoCoverDimensions = function (
        aspect,
        scale = 1,
        frameW = 326,
        frameH = 163,
    ) {
        const frameAspect = frameW / frameH;
        let baseW, baseH;
        const numAspect = parseFloat(aspect);
        const validAspect =
            !numAspect || isNaN(numAspect) || numAspect <= 0
                ? frameAspect
                : numAspect;
        if (validAspect >= frameAspect) {
            baseH = frameH;
            baseW = frameH * validAspect;
        } else {
            baseW = frameW;
            baseH = frameW / validAspect;
        }
        const currentW = baseW * scale;
        const currentH = baseH * scale;
        const maxOffsetX = Math.max(0, (currentW - frameW) / 2);
        const maxOffsetY = Math.max(0, (currentH - frameH) / 2);
        return { baseW, baseH, currentW, currentH, maxOffsetX, maxOffsetY };
    };

    window.toggleFlip = function (force) {
        if (!window.AppState) return;
        const next = force !== undefined ? !!force : !window.AppState.isFlipped;
        window.updateState({ isFlipped: next });
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    // Text may shrink to this share of its designed size and no further (the
    // 8 pt letter bottoms out at 6 pt). Editors stop accepting text that would
    // need to go smaller, so nothing on the card is ever clipped.
    const MIN_FONT_SCALE = 0.75;

    // Shrinks a single-line field just enough for its text to fit, so long words
    // are never clipped or replaced with an ellipsis. Needs real layout, so it is
    // a no-op where the element has no measured width.
    function fitTextToWidth(el) {
        if (!el || !el.style || typeof window.getComputedStyle !== "function")
            return;
        el.style.fontSize = "";
        let size = parseFloat(window.getComputedStyle(el).fontSize);
        const minSize = size * MIN_FONT_SCALE;
        for (let attempt = 0; attempt < 6; attempt += 1) {
            const available = el.clientWidth;
            const needed = el.scrollWidth;
            if (
                !size ||
                !available ||
                !needed ||
                needed <= available ||
                size <= minSize
            )
                return;
            size = Math.max(
                minSize,
                Math.floor(size * (available / needed) * 0.98 * 100) / 100,
            );
            el.style.fontSize = `${size}px`;
        }
    }

    // Multi-line version: shrinks wrapped text until its height fits the box.
    // `box` defaults to the element itself (when it has a fixed height).
    // Text height shrinks faster than font size once lines rewrap, so step by
    // the square root of the overflow ratio and re-measure.
    function fitTextToBox(el, box) {
        if (!el || !el.style || typeof window.getComputedStyle !== "function")
            return;
        const container = box || el;
        el.style.fontSize = "";
        let size = parseFloat(window.getComputedStyle(el).fontSize);
        const minSize = size * MIN_FONT_SCALE;
        for (let attempt = 0; attempt < 12; attempt += 1) {
            const available = container.clientHeight;
            const needed = el.scrollHeight;
            if (
                !size ||
                !available ||
                !needed ||
                needed <= available ||
                size <= minSize
            )
                return;
            size = Math.max(
                minSize,
                Math.floor(size * Math.sqrt(available / needed) * 0.98 * 100) /
                    100,
            );
            el.style.fontSize = `${size}px`;
        }
    }

    // Where each editable text field is drawn. `wraps` fields fill a box over
    // several lines (measured as `fitSelector`, or the element itself, inside
    // its parent); the rest are single lines. All stat names share one width.
    const FIT_TARGETS = {
        title: { id: "card-title-text" },
        cardEffect: { id: "card-effect-text" },
        statName: { selector: "#card-stats .stat-row:not([hidden]) .stat-name" },
        backTitle: { id: "card-back-title" },
        backSubtitle: { id: "card-back-subtitle" },
        backSignoff: { id: "card-back-signoff" },
        backLetter: { id: "card-back-letter-text", wraps: true },
        backTradeGive: {
            id: "card-back-trade-give",
            fitSelector: ".back-trade-line",
        },
        backTradeGet: {
            id: "card-back-trade-get",
            fitSelector: ".back-trade-line",
        },
        actionTitle: { id: "action-title-text" },
        actionLabel: { id: "action-label-text" },
        actionEffect: { id: "action-effect-text", wraps: true },
        actionCost: { id: "action-cost-text", fitSelector: ".action-cost-line" },
        actionBackTitle: { id: "action-back-title" },
        actionBackSubtitle: { id: "action-back-subtitle" },
        actionSignoff: { id: "action-back-signoff" },
        actionMessage: { id: "action-message-text", wraps: true },
    };

    function cssSize(el) {
        const inline = el.style.fontSize;
        el.style.fontSize = "";
        const size = parseFloat(window.getComputedStyle(el).fontSize) || 0;
        el.style.fontSize = inline;
        return size;
    }

    // Width of `text` set in `el`'s font at `fontSize`, measured off-card so the
    // card's 3D transforms and overflow clipping don't affect it.
    function measureLineWidth(el, text, fontSize) {
        const style = window.getComputedStyle(el);
        const probe = document.createElement("span");
        [
            "fontFamily",
            "fontWeight",
            "fontStyle",
            "fontVariant",
            "letterSpacing",
            "textTransform",
        ].forEach((prop) => {
            probe.style[prop] = style[prop];
        });
        probe.style.fontSize = `${fontSize}px`;
        probe.style.position = "absolute";
        probe.style.left = "-9999px";
        probe.style.top = "0";
        probe.style.visibility = "hidden";
        probe.style.whiteSpace = "pre";
        probe.textContent = text;
        document.body.appendChild(probe);
        const width = probe.getBoundingClientRect().width;
        document.body.removeChild(probe);
        return width;
    }

    // Room a single-line field gets once its text is long enough to fill it.
    function availableLineWidth(el) {
        const saved = el.textContent;
        el.textContent = "W".repeat(200);
        const style = window.getComputedStyle(el);
        const width =
            el.clientWidth -
            parseFloat(style.paddingLeft || 0) -
            parseFloat(style.paddingRight || 0);
        el.textContent = saved;
        return width;
    }

    // Natural height of wrapped text at `fontSize`. In a column flex box the
    // element is stretched to fill, so let it size to its content instead.
    function measureWrappedHeight(el, fontSize) {
        const saved = { size: el.style.fontSize, flex: el.style.flex };
        const parentStyle = window.getComputedStyle(el.parentElement);
        if (String(parentStyle.flexDirection).startsWith("column")) {
            el.style.flex = "0 0 auto";
        }
        el.style.fontSize = `${fontSize}px`;
        const height = el.offsetHeight;
        el.style.fontSize = saved.size;
        el.style.flex = saved.flex;
        return height;
    }

    function availableBoxHeight(el) {
        const box = el.parentElement;
        const style = window.getComputedStyle(box);
        return (
            box.clientHeight -
            parseFloat(style.paddingTop || 0) -
            parseFloat(style.paddingBottom || 0)
        );
    }

    // How much of a field's space on the card `text` would take, measured on the
    // live layout and then restored. `use` is the share needed at the smallest
    // allowed size (over 1 means it can't fit); `shrinks` is true when the text
    // has to be set smaller than designed.
    window.measureCardText = function (key, text) {
        const empty = { use: 0, shrinks: false };
        const target = FIT_TARGETS[key];
        const textEl =
            target &&
            (target.selector
                ? document.querySelector(target.selector)
                : byId(target.id));
        if (
            !textEl ||
            !document.body ||
            typeof window.getComputedStyle !== "function"
        )
            return empty;
        const fitEl = target.fitSelector
            ? textEl.closest(target.fitSelector)
            : textEl;
        if (!fitEl) return empty;

        const saved = {
            text: textEl.textContent,
            display: textEl.style.display,
        };
        // Hidden fields (empty subtitle, handwritten letter) have no layout.
        if (window.getComputedStyle(textEl).display === "none") {
            textEl.style.display = "block";
        }
        const designed = cssSize(fitEl);
        const smallest = designed * MIN_FONT_SCALE;
        let useAtSmallest;
        let useAtDesigned;
        if (target.wraps) {
            textEl.textContent = String(text);
            const available = availableBoxHeight(fitEl);
            useAtSmallest = measureWrappedHeight(fitEl, smallest) / available;
            useAtDesigned = measureWrappedHeight(fitEl, designed) / available;
        } else {
            // A line with a label ("I give:") shares its width with that label.
            const available =
                fitEl === textEl ? availableLineWidth(textEl) : fitEl.clientWidth;
            let width = measureLineWidth(textEl, String(text), smallest);
            if (fitEl !== textEl) {
                Array.from(fitEl.childNodes).forEach((node) => {
                    if (node === textEl) return;
                    width += measureLineWidth(
                        node.nodeType === 1 ? node : fitEl,
                        node.textContent,
                        smallest,
                    );
                });
            }
            useAtSmallest = width / available;
            useAtDesigned = useAtSmallest / MIN_FONT_SCALE;
        }
        textEl.textContent = saved.text;
        textEl.style.display = saved.display;

        if (!Number.isFinite(useAtSmallest)) return empty;
        return { use: useAtSmallest, shrinks: useAtDesigned > 1 };
    };

    // Colours and lookups shared by every section of both faces.
    function resolveTheme(state) {
        const primary = state.primaryColor || "#28566F";
        const accent = state.accentColor || "#6B4A2B";
        const resources = window.CATAN_RESOURCES || [];
        const roles = window.CATAN_DEVELOPMENT_ROLES || [];
        return {
            primary,
            accent,
            contrastText: getBaseTextColor(primary),
            glow: hexToRgba(accent, 0.45),
            resource:
                resources.find((item) => item.id === state.resourceId) ||
                resources[2],
            role:
                roles.find((item) => item.id === state.developmentRoleId) ||
                roles[0],
        };
    }

    function applyFaceTheming(face, theme, isCustomized) {
        if (!face || !face.style) return;
        const { primary, accent, contrastText, glow, resource } = theme;
        face.style.setProperty("--archetype-primary", primary);
        face.style.setProperty("--archetype-accent", accent);
        face.style.setProperty("--card-contrast-text", contrastText);
        // Both faces share the resource ring so the pair reads as one card.
        face.style.setProperty(
            "--resource-color",
            (resource && resource.color) || DEFAULT_RESOURCE_COLOR,
        );
        face.style.setProperty("--glow-color", glow);
        if (resource) {
            face.style.setProperty(
                "--resource-text",
                getBaseTextColor(resource.color),
            );
        }
        face.style.setProperty("--font-title", TITLE_FONT);
        face.style.setProperty("--font-body", BODY_FONT);
        face.style.backgroundColor = accent;
        if (face.classList) {
            face.classList.toggle("card--placeholder", !isCustomized);
        }
    }

    function themeDownloadButton(theme) {
        const downloadBtn = byId("download-btn");
        if (!downloadBtn || !downloadBtn.style) return;
        downloadBtn.style.setProperty("--archetype-primary", theme.primary);
        downloadBtn.style.setProperty("--archetype-accent", theme.accent);
        downloadBtn.style.setProperty("--glow-color", theme.glow);
    }

    // Header: dice token with probability pips, name, closeness VP, resource tab.
    function renderHeader(state, resource) {
        const requestedDiceNumber = parseInt(state.diceNumber, 10) || 8;
        const diceNumber =
            requestedDiceNumber >= 2 &&
            requestedDiceNumber <= 12 &&
            requestedDiceNumber !== 7
                ? requestedDiceNumber
                : 8;
        const pipCount = 6 - Math.abs(7 - diceNumber);
        const diceEl = byId("card-dice-number");
        if (diceEl) diceEl.textContent = String(diceNumber);
        const diceTokenEl = byId("card-dice-token");
        if (diceTokenEl) {
            diceTokenEl.title = `Dice number ${diceNumber}, ${pipCount} probability ${pipCount === 1 ? "pip" : "pips"}`;
            diceTokenEl.classList.toggle(
                "catan-dice-token--red",
                diceNumber === 6 || diceNumber === 8,
            );
        }
        const dicePipsEl = byId("card-dice-pips");
        if (dicePipsEl) {
            Array.from(dicePipsEl.children || []).forEach((pip, index) => {
                pip.classList.toggle("is-visible", index < pipCount);
            });
        }

        const titleEl = byId("card-title-text");
        if (titleEl) {
            titleEl.textContent = state.title || "Friend's Name";
            titleEl.style.fontFamily = TITLE_FONT;
            fitTextToWidth(titleEl);
        }

        const closenessEl = byId("card-hp-text");
        if (closenessEl) {
            closenessEl.textContent = String(
                clamp(parseInt(state.closeness, 10) || 1, 1, 10),
            );
        }

        const resourceIconEl = byId("card-resource-icon");
        if (resourceIconEl && resource) {
            renderResourceIcon(
                resourceIconEl,
                resource,
                getBaseTextColor(resource.color),
            );
        }
        const resourceNameEl = byId("card-resource-name");
        if (resourceNameEl && resource) {
            resourceNameEl.textContent = resource.name.toUpperCase();
        }
    }

    function renderFrame(state, frameEl) {
        if (frameEl && frameEl.classList) {
            Array.from(frameEl.classList).forEach((c) => {
                if (c.startsWith("frame-")) frameEl.classList.remove(c);
            });
            frameEl.classList.add(`frame-${state.frameStyle || "resource"}`);
        }
        return frameEl;
    }

    // Once the uploaded image loads, record its aspect ratio so cover sizing is exact.
    function watchPhotoAspect(photoEl, slot) {
        if (photoEl._aspectListenerAttached) return;
        photoEl._aspectListenerAttached = true;
        photoEl.addEventListener("load", function () {
            if (!photoEl.naturalWidth || !photoEl.naturalHeight) return;
            const aspect = photoEl.naturalWidth / photoEl.naturalHeight;
            const state = window.AppState;
            if (state && state[slot.url] && state[slot.aspect] !== aspect) {
                window.updateState({ [slot.aspect]: aspect });
            }
            window.syncPhotoQualityNotes(window.AppState);
        });
    }

    // The card trim is 350 CSS px wide and prints 2.5 in wide, so 140 CSS px
    // make one printed inch.
    const CSS_PX_PER_PRINT_INCH = 140;
    const PHOTO_SHARP_DPI = 300;
    const PHOTO_SOFT_DPI = 200;

    // Photo pixels per printed inch for an image of the given size at a zoom.
    window.estimatePhotoPrintDpi = function (slot, pixelW, pixelH, scale) {
        const frameEl = byId(slot.frameId);
        if (!frameEl || !frameEl.clientWidth || !pixelW || !pixelH) return null;
        const dims = window.computePhotoCoverDimensions(
            pixelW / pixelH,
            Math.max(1, scale || 1),
            frameEl.clientWidth,
            frameEl.clientHeight,
        );
        return (pixelW * CSS_PX_PER_PRINT_INCH) / dims.currentW;
    };

    // How many photo pixels land on each printed inch at the current zoom, or
    // null when no uploaded photo is showing (or loaded yet) in that slot.
    function getPhotoPrintDpi(state, slot) {
        if (!state[slot.url]) return null;
        if (slot.modeKey && state[slot.modeKey] !== "photo") return null;
        const photoEl = byId(slot.photoId);
        if (
            !photoEl ||
            !photoEl.complete ||
            photoEl.getAttribute("src") !== state[slot.url]
        ) {
            return null;
        }
        return window.estimatePhotoPrintDpi(
            slot,
            photoEl.naturalWidth,
            photoEl.naturalHeight,
            state[slot.scale],
        );
    }

    // Warns (never blocks) when a photo will print below 300 dpi: in the photo
    // editor and in the photo's edit guide beside the card.
    window.syncPhotoQualityNotes = function (state) {
        if (!state || !document.querySelectorAll) return;
        document.querySelectorAll(".photo-quality-note").forEach((note) => {
            const slot = window.PHOTO_SLOTS[note.getAttribute("data-slot")];
            window.setPhotoQualityNote(
                note,
                slot ? getPhotoPrintDpi(state, slot) : null,
            );
        });
        // A warning changes the guide's height, so re-lay out the guides.
        renderGuideRail();
    };

    window.setPhotoQualityNote = function (note, dpi) {
        const isLow = dpi !== null && dpi < PHOTO_SOFT_DPI;
        const isSoft = dpi !== null && !isLow && dpi < PHOTO_SHARP_DPI;
        note.hidden = !isLow && !isSoft;
        note.classList.toggle("is-low", isLow);
        note.classList.toggle("is-soft", isSoft);
        const roundedDpi = Math.round(dpi);
        if (isLow) {
            note.textContent = `⚠ Low-resolution photo (about ${roundedDpi} dpi): it will look blurry in print. Use a larger original photo.`;
        } else if (isSoft) {
            note.textContent = `⚠ Photo may print a little soft (about ${roundedDpi} dpi, 300 is ideal). Zoom out or use a larger original.`;
        }
    };

    // Draws one card type's photo (see window.PHOTO_SLOTS) cover-fitted to its frame.
    function renderPhoto(state, slot) {
        const frameEl = renderFrame(state, byId(slot.frameId));
        const photoEl = byId(slot.photoId);
        if (!photoEl) return;

        const url = state[slot.url];
        photoEl.src = url || "assets/placeholder.svg";
        const scale = Math.max(
            1,
            state[slot.scale] !== undefined ? state[slot.scale] : 1,
        );
        photoEl.style.objectFit = "contain";

        if (!url) {
            photoEl.style.width = "100%";
            photoEl.style.height = "100%";
            photoEl.style.maxWidth = "";
            photoEl.style.maxHeight = "";
            const offsetX = state[slot.offsetX] || 0;
            const offsetY = state[slot.offsetY] || 0;
            photoEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
            return;
        }

        const frameW =
            frameEl && frameEl.clientWidth ? frameEl.clientWidth : 326;
        const frameH =
            frameEl && frameEl.clientHeight ? frameEl.clientHeight : 215;
        const aspect =
            state[slot.aspect] ||
            (photoEl.naturalWidth && photoEl.naturalHeight
                ? photoEl.naturalWidth / photoEl.naturalHeight
                : frameW / frameH);
        const dims = window.computePhotoCoverDimensions(
            aspect,
            scale,
            frameW,
            frameH,
        );

        photoEl.style.width = `${Math.round(dims.baseW)}px`;
        photoEl.style.height = `${Math.round(dims.baseH)}px`;
        photoEl.style.maxWidth = "none";
        photoEl.style.maxHeight = "none";
        const offsetX = clamp(
            state[slot.offsetX] || 0,
            -dims.maxOffsetX,
            dims.maxOffsetX,
        );
        const offsetY = clamp(
            state[slot.offsetY] || 0,
            -dims.maxOffsetY,
            dims.maxOffsetY,
        );
        photoEl.style.transform = `translate(${Math.round(offsetX)}px, ${Math.round(offsetY)}px) scale(${scale})`;

        watchPhotoAspect(photoEl, slot);
    }

    function renderRoleAndEffect(state, role) {
        const roleEl = byId("card-archetype-text");
        if (roleEl) {
            roleEl.textContent =
                role.cardLabel ||
                `${role.name.toUpperCase()} · ${role.epithet}`;
            roleEl.style.fontFamily = BODY_FONT;
            roleEl.title = `${role.name}: ${role.epithet}`;
            fitTextToWidth(roleEl);
        }

        const effectEl = byId("card-effect-text");
        if (effectEl) {
            const effect =
                state.cardEffect !== undefined
                    ? String(state.cardEffect)
                    : "When played: the whole table laughs.";
            effectEl.textContent = effect;
            effectEl.title = effect;
            effectEl.style.fontFamily = BODY_FONT;
            fitTextToWidth(effectEl);
        }
    }

    // Ten inline SVG hexes per rating, created once and recoloured on each render.
    function ensureRatingSegments(segmentsEl) {
        if (!segmentsEl.children || segmentsEl.children.length !== 0) return;
        for (let segment = 0; segment < RATING_SEGMENTS; segment += 1) {
            const cell = document.createElementNS(SVG_NS, "svg");
            cell.classList.add("stat-segment");
            cell.setAttribute("viewBox", "0 0 20 12");
            cell.setAttribute("preserveAspectRatio", "none");
            cell.setAttribute("aria-hidden", "true");
            const hex = document.createElementNS(SVG_NS, "polygon");
            hex.setAttribute("points", RATING_HEX_POINTS);
            hex.setAttribute("stroke-width", "2");
            cell.hexShape = hex;
            cell.appendChild(hex);
            segmentsEl.appendChild(cell);
        }
    }

    function paintRatingSegments(
        segmentsEl,
        filledSegments,
        filledColor,
        contrastText,
    ) {
        Array.from(segmentsEl.children || []).forEach((segment, segmentIdx) => {
            const isFilled = segmentIdx < filledSegments;
            if (segment.classList) {
                segment.classList.toggle("is-filled", isFilled);
            }
            const hex = segment.hexShape;
            if (!hex) return;
            hex.setAttribute(
                "fill",
                isFilled ? filledColor : hexToRgba(contrastText, 0.18),
            );
            hex.setAttribute(
                "stroke",
                isFilled
                    ? "rgba(255, 255, 255, 0.3)"
                    : hexToRgba(contrastText, 0.6),
            );
        });
    }

    function renderStats(state, theme) {
        if (!Array.isArray(state.stats)) return;
        const filledColor =
            (theme.resource && theme.resource.color) || DEFAULT_RESOURCE_COLOR;
        const shown = Array.isArray(state.shownStats)
            ? state.shownStats
            : [0, 1, 2];
        (window.CATAN_RESOURCES || []).forEach((resourceItem, idx) => {
            const rowEl = document.querySelector(
                `#card-stats .stat-row[data-stat-index="${idx}"]`,
            );
            if (rowEl) rowEl.hidden = !shown.includes(idx);
            const stat = state.stats[idx] || {
                name: resourceItem.meaning,
                value: 1,
            };
            const label = stat.name || `Stat ${idx + 1}`;
            const value = clamp(
                parseInt(stat.value, 10) || 1,
                1,
                RATING_SEGMENTS,
            );

            renderResourceIcon(
                byId(`stat-icon-${idx}`),
                resourceItem,
                hexToRgba(theme.contrastText, 0.55),
            );
            const nameEl = byId(`stat-name-${idx}`);
            if (nameEl) {
                nameEl.textContent = label;
                nameEl.style.fontFamily = BODY_FONT;
                fitTextToWidth(nameEl);
            }
            const segmentsEl = byId(`stat-segments-${idx}`);
            if (segmentsEl) {
                segmentsEl.setAttribute(
                    "aria-label",
                    `${label}: ${value} out of 10`,
                );
                ensureRatingSegments(segmentsEl);
                paintRatingSegments(
                    segmentsEl,
                    value,
                    filledColor,
                    theme.contrastText,
                );
            }
        });
    }

    function renderBackHeader(state) {
        const backTitleEl = byId("card-back-title");
        if (backTitleEl) {
            const titleVal =
                state.backTitle !== undefined
                    ? state.backTitle
                    : "Happy Birthday!";
            backTitleEl.textContent = titleVal;
            backTitleEl.style.fontFamily = TITLE_FONT;
            fitTextToWidth(backTitleEl);
            const headerEl = byId("card-back-header");
            if (headerEl && headerEl.classList) {
                headerEl.classList.toggle(
                    "back-header--empty",
                    !titleVal || !titleVal.trim(),
                );
            }
        }

        const subtitleEl = byId("card-back-subtitle");
        if (subtitleEl) {
            const subtitle = state.backSubtitle || "";
            subtitleEl.textContent = subtitle;
            subtitleEl.style.display = subtitle ? "" : "none";
            fitTextToWidth(subtitleEl);
        }
    }

    // The message panel is ruled for handwriting unless the sender typed a letter.
    function renderBackLetter(state, backEl) {
        const letterContainer = backEl.querySelector
            ? backEl.querySelector(".back-letter-container")
            : null;
        const letterTextEl = byId("card-back-letter-text");
        if (letterTextEl) {
            letterTextEl.textContent =
                state.backLetter !== undefined
                    ? String(state.backLetter).slice(
                          0,
                          (window.TEXT_LIMITS || {}).backLetter || 240,
                      )
                    : "";
            letterTextEl.style.fontFamily = LETTER_FONT;
            if (letterContainer && letterContainer.classList) {
                const isTyped = state.backLetterMode === "typed";
                letterContainer.classList.toggle(
                    "back-letter--handwritten",
                    !isTyped,
                );
                letterContainer.classList.toggle("back-letter--typed", isTyped);
            }
            fitTextToBox(letterTextEl);
        }

        const tradeGiveEl = byId("card-back-trade-give");
        if (tradeGiveEl)
            tradeGiveEl.textContent = state.backTradeGive || "________";
        const tradeGetEl = byId("card-back-trade-get");
        if (tradeGetEl)
            tradeGetEl.textContent = state.backTradeGet || "________";
        // Each offer stays on one line; both share the smaller fitted size so
        // the voucher reads as one block.
        const tradeLines = backEl.querySelectorAll
            ? Array.from(backEl.querySelectorAll(".back-trade-line"))
            : [];
        tradeLines.forEach(fitTextToWidth);
        if (
            tradeLines.length &&
            typeof window.getComputedStyle === "function"
        ) {
            const sizes = tradeLines
                .map((line) => parseFloat(window.getComputedStyle(line).fontSize))
                .filter(Boolean);
            if (sizes.length) {
                const shared = Math.min(...sizes);
                tradeLines.forEach((line) => {
                    line.style.fontSize = `${shared}px`;
                });
            }
        }

        if (letterContainer) letterContainer.style.display = "flex";
    }

    function renderBackFooter(state) {
        const signoffVal =
            state.backSignoff !== undefined
                ? state.backSignoff
                : "With love, [Your name]";
        const dateVal = state.backDate !== undefined ? state.backDate : "";

        const signoffEl = byId("card-back-signoff");
        if (signoffEl) {
            signoffEl.textContent = signoffVal;
            signoffEl.style.fontFamily = BODY_FONT;
            fitTextToWidth(signoffEl);
        }
        const dateEl = byId("card-back-date");
        if (dateEl) dateEl.textContent = dateVal;

        const footerEl = byId("card-back-footer");
        const signoffGroup =
            footerEl && footerEl.querySelector
                ? footerEl.querySelector(".back-signoff-group")
                : null;
        if (signoffGroup && signoffGroup.classList) {
            const isSignoffBlank =
                !(signoffVal && String(signoffVal).trim()) &&
                !(dateVal && String(dateVal).trim());
            signoffGroup.classList.toggle(
                "back-signoff-group--blank",
                isSignoffBlank,
            );
        }
    }

    function renderBack(state, backEl) {
        renderBackHeader(state);
        renderBackLetter(state, backEl);
        renderBackFooter(state);
    }

    function syncFlipState(state) {
        const flipperEl = byId("card-flipper");
        if (flipperEl && flipperEl.classList) {
            flipperEl.classList.toggle("is-flipped", !!state.isFlipped);
        }
        const flipLabel = byId("flip-label");
        if (flipLabel) {
            flipLabel.textContent = state.isFlipped
                ? "Flip to Front"
                : "Flip to Back";
        }
    }

    function syncStyleToolbar(theme) {
        const { primary, accent } = theme;
        const same = (a, b) =>
            String(a).toUpperCase() === String(b).toUpperCase();
        const primaryPicker = byId("primary-color-picker");
        if (primaryPicker && !same(primaryPicker.value, primary))
            primaryPicker.value = primary;
        const accentPicker = byId("accent-color-picker");
        if (accentPicker && !same(accentPicker.value, accent))
            accentPicker.value = accent;
        if (!document.querySelectorAll) return;
        document.querySelectorAll("[data-base-color]").forEach((preset) => {
            const color = preset.getAttribute("data-base-color");
            preset.setAttribute("aria-pressed", String(same(color, primary)));
            // Grey out bases that would blend into the current accent.
            preset.disabled = !window.isDistinctAccentColor(accent, color);
        });
        document.querySelectorAll("[data-accent-color]").forEach((preset) => {
            const color = preset.getAttribute("data-accent-color");
            preset.setAttribute("aria-pressed", String(same(color, accent)));
            preset.disabled = !window.isDistinctAccentColor(color, primary);
        });
        document.querySelectorAll("[data-theme-base]").forEach((preset) => {
            preset.setAttribute(
                "aria-pressed",
                String(
                    same(preset.getAttribute("data-theme-base"), primary) &&
                        same(preset.getAttribute("data-theme-accent"), accent),
                ),
            );
        });
    }

    // The two faces of the card type being edited, shown and exported.
    window.getActiveFaces = function () {
        const isAction = (window.AppState || {}).cardType === "action";
        return {
            type: isAction ? "action" : "friend",
            front: byId(isAction ? "action-front" : "card-front"),
            back: byId(isAction ? "action-back" : "card-back"),
        };
    };

    // Shows only the chosen card type. Runs before rendering so the visible
    // faces have layout for text fitting.
    function syncCardType(state) {
        const type = state.cardType === "action" ? "action" : "friend";
        const container = byId("card-container");
        if (container && container.dataset) container.dataset.cardType = type;
        if (!document.querySelectorAll) return;
        document
            .querySelectorAll("[data-card-type-option]")
            .forEach((button) => {
                button.setAttribute(
                    "aria-pressed",
                    String(
                        button.getAttribute("data-card-type-option") === type,
                    ),
                );
            });
    }

    window.renderCard = function () {
        const frontEl = byId("card-front") || byId("card");
        const backEl = byId("card-back");
        if (!frontEl) return;

        const state = window.AppState || {};
        const theme = resolveTheme(state);
        syncCardType(state);

        applyFaceTheming(frontEl, theme, state.isCustomized);
        if (backEl) applyFaceTheming(backEl, theme, state.isCustomized);
        themeDownloadButton(theme);

        renderHeader(state, theme.resource);
        renderPhoto(state, window.PHOTO_SLOTS.friend);
        renderRoleAndEffect(state, theme.role);
        renderStats(state, theme);
        if (backEl) renderBack(state, backEl);
        if (typeof window.renderActionCard === "function") {
            window.renderActionCard(state, theme);
        }

        syncFlipState(state);
        syncStyleToolbar(theme);
        window.syncPhotoQualityNotes(state);
    };

    // Building blocks reused by the action card (js/action-card.js).
    window.CardRender = {
        byId,
        clamp,
        fitTextToWidth,
        fitTextToBox,
        ensureRatingSegments,
        paintRatingSegments,
        renderFrame,
        renderPhoto,
        applyFaceTheming,
        SVG_NS,
        TITLE_FONT,
        BODY_FONT,
        LETTER_FONT,
    };

    window.subscribe(() => window.renderCard());
    // Re-fit text once web fonts finish loading, since their widths differ from fallbacks.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => window.renderCard());
    }

    window.initStyleToolbar = function () {
        const toolbar = byId("style-toolbar");
        if (!toolbar) return;

        const colorError = byId("base-color-error");
        const showError = (message) => {
            if (colorError) colorError.textContent = message || "";
        };
        // Applies a colour change, or explains why it was refused and restores the pickers.
        const applyColors = (update) => {
            if (window.updateState(update)) {
                showError("");
                return;
            }
            if (
                update.primaryColor &&
                !window.isValidBaseColor(update.primaryColor)
            ) {
                showError(
                    "Choose a darker base colour with readable contrast.",
                );
            } else {
                showError(
                    "Base and accent are too similar; pick colours that stand apart.",
                );
            }
            window.renderCard();
        };

        const primaryPicker = byId("primary-color-picker");
        if (primaryPicker) {
            primaryPicker.addEventListener("input", function () {
                applyColors({ primaryColor: this.value.toUpperCase() });
            });
        }
        const accentPicker = byId("accent-color-picker");
        if (accentPicker) {
            accentPicker.addEventListener("input", function () {
                applyColors({ accentColor: this.value.toUpperCase() });
            });
        }

        if (!document.querySelectorAll) return;
        document
            .querySelectorAll("[data-card-type-option]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    if (typeof window.hidePopover === "function") {
                        window.hidePopover();
                    }
                    window.updateState({
                        cardType: button.getAttribute("data-card-type-option"),
                    });
                });
            });
        document.querySelectorAll("[data-base-color]").forEach((button) => {
            button.addEventListener("click", () =>
                applyColors({
                    primaryColor: button.getAttribute("data-base-color"),
                }),
            );
        });
        document.querySelectorAll("[data-accent-color]").forEach((button) => {
            button.addEventListener("click", () =>
                applyColors({
                    accentColor: button.getAttribute("data-accent-color"),
                }),
            );
        });
        document.querySelectorAll("[data-theme-base]").forEach((button) => {
            button.addEventListener("click", () =>
                applyColors({
                    primaryColor: button.getAttribute("data-theme-base"),
                    accentColor: button.getAttribute("data-theme-accent"),
                }),
            );
        });
        window.renderCard();
    };

    function setupGuideToggle(cardContainer) {
        const guideToggleBtn = byId("guide-toggle-btn");
        const guideToggleLabel = byId("guide-toggle-label");
        if (!guideToggleBtn || !cardContainer) return;
        let guidesActive = true;
        guideToggleBtn.addEventListener("click", function () {
            guidesActive = !guidesActive;
            cardContainer.classList.toggle("guides-hidden", !guidesActive);
            document.body.classList.toggle("guides-hidden", !guidesActive);
            guideToggleBtn.classList.toggle("active", guidesActive);
            if (guideToggleLabel) {
                guideToggleLabel.textContent = guidesActive
                    ? "Edit Guides: ON"
                    : "Edit Guides: OFF";
            }
        });
    }

    function setupPrintGuidesToggle(cardContainer) {
        const printGuidesBtn = byId("print-guides-toggle-btn");
        const printGuidesLabel = byId("print-guides-toggle-label");
        if (!printGuidesBtn || !cardContainer) return;
        printGuidesBtn.addEventListener("click", function () {
            const guidesActive = !cardContainer.classList.contains(
                "print-guides-visible",
            );
            cardContainer.classList.toggle(
                "print-guides-visible",
                guidesActive,
            );
            printGuidesBtn.classList.toggle("active", guidesActive);
            printGuidesBtn.setAttribute("aria-pressed", String(guidesActive));
            if (printGuidesLabel) {
                printGuidesLabel.textContent = guidesActive
                    ? "Print Guides: ON"
                    : "Print Guides: OFF";
            }
        });
    }

    // Edit guides sit beside the card, never on it, so they cannot cover what
    // the user writes. Each callout comes from a section's (hidden) guide badge
    // and points at that section on the visible face.
    const GUIDE_HINTS = {
        header: [
            [
                "Dice number",
                "how often you see each other. 6 and 8 roll the most (all the time); 2 and 12 the least (rarely). No 7: that's the robber.",
            ],
            [
                "VP",
                "how close you are, 1 to 10. 10 VP wins the game: as close as it gets.",
            ],
        ],
    };
    const GUIDE_SPACING = 6;
    // Guide sections that show an uploaded photo, and its PHOTO_SLOTS entry.
    const GUIDE_PHOTO_SLOTS = { image: "friend", "action-symbol": "action" };
    const GUIDE_LINE_WIDTH = 28;

    function offsetWithin(el, ancestor) {
        let top = 0;
        let node = el;
        while (node && node !== ancestor) {
            top += node.offsetTop;
            node = node.offsetParent;
        }
        return top;
    }

    function buildGuideCallout(sectionId, labelText) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "guide-callout";
        item.setAttribute("data-for", sectionId);

        const label = document.createElement("span");
        label.className = "guide-callout-label";
        const dot = document.createElement("span");
        dot.className = "guide-dot";
        label.appendChild(dot);
        label.appendChild(document.createTextNode(labelText));
        item.appendChild(label);

        (GUIDE_HINTS[sectionId] || []).forEach(([term, meaning]) => {
            const hint = document.createElement("span");
            hint.className = "guide-callout-hint";
            const strong = document.createElement("b");
            strong.textContent = `${term}: `;
            hint.appendChild(strong);
            hint.appendChild(document.createTextNode(meaning));
            item.appendChild(hint);
        });

        // The photo guides also carry the print-sharpness warning.
        const photoSlotName = GUIDE_PHOTO_SLOTS[sectionId];
        if (photoSlotName) {
            const note = document.createElement("span");
            note.className = "photo-quality-note guide-callout-warning";
            note.setAttribute("data-slot", photoSlotName);
            note.setAttribute("role", "status");
            window.setPhotoQualityNote(
                note,
                getPhotoPrintDpi(
                    window.AppState || {},
                    window.PHOTO_SLOTS[photoSlotName],
                ),
            );
            item.appendChild(note);
        }
        return item;
    }

    function renderGuideRail() {
        const rail = byId("card-guide-rail");
        if (!rail || typeof window.getActiveFaces !== "function") return;
        const faces = window.getActiveFaces();
        const face = (window.AppState || {}).isFlipped
            ? faces.back
            : faces.front;
        const list = rail.querySelector(".guide-rail-list");
        const lines = rail.querySelector(".guide-rail-lines");
        if (!face || !list || !lines) return;

        const accent = face.style.getPropertyValue("--archetype-accent");
        if (accent) rail.style.setProperty("--archetype-accent", accent);

        list.textContent = "";
        lines.textContent = "";
        const entries = [];
        face.querySelectorAll(".card-guide-badge").forEach((badge) => {
            const sectionId = badge.getAttribute("data-for");
            const section = badge.closest(".card-section");
            if (!sectionId || !section) return;
            const labelText = badge.textContent.replace(/\s+/g, " ").trim();
            const item = buildGuideCallout(sectionId, labelText);
            list.appendChild(item);
            entries.push({
                item,
                target:
                    offsetWithin(section, face) + section.offsetHeight / 2,
            });
        });

        // Narrow screens show the guides as a plain list under the card.
        if (window.getComputedStyle(rail).position !== "absolute") return;

        entries.sort((a, b) => a.target - b.target);
        let cursor = 0;
        entries.forEach((entry) => {
            entry.height = entry.item.offsetHeight;
            entry.top = Math.max(entry.target - entry.height / 2, cursor);
            cursor = entry.top + entry.height + GUIDE_SPACING;
        });
        let limit = face.offsetHeight;
        for (let i = entries.length - 1; i >= 0; i -= 1) {
            const entry = entries[i];
            if (entry.top + entry.height > limit) {
                entry.top = limit - entry.height;
            }
            limit = entry.top - GUIDE_SPACING;
        }

        entries.forEach((entry) => {
            entry.item.style.top = `${Math.round(entry.top)}px`;
            const from = entry.top + entry.height / 2;
            const mid = GUIDE_LINE_WIDTH / 2;
            const path = document.createElementNS(SVG_NS, "path");
            path.setAttribute(
                "d",
                `M0 ${from} C${mid} ${from}, ${mid} ${entry.target}, ${GUIDE_LINE_WIDTH} ${entry.target}`,
            );
            path.setAttribute("data-for", entry.item.getAttribute("data-for"));
            lines.appendChild(path);
            const dot = document.createElementNS(SVG_NS, "circle");
            dot.setAttribute("cx", String(GUIDE_LINE_WIDTH));
            dot.setAttribute("cy", String(entry.target));
            dot.setAttribute("r", "3");
            lines.appendChild(dot);
        });
    }

    function setGuideLink(sectionId, linked) {
        const rail = byId("card-guide-rail");
        if (!rail || !sectionId) return;
        rail.querySelectorAll(`[data-for="${sectionId}"]`).forEach((el) =>
            el.classList.toggle("is-linked", linked),
        );
        const faces = window.getActiveFaces();
        [faces.front, faces.back].forEach((face) => {
            if (!face) return;
            face.querySelectorAll(`[data-section="${sectionId}"]`).forEach(
                (section) => section.classList.toggle("is-guide-target", linked),
            );
        });
    }

    // Clicking a callout opens its section's editor; hovering a callout or a
    // section highlights the other.
    function setupGuideRail() {
        const rail = byId("card-guide-rail");
        const flipper = byId("card-flipper");
        if (!rail) return;

        rail.addEventListener("click", function (e) {
            const item = e.target.closest(".guide-callout");
            if (!item || typeof window.showPopover !== "function") return;
            e.stopPropagation();
            window.showPopover(item.getAttribute("data-for"));
        });

        function linkFrom(container, selector, attr) {
            container.addEventListener("mouseover", function (e) {
                const el = e.target.closest(selector);
                if (el) setGuideLink(el.getAttribute(attr), true);
            });
            container.addEventListener("mouseout", function (e) {
                const el = e.target.closest(selector);
                if (el) setGuideLink(el.getAttribute(attr), false);
            });
        }
        linkFrom(rail, ".guide-callout", "data-for");
        if (flipper) linkFrom(flipper, ".card-section", "data-section");

        window.addEventListener("resize", renderGuideRail);
        renderGuideRail();
    }

    // Press F to flip the card unless the user is typing.
    function setupFlipShortcut() {
        document.addEventListener("keydown", function (e) {
            if (e.key !== "f" && e.key !== "F") return;
            const tag =
                e.target && e.target.tagName
                    ? e.target.tagName.toLowerCase()
                    : "";
            if (tag !== "input" && tag !== "textarea") {
                window.toggleFlip();
            }
        });
    }

    if (typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("DOMContentLoaded", function () {
            window.initStyleToolbar();
            window.renderCard();

            const flipBtn = byId("flip-btn");
            if (flipBtn) {
                flipBtn.addEventListener("click", function () {
                    window.toggleFlip();
                });
            }

            const cardContainer = byId("card-container");
            setupGuideToggle(cardContainer);
            setupPrintGuidesToggle(cardContainer);
            setupGuideRail();
            setupFlipShortcut();
        });
    }
})();
