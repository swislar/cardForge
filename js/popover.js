// Popover Editing System for Card Forge

(function () {
    let activePopover = null;
    let activeSection = null;

    const POPOVER_TITLES = {
        header: "Edit Name, Dice & Closeness",
        image: "Edit Photo & Frame",
        archetype: "Choose Catan Resource & Role",
        effect: "Write Their Card Effect",
        stats: "Edit What They Bring to the Table",
        "back-header": "Edit Card-Back Title & Subtitle",
        "back-letter": "Write Birthday Letter",
        "back-footer": "Edit Sign-off & Deck Number",
    };

    const DEFAULT_BACK_TEXT = {
        backTitle: "Happy Birthday!",
        backSubtitle: "Harvest Day",
        backLetter: "",
        backLetterMode: "handwritten",
        backTradeGive: "one dinner",
        backTradeGet: "your company",
        backSignoff: "With love, [Your name]",
        backDate: "",
    };

    const PHOTO_MAX_DIMENSION = 1200;

    // ------------------------------------------------------------------------
    // Form building blocks
    // ------------------------------------------------------------------------

    function createEl(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    // Appends a labelled field: label, control, then any extra nodes (hints, counters).
    // Returns { field, label }.
    function appendField(container, labelText, control, ...extras) {
        const field = createEl("div", "popover-field");
        const label = createEl("label", "popover-label", labelText);
        if (control.id) label.setAttribute("for", control.id);
        field.appendChild(label);
        field.appendChild(control);
        extras.forEach((extra) => field.appendChild(extra));
        container.appendChild(field);
        return { field, label };
    }

    function createInput({
        id,
        type = "text",
        className = "popover-input",
        maxLength,
        min,
        max,
        step,
        placeholder,
        value,
    }) {
        const input = createEl("input", className);
        input.type = type;
        if (id) input.id = id;
        if (maxLength) input.maxLength = maxLength;
        if (min !== undefined) input.min = String(min);
        if (max !== undefined) input.max = String(max);
        if (step !== undefined) input.step = String(step);
        if (placeholder) input.placeholder = placeholder;
        if (value !== undefined) input.value = value;
        return input;
    }

    // options: array of [value, label] pairs.
    function createSelect({ id, className = "popover-input", options, value }) {
        const select = createEl("select", className);
        if (id) select.id = id;
        options.forEach(([optionValue, text]) => {
            const option = createEl("option", "", text);
            option.value = optionValue;
            select.appendChild(option);
        });
        select.value = value;
        return select;
    }

    function createButton({ id, text, title, onClick }) {
        const button = createEl("button", "popover-small-btn", text);
        button.type = "button";
        if (id) button.id = id;
        if (title) button.title = title;
        button.addEventListener("click", onClick);
        return button;
    }

    // "n / max" character counter; call update() after the input changes.
    function createCounter(input, max) {
        const counter = createEl("div", "char-counter");
        const update = () => {
            counter.textContent = `${input.value.length} / ${max}`;
        };
        update();
        return { counter, update };
    }

    // Sends each edit of the control to a single state key.
    function bindToState(control, key, eventName = "input") {
        control.addEventListener(eventName, function () {
            window.updateState({ [key]: control.value });
        });
    }

    // Text field capped at the card's limit for `key` (window.TEXT_LIMITS), with a
    // "(Max n chars)" label and live counter. Returns the input, its field, and a
    // counter refresh for code that sets the value directly.
    function appendLimitedTextField(
        container,
        { id, key, label, placeholder, value },
    ) {
        const maxLength = window.TEXT_LIMITS[key];
        const input = createInput({ id, maxLength, placeholder, value });
        const counter = createCounter(input, maxLength);
        input.addEventListener("input", function () {
            counter.update();
            window.updateState({ [key]: input.value });
        });
        const { field } = appendField(
            container,
            `${label} (Max ${maxLength} chars)`,
            input,
            counter.counter,
        );
        return { input, field, updateCounter: counter.update };
    }

    // ------------------------------------------------------------------------
    // Popover lifecycle
    // ------------------------------------------------------------------------

    function createPopoverHeader(sectionId) {
        const header = createEl("div", "popover-header");
        const closeBtn = createEl("button", "popover-close-btn");
        closeBtn.setAttribute("type", "button");
        closeBtn.setAttribute("aria-label", "Close editor");
        closeBtn.innerHTML = "&times;";
        closeBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            window.hidePopover();
        });
        header.appendChild(
            createEl(
                "span",
                "popover-title",
                POPOVER_TITLES[sectionId] || "Edit Section",
            ),
        );
        header.appendChild(closeBtn);
        return header;
    }

    // The backdrop dims the page behind the mobile bottom sheet.
    function showBackdrop() {
        let backdrop = document.getElementById("popover-backdrop");
        if (!backdrop && document.body && document.createElement) {
            backdrop = createEl("div", "popover-backdrop");
            backdrop.id = "popover-backdrop";
            backdrop.addEventListener("click", function () {
                window.hidePopover();
            });
            document.body.appendChild(backdrop);
        }
        if (backdrop) {
            backdrop.classList.add("active");
        }
    }

    function getBackdrop() {
        return document.getElementById
            ? document.getElementById("popover-backdrop")
            : null;
    }

    window.showPopover = function (sectionId) {
        window.hidePopover();

        const popoverRoot = document.getElementById("popover-root");
        if (!popoverRoot) return;

        activeSection = sectionId;

        const popover = createEl("div", "popover-card");
        popover.id = "active-popover";
        popover.appendChild(createPopoverHeader(sectionId));

        const body = createEl("div", "popover-body");
        const editors = SECTION_EDITORS[sectionId];
        if (editors) {
            editors.forEach((buildEditor) => buildEditor(body));
        } else {
            body.textContent = "No editor available.";
        }

        popover.appendChild(body);
        popoverRoot.appendChild(popover);
        activePopover = popover;

        showBackdrop();

        positionPopover(sectionId, popover);
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(function () {
                if (activePopover === popover) {
                    positionPopover(sectionId, popover);
                }
            });
        }
    };

    window.hidePopover = function () {
        if (activePopover && activePopover.parentElement) {
            activePopover.parentElement.removeChild(activePopover);
        }
        const backdrop = getBackdrop();
        if (backdrop) {
            backdrop.classList.remove("active");
            backdrop.classList.remove("popover-backdrop--sheet");
        }
        activePopover = null;
        activeSection = null;
    };

    // At large widths, customisation menus appear directly to the RIGHT of the card.
    // At medium and small widths (or whenever horizontal space is insufficient),
    // the menu appears from the bottom up as a bottom sheet.
    function positionPopover(sectionId, popoverEl) {
        const cardEl =
            (window.AppState && window.AppState.isFlipped
                ? document.getElementById("card-back")
                : document.getElementById("card-front") ||
                  document.getElementById("card")) ||
            document.getElementById("card");
        const targetSection =
            document.getElementById(`card-${sectionId}`) || cardEl;
        if (!cardEl || !targetSection) return;

        const cardRect = cardEl.getBoundingClientRect();
        const scrollY =
            window.pageYOffset ||
            (document.documentElement
                ? document.documentElement.scrollTop
                : 0) ||
            0;
        const scrollX =
            window.pageXOffset ||
            (document.documentElement
                ? document.documentElement.scrollLeft
                : 0) ||
            0;

        const popoverWidth = popoverEl.offsetWidth || 330;
        const popoverHeight = popoverEl.offsetHeight || 420;
        const gap = 18;

        const rightBoundary = cardRect.right + gap + popoverWidth;
        const maxAllowedRight = (window.innerWidth || 1024) + scrollX - 12;
        const isBottomSheet =
            window.innerWidth <= 1024 || rightBoundary > maxAllowedRight;
        const backdrop = getBackdrop();

        if (isBottomSheet) {
            popoverEl.classList.add("popover-card--sheet");
            popoverEl.style.top = "";
            popoverEl.style.left = "";
            popoverEl.style.right = "";
            popoverEl.style.bottom = "";
            if (backdrop) {
                backdrop.classList.add("active");
                backdrop.classList.add("popover-backdrop--sheet");
            }
            return;
        }

        popoverEl.classList.remove("popover-card--sheet");
        if (backdrop) {
            backdrop.classList.remove("popover-backdrop--sheet");
        }

        const left = cardRect.right + gap + scrollX;

        // Align with the target section, clamped within the card's vertical extent.
        const cardTop = cardRect.top + scrollY;
        const cardBottom = cardRect.bottom + scrollY;
        const cardHeight = cardBottom - cardTop;

        const secRect = targetSection.getBoundingClientRect
            ? targetSection.getBoundingClientRect()
            : cardRect;
        let targetTop = secRect.top + scrollY - 12;

        if (popoverHeight <= cardHeight) {
            if (targetTop < cardTop) {
                targetTop = cardTop;
            } else if (targetTop + popoverHeight > cardBottom) {
                targetTop = cardBottom - popoverHeight;
            }
        } else {
            targetTop = cardTop;
        }

        if (targetTop < 10 + scrollY) {
            targetTop = 10 + scrollY;
        }

        popoverEl.style.left = `${Math.round(left)}px`;
        popoverEl.style.top = `${Math.round(targetTop)}px`;
    }

    // ------------------------------------------------------------------------
    // Front-face editors
    // ------------------------------------------------------------------------

    function buildHeaderEditor(container) {
        const state = window.AppState;

        appendLimitedTextField(container, {
            id: "friend-name-input",
            key: "title",
            label: "Friend's Name / Nickname",
            value: state.title,
        });

        const diceNumbers = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map((number) => [
            String(number),
            String(number),
        ]);
        const diceSelect = createSelect({
            id: "dice-number-select",
            options: diceNumbers,
            value: String(state.diceNumber || 8),
        });
        diceSelect.addEventListener("change", function () {
            window.updateState({ diceNumber: parseInt(diceSelect.value, 10) });
        });
        const diceHint = createEl(
            "p",
            "popover-hint",
            "7 is the robber — no robbers in this friendship. 6 and 8 are the red, luckiest numbers.",
        );
        appendField(
            container,
            "Dice Number Token (2–6 or 8–12)",
            diceSelect,
            diceHint,
        );

        const closenessInput = createInput({
            id: "closeness-input",
            type: "number",
            min: 1,
            max: 10,
            value: state.closeness,
        });
        bindToState(closenessInput, "closeness");
        const closenessHint = createEl(
            "p",
            "popover-hint",
            "10 VP wins the game — 10 means you are as close as it gets.",
        );
        appendField(
            container,
            "Victory points: how close you are (1–10)",
            closenessInput,
            closenessHint,
        );
    }

    function buildEffectEditor(container) {
        appendLimitedTextField(container, {
            id: "card-effect-input",
            key: "cardEffect",
            label: "What happens when they show up?",
            placeholder: "When played: the whole table laughs.",
            value: window.AppState.cardEffect || "",
        });
    }

    function buildArchetypeEditor(container) {
        const state = window.AppState;

        const resourceSelect = createSelect({
            id: "catan-resource-select",
            options: (window.CATAN_RESOURCES || []).map((resource) => [
                resource.id,
                `${resource.icon} ${resource.name} — ${resource.meaning}`,
            ]),
            value: state.resourceId || "wool",
        });
        bindToState(resourceSelect, "resourceId", "change");
        appendField(
            container,
            "Resource colour — what they are to you",
            resourceSelect,
        );

        const roleSelect = createSelect({
            id: "catan-role-select",
            options: (window.CATAN_DEVELOPMENT_ROLES || []).map((role) => [
                role.id,
                `${role.name}: ${role.epithet}`,
            ]),
            value: state.developmentRoleId || "knight",
        });
        bindToState(roleSelect, "developmentRoleId", "change");
        appendField(
            container,
            "Development-card role — their place in the group",
            roleSelect,
        );
    }

    function buildStatsEditor(container) {
        container.appendChild(
            createEl(
                "p",
                "popover-hint",
                `What do they bring to the table? Rate each trait (1–10, names up to ${window.TEXT_LIMITS.statName} chars):`,
            ),
        );

        window.AppState.stats.forEach((stat, idx) => {
            const row = createEl("div", "stat-edit-row");
            const labelInput = createInput({
                className: "popover-input stat-edit-label",
                maxLength: window.TEXT_LIMITS.statName,
                value: stat.name,
            });
            const slider = createInput({
                type: "range",
                className: "stat-edit-slider",
                min: 1,
                max: 10,
                value: stat.value,
            });
            const valueDisplay = createEl("span", "stat-edit-val", stat.value);

            function updateThisStat() {
                const newStats = [...window.AppState.stats];
                newStats[idx] = {
                    name: labelInput.value || `Stat ${idx + 1}`,
                    value: Math.max(
                        1,
                        Math.min(10, parseInt(slider.value, 10) || 1),
                    ),
                };
                valueDisplay.textContent = slider.value;
                window.updateState({ stats: newStats });
            }

            labelInput.addEventListener("input", updateThisStat);
            slider.addEventListener("input", updateThisStat);

            row.appendChild(labelInput);
            row.appendChild(slider);
            row.appendChild(valueDisplay);
            container.appendChild(row);
        });
    }

    // Collectible deck details, shown with the back-face sign-off.
    function buildFooterEditor(container) {
        const state = window.AppState;
        [
            {
                key: "cardNumber",
                label: "Card number",
                id: "card-number-input",
            },
            {
                key: "deckSize",
                label: "Cards in this deck",
                id: "deck-size-input",
            },
        ].forEach(({ key, label, id }) => {
            const input = createInput({
                id,
                type: "number",
                min: 1,
                value: state[key],
            });
            bindToState(input, key);
            appendField(container, label, input);
        });
    }

    // ------------------------------------------------------------------------
    // Photo editor
    // ------------------------------------------------------------------------

    // Offset limits for the photo at a given zoom, measured against the live frame.
    function getPhotoBounds(scale) {
        const frame = document.getElementById("card-image-frame");
        const frameW = (frame && frame.clientWidth) || 326;
        const frameH = (frame && frame.clientHeight) || 215;
        const photoEl = document.getElementById("card-photo");
        const aspect =
            window.AppState.photoAspect ||
            (photoEl && photoEl.naturalWidth
                ? photoEl.naturalWidth / photoEl.naturalHeight
                : frameW / frameH);
        return window.computePhotoCoverDimensions(
            aspect,
            scale,
            frameW,
            frameH,
        );
    }

    function clampOffset(value, maxOffset) {
        return Math.max(-maxOffset, Math.min(maxOffset, value));
    }

    // Downscales large uploads so the data URL stays small enough to keep editing smooth.
    function loadResizedPhoto(file) {
        if (!file || !file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                let w = img.width;
                let h = img.height;
                if (w > PHOTO_MAX_DIMENSION || h > PHOTO_MAX_DIMENSION) {
                    if (w > h) {
                        h = Math.round((h * PHOTO_MAX_DIMENSION) / w);
                        w = PHOTO_MAX_DIMENSION;
                    } else {
                        w = Math.round((w * PHOTO_MAX_DIMENSION) / h);
                        h = PHOTO_MAX_DIMENSION;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                canvas.getContext("2d").drawImage(img, 0, 0, w, h);

                window.updateState({
                    photoDataUrl: canvas.toDataURL("image/jpeg", 0.9),
                    photoAspect: w / h,
                    photoOffsetX: 0,
                    photoOffsetY: 0,
                    photoScale: 1,
                });
                window.hidePopover();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function appendPhotoDropzone(container) {
        const dropZone = createEl("div", "photo-dropzone");
        dropZone.innerHTML = `
      <div class="dropzone-content">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span>Click or Drag photo here</span>
        <span class="subtext">JPG, PNG, WebP (auto-resized)</span>
      </div>
    `;

        const fileInput = createInput({
            type: "file",
            className: "photo-file-input",
        });
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        dropZone.appendChild(fileInput);

        dropZone.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                loadResizedPhoto(e.target.files[0]);
            }
        });
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("drag-over");
        });
        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("drag-over");
        });
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("drag-over");
            if (
                e.dataTransfer &&
                e.dataTransfer.files &&
                e.dataTransfer.files[0]
            ) {
                loadResizedPhoto(e.dataTransfer.files[0]);
            }
        });

        container.appendChild(dropZone);
    }

    function appendFrameSelect(container) {
        const frameSelect = createSelect({
            className: "popover-select",
            options: window.FRAME_STYLES.map((style) => [
                style.id,
                style.label,
            ]),
            value: window.AppState.frameStyle,
        });
        bindToState(frameSelect, "frameStyle", "change");
        appendField(container, "Photo Border:", frameSelect);
    }

    function appendZoomControls(container) {
        const zoomLabel = (scale) =>
            `Photo Zoom (${Math.round(scale * 100)}%):`;
        const scaleSlider = createInput({
            type: "range",
            className: "stat-edit-slider",
            min: 1,
            max: 3,
            step: 0.05,
            value: Math.max(1, window.AppState.photoScale || 1),
        });
        const scaleLabel = appendField(
            container,
            zoomLabel(window.AppState.photoScale || 1),
            scaleSlider,
        ).label;
        const setZoomLabel = (scale) => {
            scaleLabel.textContent = zoomLabel(scale);
        };

        scaleSlider.addEventListener("input", () => {
            const scale = Math.max(1, parseFloat(scaleSlider.value));
            setZoomLabel(scale);
            const dims = getPhotoBounds(scale);
            window.updateState({
                photoScale: scale,
                photoOffsetX: clampOffset(
                    window.AppState.photoOffsetX || 0,
                    dims.maxOffsetX,
                ),
                photoOffsetY: clampOffset(
                    window.AppState.photoOffsetY || 0,
                    dims.maxOffsetY,
                ),
            });
        });

        const actionsRow = createEl("div", "photo-actions-row");
        actionsRow.appendChild(
            createEl(
                "span",
                "photo-drag-hint",
                "💡 Drag photo on card to reposition",
            ),
        );
        actionsRow.appendChild(
            createButton({
                text: "Reset Position",
                onClick: () => {
                    scaleSlider.value = 1;
                    setZoomLabel(1);
                    window.updateState({
                        photoOffsetX: 0,
                        photoOffsetY: 0,
                        photoScale: 1,
                    });
                },
            }),
        );
        container.appendChild(actionsRow);
    }

    function buildImageEditor(container) {
        appendPhotoDropzone(container);
        appendFrameSelect(container);
        appendZoomControls(container);
    }

    // ------------------------------------------------------------------------
    // Back-face editors
    // ------------------------------------------------------------------------

    function buildBackHeaderEditor(container) {
        const state = window.AppState;

        const title = appendLimitedTextField(container, {
            id: "back-title-input",
            key: "backTitle",
            label: "Card Back Title / Occasion",
            placeholder: "e.g. Happy Birthday!",
            value:
                state.backTitle !== undefined
                    ? state.backTitle
                    : DEFAULT_BACK_TEXT.backTitle,
        });
        const titleInput = title.input;

        const subtitle = appendLimitedTextField(container, {
            id: "back-subtitle-input",
            key: "backSubtitle",
            label: "Small subtitle / turn count",
            placeholder: "e.g. Harvest Day or Turn 30",
            value: state.backSubtitle || "",
        });
        const subtitleInput = subtitle.input;
        subtitle.field.style.marginTop = "10px";

        // Quick actions for printing the back blank and writing it by hand.
        const blankActions = createEl("div", "back-blank-actions");
        blankActions.style.marginTop = "14px";
        blankActions.style.display = "flex";
        blankActions.style.flexDirection = "column";
        blankActions.style.gap = "6px";

        blankActions.appendChild(
            createButton({
                id: "clear-back-text-btn",
                text: "✍️ Clear All Text (Blank to Handwrite & Sign)",
                title: "Remove all digital text on the back so you can print it blank and write your message by hand",
                onClick: () => {
                    titleInput.value = "";
                    subtitleInput.value = "";
                    title.updateCounter();
                    subtitle.updateCounter();
                    window.updateState({
                        backTitle: "",
                        backSubtitle: "",
                        backLetter: "",
                        backLetterMode: "handwritten",
                        backSignoff: "",
                        backDate: "",
                    });
                },
            }),
        );
        blankActions.appendChild(
            createButton({
                id: "restore-back-text-btn",
                text: "Restore Default Birthday Text",
                onClick: () => {
                    titleInput.value = DEFAULT_BACK_TEXT.backTitle;
                    subtitleInput.value = DEFAULT_BACK_TEXT.backSubtitle;
                    title.updateCounter();
                    subtitle.updateCounter();
                    window.updateState({ ...DEFAULT_BACK_TEXT });
                },
            }),
        );
        container.appendChild(blankActions);
    }

    function buildBackLetterEditor(container) {
        const state = window.AppState;

        const modeSelect = createSelect({
            id: "back-letter-mode",
            options: [
                ["handwritten", "Handwritten — leave ruled space"],
                ["typed", "Typed — 8 pt print text"],
            ],
            value: state.backLetterMode || "handwritten",
        });
        bindToState(modeSelect, "backLetterMode", "change");
        appendField(container, "Message format:", modeSelect);

        const letterMaxLength = window.TEXT_LIMITS.backLetter;
        const textarea = createEl("textarea", "popover-textarea");
        textarea.id = "back-letter-input";
        textarea.rows = 10;
        textarea.maxLength = letterMaxLength;
        textarea.placeholder =
            "Typed mode: about 33 characters per line, up to 11 lines.";
        textarea.value =
            typeof state.backLetter === "string"
                ? state.backLetter.slice(0, letterMaxLength)
                : "";

        const letterCounter = createCounter(textarea, letterMaxLength);
        letterCounter.counter.id = "back-letter-counter";
        letterCounter.counter.setAttribute("aria-live", "polite");

        // Typing a message switches the panel to typed mode.
        textarea.addEventListener("input", function () {
            modeSelect.value = "typed";
            letterCounter.update();
            window.updateState({
                backLetter: textarea.value,
                backLetterMode: "typed",
            });
        });
        appendField(
            container,
            `Personal Birthday Message (Max ${letterMaxLength} chars):`,
            textarea,
            letterCounter.counter,
        );

        const letterActions = createEl("div", "back-letter-actions");
        letterActions.style.display = "flex";
        letterActions.style.justifyContent = "space-between";
        letterActions.style.alignItems = "center";
        letterActions.style.marginTop = "8px";
        letterActions.appendChild(
            createButton({
                id: "clear-back-letter-btn",
                text: "✍️ Clear Text (Print Blank)",
                title: "Leave the body area blank for a handwritten letter",
                onClick: () => {
                    textarea.value = "";
                    modeSelect.value = "handwritten";
                    letterCounter.update();
                    window.updateState({
                        backLetter: "",
                        backLetterMode: "handwritten",
                    });
                },
            }),
        );
        container.appendChild(letterActions);

        [
            ["back-trade-give-input", "I give", "backTradeGive"],
            ["back-trade-get-input", "You give", "backTradeGet"],
        ].forEach(([id, label, key]) => {
            appendLimitedTextField(container, {
                id,
                key,
                label,
                value: state[key] || "",
            }).field.style.marginTop = "10px";
        });
    }

    function buildBackFooterEditor(container) {
        const signoff = appendLimitedTextField(container, {
            id: "back-signoff-input",
            key: "backSignoff",
            label: "Sign-off Signature",
            placeholder: "e.g. With love, Maya",
            value:
                window.AppState.backSignoff !== undefined
                    ? window.AppState.backSignoff
                    : "",
        });
        const signoffInput = signoff.input;

        const footerActions = createEl("div");
        footerActions.style.marginTop = "8px";
        footerActions.appendChild(
            createButton({
                id: "clear-back-footer-btn",
                text: "✍️ Clear Sign-off (Sign in Person)",
                title: "Leave the sign-off blank to sign by hand after printing",
                onClick: () => {
                    signoffInput.value = "";
                    signoff.updateCounter();
                    window.updateState({ backSignoff: "" });
                },
            }),
        );
        container.appendChild(footerActions);
    }

    const SECTION_EDITORS = {
        header: [buildHeaderEditor],
        image: [buildImageEditor],
        archetype: [buildArchetypeEditor],
        effect: [buildEffectEditor],
        stats: [buildStatsEditor],
        "back-header": [buildBackHeaderEditor],
        "back-letter": [buildBackLetterEditor],
        "back-footer": [buildBackFooterEditor, buildFooterEditor],
    };

    // ------------------------------------------------------------------------
    // Photo Drag-to-Reposition (Mouse + Touch)
    // ------------------------------------------------------------------------

    const SNAP_THRESHOLD = 14;

    // Snaps an offset to either edge or the centre when it is within the threshold.
    function snapOffset(value, maxOffset) {
        if (Math.abs(value - maxOffset) < SNAP_THRESHOLD) return maxOffset;
        if (Math.abs(value + maxOffset) < SNAP_THRESHOLD) return -maxOffset;
        if (Math.abs(value) < SNAP_THRESHOLD) return 0;
        return value;
    }

    function setupPhotoDrag() {
        const frame = document.getElementById("card-image-frame");
        if (!frame) return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialOffsetX = 0;
        let initialOffsetY = 0;

        function onPointerDown(clientX, clientY) {
            if (!window.AppState.photoDataUrl) return;
            isDragging = true;
            startX = clientX;
            startY = clientY;
            initialOffsetX = window.AppState.photoOffsetX || 0;
            initialOffsetY = window.AppState.photoOffsetY || 0;
            frame.style.cursor = "grabbing";
        }

        function onPointerMove(clientX, clientY) {
            if (!isDragging) return;
            const dims = getPhotoBounds(
                Math.max(1, window.AppState.photoScale || 1),
            );
            // Clamp so the photo never exposes the empty frame background.
            const targetX = clampOffset(
                snapOffset(initialOffsetX + clientX - startX, dims.maxOffsetX),
                dims.maxOffsetX,
            );
            const targetY = clampOffset(
                snapOffset(initialOffsetY + clientY - startY, dims.maxOffsetY),
                dims.maxOffsetY,
            );
            window.updateState({
                photoOffsetX: Math.round(targetX),
                photoOffsetY: Math.round(targetY),
            });
        }

        function onPointerUp() {
            if (isDragging) {
                isDragging = false;
                frame.style.cursor = "";
            }
        }

        frame.addEventListener("mousedown", function (e) {
            if (e.button === 0) {
                onPointerDown(e.clientX, e.clientY);
                e.preventDefault();
            }
        });
        window.addEventListener("mousemove", function (e) {
            onPointerMove(e.clientX, e.clientY);
        });
        window.addEventListener("mouseup", onPointerUp);

        frame.addEventListener(
            "touchstart",
            function (e) {
                if (e.touches && e.touches.length === 1) {
                    onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
                }
            },
            { passive: true },
        );
        window.addEventListener(
            "touchmove",
            function (e) {
                if (isDragging && e.touches && e.touches.length === 1) {
                    onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            },
            { passive: true },
        );
        window.addEventListener("touchend", onPointerUp);
    }

    // ------------------------------------------------------------------------
    // Section Click Wiring & Global Dismissals
    // ------------------------------------------------------------------------
    function setupInteractions() {
        document.querySelectorAll(".card-section").forEach((sec) => {
            sec.addEventListener("click", function (e) {
                const secId = sec.getAttribute("data-section");
                if (secId) {
                    e.stopPropagation();
                    window.showPopover(secId);
                }
            });
        });

        const backdrop = document.getElementById("popover-backdrop");
        if (backdrop) {
            backdrop.addEventListener("click", function () {
                window.hidePopover();
            });
        }

        document.addEventListener("click", function (e) {
            if (!activePopover) return;
            const isInsidePopover = activePopover.contains(e.target);
            const isInsideSection =
                e.target.closest && e.target.closest(".card-section");
            if (!isInsidePopover && !isInsideSection) {
                window.hidePopover();
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                window.hidePopover();
            }
        });

        window.addEventListener("resize", function () {
            if (activePopover && activeSection) {
                positionPopover(activeSection, activePopover);
            }
        });

        setupPhotoDrag();
    }

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", setupInteractions);
        } else {
            setupInteractions();
        }
    }
})();
