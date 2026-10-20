// Action card renderer (acquaintances and colleagues).
// Depends on js/emblems.js and js/card.js (window.CardRender); called from
// window.renderCard on every state change.

(function () {
    const { getBaseTextColor } = window.CardColor;
    const {
        byId,
        fitTextToWidth,
        fitTextToBox,
        renderFrame,
        renderPhoto,
        applyFaceTheming,
        SVG_NS,
        TITLE_FONT,
        BODY_FONT,
        LETTER_FONT,
    } = window.CardRender;

    function findEmblem(id) {
        const emblems = window.ACTION_EMBLEMS || [];
        return emblems.find((emblem) => emblem.id === id) || emblems[0];
    }
    window.findActionEmblem = findEmblem;

    // Inline SVG hex tile with the emblem's glyph, like the resource icons, so
    // it stays sharp in print and in html2canvas exports.
    window.renderEmblemSvg = function (container, emblem) {
        if (!container || !emblem || !document.createElementNS) return;
        const glyphColor = getBaseTextColor(emblem.color);
        const cacheKey = `${emblem.id}|${glyphColor}`;
        if (container._emblemKey === cacheKey) return;
        container._emblemKey = cacheKey;
        container.textContent = "";

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 100 110");
        svg.setAttribute("aria-hidden", "true");
        const tile = document.createElementNS(SVG_NS, "polygon");
        tile.setAttribute("points", window.ACTION_EMBLEM_TILE);
        tile.setAttribute("fill", emblem.color);
        tile.setAttribute("stroke", "rgba(48, 41, 31, 0.55)");
        tile.setAttribute("stroke-width", "3");
        svg.appendChild(tile);
        emblem.glyph.forEach(([tag, attrs]) => {
            const shape = document.createElementNS(SVG_NS, tag);
            Object.keys(attrs).forEach((name) => {
                if (name !== "fill") shape.setAttribute(name, String(attrs[name]));
            });
            shape.setAttribute(
                "fill",
                attrs.fill === "tile" ? emblem.color : glyphColor,
            );
            svg.appendChild(shape);
        });
        container.appendChild(svg);
    };

    function setText(el, text, font) {
        if (!el) return;
        el.textContent = text;
        if (font) el.style.fontFamily = font;
    }

    // Symbol by default; an uploaded photo replaces it when chosen.
    function renderPicture(state, emblem) {
        const slot = window.PHOTO_SLOTS.action;
        const frameEl = byId(slot.frameId);
        const emblemEl = byId("action-emblem");
        const photoEl = byId(slot.photoId);
        const showPhoto =
            state.actionImageMode === "photo" && !!state[slot.url];

        if (emblemEl) {
            emblemEl.style.display = showPhoto ? "none" : "";
            window.renderEmblemSvg(emblemEl, emblem);
        }
        if (photoEl) photoEl.style.display = showPhoto ? "" : "none";
        if (frameEl) {
            frameEl.style.cursor = showPhoto ? "grab" : "";
            frameEl.title = showPhoto
                ? "Drag to reposition the photo"
                : `${emblem.name}: ${emblem.meaning}`;
        }
        if (showPhoto) {
            renderPhoto(state, slot);
        } else {
            renderFrame(state, frameEl);
        }
    }

    function renderFront(state, emblem) {
        const titleEl = byId("action-title-text");
        setText(titleEl, state.actionTitle || "Their Name", TITLE_FONT);
        fitTextToWidth(titleEl);

        renderPicture(state, emblem);

        const labelEl = byId("action-label-text");
        setText(
            labelEl,
            state.actionLabel || window.defaultEmblemLabel(emblem),
            BODY_FONT,
        );
        fitTextToWidth(labelEl);

        const effectEl = byId("action-effect-text");
        if (effectEl) {
            setText(effectEl, state.actionEffect || "", BODY_FONT);
            fitTextToBox(effectEl, byId("action-effect-body"));
        }

        // Development-card style "price". Blank shows a hint on screen only.
        const cost = (state.actionCost || "").trim();
        const costEl = byId("action-cost");
        if (costEl) costEl.classList.toggle("action-cost--empty", !cost);
        const costTextEl = byId("action-cost-text");
        if (costTextEl) {
            setText(costTextEl, cost || "Click to add a build cost", BODY_FONT);
            fitTextToWidth(costTextEl.parentElement);
        }
    }

    function renderBack(state, backEl) {
        const title = state.actionBackTitle || "";
        const titleEl = byId("action-back-title");
        setText(titleEl, title, TITLE_FONT);
        fitTextToWidth(titleEl);
        const headerEl = byId("action-back-header");
        if (headerEl) {
            headerEl.classList.toggle("back-header--empty", !title.trim());
        }

        const subtitleEl = byId("action-back-subtitle");
        if (subtitleEl) {
            const subtitle = state.actionBackSubtitle || "";
            subtitleEl.textContent = subtitle;
            subtitleEl.style.display = subtitle ? "" : "none";
            fitTextToWidth(subtitleEl);
        }

        const container = backEl.querySelector(".back-letter-container");
        const isTyped = state.actionMessageMode === "typed";
        if (container) {
            container.classList.toggle("back-letter--handwritten", !isTyped);
            container.classList.toggle("back-letter--typed", isTyped);
            container.style.display = "flex";
        }
        const messageEl = byId("action-message-text");
        if (messageEl) {
            setText(messageEl, state.actionMessage || "", LETTER_FONT);
            fitTextToBox(messageEl);
        }

        const signoff = state.actionSignoff || "";
        const signoffEl = byId("action-back-signoff");
        setText(signoffEl, signoff, BODY_FONT);
        fitTextToWidth(signoffEl);
        const signoffGroup = backEl.querySelector(".back-signoff-group");
        if (signoffGroup) {
            signoffGroup.classList.toggle(
                "back-signoff-group--blank",
                !signoff.trim(),
            );
        }
    }

    window.renderActionCard = function (state, theme) {
        const frontEl = byId("action-front");
        const backEl = byId("action-back");
        if (!frontEl || !backEl) return;
        const emblem = findEmblem(state.actionEmblemId);
        if (!emblem) return;
        // The emblem's colour plays the part the resource plays on the friend
        // card: face ring, frame and rating fill.
        const actionTheme = { ...theme, resource: { color: emblem.color } };
        applyFaceTheming(frontEl, actionTheme, state.isCustomized);
        applyFaceTheming(backEl, actionTheme, state.isCustomized);
        renderFront(state, emblem);
        renderBack(state, backEl);
    };
})();
