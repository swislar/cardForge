// Popover Editing System for Card Forge

(function() {
  let activePopover = null;
  let activeSection = null;

  // Global showPopover
  window.showPopover = function(sectionId) {
    window.hidePopover();

    const popoverRoot = document.getElementById('popover-root');
    if (!popoverRoot) return;

    activeSection = sectionId;

    // Popover wrapper
    const popover = document.createElement('div');
    popover.className = 'popover-card';
    popover.id = 'active-popover';

    // Header with title and close button
    const header = document.createElement('div');
    header.className = 'popover-header';

    const titles = {
      header: 'Edit Name & HP',
      image: 'Edit Photo & Frame',
      archetype: 'Customize Archetype & Badge',
      description: 'Edit Memory & Narrative',
      stats: 'Adjust Personality Stats',
      footer: 'Select & Add Vibe Badges',
      'back-header': 'Edit Card-Back Title & Style',
      'back-letter': 'Write Birthday Letter',
      'back-footer': 'Sign-off, Date & Wax Seal'
    };

    const titleEl = document.createElement('span');
    titleEl.className = 'popover-title';
    titleEl.textContent = titles[sectionId] || 'Edit Section';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'popover-close-btn';
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', 'Close editor');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      window.hidePopover();
    });

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    popover.appendChild(header);

    // Body content builder
    const body = document.createElement('div');
    body.className = 'popover-body';

    switch (sectionId) {
      case 'header':
        buildHeaderEditor(body);
        break;
      case 'image':
        buildImageEditor(body);
        break;
      case 'archetype':
        buildArchetypeEditor(body);
        break;
      case 'description':
        buildDescriptionEditor(body);
        break;
      case 'stats':
        buildStatsEditor(body);
        break;
      case 'footer':
        buildFooterEditor(body);
        break;
      case 'back-header':
        buildBackHeaderEditor(body);
        break;
      case 'back-letter':
        buildBackLetterEditor(body);
        break;
      case 'back-footer':
        buildBackFooterEditor(body);
        break;
      default:
        body.textContent = 'No editor available.';
    }

    popover.appendChild(body);
    popoverRoot.appendChild(popover);
    activePopover = popover;

    // Manage backdrop (for mobile bottom-sheet & focus)
    let backdrop = document.getElementById('popover-backdrop');
    if (!backdrop && document.body && document.createElement) {
      backdrop = document.createElement('div');
      backdrop.id = 'popover-backdrop';
      backdrop.className = 'popover-backdrop';
      backdrop.addEventListener('click', function() {
        window.hidePopover();
      });
      document.body.appendChild(backdrop);
    }
    if (backdrop) {
      backdrop.classList.add('active');
    }

    // Position popover
    positionPopover(sectionId, popover);
  };

  window.hidePopover = function() {
    if (activePopover && activePopover.parentElement) {
      activePopover.parentElement.removeChild(activePopover);
    }
    const backdrop = document.getElementById ? document.getElementById('popover-backdrop') : null;
    if (backdrop) {
      backdrop.classList.remove('active');
    }
    activePopover = null;
    activeSection = null;
  };

  // Positioning logic
  function positionPopover(sectionId, popoverEl) {
    if (window.innerWidth <= 768) {
      // Bottom sheet on mobile via CSS
      popoverEl.style.top = '';
      popoverEl.style.left = '';
      return;
    }

    const cardEl = (window.AppState && window.AppState.isFlipped ? document.getElementById('card-back') : (document.getElementById('card-front') || document.getElementById('card'))) || document.getElementById('card');
    const targetSection = document.getElementById(`card-${sectionId}`) || cardEl;
    if (!cardEl || !targetSection) return;

    const cardRect = cardEl.getBoundingClientRect();
    const secRect = targetSection.getBoundingClientRect();
    const scrollY = window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || 0;
    const scrollX = window.pageXOffset || (document.documentElement ? document.documentElement.scrollLeft : 0) || 0;

    // Place to the right of the card with 20px gap
    let left = cardRect.right + 20 + scrollX;
    let top = secRect.top + scrollY - 20;

    // Boundary protection: If overflowing window on right, place to the left of the card
    if (left + 350 > window.innerWidth + scrollX) {
      left = cardRect.left - 350 + scrollX;
      if (left < 10) left = 10;
    }

    // Vertical boundary protection
    if (top < 10 + scrollY) top = 10 + scrollY;

    popoverEl.style.left = `${left}px`;
    popoverEl.style.top = `${top}px`;
  }

  // ------------------------------------------------------------------------
  // Section Editors
  // ------------------------------------------------------------------------

  // 1. Header Editor
  function buildHeaderEditor(container) {
    const state = window.AppState;

    // Title Field
    const titleField = document.createElement('div');
    titleField.className = 'popover-field';

    const titleLabel = document.createElement('label');
    titleLabel.className = 'popover-label';
    titleLabel.textContent = "Friend's Name / Nickname (Max 24 chars)";

    const titleInput = document.createElement('input');
    titleInput.className = 'popover-input';
    titleInput.type = 'text';
    titleInput.maxLength = 24;
    titleInput.value = state.title;

    const titleCounter = document.createElement('div');
    titleCounter.className = 'char-counter';
    titleCounter.textContent = `${titleInput.value.length} / 24`;

    titleInput.addEventListener('input', function() {
      titleCounter.textContent = `${titleInput.value.length} / 24`;
      window.updateState({ title: titleInput.value });
    });

    titleField.appendChild(titleLabel);
    titleField.appendChild(titleInput);
    titleField.appendChild(titleCounter);
    container.appendChild(titleField);

    // HP Field
    const hpField = document.createElement('div');
    hpField.className = 'popover-field';

    const hpLabel = document.createElement('label');
    hpLabel.className = 'popover-label';
    hpLabel.textContent = 'Hype Points (HP: 1 - 999)';

    const hpInput = document.createElement('input');
    hpInput.className = 'popover-input';
    hpInput.type = 'number';
    hpInput.min = '1';
    hpInput.max = '999';
    hpInput.value = state.hp;

    hpInput.addEventListener('input', function() {
      const val = parseInt(hpInput.value, 10);
      window.updateState({ hp: isNaN(val) ? 0 : Math.min(999, Math.max(1, val)) });
    });

    hpField.appendChild(hpLabel);
    hpField.appendChild(hpInput);
    container.appendChild(hpField);
  }

  // 2. Archetype Editor
  function buildArchetypeEditor(container) {
    const state = window.AppState;

    // 1. Custom Archetype Title & Badge
    const customSection = document.createElement('div');
    customSection.className = 'popover-field';

    const titleLabel = document.createElement('label');
    titleLabel.className = 'popover-label';
    titleLabel.textContent = 'Custom Archetype Title & Badge Emoji:';
    customSection.appendChild(titleLabel);

    const inputRow = document.createElement('div');
    inputRow.className = 'archetype-custom-row';

    const badgeInput = document.createElement('input');
    badgeInput.type = 'text';
    badgeInput.id = 'custom-archetype-badge';
    badgeInput.className = 'popover-input custom-badge-input';
    badgeInput.maxLength = 4;
    badgeInput.value = state.archetypeBadge || '🧭';
    badgeInput.placeholder = 'Emoji';
    badgeInput.title = 'Custom Archetype Badge Emoji';
    badgeInput.addEventListener('input', function() {
      window.updateState({ archetypeBadge: badgeInput.value });
    });

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'custom-archetype-name';
    nameInput.className = 'popover-input custom-name-input';
    nameInput.maxLength = 24;
    nameInput.value = state.archetypeName || 'The Adventurer';
    nameInput.placeholder = 'Archetype Name (e.g. The Legend)';
    nameInput.title = 'Custom Archetype Name';
    nameInput.addEventListener('input', function() {
      window.updateState({ archetypeName: nameInput.value });
    });

    inputRow.appendChild(badgeInput);
    inputRow.appendChild(nameInput);
    customSection.appendChild(inputRow);
    container.appendChild(customSection);

    // 2. Presets Grid
    const presetsLabel = document.createElement('label');
    presetsLabel.className = 'popover-label';
    presetsLabel.style.marginTop = '12px';
    presetsLabel.textContent = 'Or Choose From Archetype Presets:';
    container.appendChild(presetsLabel);

    const list = document.createElement('div');
    list.className = 'archetype-grid';

    if (Array.isArray(window.ARCHETYPES)) {
      window.ARCHETYPES.forEach(arch => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'archetype-card-item';
        if (arch.id === window.AppState.archetypeId) {
          item.classList.add('active');
        }

        const swatch = document.createElement('div');
        swatch.className = 'archetype-swatch';
        swatch.style.background = arch.gradient;
        swatch.style.borderColor = arch.accent;

        const info = document.createElement('div');
        info.className = 'archetype-item-info';

        const nameLine = document.createElement('div');
        nameLine.className = 'archetype-item-name';
        nameLine.innerHTML = `<span class="badge-icon">${arch.badgeEmoji}</span> ${arch.name}`;

        const tagline = document.createElement('div');
        tagline.className = 'archetype-item-tagline';
        tagline.textContent = arch.tagline;

        info.appendChild(nameLine);
        info.appendChild(tagline);
        item.appendChild(swatch);
        item.appendChild(info);

        item.addEventListener('click', function() {
          const currentActive = list.querySelector('.archetype-card-item.active');
          if (currentActive) currentActive.classList.remove('active');
          item.classList.add('active');
          nameInput.value = arch.name;
          badgeInput.value = arch.badgeEmoji;
          window.updateState({ archetypeId: arch.id });
        });

        list.appendChild(item);
      });
    }

    container.appendChild(list);
  }

  // 3. Narrative Description Editor
  function buildDescriptionEditor(container) {
    const state = window.AppState;

    const field = document.createElement('div');
    field.className = 'popover-field';

    const label = document.createElement('label');
    label.className = 'popover-label';
    label.textContent = 'Friendship Memoir / Narrative (Max 180 chars)';

    const textarea = document.createElement('textarea');
    textarea.className = 'popover-textarea';
    textarea.maxLength = 180;
    textarea.rows = 4;
    textarea.value = state.description;

    const counter = document.createElement('div');
    counter.className = 'char-counter';
    counter.textContent = `${textarea.value.length} / 180`;

    textarea.addEventListener('input', function() {
      counter.textContent = `${textarea.value.length} / 180`;
      window.updateState({ description: textarea.value });
    });

    field.appendChild(label);
    field.appendChild(textarea);
    field.appendChild(counter);
    container.appendChild(field);
  }

  // 4. Personality Stats Editor
  function buildStatsEditor(container) {
    const state = window.AppState;

    const helper = document.createElement('p');
    helper.className = 'popover-hint';
    helper.textContent = 'Customize traits and rating bars (0 - 99):';
    container.appendChild(helper);

    state.stats.forEach((st, idx) => {
      const row = document.createElement('div');
      row.className = 'stat-edit-row';

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'popover-input stat-edit-label';
      labelInput.maxLength = 12;
      labelInput.value = st.name;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'stat-edit-slider';
      slider.min = '0';
      slider.max = '99';
      slider.value = st.value;

      const valDisplay = document.createElement('span');
      valDisplay.className = 'stat-edit-val';
      valDisplay.textContent = st.value;

      function updateThisStat() {
        const newStats = [...window.AppState.stats];
        newStats[idx] = {
          name: labelInput.value || `Stat ${idx + 1}`,
          value: parseInt(slider.value, 10) || 0
        };
        valDisplay.textContent = slider.value;
        window.updateState({ stats: newStats });
      }

      labelInput.addEventListener('input', updateThisStat);
      slider.addEventListener('input', updateThisStat);

      row.appendChild(labelInput);
      row.appendChild(slider);
      row.appendChild(valDisplay);
      container.appendChild(row);
    });
  }

  // 5. Footer Editor (Vibe Badges & Year)
  function buildFooterEditor(container) {
    const state = window.AppState;

    // Helper to get active badges array
    function getActiveBadges() {
      if (Array.isArray(window.AppState.vibeIcons) && window.AppState.vibeIcons.length > 0) {
        return window.AppState.vibeIcons.map(b => (typeof b === 'object' && b ? { emoji: b.emoji, name: b.name || '' } : { emoji: String(b), name: '' }));
      }
      if (Array.isArray(window.AppState.vibeIconIds) && Array.isArray(window.VIBE_ICONS)) {
        return window.AppState.vibeIconIds.map(id => {
          const found = window.VIBE_ICONS.find(v => v.id === id);
          return found ? { emoji: found.emoji, name: found.name, id: found.id } : null;
        }).filter(Boolean);
      }
      return [];
    }

    function syncBadges(badges) {
      window.updateState({
        vibeIcons: badges,
        vibeIconIds: badges.map(b => b.id || '').filter(Boolean)
      });
    }

    // 1. Active Badges Tray
    const activeLabel = document.createElement('label');
    activeLabel.className = 'popover-label';
    activeLabel.textContent = 'Active Vibe Badges (up to 4):';
    container.appendChild(activeLabel);

    const badgeTray = document.createElement('div');
    badgeTray.className = 'popover-badge-tray';
    container.appendChild(badgeTray);

    function renderActiveTray() {
      badgeTray.innerHTML = '';
      const badges = getActiveBadges();
      if (badges.length === 0) {
        const emptyMsg = document.createElement('span');
        emptyMsg.className = 'popover-hint';
        emptyMsg.textContent = 'No badges yet. Add a custom emoji or pick a preset!';
        badgeTray.appendChild(emptyMsg);
        return;
      }

      badges.forEach((b, idx) => {
        const chip = document.createElement('div');
        chip.className = 'popover-badge-chip';
        chip.innerHTML = `<span class="badge-emoji">${b.emoji}</span> <span class="badge-name">${b.name || ''}</span>`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'badge-remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = `Remove ${b.name || b.emoji}`;
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          const current = getActiveBadges();
          current.splice(idx, 1);
          syncBadges(current);
          renderActiveTray();
          renderPresetGrid();
        });

        chip.appendChild(removeBtn);
        badgeTray.appendChild(chip);
      });
    }

    // 2. Custom Emoji Badge Creator
    const customWrap = document.createElement('div');
    customWrap.className = 'custom-badge-creator';

    const customLabel = document.createElement('label');
    customLabel.className = 'popover-label';
    customLabel.style.marginTop = '12px';
    customLabel.textContent = 'Add Custom Emoji Badge:';
    customWrap.appendChild(customLabel);

    const customRow = document.createElement('div');
    customRow.className = 'custom-badge-row';

    const customEmojiInput = document.createElement('input');
    customEmojiInput.type = 'text';
    customEmojiInput.id = 'custom-emoji-input';
    customEmojiInput.className = 'popover-input custom-emoji-input';
    customEmojiInput.placeholder = 'Emoji (e.g. 🎂)';
    customEmojiInput.maxLength = 4;

    const customLabelInput = document.createElement('input');
    customLabelInput.type = 'text';
    customLabelInput.id = 'custom-emoji-label';
    customLabelInput.className = 'popover-input custom-emoji-label';
    customLabelInput.placeholder = 'Badge Name (optional)';
    customLabelInput.maxLength = 16;

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.id = 'add-custom-badge-btn';
    addBtn.className = 'btn btn-secondary custom-badge-add-btn';
    addBtn.textContent = 'Add';

    addBtn.addEventListener('click', function() {
      const emoji = (customEmojiInput.value || '').trim() || '✨';
      const name = (customLabelInput.value || '').trim() || 'Vibe';
      const current = getActiveBadges();
      if (current.length >= 4) {
        current.shift();
      }
      current.push({ emoji, name });
      syncBadges(current);
      customEmojiInput.value = '';
      if (customLabelInput) customLabelInput.value = '';
      renderActiveTray();
      renderPresetGrid();
    });

    customRow.appendChild(customEmojiInput);
    customRow.appendChild(customLabelInput);
    customRow.appendChild(addBtn);
    customWrap.appendChild(customRow);
    container.appendChild(customWrap);

    // 3. Preset Icons Grid
    const presetLabel = document.createElement('label');
    presetLabel.className = 'popover-label';
    presetLabel.style.marginTop = '12px';
    presetLabel.textContent = 'Or Choose From Vibe Presets:';
    container.appendChild(presetLabel);

    const iconGrid = document.createElement('div');
    iconGrid.className = 'vibe-picker-grid';

    function renderPresetGrid() {
      iconGrid.innerHTML = '';
      const current = getActiveBadges();

      if (Array.isArray(window.VIBE_ICONS)) {
        window.VIBE_ICONS.forEach(icon => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'vibe-picker-item';
          btn.title = `${icon.name}: ${icon.meaning}`;
          btn.innerHTML = `<span class="vibe-emoji">${icon.emoji}</span><span class="vibe-name">${icon.name}</span>`;

          const isSelected = current.some(b => b.emoji === icon.emoji || b.name === icon.name || b.id === icon.id);
          if (isSelected) {
            btn.classList.add('selected');
          }

          btn.addEventListener('click', function() {
            const active = getActiveBadges();
            const existingIdx = active.findIndex(b => b.emoji === icon.emoji || b.name === icon.name || b.id === icon.id);

            if (existingIdx !== -1) {
              active.splice(existingIdx, 1);
            } else {
              if (active.length >= 4) {
                active.shift();
              }
              active.push({ emoji: icon.emoji, name: icon.name, id: icon.id });
            }
            syncBadges(active);
            renderActiveTray();
            renderPresetGrid();
          });

          iconGrid.appendChild(btn);
        });
      }
    }

    renderActiveTray();
    renderPresetGrid();
    container.appendChild(iconGrid);

    // 4. Year Input
    const yearField = document.createElement('div');
    yearField.className = 'popover-field';
    yearField.style.marginTop = '12px';

    const yearLabel = document.createElement('label');
    yearLabel.className = 'popover-label';
    yearLabel.textContent = 'Friendship Established Year';

    const yearInput = document.createElement('input');
    yearInput.type = 'text';
    yearInput.className = 'popover-input';
    yearInput.maxLength = 10;
    yearInput.placeholder = 'e.g. 2018 or Est. 2018';
    yearInput.value = state.year;

    yearInput.addEventListener('input', function() {
      window.updateState({ year: yearInput.value });
    });

    yearField.appendChild(yearLabel);
    yearField.appendChild(yearInput);
    container.appendChild(yearField);
  }

  // 6. Image Editor
  function buildImageEditor(container) {
    const state = window.AppState;

    // Drop Zone / File Upload
    const dropZone = document.createElement('div');
    dropZone.className = 'photo-dropzone';
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

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'photo-file-input';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    dropZone.appendChild(fileInput);

    function handleFile(file) {
      if (!file || !file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          // Resize to max 1200px width/height to prevent memory freezes
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          window.updateState({
            photoDataUrl: resizedDataUrl,
            photoOffsetX: 0,
            photoOffsetY: 0,
            photoScale: 1
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    container.appendChild(dropZone);

    // Frame Style Selector
    const frameField = document.createElement('div');
    frameField.className = 'popover-field';

    const frameLabel = document.createElement('label');
    frameLabel.className = 'popover-label';
    frameLabel.textContent = 'Frame Border Style:';

    const frameSelect = document.createElement('select');
    frameSelect.className = 'popover-select';
    frameSelect.innerHTML = `
      <option value="simple">Simple Border</option>
      <option value="gold">Gold Foil Glow</option>
      <option value="holographic">Holographic Prismatic</option>
      <option value="none">None (Borderless)</option>
    `;
    frameSelect.value = state.frameStyle || 'simple';

    frameSelect.addEventListener('change', () => {
      window.updateState({ frameStyle: frameSelect.value });
    });

    frameField.appendChild(frameLabel);
    frameField.appendChild(frameSelect);
    container.appendChild(frameField);

    // Zoom / Scale Slider
    const scaleField = document.createElement('div');
    scaleField.className = 'popover-field';

    const scaleLabel = document.createElement('label');
    scaleLabel.className = 'popover-label';
    scaleLabel.textContent = `Photo Zoom (${Math.round((state.photoScale || 1) * 100)}%):`;

    const scaleSlider = document.createElement('input');
    scaleSlider.type = 'range';
    scaleSlider.className = 'stat-edit-slider';
    scaleSlider.min = '0.5';
    scaleSlider.max = '3';
    scaleSlider.step = '0.05';
    scaleSlider.value = state.photoScale || 1;

    scaleSlider.addEventListener('input', () => {
      const s = parseFloat(scaleSlider.value);
      scaleLabel.textContent = `Photo Zoom (${Math.round(s * 100)}%):`;
      window.updateState({ photoScale: s });
    });

    scaleField.appendChild(scaleLabel);
    scaleField.appendChild(scaleSlider);
    container.appendChild(scaleField);

    // Drag hint & Reset
    const actionsRow = document.createElement('div');
    actionsRow.className = 'photo-actions-row';

    const dragHint = document.createElement('span');
    dragHint.className = 'photo-drag-hint';
    dragHint.textContent = '💡 Drag photo on card to reposition';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'popover-small-btn';
    resetBtn.textContent = 'Reset Position';
    resetBtn.addEventListener('click', () => {
      scaleSlider.value = 1;
      scaleLabel.textContent = 'Photo Zoom (100%):';
      window.updateState({ photoOffsetX: 0, photoOffsetY: 0, photoScale: 1 });
    });

    actionsRow.appendChild(dragHint);
    actionsRow.appendChild(resetBtn);
    container.appendChild(actionsRow);
  }

  // 7. Back Header Editor
  function buildBackHeaderEditor(container) {
    const state = window.AppState;

    // Title Field
    const titleField = document.createElement('div');
    titleField.className = 'popover-field';

    const titleLabel = document.createElement('label');
    titleLabel.className = 'popover-label';
    titleLabel.textContent = 'Card Back Title / Occasion:';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'back-title-input';
    titleInput.className = 'popover-input';
    titleInput.maxLength = 36;
    titleInput.placeholder = 'e.g. Happy Birthday!';
    titleInput.value = state.backTitle || 'Happy Birthday!';
    titleInput.addEventListener('input', function() {
      window.updateState({ backTitle: titleInput.value });
    });

    titleField.appendChild(titleLabel);
    titleField.appendChild(titleInput);
    container.appendChild(titleField);

    // Layout Selector
    const layoutField = document.createElement('div');
    layoutField.className = 'popover-field';
    layoutField.style.marginTop = '12px';

    const layoutLabel = document.createElement('label');
    layoutLabel.className = 'popover-label';
    layoutLabel.textContent = 'Back Design Style:';

    const layoutSelect = document.createElement('select');
    layoutSelect.id = 'back-layout-select';
    layoutSelect.className = 'popover-select';

    const optLetter = document.createElement('option');
    optLetter.value = 'letter';
    optLetter.textContent = 'Birthday Letter & Wax Seal (Spacious Memoir)';
    if (state.backLayout === 'letter' || state.backStyle === 'letter') optLetter.selected = true;

    const optTcg = document.createElement('option');
    optTcg.value = 'tcg';
    optTcg.textContent = 'TCG Deck Crest & Emblem (Card Game Back)';
    if (state.backLayout === 'tcg' || state.backStyle === 'tcg') optTcg.selected = true;

    layoutSelect.appendChild(optLetter);
    layoutSelect.appendChild(optTcg);

    layoutSelect.addEventListener('change', function() {
      window.updateState({ backLayout: layoutSelect.value, backStyle: layoutSelect.value });
    });

    layoutField.appendChild(layoutLabel);
    layoutField.appendChild(layoutSelect);
    container.appendChild(layoutField);
  }

  // 8. Back Letter Editor
  function buildBackLetterEditor(container) {
    const state = window.AppState;

    const field = document.createElement('div');
    field.className = 'popover-field';

    const label = document.createElement('label');
    label.className = 'popover-label';
    label.textContent = 'Personal Birthday Letter (Max 600 chars):';

    const textarea = document.createElement('textarea');
    textarea.id = 'back-letter-input';
    textarea.className = 'popover-textarea';
    textarea.rows = 8;
    textarea.maxLength = 600;
    textarea.placeholder = 'Write your personal birthday message, shared memories, inside jokes, and wishes...';
    textarea.value = state.backLetter || '';

    const counter = document.createElement('div');
    counter.id = 'back-letter-counter';
    counter.className = 'char-counter';
    counter.textContent = `${textarea.value.length} / 600`;

    textarea.addEventListener('input', function() {
      counter.textContent = `${textarea.value.length} / 600`;
      window.updateState({ backLetter: textarea.value });
    });

    field.appendChild(label);
    field.appendChild(textarea);
    field.appendChild(counter);
    container.appendChild(field);
  }

  // 9. Back Footer Editor (Sign-off, Date, Wax Seal)
  function buildBackFooterEditor(container) {
    const state = window.AppState;

    // Sign-off
    const signoffField = document.createElement('div');
    signoffField.className = 'popover-field';

    const signoffLabel = document.createElement('label');
    signoffLabel.className = 'popover-label';
    signoffLabel.textContent = 'Sign-off Signature:';

    const signoffInput = document.createElement('input');
    signoffInput.type = 'text';
    signoffInput.id = 'back-signoff-input';
    signoffInput.className = 'popover-input';
    signoffInput.maxLength = 36;
    signoffInput.placeholder = 'e.g. With love, Your Best Friend';
    signoffInput.value = state.backSignoff || '';
    signoffInput.addEventListener('input', function() {
      window.updateState({ backSignoff: signoffInput.value });
    });

    signoffField.appendChild(signoffLabel);
    signoffField.appendChild(signoffInput);
    container.appendChild(signoffField);

    // Date / Milestone
    const dateField = document.createElement('div');
    dateField.className = 'popover-field';
    dateField.style.marginTop = '10px';

    const dateLabel = document.createElement('label');
    dateLabel.className = 'popover-label';
    dateLabel.textContent = 'Date / Milestone:';

    const dateInput = document.createElement('input');
    dateInput.type = 'text';
    dateInput.id = 'back-date-input';
    dateInput.className = 'popover-input';
    dateInput.maxLength = 24;
    dateInput.placeholder = 'e.g. October 2026';
    dateInput.value = state.backDate || '';
    dateInput.addEventListener('input', function() {
      window.updateState({ backDate: dateInput.value });
    });

    dateField.appendChild(dateLabel);
    dateField.appendChild(dateInput);
    container.appendChild(dateField);

    // Wax Seal Emoji
    const sealField = document.createElement('div');
    sealField.className = 'popover-field';
    sealField.style.marginTop = '10px';

    const sealLabel = document.createElement('label');
    sealLabel.className = 'popover-label';
    sealLabel.textContent = 'Wax Seal Emblem (Type or pick emoji):';

    const sealInput = document.createElement('input');
    sealInput.type = 'text';
    sealInput.id = 'back-seal-input';
    sealInput.className = 'popover-input';
    sealInput.maxLength = 4;
    sealInput.placeholder = '🎂';
    sealInput.value = state.backSealEmoji || '🎂';
    sealInput.addEventListener('input', function() {
      window.updateState({ backSealEmoji: sealInput.value || '🎂' });
    });

    const sealPresets = ['🎂', '💌', '👑', '⭐', '❤️', '🕊️', '🗝️', '✨'];
    const presetGrid = document.createElement('div');
    presetGrid.className = 'seal-presets-grid';

    sealPresets.forEach(em => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seal-preset-btn';
      btn.textContent = em;
      btn.title = `Choose ${em}`;
      btn.addEventListener('click', function() {
        sealInput.value = em;
        window.updateState({ backSealEmoji: em });
      });
      presetGrid.appendChild(btn);
    });

    sealField.appendChild(sealLabel);
    sealField.appendChild(sealInput);
    sealField.appendChild(presetGrid);
    container.appendChild(sealField);
  }

  // ------------------------------------------------------------------------
  // Photo Drag-to-Reposition (Mouse + Touch)
  // ------------------------------------------------------------------------
  function setupPhotoDrag() {
    const frame = document.getElementById('card-image-frame');
    if (!frame) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialOffsetX = 0;
    let initialOffsetY = 0;

    function onPointerDown(clientX, clientY) {
      if (!window.AppState.photoDataUrl) return; // only drag if photo loaded
      isDragging = true;
      startX = clientX;
      startY = clientY;
      initialOffsetX = window.AppState.photoOffsetX || 0;
      initialOffsetY = window.AppState.photoOffsetY || 0;
      frame.style.cursor = 'grabbing';
    }

    function onPointerMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      window.updateState({
        photoOffsetX: initialOffsetX + dx,
        photoOffsetY: initialOffsetY + dy
      });
    }

    function onPointerUp() {
      if (isDragging) {
        isDragging = false;
        frame.style.cursor = '';
      }
    }

    // Mouse handlers
    frame.addEventListener('mousedown', function(e) {
      if (e.button === 0) {
        onPointerDown(e.clientX, e.clientY);
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', function(e) {
      onPointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', function() {
      onPointerUp();
    });

    // Touch handlers
    frame.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', function(e) {
      if (isDragging && e.touches && e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', function() {
      onPointerUp();
    });
  }

  // ------------------------------------------------------------------------
  // Section Click Wiring & Global Dismissals
  // ------------------------------------------------------------------------
  function setupInteractions() {
    // Click on card sections to open popovers
    const sections = document.querySelectorAll('.card-section');
    sections.forEach(sec => {
      sec.addEventListener('click', function(e) {
        // If clicking on image frame while dragging, do not open popover on release
        const secId = sec.getAttribute('data-section');
        if (secId) {
          e.stopPropagation();
          window.showPopover(secId);
        }
      });
    });

    // Dismiss on mobile backdrop click
    const backdrop = document.getElementById('popover-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function() {
        window.hidePopover();
      });
    }

    // Dismiss on click outside
    document.addEventListener('click', function(e) {
      if (!activePopover) return;
      const isInsidePopover = activePopover.contains(e.target);
      const isInsideSection = e.target.closest && e.target.closest('.card-section');
      if (!isInsidePopover && !isInsideSection) {
        window.hidePopover();
      }
    });

    // Dismiss on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        window.hidePopover();
      }
    });

    // Recalculate position on window resize
    window.addEventListener('resize', function() {
      if (activePopover && activeSection) {
        positionPopover(activeSection, activePopover);
      }
    });

    setupPhotoDrag();
  }

  // Initialize once DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupInteractions);
    } else {
      setupInteractions();
    }
  }
})();
