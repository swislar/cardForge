// Card Rendering Engine for Card Forge (Two-Sided 3D Canvas)

(function () {
    function hexToRgba(hex, alpha) {
        if (
            !hex ||
            typeof hex !== "string" ||
            !hex.startsWith("#") ||
            hex.length !== 7
        ) {
            return `rgba(125, 206, 160, ${alpha})`;
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function adjustBrightness(hex, percent) {
        if (
            !hex ||
            typeof hex !== "string" ||
            !hex.startsWith("#") ||
            hex.length !== 7
        )
            return hex;
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        r = Math.min(255, Math.max(0, Math.round(r + (r * percent) / 100)));
        g = Math.min(255, Math.max(0, Math.round(g + (g * percent) / 100)));
        b = Math.min(255, Math.max(0, Math.round(b + (b * percent) / 100)));
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }

    function resolveFontFamily(id, type) {
        if (window.AVAILABLE_FONTS && window.AVAILABLE_FONTS[type]) {
            const match = window.AVAILABLE_FONTS[type].find((f) => f.id === id);
            if (match) return match.family;
        }
        if (id && id.includes(",")) return id;
        if (id) return `'${id}', sans-serif`;
        return type === "title" ? "'Cinzel', serif" : "'Outfit', sans-serif";
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
        const current = !!window.AppState.isFlipped;
        const next = force !== undefined ? !!force : !current;
        window.AppState.isFlipped = next;
        if (typeof window.renderCard === "function") {
            window.renderCard();
        }
    };

    window.renderCard = function () {
        const frontEl =
            document.getElementById("card-front") ||
            document.getElementById("card");
        const backEl = document.getElementById("card-back");
        const flipperEl = document.getElementById("card-flipper");
        if (!frontEl) return;

        const state = window.AppState || {};
        // 1. Resolve Colors, Fonts & Textures
        const primary = state.primaryColor || "#28566F";
        const accent = state.accentColor || "#6B4A2B";
        const contrastText =
            typeof window.getBaseTextColor === "function"
                ? window.getBaseTextColor(primary)
                : "#F3E7C9";
        const resource =
            (window.CATAN_RESOURCES || []).find(
                (item) => item.id === state.resourceId,
            ) || (window.CATAN_RESOURCES || [])[2];
        const role =
            (window.CATAN_DEVELOPMENT_ROLES || []).find(
                (item) => item.id === state.developmentRoleId,
            ) || (window.CATAN_DEVELOPMENT_ROLES || [])[0];
        const glow = hexToRgba(accent, 0.45);

        const titleFont = resolveFontFamily("Cinzel", "title");
        const bodyFont = resolveFontFamily("Outfit", "body");
        const texture = "smooth";

        const textureClasses = [
            "texture-smooth",
            "texture-holographic",
            "texture-parchment",
            "texture-cosmic",
            "texture-linen",
            "texture-leather",
            "texture-gold",
            "texture-carbon",
            "texture-pearl",
            "texture-crystal",
            "texture-aurora",
            "texture-prismatic",
        ];

        function applyFaceTheming(face) {
            if (!face || !face.style) return;
            face.style.setProperty("--archetype-primary", primary);
            face.style.setProperty("--archetype-accent", accent);
            face.style.setProperty("--card-contrast-text", contrastText);
            face.style.setProperty(
                "--resource-color",
                face === frontEl
                    ? (resource && resource.color) || "#A8D26B"
                    : accent,
            );
            face.style.setProperty("--glow-color", glow);
            face.style.setProperty("--font-title", titleFont);
            face.style.setProperty("--font-body", bodyFont);
            face.style.backgroundColor = accent;

            if (face.classList) {
                textureClasses.forEach((c) => face.classList.remove(c));
                face.classList.add(`texture-${texture}`);
                face.classList.toggle("card--placeholder", !state.isCustomized);
            }
        }

        applyFaceTheming(frontEl);
        if (backEl) applyFaceTheming(backEl);

        // Update download buttons & toolbar theme glow
        const downloadBtn = document.getElementById("download-btn");
        if (downloadBtn && downloadBtn.style) {
            downloadBtn.style.setProperty("--archetype-primary", primary);
            downloadBtn.style.setProperty("--archetype-accent", accent);
            downloadBtn.style.setProperty("--glow-color", glow);
        }

        // 2. Front Face Section 1: Header
        const requestedDiceNumber = parseInt(state.diceNumber, 10) || 8;
        const diceNumber =
            requestedDiceNumber >= 2 &&
            requestedDiceNumber <= 12 &&
            requestedDiceNumber !== 7
                ? requestedDiceNumber
                : 8;
        const diceEl = document.getElementById("card-dice-number");
        if (diceEl) diceEl.textContent = String(diceNumber);
        const diceTokenEl = document.getElementById("card-dice-token");
        const pipCount = 6 - Math.abs(7 - diceNumber);
        if (diceTokenEl) {
            diceTokenEl.title = `Dice number ${diceNumber}, ${pipCount} probability ${pipCount === 1 ? "pip" : "pips"}`;
            diceTokenEl.classList.toggle(
                "catan-dice-token--red",
                diceNumber === 6 || diceNumber === 8,
            );
        }
        const dicePipsEl = document.getElementById("card-dice-pips");
        if (dicePipsEl) {
            Array.from(dicePipsEl.children || []).forEach((pip, index) => {
                pip.classList.toggle("is-visible", index < pipCount);
            });
        }

        const titleEl = document.getElementById("card-title-text");
        if (titleEl) {
            titleEl.textContent = state.title || "Friend's Name";
            titleEl.style.fontFamily = titleFont;
        }

        const hpEl = document.getElementById("card-hp-text");
        if (hpEl) {
            const vpTotal = Math.max(1, parseInt(state.vpTotal, 10) || 10);
            const vpScore = Math.min(
                vpTotal,
                Math.max(0, parseInt(state.vpScore, 10) || 0),
            );
            hpEl.textContent = `${vpScore}/${vpTotal}`;
        }
        const resourceIconEl = document.getElementById("card-resource-icon");
        if (resourceIconEl && resource) resourceIconEl.textContent = resource.icon;
        const resourceNameEl = document.getElementById("card-resource-name");
        if (resourceNameEl && resource)
            resourceNameEl.textContent = resource.name.toUpperCase();

        // 3. Front Face Section 2: Image & Frame
        const frameEl = document.getElementById("card-image-frame");
        if (frameEl && frameEl.classList) {
            Array.from(frameEl.classList).forEach((c) => {
                if (c.startsWith("frame-")) frameEl.classList.remove(c);
            });
            frameEl.classList.add(`frame-${state.frameStyle || "simple"}`);
        }

        const photoEl = document.getElementById("card-photo");
        if (photoEl) {
            const isCustomPhoto = !!state.photoDataUrl;
            photoEl.src = state.photoDataUrl || "assets/placeholder.svg";
            const scale = Math.max(
                1,
                state.photoScale !== undefined ? state.photoScale : 1,
            );

            if (isCustomPhoto) {
                const frameW =
                    frameEl && frameEl.clientWidth ? frameEl.clientWidth : 326;
                const frameH =
                    frameEl && frameEl.clientHeight
                        ? frameEl.clientHeight
                        : 229;
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
                photoEl.style.objectFit = "contain";

                let offsetX = state.photoOffsetX || 0;
                let offsetY = state.photoOffsetY || 0;
                offsetX = Math.max(
                    -dims.maxOffsetX,
                    Math.min(dims.maxOffsetX, offsetX),
                );
                offsetY = Math.max(
                    -dims.maxOffsetY,
                    Math.min(dims.maxOffsetY, offsetY),
                );

                photoEl.style.transform = `translate(${Math.round(offsetX)}px, ${Math.round(offsetY)}px) scale(${scale})`;

                if (!photoEl._aspectListenerAttached) {
                    photoEl._aspectListenerAttached = true;
                    photoEl.addEventListener("load", function () {
                        if (photoEl.naturalWidth && photoEl.naturalHeight) {
                            const asp =
                                photoEl.naturalWidth / photoEl.naturalHeight;
                            if (
                                window.AppState &&
                                window.AppState.photoDataUrl &&
                                window.AppState.photoAspect !== asp
                            ) {
                                window.AppState.photoAspect = asp;
                                if (typeof window.renderCard === "function")
                                    window.renderCard();
                            }
                        }
                    });
                }
            } else {
                photoEl.style.width = "100%";
                photoEl.style.height = "100%";
                photoEl.style.maxWidth = "";
                photoEl.style.maxHeight = "";
                photoEl.style.objectFit = "contain";
                const offsetX = state.photoOffsetX || 0;
                const offsetY = state.photoOffsetY || 0;
                photoEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
            }
        }

        // 4. Front Face Section 3: Archetype Banner
        const archTextEl = document.getElementById("card-archetype-text");
        if (archTextEl) {
            const roleCardLabel =
                role.cardLabel || `${role.name.toUpperCase()} · ${role.epithet}`;
            archTextEl.textContent =
                roleCardLabel.slice(0, 22);
            archTextEl.style.fontFamily = bodyFont;
            archTextEl.title = `${role.name}: ${role.epithet}`;
        }

        // 5. Front Face Resource Ratings
        if (Array.isArray(state.stats)) {
            (window.CATAN_RESOURCES || []).forEach((resourceItem, idx) => {
                const st = state.stats[idx] || {
                    name: resourceItem.meaning,
                    value: 1,
                };
                const nameEl = document.getElementById(`stat-name-${idx}`);
                const segmentsEl = document.getElementById(
                    `stat-segments-${idx}`,
                );

                if (nameEl) {
                    nameEl.textContent = st.name || `Stat ${idx + 1}`;
                    nameEl.style.fontFamily = bodyFont;
                }
                const val = Math.min(10, Math.max(1, parseInt(st.value, 10) || 1));
                if (segmentsEl) {
                    segmentsEl.setAttribute(
                        "aria-label",
                        `${st.name || `Stat ${idx + 1}`}: ${val} out of 10`,
                    );
                    if (segmentsEl.children && segmentsEl.children.length === 0) {
                        for (let segment = 0; segment < 10; segment += 1) {
                            const cell = document.createElementNS(
                                "http://www.w3.org/2000/svg",
                                "svg",
                            );
                            cell.classList.add("stat-segment");
                            cell.setAttribute("viewBox", "0 0 20 12");
                            cell.setAttribute("preserveAspectRatio", "none");
                            cell.setAttribute("aria-hidden", "true");
                            const hex = document.createElementNS(
                                "http://www.w3.org/2000/svg",
                                "polygon",
                            );
                            hex.setAttribute(
                                "points",
                                "4.5,0.5 15.5,0.5 19.5,6 15.5,11.5 4.5,11.5 0.5,6",
                            );
                            hex.setAttribute("stroke-width", "2");
                            cell.hexShape = hex;
                            cell.appendChild(hex);
                            segmentsEl.appendChild(cell);
                        }
                    }
                    const filledSegments = val;
                    Array.from(segmentsEl.children || []).forEach(
                        (segment, segmentIdx) => {
                            if (segment.classList) {
                                segment.classList.toggle(
                                    "is-filled",
                                    segmentIdx < filledSegments,
                                );
                            }
                            const hex = segment.hexShape;
                            if (hex) {
                                hex.setAttribute(
                                    "fill",
                                    segmentIdx < filledSegments
                                        ? (resource && resource.color) || "#A8D26B"
                                        : "rgba(243, 231, 201, 0.18)",
                                );
                                hex.setAttribute(
                                    "stroke",
                                    segmentIdx < filledSegments
                                        ? "rgba(255, 255, 255, 0.3)"
                                        : "rgba(243, 231, 201, 0.6)",
                                );
                            }
                        },
                    );
                }
            });
        }

        const chaosEl = document.getElementById("card-chaos-score");
        const chaos = Math.min(
            99,
            Math.max(0, parseInt(state.chaosScore, 10) || 0),
        );
        if (chaosEl) chaosEl.textContent = String(chaos);

        // 6. Collectible details move to the back face.
        const backNumberEl = document.getElementById("card-back-number");
        if (backNumberEl) {
            const cardNumber = Math.max(
                1,
                parseInt(state.cardNumber, 10) || 1,
            );
            const deckSize = Math.max(
                cardNumber,
                parseInt(state.deckSize, 10) || 1,
            );
            backNumberEl.textContent = `Card ${cardNumber}/${deckSize}`;
        }

        // 8. Back Face Content & Layout
        if (backEl) {
            const backTitleEl = document.getElementById("card-back-title");
            if (backTitleEl) {
                const titleVal =
                    state.backTitle !== undefined
                        ? state.backTitle
                        : isBlank
                          ? ""
                          : "Happy Birthday!";
                backTitleEl.textContent = titleVal;
                backTitleEl.style.fontFamily = titleFont;
                const headerEl = document.getElementById("card-back-header");
                if (headerEl && headerEl.classList) {
                    headerEl.classList.toggle(
                        "back-header--empty",
                        !titleVal || !titleVal.trim(),
                    );
                }
            }

            const subtitleEl = document.getElementById("card-back-subtitle");
            if (subtitleEl) {
                const subtitle = state.backSubtitle || "";
                subtitleEl.textContent = subtitle;
                subtitleEl.style.display = subtitle ? "" : "none";
            }

            const letterContainer = backEl.querySelector
                ? backEl.querySelector(".back-letter-container")
                : null;
            const letterTextEl = document.getElementById(
                "card-back-letter-text",
            );
            if (letterTextEl) {
                const letterVal =
                    state.backLetter !== undefined
                        ? String(state.backLetter).slice(0, 300)
                        : "";
                letterTextEl.textContent = letterVal;
                letterTextEl.style.fontFamily = 'Georgia, "Times New Roman", serif';
                if (letterContainer && letterContainer.classList) {
                    const letterMode = state.backLetterMode === "typed"
                        ? "typed"
                        : "handwritten";
                    letterContainer.classList.toggle(
                        "back-letter--handwritten",
                        letterMode === "handwritten",
                    );
                    letterContainer.classList.toggle(
                        "back-letter--typed",
                        letterMode === "typed",
                    );
                }
            }

            const tradeGiveEl = document.getElementById("card-back-trade-give");
            if (tradeGiveEl) {
                tradeGiveEl.textContent = state.backTradeGive || "________";
            }
            const tradeGetEl = document.getElementById("card-back-trade-get");
            if (tradeGetEl) {
                tradeGetEl.textContent = state.backTradeGet || "________";
            }
            const voucherEl = document.getElementById("card-back-voucher");
            if (voucherEl) {
                voucherEl.textContent = state.backVoucher || "Redeemable any time";
            }

            const signoffEl = document.getElementById("card-back-signoff");
            const signoffVal =
                state.backSignoff !== undefined
                    ? state.backSignoff
                    : "With love, [Your name]";
            if (signoffEl) {
                signoffEl.textContent = signoffVal;
                signoffEl.style.fontFamily = bodyFont;
            }

            const dateEl = document.getElementById("card-back-date");
            const dateVal =
                state.backDate !== undefined
                    ? state.backDate
                    : "";
            if (dateEl) {
                dateEl.textContent = dateVal;
            }

            const footerEl = document.getElementById("card-back-footer");
            const signoffGroup =
                footerEl && footerEl.querySelector
                    ? footerEl.querySelector(".back-signoff-group")
                    : null;
            const isSignoffBlank =
                !(signoffVal && String(signoffVal).trim()) &&
                !(dateVal && String(dateVal).trim());
            if (signoffGroup && signoffGroup.classList) {
                signoffGroup.classList.toggle(
                    "back-signoff-group--blank",
                    isSignoffBlank,
                );
            }

            if (letterContainer) letterContainer.style.display = "flex";
        }

        // 9. 3D Flip State Synchronization
        if (flipperEl && flipperEl.classList) {
            flipperEl.classList.toggle("is-flipped", !!state.isFlipped);
        }
        const flipLabel = document.getElementById("flip-label");
        if (flipLabel) {
            flipLabel.textContent = state.isFlipped
                ? "Flip to Front"
                : "Flip to Back";
        }
        const purposeLabel = document.getElementById("card-purpose-label");
        if (purposeLabel) {
            purposeLabel.textContent = state.isFlipped
                ? "The message to your friend"
                : "The impression of your friend";
        }

        // 10. Sync Style Toolbar controls
        const primaryPicker = document.getElementById("primary-color-picker");
        if (primaryPicker && primaryPicker.value !== primary)
            primaryPicker.value = primary;
        if (document.querySelectorAll) {
            document
                .querySelectorAll("[data-base-color]")
                .forEach((preset) => {
                    preset.setAttribute(
                        "aria-pressed",
                        String(
                            preset.getAttribute("data-base-color").toUpperCase() ===
                                primary.toUpperCase(),
                        ),
                    );
                });
        }

        const accentPicker = document.getElementById("accent-color-picker");
        if (accentPicker && accentPicker.value !== accent)
            accentPicker.value = accent;

    };

    window.initStyleToolbar = function () {
        const toolbar = document.getElementById("style-toolbar");
        if (!toolbar) return;

        // Background color pickers
        const primaryPicker = document.getElementById("primary-color-picker");
        if (primaryPicker) {
            if (window.AppState && window.AppState.primaryColor) {
                primaryPicker.value = window.AppState.primaryColor;
            }
            const baseColorError = document.getElementById("base-color-error");
            primaryPicker.addEventListener("input", function () {
                const nextColor = this.value.toUpperCase();
                if (!window.isValidBaseColor(nextColor)) {
                    this.value = window.AppState.primaryColor;
                    if (baseColorError) {
                        baseColorError.textContent =
                            "Choose a darker base colour with readable contrast.";
                    }
                    return;
                }
                if (baseColorError) baseColorError.textContent = "";
                window.updateState({ primaryColor: nextColor });
            });
        }

        const paletteButtons = document.querySelectorAll
            ? document.querySelectorAll("[data-base-color]")
            : [];
        paletteButtons.forEach((button) => {
            button.addEventListener("click", function () {
                const color = button.getAttribute("data-base-color");
                if (!window.isValidBaseColor(color)) {
                    throw new Error(`Invalid base colour preset: ${color}`);
                }
                window.updateState({ primaryColor: color });
                if (primaryPicker) primaryPicker.value = color;
                const baseColorError = document.getElementById("base-color-error");
                if (baseColorError) baseColorError.textContent = "";
                paletteButtons.forEach((preset) => {
                    preset.setAttribute(
                        "aria-pressed",
                        String(preset === button),
                    );
                });
            });
        });

        // 5. Accent Color Picker
        const accentPicker = document.getElementById("accent-color-picker");
        if (accentPicker) {
            if (window.AppState && window.AppState.accentColor) {
                accentPicker.value = window.AppState.accentColor;
            }
            accentPicker.addEventListener("input", function () {
                window.updateState({ accentColor: this.value });
            });
        }
    };

    // Wire up Global Interactions
    if (typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("DOMContentLoaded", function () {
            window.initStyleToolbar();
            window.renderCard();

            const flipBtn = document.getElementById("flip-btn");
            if (flipBtn) {
                flipBtn.addEventListener("click", function () {
                    window.toggleFlip();
                });
            }

            // Guide Toggle Control
            const guideToggleBtn = document.getElementById("guide-toggle-btn");
            const cardContainer = document.getElementById("card-container");
            const guideToggleLabel =
                document.getElementById("guide-toggle-label");
            if (guideToggleBtn && cardContainer) {
                let guidesActive = true;
                guideToggleBtn.addEventListener("click", function () {
                    guidesActive = !guidesActive;
                    cardContainer.classList.toggle(
                        "guides-hidden",
                        !guidesActive,
                    );
                    document.body.classList.toggle(
                        "guides-hidden",
                        !guidesActive,
                    );
                    guideToggleBtn.classList.toggle("active", guidesActive);
                    if (guideToggleLabel) {
                        guideToggleLabel.textContent = guidesActive
                            ? "Edit Guides: ON"
                            : "Edit Guides: OFF";
                    }
                });
            }

            const printGuidesBtn = document.getElementById(
                "print-guides-toggle-btn",
            );
            const printGuidesLabel = document.getElementById(
                "print-guides-toggle-label",
            );
            if (printGuidesBtn && cardContainer) {
                printGuidesBtn.addEventListener("click", function () {
                    const guidesActive =
                        !cardContainer.classList.contains(
                            "print-guides-visible",
                        );
                    cardContainer.classList.toggle(
                        "print-guides-visible",
                        guidesActive,
                    );
                    printGuidesBtn.classList.toggle("active", guidesActive);
                    printGuidesBtn.setAttribute(
                        "aria-pressed",
                        String(guidesActive),
                    );
                    if (printGuidesLabel) {
                        printGuidesLabel.textContent = guidesActive
                            ? "Print Guides: ON"
                            : "Print Guides: OFF";
                    }
                });
            }

            // Click on guide badges to open corresponding popover directly
            const guideBadges = document.querySelectorAll(".card-guide-badge");
            guideBadges.forEach((badge) => {
                badge.addEventListener("click", function (e) {
                    e.stopPropagation();
                    const targetSection =
                        badge.getAttribute("data-for") ||
                        (badge.closest && badge.closest(".card-section")
                            ? badge
                                  .closest(".card-section")
                                  .getAttribute("data-section")
                            : null);
                    if (
                        targetSection &&
                        typeof window.showPopover === "function"
                    ) {
                        window.showPopover(targetSection);
                    }
                });
            });

            // Keyboard shortcut: Press F/f to flip card (unless typing in input/textarea)
            document.addEventListener("keydown", function (e) {
                if (e.key === "f" || e.key === "F") {
                    const tag =
                        e.target && e.target.tagName
                            ? e.target.tagName.toLowerCase()
                            : "";
                    if (tag !== "input" && tag !== "textarea") {
                        window.toggleFlip();
                    }
                }
            });
        });
    }
})();
