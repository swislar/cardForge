// Application State Management for Card Forge

(function() {
  const currentYear = new Date().getFullYear().toString();

  // Central Application State
  window.AppState = {
    title: "Friend's Name",
    hp: 100,
    archetypeId: 'the-adventurer',
    photoDataUrl: null,
    photoOffsetX: 0,
    photoOffsetY: 0,
    photoScale: 1,
    frameStyle: 'simple',
    description: 'Click to add your memory...',
    stats: [
      { name: 'Humor', value: 50 },
      { name: 'Loyalty', value: 50 },
      { name: 'Chaos', value: 50 },
      { name: 'Warmth', value: 50 }
    ],
    vibeIconIds: [],
    year: currentYear,
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
      id: 'the-adventurer',
      name: 'The Adventurer',
      tagline: 'Explorer, spontaneous',
      primary: '#2D7D46',
      accent: '#7DCEA0',
      gradient: 'linear-gradient(135deg, #2D7D46 0%, #164324 100%)',
      badgeEmoji: '🧭'
    };
  };

  // State update dispatcher
  window.updateState = function(partialState) {
    if (!partialState || typeof partialState !== 'object') return;

    // Check if any personal field has been customized
    if (partialState.title !== undefined && partialState.title !== "Friend's Name") {
      window.AppState.isCustomized = true;
    }
    if (partialState.photoDataUrl !== undefined && partialState.photoDataUrl !== null) {
      window.AppState.isCustomized = true;
    }
    if (partialState.description !== undefined && partialState.description !== 'Click to add your memory...') {
      window.AppState.isCustomized = true;
    }
    if (partialState.vibeIconIds !== undefined && partialState.vibeIconIds.length > 0) {
      window.AppState.isCustomized = true;
    }

    Object.assign(window.AppState, partialState);

    if (typeof window.renderCard === 'function') {
      window.renderCard();
    }
  };
})();
