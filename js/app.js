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
    // Character limits sized so each field fits its box on the card at full size.
    // The renderer still shrinks a line slightly if wide letters need it, so text
    // is never cut off or replaced with an ellipsis.
    const TEXT_LIMITS = Object.freeze({
        title: 16,
        cardEffect: 44,
        statName: 12,
        backTitle: 20,
        backSubtitle: 24,
        backTradeGive: 18,
        backTradeGet: 18,
        backSignoff: 24,
        backLetter: 240,
    });
    const STAT_NAME_MAX_LENGTH = TEXT_LIMITS.statName;
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
        cardEffect: "When played: the whole table laughs.",
        cardNumber: 3,
        deckSize: 8,

        // Back face
        backTitle: "Happy Birthday!",
        backSubtitle: "Harvest Day",
        backLetter: "",
        backLetterMode: "handwritten",
        backTradeGive: "one dinner",
        backTradeGet: "your company",
        backSignoff: "With love, [Your name]",
        backDate: "",

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

    // Returns a cleaned copy of the update, or null when it must be rejected.
    function normalizeUpdate(partialState) {
        if (
            partialState.primaryColor !== undefined &&
            !window.isValidBaseColor(partialState.primaryColor)
        ) {
            return null;
        }
        if (
            partialState.primaryColor !== undefined ||
            partialState.accentColor !== undefined
        ) {
            const base =
                partialState.primaryColor !== undefined
                    ? partialState.primaryColor
                    : window.AppState.primaryColor;
            const accent =
                partialState.accentColor !== undefined
                    ? partialState.accentColor
                    : window.AppState.accentColor;
            if (!window.isDistinctAccentColor(accent, base)) return null;
        }
        if (
            partialState.diceNumber !== undefined &&
            !isValidDiceNumber(partialState.diceNumber)
        ) {
            return null;
        }
        if (
            partialState.backLetterMode !== undefined &&
            !BACK_LETTER_MODES.includes(partialState.backLetterMode)
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
        return next;
    }

    // The placeholder styling stays until a personal field is filled in.
    function touchesPersonalField(update) {
        return (
            (update.title !== undefined && update.title !== "Friend's Name") ||
            (update.photoDataUrl !== undefined &&
                update.photoDataUrl !== null) ||
            update.backLetter !== undefined
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
