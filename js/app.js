// Application State Management for Card Forge

(function() {
  const currentYear = new Date().getFullYear().toString();
  const DEFAULT_STAT_LABELS = [
    'Reliable',
    'Growing',
    'Comforting',
    'Nourishing',
    'Resilient'
  ];
  const BASE_COLOR_INK = '#30291F';
  const BASE_COLOR_CREAM = '#F3E7C9';
  const BASE_COLOR_MAX_LUMINANCE = 0.84;
  const MIN_TEXT_CONTRAST = 4.5;

  function getRelativeLuminance(hexColor) {
    if (typeof hexColor !== 'string' || !/^#[\da-f]{6}$/i.test(hexColor)) {
      return null;
    }
    const channels = hexColor.slice(1).match(/.{2}/g).map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function getContrastRatio(luminanceA, luminanceB) {
    const lighter = Math.max(luminanceA, luminanceB);
    const darker = Math.min(luminanceA, luminanceB);
    return (lighter + 0.05) / (darker + 0.05);
  }

  const INK_LUMINANCE = getRelativeLuminance(BASE_COLOR_INK);
  const CREAM_LUMINANCE = getRelativeLuminance(BASE_COLOR_CREAM);
  window.isValidBaseColor = function(color) {
    const luminance = getRelativeLuminance(color);
    if (luminance === null || luminance > BASE_COLOR_MAX_LUMINANCE) return false;
    return Math.max(
      getContrastRatio(luminance, INK_LUMINANCE),
      getContrastRatio(luminance, CREAM_LUMINANCE)
    ) >= MIN_TEXT_CONTRAST;
  };
  window.getBaseTextColor = function(color) {
    const luminance = getRelativeLuminance(color);
    if (luminance === null) return BASE_COLOR_CREAM;
    return getContrastRatio(luminance, INK_LUMINANCE) >
      getContrastRatio(luminance, CREAM_LUMINANCE)
      ? BASE_COLOR_INK
      : BASE_COLOR_CREAM;
  };

  window.CATAN_RESOURCES = [
    { id: 'brick', name: 'Brick', color: '#B5532F', icon: '🧱', meaning: 'Reliable' },
    { id: 'lumber', name: 'Lumber', color: '#2F6B3A', icon: '🌲', meaning: 'Helps me grow' },
    { id: 'wool', name: 'Wool', color: '#A8D26B', icon: '🐑', meaning: 'Comfort' },
    { id: 'grain', name: 'Grain', color: '#E3B93C', icon: '🌾', meaning: 'Nourishment' },
    { id: 'ore', name: 'Ore', color: '#7A7F87', icon: '⛰️', meaning: 'Resilience' }
  ];

  window.CATAN_DEVELOPMENT_ROLES = [
    { id: 'knight', name: 'Knight', cardLabel: 'KNIGHT · Protector', epithet: 'Protector' },
    { id: 'road-building', name: 'Road Building', cardLabel: 'ROAD BUILDING · Links', epithet: 'Links' },
    { id: 'year-of-plenty', name: 'Year of Plenty', cardLabel: 'YEAR OF PLENTY · Gift', epithet: 'Gift' },
    { id: 'monopoly', name: 'Monopoly', cardLabel: 'MONOPOLY · Charmer', epithet: 'Charmer' },
    { id: 'victory-point', name: 'Victory Point', cardLabel: 'VICTORY POINT · Pride', epithet: 'Pride' }
  ];

  // Central Application State
  window.AppState = {
    // Identity
    title: "Friend's Name",
    hp: 100,
    vpScore: 10,
    vpTotal: 10,
    diceNumber: 8,
    resourceId: 'wool',
    developmentRoleId: 'knight',

    // Unbundled Styling Tokens
    archetypeId: 'the-sunshine',
    archetypeName: 'The Luminary',
    archetypeBadge: '☀️',
    primaryColor: '#28566F',
    accentColor: '#6B4A2B',
    fontFamilyTitle: 'Cinzel',
    fontFamilyBody: 'Outfit',
    fontSizeTitle: 'medium',
    fontSizeBody: 'medium',
    cardTexture: 'gold',

    // Front Face Content
    photoDataUrl: null,
    photoAspect: null,
    photoOffsetX: 0,
    photoOffsetY: 0,
    photoScale: 1,
    frameStyle: 'simple',
    stats: [
      { name: 'Reliable', value: 5 },
      { name: 'Growing', value: 5 },
      { name: 'Comforting', value: 5 },
      { name: 'Nourishing', value: 5 },
      { name: 'Resilient', value: 5 }
    ],
    chaosScore: 50,
    cardNumber: 3,
    deckSize: 8,
    year: currentYear,

    // Back Face Content (Birthday Physical Canvas)
    backStyle: 'letter', // 'letter' | 'tcg'
    backTitle: 'Happy Birthday!',
    backSubtitle: 'Harvest Day',
    backLetter: '',
    backLetterMode: 'handwritten',
    backTradeGive: 'one dinner',
    backTradeGet: 'your company',
    backVoucher: '1 dinner, redeemable any time',
    backSignoff: 'With love, [Your name]',
    backDate: '',

    // View & Customization State
    isFlipped: false,
    isCustomized: false
  };

  // Helper to look up an archetype definition
  window.getArchetype = function(id) {
    const targetId = id || window.AppState.archetypeId;
    if (Array.isArray(window.ARCHETYPES)) {
      const match = window.ARCHETYPES.find(a => a.id === targetId);
      if (match) return match;
      return window.ARCHETYPES[0];
    }
    return {
      id: 'the-sunshine',
      name: 'The Luminary',
      tagline: 'Radiant spirit, infectious warmth',
      primary: '#28566F',
      accent: '#6B4A2B',
      gradient: 'none',
      badgeEmoji: '☀️'
    };
  };

    // State update dispatcher
  window.updateState = function(partialState) {
    if (!partialState || typeof partialState !== 'object') return;
    if (
      partialState.primaryColor !== undefined &&
      !window.isValidBaseColor(partialState.primaryColor)
    ) {
      return false;
    }
    if (
      partialState.diceNumber !== undefined &&
      (!Number.isInteger(Number(partialState.diceNumber)) ||
        Number(partialState.diceNumber) < 2 ||
        Number(partialState.diceNumber) > 12 ||
        Number(partialState.diceNumber) === 7)
    ) {
      return false;
    }

    if (Array.isArray(partialState.stats)) {
      const submittedStats = partialState.stats.slice(0, window.CATAN_RESOURCES.length);
      partialState.stats = window.CATAN_RESOURCES.map((resource, index) => {
        const stat = submittedStats[index];
        const value = Number.parseInt(stat && stat.value, 10);
        return {
          name: stat && typeof stat.name === 'string' && stat.name.trim()
            ? stat.name.slice(0, 20)
            : DEFAULT_STAT_LABELS[index],
          value: Number.isFinite(value)
            ? Math.max(1, Math.min(10, value))
            : 1
        };
      });
    }
    if (partialState.backLetter !== undefined) {
      partialState.backLetter = typeof partialState.backLetter === 'string'
        ? partialState.backLetter.slice(0, 300)
        : '';
    }
    if (
      partialState.backLetterMode !== undefined &&
      !['handwritten', 'typed'].includes(partialState.backLetterMode)
    ) {
      return false;
    }

    // Check if any personal field has been customized
    if (partialState.title !== undefined && partialState.title !== "Friend's Name") {
      window.AppState.isCustomized = true;
    }
    if (partialState.photoDataUrl !== undefined && partialState.photoDataUrl !== null) {
      window.AppState.isCustomized = true;
    }
    if (partialState.cardTexture !== undefined && partialState.cardTexture !== 'gold') {
      window.AppState.isCustomized = true;
    }
    if (partialState.backLetter !== undefined) {
      window.AppState.isCustomized = true;
    }

    Object.assign(window.AppState, partialState);

    if (typeof window.renderCard === 'function') {
      window.renderCard();
    }
    return true;
  };
})();
