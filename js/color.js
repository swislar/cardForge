// Colour maths shared by the state rules (app.js) and the renderer (card.js).

(function () {
    const INK = "#30291F";
    const CREAM = "#F3E7C9";
    const BASE_COLOR_MAX_LUMINANCE = 0.84;
    const MIN_TEXT_CONTRAST = 4.5;
    // Minimum RGB distance between accent frame and base field. Luminance contrast
    // is the wrong test here: Sea (#28566F) and Wood (#6B4A2B) have equal luminance
    // but read as clearly different hues.
    const MIN_ACCENT_DISTANCE = 48;

    // WCAG relative luminance of a #rrggbb colour, or null when the input is not one.
    function getRelativeLuminance(hexColor) {
        if (typeof hexColor !== "string" || !/^#[\da-f]{6}$/i.test(hexColor)) {
            return null;
        }
        const channels = hexColor
            .slice(1)
            .match(/.{2}/g)
            .map((channel) => {
                const value = parseInt(channel, 16) / 255;
                return value <= 0.04045
                    ? value / 12.92
                    : ((value + 0.055) / 1.055) ** 2.4;
            });
        return (
            0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
        );
    }

    function getContrastRatio(luminanceA, luminanceB) {
        const lighter = Math.max(luminanceA, luminanceB);
        const darker = Math.min(luminanceA, luminanceB);
        return (lighter + 0.05) / (darker + 0.05);
    }

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

    const INK_LUMINANCE = getRelativeLuminance(INK);
    const CREAM_LUMINANCE = getRelativeLuminance(CREAM);

    // A base colour is accepted when it is not near-white and either ink or cream text stays readable on it.
    function isValidBaseColor(color) {
        const luminance = getRelativeLuminance(color);
        if (luminance === null || luminance > BASE_COLOR_MAX_LUMINANCE)
            return false;
        return (
            Math.max(
                getContrastRatio(luminance, INK_LUMINANCE),
                getContrastRatio(luminance, CREAM_LUMINANCE),
            ) >= MIN_TEXT_CONTRAST
        );
    }

    // Ink or cream, whichever contrasts more with the colour.
    function getBaseTextColor(color) {
        const luminance = getRelativeLuminance(color);
        if (luminance === null) return CREAM;
        return getContrastRatio(luminance, INK_LUMINANCE) >
            getContrastRatio(luminance, CREAM_LUMINANCE)
            ? INK
            : CREAM;
    }

    // An accent is accepted when it is a #rrggbb colour that stands apart from the
    // base, so the frame never blends into the card field.
    function isDistinctAccentColor(accent, base) {
        const hex = /^#[\da-f]{6}$/i;
        if (!hex.test(accent) || !hex.test(base)) return false;
        const a = accent
            .slice(1)
            .match(/.{2}/g)
            .map((c) => parseInt(c, 16));
        const b = base
            .slice(1)
            .match(/.{2}/g)
            .map((c) => parseInt(c, 16));
        return (
            Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) >=
            MIN_ACCENT_DISTANCE
        );
    }

    window.CardColor = {
        INK,
        CREAM,
        getRelativeLuminance,
        getContrastRatio,
        hexToRgba,
        isValidBaseColor,
        getBaseTextColor,
        isDistinctAccentColor,
    };
    window.isValidBaseColor = isValidBaseColor;
    window.getBaseTextColor = getBaseTextColor;
    window.isDistinctAccentColor = isDistinctAccentColor;
})();
