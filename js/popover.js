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
      header: 'Edit Name, Dice & VP',
      image: 'Edit Photo & Frame',
      archetype: 'Choose Catan Resource & Role',
      stats: 'Edit Resource Traits & Chaos',
      'back-header': 'Edit Card-Back Title & Subtitle',
      'back-letter': 'Write Birthday Letter',
      'back-footer': 'Edit Sign-off & Deck Number'
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
      case 'stats':
        buildStatsEditor(body);
        break;
      case 'back-header':
        buildBackHeaderEditor(body);
        break;
      case 'back-letter':
        buildBackLetterEditor(body);
        break;
      case 'back-footer':
        buildBackFooterEditor(body);
        buildFooterEditor(body);
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
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function() {
        if (activePopover === popover) {
          positionPopover(sectionId, popover);
        }
      });
    }
  };

  window.hidePopover = function() {
    if (activePopover && activePopover.parentElement) {
      activePopover.parentElement.removeChild(activePopover);
    }
    const backdrop = document.getElementById ? document.getElementById('popover-backdrop') : null;
    if (backdrop) {
      backdrop.classList.remove('active');
      backdrop.classList.remove('popover-backdrop--sheet');
    }
    activePopover = null;
    activeSection = null;
  };

  // Positioning logic:
  // At large widths, customisation menus appear directly to the RIGHT of the card.
  // At medium and small widths (or whenever horizontal space is insufficient),
  // the menu appears from the bottom up as a bottom sheet.
  function positionPopover(sectionId, popoverEl) {
    const cardEl = (window.AppState && window.AppState.isFlipped ? document.getElementById('card-back') : (document.getElementById('card-front') || document.getElementById('card'))) || document.getElementById('card');
    const targetSection = document.getElementById(`card-${sectionId}`) || cardEl;
    if (!cardEl || !targetSection) return;

    const cardRect = cardEl.getBoundingClientRect();
    const scrollY = window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || 0;
    const scrollX = window.pageXOffset || (document.documentElement ? document.documentElement.scrollLeft : 0) || 0;

    const popoverWidth = popoverEl.offsetWidth || 330;
    const popoverHeight = popoverEl.offsetHeight || 420;
    const gap = 18;

    // Check if bottom-sheet mode applies:
    // 1. Viewport width is medium or small (<= 1024px)
    // 2. Or the popover placed on the right would exceed the available viewport width
    const rightBoundary = cardRect.right + gap + popoverWidth;
    const maxAllowedRight = (window.innerWidth || 1024) + scrollX - 12;

    const isBottomSheet = (window.innerWidth <= 1024) || (rightBoundary > maxAllowedRight);

    if (isBottomSheet) {
      popoverEl.classList.add('popover-card--sheet');
      popoverEl.style.top = '';
      popoverEl.style.left = '';
      popoverEl.style.right = '';
      popoverEl.style.bottom = '';
      const backdrop = document.getElementById ? document.getElementById('popover-backdrop') : null;
      if (backdrop) {
        backdrop.classList.add('active');
        backdrop.classList.add('popover-backdrop--sheet');
      }
      return;
    }

    // Large desktop screen: Position directly to the RIGHT of the card
    popoverEl.classList.remove('popover-card--sheet');
    const backdrop = document.getElementById ? document.getElementById('popover-backdrop') : null;
    if (backdrop) {
      backdrop.classList.remove('popover-backdrop--sheet');
    }

    const left = cardRect.right + gap + scrollX;

    // Vertical side matching:
    // Align with the target section, but clamp strictly within the card's vertical height
    const cardTop = cardRect.top + scrollY;
    const cardBottom = cardRect.bottom + scrollY;
    const cardHeight = cardBottom - cardTop;

    const secRect = targetSection.getBoundingClientRect ? targetSection.getBoundingClientRect() : cardRect;
    let targetTop = secRect.top + scrollY - 12;

    if (popoverHeight <= cardHeight) {
      // Clamped so popover top is never above card top,
      // and popover bottom is never below card bottom (matches side of card for bottom sections)
      if (targetTop < cardTop) {
        targetTop = cardTop;
      } else if (targetTop + popoverHeight > cardBottom) {
        targetTop = cardBottom - popoverHeight;
      }
    } else {
      // If popover is taller than card, align top to card top
      targetTop = cardTop;
    }

    // Ensure it never goes above top of window
    if (targetTop < 10 + scrollY) {
      targetTop = 10 + scrollY;
    }

    popoverEl.style.left = `${Math.round(left)}px`;
    popoverEl.style.top = `${Math.round(targetTop)}px`;
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

    const diceField = document.createElement('div');
    diceField.className = 'popover-field';
    const diceLabel = document.createElement('label');
    diceLabel.className = 'popover-label';
    diceLabel.textContent = 'Dice Number Token (2–6 or 8–12)';
    const diceSelect = document.createElement('select');
    diceSelect.className = 'popover-input';
    diceSelect.id = 'dice-number-select';
    for (let number = 2; number <= 12; number += 1) {
      if (number === 7) continue;
      const option = document.createElement('option');
      option.value = String(number);
      option.textContent = String(number);
      diceSelect.appendChild(option);
    }
    diceSelect.value = String(state.diceNumber || 8);
    diceSelect.addEventListener('change', function() {
      window.updateState({ diceNumber: parseInt(diceSelect.value, 10) });
    });
    diceField.appendChild(diceLabel);
    diceField.appendChild(diceSelect);
    container.appendChild(diceField);

    const vpField = document.createElement('div');
    vpField.className = 'popover-field';
    const vpLabel = document.createElement('label');
    vpLabel.className = 'popover-label';
    vpLabel.textContent = 'Victory Points (score / total)';
    const vpRow = document.createElement('div');
    vpRow.className = 'vp-score-inputs';
    ['vpScore', 'vpTotal'].forEach((key, index) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'popover-input';
      input.id = index === 0 ? 'vp-score-input' : 'vp-total-input';
      input.min = '0';
      input.max = '99';
      input.value = state[key];
      input.setAttribute('aria-label', index === 0 ? 'Victory points earned' : 'Victory points possible');
      input.addEventListener('input', function() {
        const value = Math.max(0, Math.min(99, parseInt(input.value, 10) || 0));
        window.updateState({ [key]: value });
      });
      vpRow.appendChild(input);
    });
    vpField.appendChild(vpLabel);
    vpField.appendChild(vpRow);
    container.appendChild(vpField);
  }

  // 2. Archetype Editor
  function buildArchetypeEditor(container) {
    const state = window.AppState;

    const resourceField = document.createElement('div');
    resourceField.className = 'popover-field';
    const resourceLabel = document.createElement('label');
    resourceLabel.className = 'popover-label';
    resourceLabel.textContent = 'Resource colour — what she is to you';
    const resourceSelect = document.createElement('select');
    resourceSelect.className = 'popover-input';
    resourceSelect.id = 'catan-resource-select';
    (window.CATAN_RESOURCES || []).forEach(resource => {
      const option = document.createElement('option');
      option.value = resource.id;
      option.textContent = `${resource.icon} ${resource.name} — ${resource.meaning}`;
      resourceSelect.appendChild(option);
    });
    resourceSelect.value = state.resourceId || 'wool';
    resourceSelect.addEventListener('change', function() {
      window.updateState({ resourceId: resourceSelect.value });
    });
    resourceField.appendChild(resourceLabel);
    resourceField.appendChild(resourceSelect);
    container.appendChild(resourceField);

    const roleField = document.createElement('div');
    roleField.className = 'popover-field';
    const roleLabel = document.createElement('label');
    roleLabel.className = 'popover-label';
    roleLabel.textContent = 'Development-card role — her place in the group';
    const roleSelect = document.createElement('select');
    roleSelect.className = 'popover-input';
    roleSelect.id = 'catan-role-select';
    (window.CATAN_DEVELOPMENT_ROLES || []).forEach(role => {
      const option = document.createElement('option');
      option.value = role.id;
      option.textContent = `${role.name}: ${role.epithet}`;
      roleSelect.appendChild(option);
    });
    roleSelect.value = state.developmentRoleId || 'knight';
    roleSelect.addEventListener('change', function() {
      window.updateState({ developmentRoleId: roleSelect.value });
    });
    roleField.appendChild(roleLabel);
    roleField.appendChild(roleSelect);
    container.appendChild(roleField);

  }

  // 4. Personality Stats Editor
  function buildStatsEditor(container) {
    const state = window.AppState;

    const helper = document.createElement('p');
    helper.className = 'popover-hint';
    helper.textContent = 'Edit each resource trait and its rating (1–10):';
    container.appendChild(helper);

    state.stats.forEach((st, idx) => {
      const row = document.createElement('div');
      row.className = 'stat-edit-row';

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'popover-input stat-edit-label';
      labelInput.maxLength = 20;
      labelInput.value = st.name;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'stat-edit-slider';
      slider.min = '1';
      slider.max = '10';
      slider.value = st.value;

      const valDisplay = document.createElement('span');
      valDisplay.className = 'stat-edit-val';
      valDisplay.textContent = st.value;

      function updateThisStat() {
        const newStats = [...window.AppState.stats];
        newStats[idx] = {
          name: labelInput.value || `Stat ${idx + 1}`,
          value: Math.max(1, Math.min(10, parseInt(slider.value, 10) || 1))
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

    const chaosField = document.createElement('div');
    chaosField.className = 'popover-field chaos-score-editor';
    const chaosLabel = document.createElement('label');
    chaosLabel.className = 'popover-label';
    chaosLabel.textContent = 'Robber Chaos score';
    const chaosRow = document.createElement('div');
    chaosRow.className = 'stat-edit-row';
    const chaosSlider = document.createElement('input');
    chaosSlider.type = 'range';
    chaosSlider.id = 'chaos-score-input';
    chaosSlider.className = 'stat-edit-slider';
    chaosSlider.min = '0';
    chaosSlider.max = '99';
    chaosSlider.value = state.chaosScore;
    const chaosValue = document.createElement('span');
    chaosValue.id = 'chaos-score-value';
    chaosValue.className = 'stat-edit-val';
    chaosValue.textContent = state.chaosScore;
    chaosSlider.addEventListener('input', function() {
      chaosValue.textContent = chaosSlider.value;
      window.updateState({ chaosScore: parseInt(chaosSlider.value, 10) || 0 });
    });
    chaosRow.appendChild(chaosSlider);
    chaosRow.appendChild(chaosValue);
    chaosField.appendChild(chaosLabel);
    chaosField.appendChild(chaosRow);
    container.appendChild(chaosField);
  }

  // 5. Collectible Deck Details
  function buildFooterEditor(container) {
    const state = window.AppState;

    const deckFields = [
      { key: 'cardNumber', label: 'Card number', type: 'number', min: 1, id: 'card-number-input' },
      { key: 'deckSize', label: 'Cards in this deck', type: 'number', min: 1, id: 'deck-size-input' }
    ];
    deckFields.forEach(fieldConfig => {
      const field = document.createElement('div');
      field.className = 'popover-field';
      const label = document.createElement('label');
      label.className = 'popover-label';
      label.textContent = fieldConfig.label;
      const input = document.createElement('input');
      input.type = fieldConfig.type;
      input.className = 'popover-input';
      input.id = fieldConfig.id;
      if (fieldConfig.maxLength) input.maxLength = fieldConfig.maxLength;
      if (fieldConfig.min) input.min = String(fieldConfig.min);
      input.value = state[fieldConfig.key];
      input.addEventListener('input', function() {
        window.updateState({ [fieldConfig.key]: input.value });
      });
      field.appendChild(label);
      field.appendChild(input);
      container.appendChild(field);
    });
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
            photoAspect: w / h,
            photoOffsetX: 0,
            photoOffsetY: 0,
            photoScale: 1
          });
            window.hidePopover();
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
      <option value="simple">Thematic Accent (Matches Archetype)</option>
      <option value="gold">Gilded Gold Foil</option>
      <option value="filigree">Ornate Heraldic Filigree</option>
      <option value="parchment">Antique Vellum & Woodcut</option>
      <option value="holographic">Deluxe Prismatic Foil</option>
      <option value="dark">Obsidian Velvet Inset</option>
      <option value="none">Borderless (Full-Bleed)</option>
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
    scaleSlider.min = '1';
    scaleSlider.max = '3';
    scaleSlider.step = '0.05';
    scaleSlider.value = Math.max(1, state.photoScale || 1);

    scaleSlider.addEventListener('input', () => {
      const s = Math.max(1, parseFloat(scaleSlider.value));
      scaleLabel.textContent = `Photo Zoom (${Math.round(s * 100)}%):`;
      const frame = document.getElementById('card-image-frame');
      const photoEl = document.getElementById('card-photo');
      const aspect = window.AppState.photoAspect || (photoEl && photoEl.naturalWidth ? photoEl.naturalWidth / photoEl.naturalHeight : 1);
      const dims = typeof window.computePhotoCoverDimensions === 'function'
        ? window.computePhotoCoverDimensions(aspect, s, (frame && frame.clientWidth) || 326, (frame && frame.clientHeight) || 163)
        : { maxOffsetX: 0, maxOffsetY: 0 };
      const currentX = window.AppState.photoOffsetX || 0;
      const currentY = window.AppState.photoOffsetY || 0;
      window.updateState({
        photoScale: s,
        photoOffsetX: Math.max(-dims.maxOffsetX, Math.min(dims.maxOffsetX, currentX)),
        photoOffsetY: Math.max(-dims.maxOffsetY, Math.min(dims.maxOffsetY, currentY))
      });
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
    titleInput.placeholder = 'e.g. Happy Birthday! (Leave blank for handwritten card)';
    titleInput.value = state.backTitle !== undefined ? state.backTitle : 'Happy Birthday!';
    titleInput.addEventListener('input', function() {
      window.updateState({ backTitle: titleInput.value });
    });

    titleField.appendChild(titleLabel);
    titleField.appendChild(titleInput);
    container.appendChild(titleField);

    const subtitleField = document.createElement('div');
    subtitleField.className = 'popover-field';
    subtitleField.style.marginTop = '10px';

    const subtitleLabel = document.createElement('label');
    subtitleLabel.className = 'popover-label';
    subtitleLabel.textContent = 'Small subtitle / turn count:';

    const subtitleInput = document.createElement('input');
    subtitleInput.type = 'text';
    subtitleInput.id = 'back-subtitle-input';
    subtitleInput.className = 'popover-input';
    subtitleInput.maxLength = 30;
    subtitleInput.placeholder = 'e.g. Harvest Day or Turn 30';
    subtitleInput.value = state.backSubtitle || '';
    subtitleInput.addEventListener('input', function() {
      window.updateState({ backSubtitle: subtitleInput.value });
    });

    subtitleField.appendChild(subtitleLabel);
    subtitleField.appendChild(subtitleInput);
    container.appendChild(subtitleField);

    // Quick Actions for Blank / Handwritten Mode
    const blankActions = document.createElement('div');
    blankActions.className = 'back-blank-actions';
    blankActions.style.marginTop = '14px';
    blankActions.style.display = 'flex';
    blankActions.style.flexDirection = 'column';
    blankActions.style.gap = '6px';

    const clearBackBtn = document.createElement('button');
    clearBackBtn.type = 'button';
    clearBackBtn.id = 'clear-back-text-btn';
    clearBackBtn.className = 'popover-small-btn';
    clearBackBtn.textContent = '✍️ Clear All Text (Blank to Handwrite & Sign)';
    clearBackBtn.title = 'Remove all digital text on the back so you can print it blank and write your message by hand';
    clearBackBtn.addEventListener('click', function() {
      titleInput.value = '';
      subtitleInput.value = '';
      window.updateState({
        backTitle: '',
        backSubtitle: '',
        backLetter: '',
        backLetterMode: 'handwritten',
        backSignoff: '',
        backDate: '',
        backStyle: 'letter'
      });
    });

    const restoreBackBtn = document.createElement('button');
    restoreBackBtn.type = 'button';
    restoreBackBtn.id = 'restore-back-text-btn';
    restoreBackBtn.className = 'popover-small-btn';
    restoreBackBtn.textContent = 'Restore Default Birthday Text';
    restoreBackBtn.addEventListener('click', function() {
      titleInput.value = 'Happy Birthday!';
      subtitleInput.value = 'Harvest Day';
      window.updateState({
        backTitle: 'Happy Birthday!',
        backSubtitle: 'Harvest Day',
        backLetter: '',
        backLetterMode: 'handwritten',
        backTradeGive: 'one dinner',
        backTradeGet: 'your company',
        backVoucher: '1 dinner, redeemable any time',
        backSignoff: 'With love, [Your name]',
        backDate: '',
        backStyle: 'letter'
      });
    });

    blankActions.appendChild(clearBackBtn);
    blankActions.appendChild(restoreBackBtn);
    container.appendChild(blankActions);
  }

  // 8. Back Letter Editor
  function buildBackLetterEditor(container) {
    const state = window.AppState;

    const modeField = document.createElement('div');
    modeField.className = 'popover-field';
    const modeLabel = document.createElement('label');
    modeLabel.className = 'popover-label';
    modeLabel.textContent = 'Message format:';
    const modeSelect = document.createElement('select');
    modeSelect.id = 'back-letter-mode';
    modeSelect.className = 'popover-input';
    [
      ['handwritten', 'Handwritten — leave ruled space'],
      ['typed', 'Typed — 8 pt print text']
    ].forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      modeSelect.appendChild(option);
    });
    modeSelect.value = state.backLetterMode || 'handwritten';
    modeSelect.addEventListener('change', function() {
      window.updateState({ backLetterMode: modeSelect.value });
    });
    modeField.appendChild(modeLabel);
    modeField.appendChild(modeSelect);
    container.appendChild(modeField);

    const field = document.createElement('div');
    field.className = 'popover-field';

    const label = document.createElement('label');
    label.className = 'popover-label';
    label.textContent = 'Personal Birthday Message (Max 300 characters):';

    const textarea = document.createElement('textarea');
    textarea.id = 'back-letter-input';
    textarea.className = 'popover-textarea';
    textarea.rows = 10;
    textarea.maxLength = 300;
    textarea.placeholder = 'Typed mode: about 33 characters per line, up to 11 lines.';
    textarea.value = typeof state.backLetter === 'string'
      ? state.backLetter.slice(0, 300)
      : '';

    const counter = document.createElement('div');
    counter.id = 'back-letter-counter';
    counter.className = 'char-counter';
    counter.textContent = `${textarea.value.length} / 300`;
    counter.setAttribute('aria-live', 'polite');

    textarea.addEventListener('input', function() {
      modeSelect.value = 'typed';
      counter.textContent = `${textarea.value.length} / 300`;
      window.updateState({
        backLetter: textarea.value,
        backLetterMode: 'typed'
      });
    });

    field.appendChild(label);
    field.appendChild(textarea);
    field.appendChild(counter);
    container.appendChild(field);

    // Quick Action for Blank Letter
    const letterActions = document.createElement('div');
    letterActions.className = 'back-letter-actions';
    letterActions.style.display = 'flex';
    letterActions.style.justifyContent = 'space-between';
    letterActions.style.alignItems = 'center';
    letterActions.style.marginTop = '8px';

    const clearLetterBtn = document.createElement('button');
    clearLetterBtn.type = 'button';
    clearLetterBtn.id = 'clear-back-letter-btn';
    clearLetterBtn.className = 'popover-small-btn';
    clearLetterBtn.textContent = '✍️ Clear Text (Print Blank)';
    clearLetterBtn.title = 'Leave the body area blank for a handwritten letter';
    clearLetterBtn.addEventListener('click', function() {
      textarea.value = '';
      modeSelect.value = 'handwritten';
      counter.textContent = '0 / 300';
      window.updateState({
        backLetter: '',
        backLetterMode: 'handwritten'
      });
    });

    letterActions.appendChild(clearLetterBtn);
    container.appendChild(letterActions);

    const tradeFields = [
      ['back-trade-give-input', 'I give', 'backTradeGive', state.backTradeGive || ''],
      ['back-trade-get-input', 'You give', 'backTradeGet', state.backTradeGet || ''],
      ['back-voucher-input', 'Redeemable voucher', 'backVoucher', state.backVoucher || '']
    ];

    tradeFields.forEach(([id, labelText, stateKey, value]) => {
      const tradeField = document.createElement('div');
      tradeField.className = 'popover-field';
      tradeField.style.marginTop = '10px';

      const tradeLabel = document.createElement('label');
      tradeLabel.className = 'popover-label';
      tradeLabel.textContent = `${labelText}:`;

      const tradeInput = document.createElement('input');
      tradeInput.type = 'text';
      tradeInput.id = id;
      tradeInput.className = 'popover-input';
      tradeInput.maxLength = stateKey === 'backVoucher' ? 48 : 28;
      tradeInput.value = value;
      tradeInput.addEventListener('input', function() {
        window.updateState({ [stateKey]: tradeInput.value });
      });

      tradeField.appendChild(tradeLabel);
      tradeField.appendChild(tradeInput);
      container.appendChild(tradeField);
    });
  }

  // 9. Back Footer Editor (Sign-off and Birthday Token)
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
    signoffInput.placeholder = 'e.g. With love, Maya (or leave blank to sign personally)';
    signoffInput.value = state.backSignoff !== undefined ? state.backSignoff : '';
    signoffInput.addEventListener('input', function() {
      window.updateState({ backSignoff: signoffInput.value });
    });

    signoffField.appendChild(signoffLabel);
    signoffField.appendChild(signoffInput);
    container.appendChild(signoffField);

    // Clear signature button
    const footerActions = document.createElement('div');
    footerActions.style.marginTop = '8px';

    const clearFooterBtn = document.createElement('button');
    clearFooterBtn.type = 'button';
    clearFooterBtn.id = 'clear-back-footer-btn';
    clearFooterBtn.className = 'popover-small-btn';
    clearFooterBtn.textContent = '✍️ Clear Sign-off (Sign in Person)';
    clearFooterBtn.title = 'Leave the sign-off blank to sign by hand after printing';
    clearFooterBtn.addEventListener('click', function() {
      signoffInput.value = '';
      window.updateState({ backSignoff: '' });
    });
    footerActions.appendChild(clearFooterBtn);
    container.appendChild(footerActions);

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

      let targetX = initialOffsetX + dx;
      let targetY = initialOffsetY + dy;

      const frameW = frame.clientWidth || 326;
      const frameH = frame.clientHeight || 163;
      const photoEl = document.getElementById('card-photo');
      const aspect = window.AppState.photoAspect || (photoEl && photoEl.naturalWidth ? photoEl.naturalWidth / photoEl.naturalHeight : (frameW / frameH));
      const scale = Math.max(1, window.AppState.photoScale || 1);

      if (typeof window.computePhotoCoverDimensions === 'function') {
        const dims = window.computePhotoCoverDimensions(aspect, scale, frameW, frameH);
        const snapThreshold = 14;

        // Snap to Right edge (+maxOffsetX) or Left edge (-maxOffsetX) or Center (0)
        if (Math.abs(targetX - dims.maxOffsetX) < snapThreshold) {
          targetX = dims.maxOffsetX;
        } else if (Math.abs(targetX - (-dims.maxOffsetX)) < snapThreshold) {
          targetX = -dims.maxOffsetX;
        } else if (Math.abs(targetX) < snapThreshold) {
          targetX = 0;
        }

        // Snap to Bottom edge (+maxOffsetY) or Top edge (-maxOffsetY) or Center (0)
        if (Math.abs(targetY - dims.maxOffsetY) < snapThreshold) {
          targetY = dims.maxOffsetY;
        } else if (Math.abs(targetY - (-dims.maxOffsetY)) < snapThreshold) {
          targetY = -dims.maxOffsetY;
        } else if (Math.abs(targetY) < snapThreshold) {
          targetY = 0;
        }

        // Clamp securely so photo never exposes empty card frame background
        targetX = Math.max(-dims.maxOffsetX, Math.min(dims.maxOffsetX, targetX));
        targetY = Math.max(-dims.maxOffsetY, Math.min(dims.maxOffsetY, targetY));
      }

      window.updateState({
        photoOffsetX: Math.round(targetX),
        photoOffsetY: Math.round(targetY)
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
