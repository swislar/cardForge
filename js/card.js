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

    // Shrinks a single-line field just enough for its text to fit, so long words
    // are never clipped or replaced with an ellipsis. Needs real layout, so it is
    // a no-op where the element has no measured width.
    function fitTextToWidth(el) {
        if (!el || !el.style || typeof window.getComputedStyle !== "function")
            return;
        el.style.fontSize = "";
        let size = parseFloat(window.getComputedStyle(el).fontSize);
        for (let attempt = 0; attempt < 6; attempt += 1) {
            const available = el.clientWidth;
            const needed = el.scrollWidth;
            if (!size || !available || !needed || needed <= available) return;
            size = Math.floor(size * (available / needed) * 0.98 * 100) / 100;
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
        const minSize = 7;
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

    function renderFrame(state) {
        const frameEl = byId("card-image-frame");
        if (frameEl && frameEl.classList) {
            Array.from(frameEl.classList).forEach((c) => {
                if (c.startsWith("frame-")) frameEl.classList.remove(c);
            });
            frameEl.classList.add(`frame-${state.frameStyle || "resource"}`);
        }
        return frameEl;
    }

    // Once the uploaded image loads, record its aspect ratio so cover sizing is exact.
    function watchPhotoAspect(photoEl) {
        if (photoEl._aspectListenerAttached) return;
        photoEl._aspectListenerAttached = true;
        photoEl.addEventListener("load", function () {
            if (!photoEl.naturalWidth || !photoEl.naturalHeight) return;
            const aspect = photoEl.naturalWidth / photoEl.naturalHeight;
            const state = window.AppState;
            if (state && state.photoDataUrl && state.photoAspect !== aspect) {
                window.updateState({ photoAspect: aspect });
            }
        });
    }

    function renderPhoto(state) {
        const frameEl = renderFrame(state);
        const photoEl = byId("card-photo");
        if (!photoEl) return;

        photoEl.src = state.photoDataUrl || "assets/placeholder.svg";
        const scale = Math.max(
            1,
            state.photoScale !== undefined ? state.photoScale : 1,
        );
        photoEl.style.objectFit = "contain";

        if (!state.photoDataUrl) {
            photoEl.style.width = "100%";
            photoEl.style.height = "100%";
            photoEl.style.maxWidth = "";
            photoEl.style.maxHeight = "";
            const offsetX = state.photoOffsetX || 0;
            const offsetY = state.photoOffsetY || 0;
            photoEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
            return;
        }

        const frameW =
            frameEl && frameEl.clientWidth ? frameEl.clientWidth : 326;
        const frameH =
            frameEl && frameEl.clientHeight ? frameEl.clientHeight : 215;
        const aspect =
            state.photoAspect ||
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
            state.photoOffsetX || 0,
            -dims.maxOffsetX,
            dims.maxOffsetX,
        );
        const offsetY = clamp(
            state.photoOffsetY || 0,
            -dims.maxOffsetY,
            dims.maxOffsetY,
        );
        photoEl.style.transform = `translate(${Math.round(offsetX)}px, ${Math.round(offsetY)}px) scale(${scale})`;

        watchPhotoAspect(photoEl);
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
        (window.CATAN_RESOURCES || []).forEach((resourceItem, idx) => {
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

    function renderCardNumber(state) {
        const backNumberEl = byId("card-back-number");
        if (!backNumberEl) return;
        const cardNumber = Math.max(1, parseInt(state.cardNumber, 10) || 1);
        const deckSize = Math.max(
            cardNumber,
            parseInt(state.deckSize, 10) || 1,
        );
        backNumberEl.textContent = `Card ${cardNumber}/${deckSize}`;
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
        const tradeOfferEl = backEl.querySelector
            ? backEl.querySelector(".back-trade-offer")
            : null;
        if (tradeOfferEl)
            fitTextToBox(tradeOfferEl, tradeOfferEl.parentElement);

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

    window.renderCard = function () {
        const frontEl = byId("card-front") || byId("card");
        const backEl = byId("card-back");
        if (!frontEl) return;

        const state = window.AppState || {};
        const theme = resolveTheme(state);

        applyFaceTheming(frontEl, theme, state.isCustomized);
        if (backEl) applyFaceTheming(backEl, theme, state.isCustomized);
        themeDownloadButton(theme);

        renderHeader(state, theme.resource);
        renderPhoto(state);
        renderRoleAndEffect(state, theme.role);
        renderStats(state, theme);
        renderCardNumber(state);
        if (backEl) renderBack(state, backEl);

        syncFlipState(state);
        syncStyleToolbar(theme);
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

    // Clicking a guide badge opens the editor for its card section.
    function setupGuideBadges() {
        document.querySelectorAll(".card-guide-badge").forEach((badge) => {
            badge.addEventListener("click", function (e) {
                e.stopPropagation();
                const section = badge.closest && badge.closest(".card-section");
                const targetSection =
                    badge.getAttribute("data-for") ||
                    (section ? section.getAttribute("data-section") : null);
                if (targetSection && typeof window.showPopover === "function") {
                    window.showPopover(targetSection);
                }
            });
        });
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
            setupGuideBadges();
            setupFlipShortcut();
        });
    }
})();
