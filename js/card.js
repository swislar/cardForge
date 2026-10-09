// Card Rendering Engine for Card Forge

(function() {
  function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith('#') || hex.length !== 7) {
      return `rgba(125, 206, 160, ${alpha})`;
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  window.renderCard = function() {
    const cardEl = document.getElementById('card');
    if (!cardEl) return;

    const state = window.AppState;
    const arch = window.getArchetype(state.archetypeId);

    // 1. Theming custom properties
    cardEl.style.setProperty('--archetype-primary', arch.primary);
    cardEl.style.setProperty('--archetype-accent', arch.accent);
    cardEl.style.setProperty('--archetype-gradient', arch.gradient);
    cardEl.style.setProperty('--glow-color', hexToRgba(arch.accent, 0.45));

    // Update download button style
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
      downloadBtn.style.setProperty('--archetype-primary', arch.primary);
      downloadBtn.style.setProperty('--archetype-accent', arch.accent);
      downloadBtn.style.setProperty('--glow-color', hexToRgba(arch.accent, 0.45));
    }

    // Toggle placeholder styling
    if (cardEl.classList) {
      cardEl.classList.toggle('card--placeholder', !state.isCustomized);
    }

    // 2. Section 1: Header
    const badgeEl = document.getElementById('card-badge');
    if (badgeEl) badgeEl.textContent = arch.badgeEmoji || '🧭';

    const titleEl = document.getElementById('card-title-text');
    if (titleEl) titleEl.textContent = state.title || "Friend's Name";

    const hpEl = document.getElementById('card-hp-text');
    if (hpEl) hpEl.textContent = String(state.hp !== undefined ? state.hp : 100);

    // 3. Section 2: Image & Frame
    const frameEl = document.getElementById('card-image-frame');
    if (frameEl && frameEl.classList) {
      frameEl.classList.remove('frame-simple', 'frame-gold', 'frame-holographic', 'frame-none');
      frameEl.classList.add(`frame-${state.frameStyle || 'simple'}`);
    }

    const photoEl = document.getElementById('card-photo');
    if (photoEl) {
      if (state.photoDataUrl) {
        photoEl.src = state.photoDataUrl;
      } else {
        photoEl.src = 'assets/placeholder.svg';
      }
      const scale = state.photoScale !== undefined ? state.photoScale : 1;
      const offsetX = state.photoOffsetX || 0;
      const offsetY = state.photoOffsetY || 0;
      photoEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    // 4. Section 3: Archetype Banner
    const archTextEl = document.getElementById('card-archetype-text');
    if (archTextEl) archTextEl.textContent = arch.name;

    // 5. Section 4: Narrative Description
    const descEl = document.getElementById('card-description-text');
    if (descEl) {
      let desc = state.description || 'Click to add your memory...';
      if (!desc.startsWith('"') && !desc.endsWith('"')) {
        desc = `"${desc}"`;
      }
      descEl.textContent = desc;
    }

    // 6. Section 5: Personality Stats
    if (Array.isArray(state.stats)) {
      state.stats.forEach((st, idx) => {
        const nameEl = document.getElementById(`stat-name-${idx}`);
        const barEl = document.getElementById(`stat-bar-${idx}`);
        const valEl = document.getElementById(`stat-val-${idx}`);

        if (nameEl) nameEl.textContent = st.name || `Stat ${idx + 1}`;
        const val = Math.min(99, Math.max(0, parseInt(st.value, 10) || 0));
        if (barEl) barEl.style.width = `${val}%`;
        if (valEl) valEl.textContent = String(val);
      });
    }

    // 7. Section 6: Footer Vibes & Year
    const vibesEl = document.getElementById('card-vibes');
    if (vibesEl) {
      vibesEl.innerHTML = '';
      if (Array.isArray(state.vibeIconIds) && Array.isArray(window.VIBE_ICONS)) {
        state.vibeIconIds.forEach(iconId => {
          const iconDef = window.VIBE_ICONS.find(v => v.id === iconId);
          if (iconDef) {
            const badge = document.createElement('span');
            badge.className = 'vibe-badge';
            badge.textContent = iconDef.emoji;
            badge.title = `${iconDef.name}: ${iconDef.meaning}`;
            vibesEl.appendChild(badge);
          }
        });
      }
    }

    const yearEl = document.getElementById('card-year-text');
    if (yearEl) {
      const yearStr = state.year ? String(state.year).trim() : '2026';
      yearEl.textContent = yearStr.startsWith('Est.') ? yearStr : `Est. ${yearStr}`;
    }
  };

  // Wire up DOMContentLoaded
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function() {
      window.renderCard();
    });
  }
})();
