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
        "action-header": "Edit Their Name",
        "action-symbol": "Choose Their Symbol",
        "action-effect": "Write What Playing Them Does",
        "action-cost": "Set Their Build Cost",
        "action-back-header": "Edit Card-Back Title & Subtitle",
        "action-back-letter": "Write Your Message",
        "action-back-footer": "Edit Sign-off & Deck Number",
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

    // Large enough to stay at 300 dpi or better in the photo frame with room
    // to zoom and crop.
    const PHOTO_MAX_DIMENSION = 2000;

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

    // Keeps only as much of the latest edit as fits on the card, so typed or
    // pasted text can never overflow its box. Deleting is always allowed; text
    // already in the field is never dropped to make room.
    function keepFittingText(control, previous, key) {
        const next = control.value;
        if (window.measureCardText(key, next).use <= 1) return next;

        let start = 0;
        while (
            start < previous.length &&
            start < next.length &&
            previous[start] === next[start]
        )
            start += 1;
        let end = 0;
        while (
            end < previous.length - start &&
            end < next.length - start &&
            previous[previous.length - 1 - end] === next[next.length - 1 - end]
        )
            end += 1;
        const head = next.slice(0, start);
        const inserted = next.slice(start, next.length - end);
        const tail = next.slice(next.length - end);

        // Longest start of the inserted text that still fits.
        let low = 0;
        let high = inserted.length;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const candidate = head + inserted.slice(0, mid) + tail;
            if (window.measureCardText(key, candidate).use <= 1) low = mid;
            else high = mid - 1;
        }
        control.value = head + inserted.slice(0, low) + tail;
        const caret = start + low;
        if (typeof control.setSelectionRange === "function") {
            control.setSelectionRange(caret, caret);
        }
        return control.value;
    }

    // Limits `control` to what fits in the `key` field on the card and shows how
    // much space is used. Calls onAccept(text) after each edit. Call refresh()
    // after setting control.value in code.
    function attachCardFit(control, key, onAccept) {
        const meter = createEl("div", "char-counter");
        meter.setAttribute("aria-live", "polite");
        let accepted = control.value;

        const refresh = () => {
            accepted = control.value;
            const fit = window.measureCardText(key, control.value);
            const isFull = fit.use >= 0.97;
            meter.classList.toggle("char-counter--full", isFull);
            if (isFull) {
                meter.textContent = "Full: no more room on the card";
            } else {
                meter.textContent =
                    `${Math.round(fit.use * 100)}% of space used` +
                    (fit.shrinks ? " · text shrinks slightly to fit" : "");
            }
        };

        control.addEventListener("input", function () {
            keepFittingText(control, accepted, key);
            refresh();
            onAccept(control.value);
        });
        refresh();
        return { meter, refresh };
    }

    // Sends each edit of the control to a single state key.
    function bindToState(control, key, eventName = "input") {
        control.addEventListener(eventName, function () {
            window.updateState({ [key]: control.value });
        });
    }

    // Text field limited to the space its `key` field has on the card, with a
    // live "space used" meter. Returns the input, its field, and a meter
    // refresh for code that sets the value directly.
    function appendLimitedTextField(
        container,
        { id, key, label, placeholder, value },
    ) {
        const input = createInput({
            id,
            maxLength: window.TEXT_LIMITS[key],
            placeholder,
            value,
        });
        const fit = attachCardFit(input, key, (text) =>
            window.updateState({ [key]: text }),
        );
        const { field } = appendField(container, label, input, fit.meter);
        return { input, field, updateCounter: fit.refresh };
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
        const faces = window.getActiveFaces();
        const cardEl =
            (window.AppState && window.AppState.isFlipped
                ? faces.back
                : faces.front) || document.getElementById("card");
        const targetSection =
            (cardEl &&
                cardEl.querySelector(`[data-section="${sectionId}"]`)) ||
            cardEl;
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
            "How often you see each other. 6 and 8 roll the most (you see them all the time); 2 and 12 the least (rarely, but it counts). 7 is the robber, so no robbers in this friendship.",
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
            "1 = just getting to know each other, 10 = as close as it gets. 10 VP wins the game.",
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
                `What do they bring to the table? Tick the ${window.SHOWN_STAT_COUNT} traits to show on the card and rate them (1–10). Names stop when the card runs out of room:`,
            ),
        );
        const pickStatus = createEl("p", "popover-hint stat-pick-status");
        pickStatus.setAttribute("aria-live", "polite");
        container.appendChild(pickStatus);

        const toggles = [];
        // The card only changes once exactly SHOWN_STAT_COUNT traits are ticked.
        function syncShownStats() {
            const picked = toggles
                .map((toggle, idx) => (toggle.checked ? idx : -1))
                .filter((idx) => idx !== -1);
            const remaining = window.SHOWN_STAT_COUNT - picked.length;
            toggles.forEach((toggle) => {
                toggle.disabled = !toggle.checked && remaining <= 0;
                toggle
                    .closest(".stat-edit-row")
                    .classList.toggle("is-unshown", !toggle.checked);
            });
            pickStatus.textContent =
                remaining > 0
                    ? `Pick ${remaining} more trait${remaining === 1 ? "" : "s"} to update the card.`
                    : `${picked.length} of ${toggles.length} traits shown on the card.`;
            if (remaining === 0) {
                window.updateState({ shownStats: picked });
            }
        }

        const shownStats = window.AppState.shownStats || [];
        window.AppState.stats.forEach((stat, idx) => {
            const row = createEl("div", "stat-edit-row");
            const toggle = createInput({
                type: "checkbox",
                className: "stat-edit-toggle",
            });
            toggle.checked = shownStats.includes(idx);
            toggle.setAttribute("aria-label", `Show ${stat.name} on the card`);
            toggle.addEventListener("change", syncShownStats);
            toggles.push(toggle);
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

            attachCardFit(labelInput, "statName", updateThisStat);
            slider.addEventListener("input", updateThisStat);

            row.appendChild(toggle);
            row.appendChild(labelInput);
            row.appendChild(slider);
            row.appendChild(valueDisplay);
            container.appendChild(row);
        });
        syncShownStats();
    }

    // ------------------------------------------------------------------------
    // Photo editor
    // ------------------------------------------------------------------------

    // Offset limits for the photo at a given zoom, measured against the live
    // frame. `slot` is one of window.PHOTO_SLOTS.
    function getPhotoBounds(scale, slot) {
        const frame = document.getElementById(slot.frameId);
        const frameW = (frame && frame.clientWidth) || 326;
        const frameH = (frame && frame.clientHeight) || 215;
        const photoEl = document.getElementById(slot.photoId);
        const aspect =
            window.AppState[slot.aspect] ||
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
    function loadResizedPhoto(file, slot) {
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
                    [slot.url]: canvas.toDataURL("image/jpeg", 0.9),
                    [slot.aspect]: w / h,
                    [slot.offsetX]: 0,
                    [slot.offsetY]: 0,
                    [slot.scale]: 1,
                    // Uploading on the action card shows the photo instead of the symbol.
                    ...(slot.modeKey ? { [slot.modeKey]: "photo" } : {}),
                });
                // Keep the editor open (rebuilt with zoom controls) when the
                // photo will print below 300 dpi, so the warning is seen now.
                const dpi = window.estimatePhotoPrintDpi(slot, w, h, 1);
                if (dpi !== null && dpi < 300 && activeSection) {
                    window.showPopover(activeSection);
                } else {
                    window.hidePopover();
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function appendPhotoDropzone(container, slot) {
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
                loadResizedPhoto(e.target.files[0], slot);
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
                loadResizedPhoto(e.dataTransfer.files[0], slot);
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

    function appendZoomControls(container, slot) {
        const state = window.AppState;
        const zoomLabel = (scale) =>
            `Photo Zoom (${Math.round(scale * 100)}%):`;
        const scaleSlider = createInput({
            type: "range",
            className: "stat-edit-slider",
            min: 1,
            max: 3,
            step: 0.05,
            value: Math.max(1, state[slot.scale] || 1),
        });
        const scaleLabel = appendField(
            container,
            zoomLabel(state[slot.scale] || 1),
            scaleSlider,
        ).label;
        const setZoomLabel = (scale) => {
            scaleLabel.textContent = zoomLabel(scale);
        };

        // Filled in here (the editor is not on the page yet) and then kept up
        // to date on every render as the zoom changes (see js/card.js).
        const qualityNote = createEl("p", "popover-hint photo-quality-note");
        qualityNote.setAttribute("data-slot", slot === window.PHOTO_SLOTS.action ? "action" : "friend");
        qualityNote.setAttribute("role", "status");
        qualityNote.hidden = true;
        container.appendChild(qualityNote);
        const photoEl = document.getElementById(slot.photoId);
        const showsPhoto =
            state[slot.url] &&
            (!slot.modeKey || state[slot.modeKey] === "photo") &&
            photoEl &&
            photoEl.complete &&
            photoEl.getAttribute("src") === state[slot.url];
        window.setPhotoQualityNote(
            qualityNote,
            showsPhoto
                ? window.estimatePhotoPrintDpi(
                      slot,
                      photoEl.naturalWidth,
                      photoEl.naturalHeight,
                      state[slot.scale],
                  )
                : null,
        );

        scaleSlider.addEventListener("input", () => {
            const scale = Math.max(1, parseFloat(scaleSlider.value));
            setZoomLabel(scale);
            const dims = getPhotoBounds(scale, slot);
            window.updateState({
                [slot.scale]: scale,
                [slot.offsetX]: clampOffset(
                    window.AppState[slot.offsetX] || 0,
                    dims.maxOffsetX,
                ),
                [slot.offsetY]: clampOffset(
                    window.AppState[slot.offsetY] || 0,
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
                        [slot.offsetX]: 0,
                        [slot.offsetY]: 0,
                        [slot.scale]: 1,
                    });
                },
            }),
        );
        container.appendChild(actionsRow);
    }

    function buildImageEditor(container) {
        const slot = window.PHOTO_SLOTS.friend;
        appendPhotoDropzone(container, slot);
        appendFrameSelect(container);
        appendZoomControls(container, slot);
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
                ["typed", "Typed — 8 pt print text (down to 6 pt if long)"],
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
            "Typed mode: write until the meter says the card is full.";
        textarea.value =
            typeof state.backLetter === "string"
                ? state.backLetter.slice(0, letterMaxLength)
                : "";

        // Typing a message switches the panel to typed mode.
        const letterFit = attachCardFit(textarea, "backLetter", (text) => {
            modeSelect.value = "typed";
            window.updateState({
                backLetter: text,
                backLetterMode: "typed",
            });
        });
        letterFit.meter.id = "back-letter-counter";
        appendField(
            container,
            "Personal Birthday Message:",
            textarea,
            letterFit.meter,
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
                    letterFit.refresh();
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

    // ------------------------------------------------------------------------
    // Action card editors (acquaintances and colleagues)
    // ------------------------------------------------------------------------

    function buildActionHeaderEditor(container) {
        appendLimitedTextField(container, {
            id: "action-title-input",
            key: "actionTitle",
            label: "Their name",
            placeholder: "e.g. Sam from Finance",
            value: window.AppState.actionTitle || "",
        });
    }

    function buildActionSymbolEditor(container) {
        const state = window.AppState;
        const slot = window.PHOTO_SLOTS.action;

        container.appendChild(
            createEl(
                "p",
                "popover-hint",
                "Pick the symbol that reminds you of them. Picking one also resets the ribbon text.",
            ),
        );
        const grid = createEl("div", "emblem-picker");
        grid.setAttribute("role", "group");
        grid.setAttribute("aria-label", "Symbols");
        container.appendChild(grid);

        const label = appendLimitedTextField(container, {
            id: "action-label-input",
            key: "actionLabel",
            label: "Ribbon text",
            value: state.actionLabel || "",
        });
        label.field.style.marginTop = "10px";

        const pictureSelect = createSelect({
            id: "action-picture-mode",
            options: [
                ["emblem", "Symbol"],
                ["photo", "Uploaded photo"],
            ],
            value: state.actionImageMode || "emblem",
        });
        pictureSelect.querySelector('option[value="photo"]').disabled =
            !state[slot.url];
        bindToState(pictureSelect, "actionImageMode", "change");
        appendField(
            container,
            "Show on the card:",
            pictureSelect,
            createEl(
                "p",
                "popover-hint",
                "Upload a photo below to use it instead of the symbol.",
            ),
        );

        const buttons = (window.ACTION_EMBLEMS || []).map((emblem) => {
            const button = createEl("button", "emblem-option");
            button.type = "button";
            button.title = `${emblem.name}: ${emblem.meaning}`;
            const icon = createEl("span", "emblem-option-icon");
            window.renderEmblemSvg(icon, emblem);
            button.appendChild(icon);
            button.appendChild(createEl("span", "emblem-option-name", emblem.name));
            button.addEventListener("click", () => {
                const text = window.defaultEmblemLabel(emblem);
                window.updateState({
                    actionEmblemId: emblem.id,
                    actionImageMode: "emblem",
                    actionLabel: text,
                });
                label.input.value = text;
                label.updateCounter();
                pictureSelect.value = "emblem";
                syncPressed();
            });
            grid.appendChild(button);
            return { button, id: emblem.id };
        });
        function syncPressed() {
            buttons.forEach(({ button, id }) => {
                button.setAttribute(
                    "aria-pressed",
                    String(window.AppState.actionEmblemId === id),
                );
            });
        }
        syncPressed();

        appendPhotoDropzone(container, slot);
        if (state[slot.url]) appendZoomControls(container, slot);
        appendFrameSelect(container);
    }

    function buildActionEffectEditor(container) {
        const textarea = createEl("textarea", "popover-textarea");
        textarea.id = "action-effect-input";
        textarea.rows = 3;
        textarea.maxLength = window.TEXT_LIMITS.actionEffect;
        textarea.placeholder = "e.g. Play anytime: everyone gets a coffee.";
        textarea.value = window.AppState.actionEffect || "";
        const fit = attachCardFit(textarea, "actionEffect", (text) =>
            window.updateState({ actionEffect: text }),
        );
        appendField(
            container,
            "What happens when you play them?",
            textarea,
            fit.meter,
        );
    }

    // Optional "price" line under the traits, like a development card's cost.
    function buildActionCostEditor(container) {
        appendLimitedTextField(container, {
            id: "action-cost-input",
            key: "actionCost",
            label: "What does it cost to play them? (leave blank to hide)",
            placeholder: "e.g. 1 Coffee + 1 Laugh + 1 Idea",
            value: window.AppState.actionCost || "",
        });
    }

    function buildActionBackHeaderEditor(container) {
        const state = window.AppState;
        const title = appendLimitedTextField(container, {
            id: "action-back-title-input",
            key: "actionBackTitle",
            label: "Card Back Title / Occasion",
            placeholder: "e.g. Happy Birthday!",
            value: state.actionBackTitle || "",
        });
        const subtitle = appendLimitedTextField(container, {
            id: "action-back-subtitle-input",
            key: "actionBackSubtitle",
            label: "Small subtitle",
            placeholder: "e.g. Harvest Day",
            value: state.actionBackSubtitle || "",
        });
        subtitle.field.style.marginTop = "10px";

        const actions = createEl("div");
        actions.style.marginTop = "14px";
        actions.appendChild(
            createButton({
                text: "Clear All Text (Blank to Handwrite & Sign)",
                title: "Remove all digital text on the back so you can write it by hand",
                onClick: () => {
                    title.input.value = "";
                    subtitle.input.value = "";
                    title.updateCounter();
                    subtitle.updateCounter();
                    window.updateState({
                        actionBackTitle: "",
                        actionBackSubtitle: "",
                        actionMessage: "",
                        actionMessageMode: "handwritten",
                        actionSignoff: "",
                    });
                },
            }),
        );
        container.appendChild(actions);
    }

    function buildActionMessageEditor(container) {
        const state = window.AppState;
        const modeSelect = createSelect({
            id: "action-message-mode",
            options: [
                ["handwritten", "Handwritten — leave ruled space"],
                ["typed", "Typed — 8 pt print text (down to 6 pt if long)"],
            ],
            value: state.actionMessageMode || "handwritten",
        });
        bindToState(modeSelect, "actionMessageMode", "change");
        appendField(container, "Message format:", modeSelect);

        const textarea = createEl("textarea", "popover-textarea");
        textarea.id = "action-message-input";
        textarea.rows = 10;
        textarea.maxLength = window.TEXT_LIMITS.actionMessage;
        textarea.placeholder =
            "Typed mode: write until the meter says the card is full.";
        textarea.value = state.actionMessage || "";
        // Typing a message switches the panel to typed mode.
        const fit = attachCardFit(textarea, "actionMessage", (text) => {
            modeSelect.value = "typed";
            window.updateState({
                actionMessage: text,
                actionMessageMode: "typed",
            });
        });
        appendField(container, "Your message:", textarea, fit.meter);

        const actions = createEl("div");
        actions.style.marginTop = "8px";
        actions.appendChild(
            createButton({
                text: "Clear Text (Print Blank)",
                title: "Leave the body blank for a handwritten message",
                onClick: () => {
                    textarea.value = "";
                    modeSelect.value = "handwritten";
                    fit.refresh();
                    window.updateState({
                        actionMessage: "",
                        actionMessageMode: "handwritten",
                    });
                },
            }),
        );
        container.appendChild(actions);
    }

    function buildActionBackFooterEditor(container) {
        const signoff = appendLimitedTextField(container, {
            id: "action-signoff-input",
            key: "actionSignoff",
            label: "Sign-off Signature",
            placeholder: "e.g. Best wishes, Maya",
            value: window.AppState.actionSignoff || "",
        });
        const actions = createEl("div");
        actions.style.marginTop = "8px";
        actions.appendChild(
            createButton({
                text: "Clear Sign-off (Sign in Person)",
                onClick: () => {
                    signoff.input.value = "";
                    signoff.updateCounter();
                    window.updateState({ actionSignoff: "" });
                },
            }),
        );
        container.appendChild(actions);
    }

    const SECTION_EDITORS = {
        header: [buildHeaderEditor],
        image: [buildImageEditor],
        archetype: [buildArchetypeEditor],
        effect: [buildEffectEditor],
        stats: [buildStatsEditor],
        "back-header": [buildBackHeaderEditor],
        "back-letter": [buildBackLetterEditor],
        "back-footer": [buildBackFooterEditor],
        "action-header": [buildActionHeaderEditor],
        "action-symbol": [buildActionSymbolEditor],
        "action-effect": [buildActionEffectEditor],
        "action-cost": [buildActionCostEditor],
        "action-back-header": [buildActionBackHeaderEditor],
        "action-back-letter": [buildActionMessageEditor],
        "action-back-footer": [buildActionBackFooterEditor],
    };

    // ------------------------------------------------------------------------
    // Photo Drag-to-Reposition (Mouse + Touch)
    // ------------------------------------------------------------------------

    // Movement (in screen px) before a press counts as a drag, not a click.
    const DRAG_CLICK_TOLERANCE = 3;

    // While dragging, the photo is moved directly once per animation frame and
    // the card is only re-rendered once, on release. Re-rendering the whole card
    // on every pointer move made the photo lag and jump.
    function setupPhotoDrag(slot) {
        const frame = document.getElementById(slot.frameId);
        const photoEl = document.getElementById(slot.photoId);
        if (!frame || !photoEl) return;

        let isDragging = false;
        let hasMoved = false;
        let startX = 0;
        let startY = 0;
        let initialOffsetX = 0;
        let initialOffsetY = 0;
        let offsetX = 0;
        let offsetY = 0;
        let scale = 1;
        let screenToCard = 1;
        let dims = null;
        let frameRequest = 0;

        function applyTransform() {
            frameRequest = 0;
            photoEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        }

        function onPointerDown(clientX, clientY) {
            const state = window.AppState;
            if (!state[slot.url]) return false;
            if (slot.modeKey && state[slot.modeKey] !== "photo") return false;
            isDragging = true;
            hasMoved = false;
            startX = clientX;
            startY = clientY;
            scale = Math.max(1, state[slot.scale] || 1);
            dims = getPhotoBounds(scale, slot);
            initialOffsetX = clampOffset(state[slot.offsetX] || 0, dims.maxOffsetX);
            initialOffsetY = clampOffset(state[slot.offsetY] || 0, dims.maxOffsetY);
            offsetX = initialOffsetX;
            offsetY = initialOffsetY;
            // Screen pixels differ from card pixels when the card is scaled
            // down on small screens.
            const rect = frame.getBoundingClientRect();
            screenToCard =
                rect.width && frame.offsetWidth
                    ? frame.offsetWidth / rect.width
                    : 1;
            frame.style.cursor = "grabbing";
            return true;
        }

        function onPointerMove(clientX, clientY) {
            if (!isDragging) return;
            const dx = clientX - startX;
            const dy = clientY - startY;
            if (
                !hasMoved &&
                Math.abs(dx) < DRAG_CLICK_TOLERANCE &&
                Math.abs(dy) < DRAG_CLICK_TOLERANCE
            ) {
                return;
            }
            hasMoved = true;
            // Clamp so the photo never exposes the empty frame background.
            offsetX = Math.round(
                clampOffset(initialOffsetX + dx * screenToCard, dims.maxOffsetX),
            );
            offsetY = Math.round(
                clampOffset(initialOffsetY + dy * screenToCard, dims.maxOffsetY),
            );
            if (!frameRequest) {
                frameRequest = requestAnimationFrame(applyTransform);
            }
        }

        function onPointerUp() {
            if (!isDragging) return;
            isDragging = false;
            frame.style.cursor = "";
            if (frameRequest) {
                cancelAnimationFrame(frameRequest);
                applyTransform();
            }
            if (hasMoved) {
                window.updateState({
                    [slot.offsetX]: offsetX,
                    [slot.offsetY]: offsetY,
                });
            }
        }

        // A drag must not also open the photo editor when the button is released.
        frame.addEventListener(
            "click",
            function (e) {
                if (hasMoved) {
                    hasMoved = false;
                    e.stopPropagation();
                }
            },
            true,
        );

        frame.addEventListener("mousedown", function (e) {
            if (e.button === 0 && onPointerDown(e.clientX, e.clientY)) {
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
        // Not passive, so the page does not scroll while the photo is dragged.
        window.addEventListener(
            "touchmove",
            function (e) {
                if (isDragging && e.touches && e.touches.length === 1) {
                    e.preventDefault();
                    onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            },
            { passive: false },
        );
        window.addEventListener("touchend", onPointerUp);
        window.addEventListener("touchcancel", onPointerUp);
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

        setupPhotoDrag(window.PHOTO_SLOTS.friend);
        setupPhotoDrag(window.PHOTO_SLOTS.action);
    }

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", setupInteractions);
        } else {
            setupInteractions();
        }
    }
})();
