// Card Rendering Engine for Card Forge (Two-Sided 3D Canvas)

(function() {
  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) {
      return `rgba(125, 206, 160, ${alpha})`;
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function adjustBrightness(hex, percent) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, Math.round(r + (r * percent / 100))));
    g = Math.min(255, Math.max(0, Math.round(g + (g * percent / 100))));
    b = Math.min(255, Math.max(0, Math.round(b + (b * percent / 100))));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  function resolveFontFamily(id, type) {
    if (window.AVAILABLE_FONTS && window.AVAILABLE_FONTS[type]) {
      const match = window.AVAILABLE_FONTS[type].find(f => f.id === id);
      if (match) return match.family;
    }
    if (id && id.includes(',')) return id;
    if (id) return `'${id}', sans-serif`;
    return type === 'title' ? "'Cinzel', serif" : "'Outfit', sans-serif";
  }

  window.toggleFlip = function(force) {
    if (!window.AppState) return;
    const current = !!window.AppState.isFlipped;
    const next = force !== undefined ? !!force : !current;
    window.AppState.isFlipped = next;
    if (typeof window.renderCard === 'function') {
      window.renderCard();
    }
  };

  window.renderCard = function() {
    const frontEl = document.getElementById('card-front') || document.getElementById('card');
    const backEl = document.getElementById('card-back');
    const flipperEl = document.getElementById('card-flipper');
    if (!frontEl) return;

    const state = window.AppState || {};
    const arch = typeof window.getArchetype === 'function' ? window.getArchetype(state.archetypeId) : {};

    // 1. Resolve Colors, Fonts & Textures
    const primary = state.primaryColor || arch.primary || '#2D7D46';
    const accent = state.accentColor || arch.accent || '#7DCEA0';
    const gradient = state.primaryColor
      ? `linear-gradient(135deg, ${primary} 0%, ${adjustBrightness(primary, -35)} 100%)`
      : (arch.gradient || `linear-gradient(135deg, ${primary} 0%, #164324 100%)`);
    const glow = hexToRgba(accent, 0.45);

    const titleFont = resolveFontFamily(state.fontFamilyTitle, 'title');
    const bodyFont = resolveFontFamily(state.fontFamilyBody, 'body');
    const texture = state.cardTexture || 'smooth';

    const textureClasses = [
      'texture-smooth', 'texture-holographic', 'texture-parchment', 'texture-cosmic',
      'texture-linen', 'texture-leather', 'texture-gold', 'texture-carbon'
    ];

    function applyFaceTheming(face) {
      if (!face || !face.style) return;
      face.style.setProperty('--archetype-primary', primary);
      face.style.setProperty('--archetype-accent', accent);
      face.style.setProperty('--archetype-gradient', gradient);
      face.style.setProperty('--glow-color', glow);
      face.style.setProperty('--font-title', titleFont);
      face.style.setProperty('--font-body', bodyFont);

      if (face.classList) {
        textureClasses.forEach(c => face.classList.remove(c));
        face.classList.add(`texture-${texture}`);
        face.classList.toggle('card--placeholder', !state.isCustomized);
      }
    }

    applyFaceTheming(frontEl);
    if (backEl) applyFaceTheming(backEl);

    // Update download buttons & toolbar theme glow
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn && downloadBtn.style) {
      downloadBtn.style.setProperty('--archetype-primary', primary);
      downloadBtn.style.setProperty('--archetype-accent', accent);
      downloadBtn.style.setProperty('--glow-color', glow);
    }

    // 2. Front Face Section 1: Header
    const badgeEl = document.getElementById('card-badge');
    if (badgeEl) badgeEl.textContent = state.archetypeBadge || arch.badgeEmoji || '🧭';

    const titleEl = document.getElementById('card-title-text');
    if (titleEl) {
      titleEl.textContent = state.title || "Friend's Name";
      titleEl.style.fontFamily = titleFont;
    }

    const hpEl = document.getElementById('card-hp-text');
    if (hpEl) hpEl.textContent = String(state.hp !== undefined ? state.hp : 100);

    // 3. Front Face Section 2: Image & Frame
    const frameEl = document.getElementById('card-image-frame');
    if (frameEl && frameEl.classList) {
      frameEl.classList.remove('frame-simple', 'frame-gold', 'frame-holographic', 'frame-none');
      frameEl.classList.add(`frame-${state.frameStyle || 'simple'}`);
    }

    const photoEl = document.getElementById('card-photo');
    if (photoEl) {
      photoEl.src = state.photoDataUrl || 'assets/placeholder.svg';
      const scale = state.photoScale !== undefined ? state.photoScale : 1;
      const offsetX = state.photoOffsetX || 0;
      const offsetY = state.photoOffsetY || 0;
      photoEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    // 4. Front Face Section 3: Archetype Banner
    const archTextEl = document.getElementById('card-archetype-text');
    if (archTextEl) {
      archTextEl.textContent = state.archetypeName || arch.name || 'The Adventurer';
      archTextEl.style.fontFamily = bodyFont;
    }

    // 5. Front Face Section 4: Narrative Description
    const descEl = document.getElementById('card-description-text');
    if (descEl) {
      let desc = state.description || 'Click to add your memory...';
      if (!desc.startsWith('"') && !desc.endsWith('"')) {
        desc = `"${desc}"`;
      }
      descEl.textContent = desc;
      descEl.style.fontFamily = bodyFont;
    }

    // 6. Front Face Section 5: Personality Stats
    if (Array.isArray(state.stats)) {
      state.stats.forEach((st, idx) => {
        const nameEl = document.getElementById(`stat-name-${idx}`);
        const barEl = document.getElementById(`stat-bar-${idx}`);
        const valEl = document.getElementById(`stat-val-${idx}`);

        if (nameEl) {
          nameEl.textContent = st.name || `Stat ${idx + 1}`;
          nameEl.style.fontFamily = bodyFont;
        }
        const val = Math.min(99, Math.max(0, parseInt(st.value, 10) || 0));
        if (barEl) barEl.style.width = `${val}%`;
        if (valEl) valEl.textContent = String(val);
      });
    }

    // 7. Front Face Section 6: Footer Vibes & Year
    const vibesEl = document.getElementById('card-vibes');
    if (vibesEl) {
      vibesEl.innerHTML = '';
      const renderedBadges = [];

      // Support custom vibeIcons objects
      if (Array.isArray(state.vibeIcons) && state.vibeIcons.length > 0) {
        state.vibeIcons.slice(0, 4).forEach(v => {
          if (v && v.emoji) {
            renderedBadges.push({ emoji: v.emoji, name: v.name || '' });
          }
        });
      } else if (Array.isArray(state.vibeIconIds) && Array.isArray(window.VIBE_ICONS)) {
        // Fallback to legacy presets
        state.vibeIconIds.slice(0, 4).forEach(iconId => {
          const iconDef = window.VIBE_ICONS.find(v => v.id === iconId);
          if (iconDef) {
            renderedBadges.push({ emoji: iconDef.emoji, name: `${iconDef.name}: ${iconDef.meaning}` });
          }
        });
      }

      renderedBadges.forEach(b => {
        const badge = document.createElement('span');
        badge.className = 'vibe-badge';
        badge.textContent = b.emoji;
        if (b.name) badge.title = b.name;
        vibesEl.appendChild(badge);
      });
    }

    const yearEl = document.getElementById('card-year-text');
    if (yearEl) {
      const yearStr = state.year ? String(state.year).trim() : '2026';
      yearEl.textContent = yearStr.startsWith('Est.') ? yearStr : `Est. ${yearStr}`;
    }

    // 8. Back Face Content & Layout
    if (backEl) {
      const backTitleEl = document.getElementById('card-back-title');
      if (backTitleEl) {
        backTitleEl.textContent = state.backTitle || 'Happy Birthday!';
        backTitleEl.style.fontFamily = titleFont;
      }

      const letterTextEl = document.getElementById('card-back-letter-text');
      if (letterTextEl) {
        letterTextEl.textContent = state.backLetter || '';
        letterTextEl.style.fontFamily = bodyFont;
      }

      const signoffEl = document.getElementById('card-back-signoff');
      if (signoffEl) {
        signoffEl.textContent = state.backSignoff || 'With love, Your Best Friend';
        signoffEl.style.fontFamily = titleFont;
      }

      const dateEl = document.getElementById('card-back-date');
      if (dateEl) {
        dateEl.textContent = state.backDate || 'October 2026';
      }

      const sealEmojiEl = document.getElementById('card-back-seal-emoji');
      if (sealEmojiEl) {
        sealEmojiEl.textContent = state.backSealEmoji || '🎂';
      }

      const crestTitleEl = document.getElementById('card-back-crest-title');
      if (crestTitleEl) {
        crestTitleEl.textContent = state.backCrestTitle || 'LEGENDARY FRIENDSHIP';
        crestTitleEl.style.fontFamily = titleFont;
      }

      // Toggle Letter vs TCG layout containers
      const isTcg = state.backStyle === 'tcg';
      if (backEl.querySelector) {
        const letterContainer = backEl.querySelector('.back-letter-container');
        const tcgContainer = backEl.querySelector('.back-tcg-container');
        if (letterContainer) letterContainer.style.display = isTcg ? 'none' : 'block';
        if (tcgContainer) tcgContainer.style.display = isTcg ? 'flex' : 'none';
      }
    }

    // 9. 3D Flip State Synchronization
    if (flipperEl && flipperEl.classList) {
      flipperEl.classList.toggle('is-flipped', !!state.isFlipped);
    }
    const flipLabel = document.getElementById('flip-label');
    if (flipLabel) {
      flipLabel.textContent = state.isFlipped ? 'Flip to Front' : 'Flip to Back';
    }

    // 10. Sync Style Toolbar controls
    const primaryPicker = document.getElementById('primary-color-picker');
    if (primaryPicker && primaryPicker.value !== primary) primaryPicker.value = primary;

    const accentPicker = document.getElementById('accent-color-picker');
    if (accentPicker && accentPicker.value !== accent) accentPicker.value = accent;

    const fontTitleSelect = document.getElementById('font-title-select');
    if (fontTitleSelect && state.fontFamilyTitle && fontTitleSelect.value !== state.fontFamilyTitle) {
      fontTitleSelect.value = state.fontFamilyTitle;
    }

    const fontBodySelect = document.getElementById('font-body-select');
    if (fontBodySelect && state.fontFamilyBody && fontBodySelect.value !== state.fontFamilyBody) {
      fontBodySelect.value = state.fontFamilyBody;
    }

    const texturePicker = document.getElementById('texture-picker');
    if (texturePicker && texturePicker.children.length > 0) {
      Array.from(texturePicker.children).forEach(ch => {
        if (ch.classList && ch.getAttribute) {
          ch.classList.toggle('active', ch.getAttribute('data-texture') === texture);
        }
      });
    }
  };

  window.initStyleToolbar = function() {
    const toolbar = document.getElementById('style-toolbar');
    if (!toolbar) return;

    // 1. Texture Chips
    const texturePicker = document.getElementById('texture-picker');
    if (texturePicker && window.CARD_TEXTURES && texturePicker.children.length === 0) {
      window.CARD_TEXTURES.forEach(tex => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'texture-chip';
        btn.textContent = tex.name.split(' ')[0];
        btn.title = `${tex.name}: ${tex.description}`;
        btn.setAttribute('data-texture', tex.id);
        if (window.AppState && window.AppState.cardTexture === tex.id) {
          btn.classList.add('active');
        }
        btn.addEventListener('click', function() {
          const current = texturePicker.querySelector ? texturePicker.querySelector('.texture-chip.active') : null;
          if (current) current.classList.remove('active');
          btn.classList.add('active');
          window.updateState({ cardTexture: tex.id });
        });
        texturePicker.appendChild(btn);
      });
    }

    // 2. Title Font Select
    const fontTitleSelect = document.getElementById('font-title-select');
    if (fontTitleSelect) {
      if (window.AppState && window.AppState.fontFamilyTitle) {
        fontTitleSelect.value = window.AppState.fontFamilyTitle;
      }
      fontTitleSelect.addEventListener('change', function() {
        window.updateState({ fontFamilyTitle: this.value });
      });
    }

    // 3. Body Font Select
    const fontBodySelect = document.getElementById('font-body-select');
    if (fontBodySelect) {
      if (window.AppState && window.AppState.fontFamilyBody) {
        fontBodySelect.value = window.AppState.fontFamilyBody;
      }
      fontBodySelect.addEventListener('change', function() {
        window.updateState({ fontFamilyBody: this.value });
      });
    }

    // 4. Primary Color Picker
    const primaryPicker = document.getElementById('primary-color-picker');
    if (primaryPicker) {
      if (window.AppState && window.AppState.primaryColor) {
        primaryPicker.value = window.AppState.primaryColor;
      }
      primaryPicker.addEventListener('input', function() {
        window.updateState({ primaryColor: this.value });
      });
    }

    // 5. Accent Color Picker
    const accentPicker = document.getElementById('accent-color-picker');
    if (accentPicker) {
      if (window.AppState && window.AppState.accentColor) {
        accentPicker.value = window.AppState.accentColor;
      }
      accentPicker.addEventListener('input', function() {
        window.updateState({ accentColor: this.value });
      });
    }
  };

  // Wire up Global Interactions
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function() {
      window.initStyleToolbar();
      window.renderCard();

      const flipBtn = document.getElementById('flip-btn');
      if (flipBtn) {
        flipBtn.addEventListener('click', function() {
          window.toggleFlip();
        });
      }

      // Keyboard shortcut: Press F/f to flip card (unless typing in input/textarea)
      document.addEventListener('keydown', function(e) {
        if (e.key === 'f' || e.key === 'F') {
          const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
          if (tag !== 'input' && tag !== 'textarea') {
            window.toggleFlip();
          }
        }
      });
    });
  }
})();
