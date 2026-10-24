// Application state for Card Forge: the card data, its validation rules, and a
// small subscribe store. Renderers subscribe; editors call updateState().
// Depends on js/color.js for the base-colour contrast guard.

(function () {
    const DEFAULT_STAT_LABELS = [
        "Reliable",
        "Growing",
        "Comforting",
        "Nourishing",
        "Resilient",
    ];
    // Hard character caps that keep stored state bounded. The real limit is
    // visual: editors only accept text that fits its box on the card at the
    // smallest allowed print size (see window.measureCardText), because a
    // character count can't tell narrow "iii" from wide "WWW".
    const TEXT_LIMITS = Object.freeze({
        title: 32,
        cardEffect: 90,
        statName: 24,
        backTitle: 40,
        backSubtitle: 48,
        backTradeGive: 40,
        backTradeGet: 40,
        backSignoff: 48,
        backLetter: 600,
        actionTitle: 32,
        actionLabel: 40,
        actionEffect: 160,
        actionTraitName: 24,
        actionCost: 48,
        actionBackTitle: 40,
        actionBackSubtitle: 48,
        actionSignoff: 48,
        actionMessage: 750,
    });
    const STAT_NAME_MAX_LENGTH = TEXT_LIMITS.statName;
    const CARD_TYPES = ["friend", "action"];
    const ACTION_IMAGE_MODES = ["emblem", "photo"];
    const ACTION_TRAIT_COUNT = 3;
    // The main card rates five traits but only shows this many of them.
    const SHOWN_STAT_COUNT = 3;
    window.SHOWN_STAT_COUNT = SHOWN_STAT_COUNT;
    const MAX_TRAIT_OPTIONS = 20;
    const DEFAULT_ACTION_TRAIT_OPTIONS = [
        "Helpful",
        "Funny",
        "Reliable",
        "Creative",
        "Calm",
        "Curious",
        "Organised",
        "Kind",
    ];
    window.DEFAULT_ACTION_TRAIT_OPTIONS = DEFAULT_ACTION_TRAIT_OPTIONS;
    const BACK_LETTER_MODES = ["handwritten", "typed"];
    window.TEXT_LIMITS = TEXT_LIMITS;
    window.CARD_EFFECT_MAX_LENGTH = TEXT_LIMITS.cardEffect;

    window.CATAN_RESOURCES = [
        {
            id: "brick",
            name: "Brick",
            color: "#B5532F",
            icon: "🧱",
            meaning: "Reliable",
        },
        {
            id: "lumber",
            name: "Lumber",
            color: "#2F6B3A",
            icon: "🌲",
            meaning: "Helps me grow",
        },
        {
            id: "wool",
            name: "Wool",
            color: "#A8D26B",
            icon: "🐑",
            meaning: "Comfort",
        },
        {
            id: "grain",
            name: "Grain",
            color: "#E3B93C",
            icon: "🌾",
            meaning: "Nourishment",
        },
        {
            id: "ore",
            name: "Ore",
            color: "#7A7F87",
            icon: "⛰️",
            meaning: "Resilience",
        },
    ];

    window.CATAN_DEVELOPMENT_ROLES = [
        {
            id: "knight",
            name: "Knight",
            cardLabel: "KNIGHT · Protector",
            epithet: "Protector",
        },
        {
            id: "road-building",
            name: "Road Building",
            cardLabel: "ROAD BUILDING · Links",
            epithet: "Links",
        },
        {
            id: "year-of-plenty",
            name: "Year of Plenty",
            cardLabel: "YEAR OF PLENTY · Gift",
            epithet: "Gift",
        },
        {
            id: "monopoly",
            name: "Monopoly",
            cardLabel: "MONOPOLY · Charmer",
            epithet: "Charmer",
        },
        {
            id: "victory-point",
            name: "Victory Point",
            cardLabel: "VICTORY POINT · Pride",
            epithet: "Pride",
        },
    ];

    // Photo border finishes; the CSS class is `frame-<id>`.
    window.FRAME_STYLES = [
        { id: "resource", label: "Resource Colour (matches terrain)" },
        { id: "accent", label: "Accent Colour" },
        { id: "wood", label: "Carved Wood" },
        { id: "parchment", label: "Parchment & Ink" },
        { id: "none", label: "No Border" },
    ];

    // Where each card type keeps its photo. Both types have their own photo so
    // switching between them never loses an upload or its framing.
    window.PHOTO_SLOTS = {
        friend: {
            frameId: "card-image-frame",
            photoId: "card-photo",
            url: "photoDataUrl",
            aspect: "photoAspect",
            scale: "photoScale",
            offsetX: "photoOffsetX",
            offsetY: "photoOffsetY",
        },
        action: {
            frameId: "action-image-frame",
            photoId: "action-photo",
            url: "actionPhotoDataUrl",
            aspect: "actionPhotoAspect",
            scale: "actionPhotoScale",
            offsetX: "actionPhotoOffsetX",
            offsetY: "actionPhotoOffsetY",
            // The photo only shows (and drags) when chosen over the symbol.
            modeKey: "actionImageMode",
        },
    };

    window.AppState = {
        // Identity
        title: "Friend's Name",
        closeness: 10,
        diceNumber: 8,
        resourceId: "wool",
        developmentRoleId: "knight",

        // Colours
        primaryColor: "#28566F",
        accentColor: "#6B4A2B",

        // Front face
        photoDataUrl: null,
        photoAspect: null,
        photoOffsetX: 0,
        photoOffsetY: 0,
        photoScale: 1,
        frameStyle: "resource",
        stats: DEFAULT_STAT_LABELS.map((name) => ({ name, value: 5 })),
        // Indices into `stats` of the traits printed on the card.
        shownStats: [0, 1, 2],
        cardEffect: "When played: the whole table laughs.",

        // Back face
        backTitle: "Happy Birthday!",
        backSubtitle: "Harvest Day",
        backLetter: "",
        backLetterMode: "handwritten",
        backTradeGive: "one dinner",
        backTradeGet: "your company",
        backSignoff: "With love, [Your name]",
        backDate: "",

        // Action card (acquaintances and colleagues).
        cardType: "friend",
        actionTitle: "Their Name",
        actionEmblemId: "joker",
        actionImageMode: "emblem",
        actionLabel: "JOKER · Wildcard",
        actionPhotoDataUrl: null,
        actionPhotoAspect: null,
        actionPhotoOffsetX: 0,
        actionPhotoOffsetY: 0,
        actionPhotoScale: 1,
        actionEffect: "Play anytime: turns a dull meeting into a good one.",
        actionTraits: DEFAULT_ACTION_TRAIT_OPTIONS.slice(
            0,
            ACTION_TRAIT_COUNT,
        ).map((name) => ({ name, value: 5 })),
        actionTraitOptions: DEFAULT_ACTION_TRAIT_OPTIONS.slice(),
        actionCost: "1 Coffee + 1 Laugh + 1 Idea",
        actionBackTitle: "Happy Birthday!",
        actionBackSubtitle: "Harvest Day",
        actionMessage: "",
        actionMessageMode: "handwritten",
        actionSignoff: "Best wishes, [Your name]",

        // View
        isFlipped: false,
        isCustomized: false,
    };

    const listeners = [];

    // Registers a listener called with the state after every accepted update.
    // Returns a function that removes the listener.
    window.subscribe = function (listener) {
        listeners.push(listener);
        return function unsubscribe() {
            const index = listeners.indexOf(listener);
            if (index !== -1) listeners.splice(index, 1);
        };
    };

    function isValidDiceNumber(value) {
        const number = Number(value);
        return (
            Number.isInteger(number) &&
            number >= 2 &&
            number <= 12 &&
            number !== 7
        );
    }

    function clampText(value, maxLength) {
        return typeof value === "string" ? value.slice(0, maxLength) : "";
    }

    // Closeness is shown as victory points out of 10, the Catan winning score.
    function normalizeCloseness(value) {
        const points = Number.parseInt(value, 10);
        return Number.isFinite(points) ? Math.max(1, Math.min(10, points)) : 1;
    }

    // Always one rating per resource: names fall back to defaults, values clamp to 1-10.
    function normalizeStats(stats) {
        const submittedStats = stats.slice(0, window.CATAN_RESOURCES.length);
        return window.CATAN_RESOURCES.map((resource, index) => {
            const stat = submittedStats[index];
            const value = Number.parseInt(stat && stat.value, 10);
            return {
                name:
                    stat && typeof stat.name === "string" && stat.name.trim()
                        ? stat.name.slice(0, STAT_NAME_MAX_LENGTH)
                        : DEFAULT_STAT_LABELS[index],
                value: Number.isFinite(value)
                    ? Math.max(1, Math.min(10, value))
                    : 1,
            };
        });
    }

    // Sorted, unique stat indices; null unless exactly SHOWN_STAT_COUNT are valid.
    function normalizeShownStats(indices) {
        const unique = Array.from(
            new Set(indices.map((index) => Number(index))),
        ).filter(
            (index) =>
                Number.isInteger(index) &&
                index >= 0 &&
                index < window.CATAN_RESOURCES.length,
        );
        return unique.length === SHOWN_STAT_COUNT
            ? unique.sort((a, b) => a - b)
            : null;
    }

    // Always three traits: names fall back to the default list, values clamp to 1-10.
    function normalizeActionTraits(traits) {
        return Array.from({ length: ACTION_TRAIT_COUNT }, (_, index) => {
            const trait = traits[index];
            const value = Number.parseInt(trait && trait.value, 10);
            return {
                name:
                    trait && typeof trait.name === "string" && trait.name.trim()
                        ? trait.name.slice(0, TEXT_LIMITS.actionTraitName)
                        : DEFAULT_ACTION_TRAIT_OPTIONS[index],
                value: Number.isFinite(value)
                    ? Math.max(1, Math.min(10, value))
                    : 1,
            };
        });
    }

    // Trimmed, de-duplicated names; an empty list falls back to the defaults.
    function normalizeTraitOptions(options) {
        const seen = new Set();
        const names = [];
        options.forEach((option) => {
            if (typeof option !== "string") return;
            const name = option.trim().slice(0, TEXT_LIMITS.actionTraitName);
            const key = name.toLowerCase();
            if (!name || seen.has(key)) return;
            seen.add(key);
            names.push(name);
        });
        return names.length
            ? names.slice(0, MAX_TRAIT_OPTIONS)
            : DEFAULT_ACTION_TRAIT_OPTIONS.slice();
    }

    // Returns a cleaned copy of the update, or null when it must be rejected.
    function normalizeUpdate(partialState) {
        if (
            partialState.primaryColor !== undefined &&
            !window.isValidBaseColor(partialState.primaryColor)
        ) {
            return null;
        }
        if (
            partialState.accentColor !== undefined &&
            !window.isValidBaseColor(partialState.accentColor)
        ) {
            return null;
        }
        if (
            partialState.diceNumber !== undefined &&
            !isValidDiceNumber(partialState.diceNumber)
        ) {
            return null;
        }
        if (
            ["backLetterMode", "actionMessageMode"].some(
                (key) =>
                    partialState[key] !== undefined &&
                    !BACK_LETTER_MODES.includes(partialState[key]),
            )
        ) {
            return null;
        }
        if (
            partialState.cardType !== undefined &&
            !CARD_TYPES.includes(partialState.cardType)
        ) {
            return null;
        }
        if (
            partialState.actionImageMode !== undefined &&
            !ACTION_IMAGE_MODES.includes(partialState.actionImageMode)
        ) {
            return null;
        }
        if (
            partialState.actionEmblemId !== undefined &&
            !(window.ACTION_EMBLEMS || []).some(
                (emblem) => emblem.id === partialState.actionEmblemId,
            )
        ) {
            return null;
        }
        if (
            partialState.frameStyle !== undefined &&
            !window.FRAME_STYLES.some(
                (style) => style.id === partialState.frameStyle,
            )
        ) {
            return null;
        }

        const next = { ...partialState };
        if (next.closeness !== undefined) {
            next.closeness = normalizeCloseness(next.closeness);
        }
        Object.keys(TEXT_LIMITS).forEach((key) => {
            if (key !== "statName" && next[key] !== undefined) {
                next[key] = clampText(next[key], TEXT_LIMITS[key]);
            }
        });
        if (Array.isArray(next.stats)) {
            next.stats = normalizeStats(next.stats);
        }
        if (next.shownStats !== undefined) {
            if (!Array.isArray(next.shownStats)) return null;
            next.shownStats = normalizeShownStats(next.shownStats);
            if (!next.shownStats) return null;
        }
        if (Array.isArray(next.actionTraits)) {
            next.actionTraits = normalizeActionTraits(next.actionTraits);
        }
        if (Array.isArray(next.actionTraitOptions)) {
            next.actionTraitOptions = normalizeTraitOptions(
                next.actionTraitOptions,
            );
        }
        return next;
    }

    // The placeholder styling stays until a personal field is filled in.
    function touchesPersonalField(update) {
        return (
            (update.title !== undefined && update.title !== "Friend's Name") ||
            (update.photoDataUrl !== undefined &&
                update.photoDataUrl !== null) ||
            update.backLetter !== undefined ||
            (update.actionTitle !== undefined &&
                update.actionTitle !== "Their Name") ||
            (update.actionPhotoDataUrl !== undefined &&
                update.actionPhotoDataUrl !== null) ||
            update.actionMessage !== undefined
        );
    }

    // Validates and applies a partial update, then notifies subscribers.
    // Returns true when applied, false when rejected.
    window.updateState = function (partialState) {
        if (!partialState || typeof partialState !== "object") return;
        const update = normalizeUpdate(partialState);
        if (!update) return false;

        if (touchesPersonalField(update)) {
            window.AppState.isCustomized = true;
        }
        Object.assign(window.AppState, update);
        listeners.slice().forEach((listener) => listener(window.AppState));
        return true;
    };
})();
