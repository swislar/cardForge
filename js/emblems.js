// Symbol library for action cards. Each emblem is a coloured hex tile with a
// simple glyph, drawn as inline SVG so it stays sharp in print and exports
// reliably. Shapes use a 100×110 viewBox; a shape with fill "tile" is cut out
// in the tile colour, every other shape is drawn in the glyph colour.

(function () {
    window.ACTION_EMBLEM_TILE = "50,3 96,29 96,81 50,107 4,81 4,29";

    window.ACTION_EMBLEMS = [
        {
            id: "joker",
            name: "Joker",
            meaning: "Wildcard",
            color: "#7B3F8C",
            glyph: [
                ["polygon", { points: "28,72 32,40 42,58 50,34 58,58 68,40 72,72" }],
                ["circle", { cx: 32, cy: 37, r: 5 }],
                ["circle", { cx: 50, cy: 31, r: 5 }],
                ["circle", { cx: 68, cy: 37, r: 5 }],
                ["rect", { x: 26, y: 72, width: 48, height: 9, rx: 3 }],
            ],
        },
        {
            id: "power-up",
            name: "Power-up",
            meaning: "Boost",
            color: "#D97B2B",
            glyph: [["polygon", { points: "56,22 30,60 46,60 38,90 72,46 55,46 66,22" }]],
        },
        {
            id: "robber",
            name: "Robber",
            meaning: "Mischief",
            color: "#4A4A4A",
            glyph: [
                ["circle", { cx: 50, cy: 36, r: 10 }],
                ["path", { d: "M36 82 C36 60 42 50 50 50 C58 50 64 60 64 82 Z" }],
                ["rect", { x: 32, y: 80, width: 36, height: 8, rx: 3 }],
            ],
        },
        {
            id: "knight",
            name: "Knight",
            meaning: "Defender",
            color: "#5A4A8A",
            glyph: [
                ["path", { d: "M50 26 L72 34 L72 54 C72 70 62 80 50 86 C38 80 28 70 28 54 L28 34 Z" }],
                ["rect", { x: 46, y: 38, width: 8, height: 36, fill: "tile" }],
                ["rect", { x: 36, y: 48, width: 28, height: 8, fill: "tile" }],
            ],
        },
        {
            id: "road",
            name: "Road",
            meaning: "Connector",
            color: "#B5532F",
            glyph: [
                ["rect", { x: 18, y: 48, width: 64, height: 14, rx: 3, transform: "rotate(-30 50 55)" }],
                ["rect", { x: 26, y: 53.5, width: 10, height: 3, fill: "tile", transform: "rotate(-30 50 55)" }],
                ["rect", { x: 45, y: 53.5, width: 10, height: 3, fill: "tile", transform: "rotate(-30 50 55)" }],
                ["rect", { x: 64, y: 53.5, width: 10, height: 3, fill: "tile", transform: "rotate(-30 50 55)" }],
            ],
        },
        {
            id: "settlement",
            name: "Settlement",
            meaning: "Builder",
            color: "#2F6B3A",
            glyph: [
                ["rect", { x: 60, y: 40, width: 6, height: 12 }],
                ["polygon", { points: "28,58 50,36 72,58 72,82 28,82" }],
                ["rect", { x: 44, y: 66, width: 12, height: 16, fill: "tile" }],
            ],
        },
        {
            id: "ship",
            name: "Ship",
            meaning: "Explorer",
            color: "#2E6E8E",
            glyph: [
                ["path", { d: "M24 66 L76 66 L68 82 L32 82 Z" }],
                ["rect", { x: 48, y: 28, width: 4, height: 38 }],
                ["polygon", { points: "53,30 53,62 74,62" }],
                ["polygon", { points: "47,36 47,62 30,62" }],
            ],
        },
        {
            id: "dice",
            name: "Dice",
            meaning: "Lucky",
            color: "#C0392B",
            glyph: [
                ["rect", { x: 30, y: 35, width: 40, height: 40, rx: 7 }],
                ["circle", { cx: 40, cy: 45, r: 4, fill: "tile" }],
                ["circle", { cx: 60, cy: 45, r: 4, fill: "tile" }],
                ["circle", { cx: 50, cy: 55, r: 4, fill: "tile" }],
                ["circle", { cx: 40, cy: 65, r: 4, fill: "tile" }],
                ["circle", { cx: 60, cy: 65, r: 4, fill: "tile" }],
            ],
        },
        {
            id: "lightbulb",
            name: "Lightbulb",
            meaning: "Ideas",
            color: "#E3B93C",
            glyph: [
                ["circle", { cx: 50, cy: 46, r: 17 }],
                ["rect", { x: 42, y: 58, width: 16, height: 14, rx: 2 }],
                ["rect", { x: 44, y: 75, width: 12, height: 5, rx: 2 }],
                ["rect", { x: 48, y: 18, width: 4, height: 7, rx: 1 }],
                ["rect", { x: 22, y: 44, width: 7, height: 4, rx: 1 }],
                ["rect", { x: 71, y: 44, width: 7, height: 4, rx: 1 }],
            ],
        },
        {
            id: "coffee",
            name: "Coffee",
            meaning: "Fuel",
            color: "#6B4A2B",
            glyph: [
                ["ellipse", { cx: 38, cy: 34, rx: 2.5, ry: 7 }],
                ["ellipse", { cx: 46, cy: 31, rx: 2.5, ry: 7 }],
                ["ellipse", { cx: 54, cy: 34, rx: 2.5, ry: 7 }],
                ["circle", { cx: 64, cy: 60, r: 9 }],
                ["circle", { cx: 64, cy: 60, r: 4.5, fill: "tile" }],
                ["rect", { x: 30, y: 46, width: 32, height: 32, rx: 5 }],
                ["rect", { x: 26, y: 80, width: 44, height: 4, rx: 2 }],
            ],
        },
        {
            id: "laptop",
            name: "Laptop",
            meaning: "Fixer",
            color: "#4A5568",
            glyph: [
                ["rect", { x: 30, y: 34, width: 40, height: 28, rx: 3 }],
                ["rect", { x: 34, y: 38, width: 32, height: 20, rx: 1, fill: "tile" }],
                ["polygon", { points: "24,66 76,66 82,76 18,76" }],
            ],
        },
        {
            id: "star",
            name: "Star",
            meaning: "Shining",
            color: "#2E8B7A",
            glyph: [
                [
                    "polygon",
                    {
                        points:
                            "50,28 57.05,46.29 76.63,47.35 61.41,59.71 66.46,78.65 50,68 33.54,78.65 38.59,59.71 23.37,47.35 42.95,46.29",
                    },
                ],
            ],
        },
    ];

    // Ribbon text shown under the symbol until the sender writes their own.
    window.defaultEmblemLabel = function (emblem) {
        return emblem ? `${emblem.name.toUpperCase()} · ${emblem.meaning}` : "";
    };
})();
