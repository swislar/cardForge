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
      archetype: 'Choose Archetype Theme',
      description: 'Edit Memory & Narrative',
      stats: 'Adjust Personality Stats',
      footer: 'Select Vibe Icons & Year'
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
      default:
        body.textContent = 'No editor available.';
    }

    popover.appendChild(body);
    popoverRoot.appendChild(popover);
    activePopover = popover;

    // Position popover
    positionPopover(sectionId, popover);
  };

  window.hidePopover = function() {
    if (activePopover && activePopover.parentElement) {
      activePopover.parentElement.removeChild(activePopover);
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

    const cardEl = document.getElementById('card');
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

  // 5. Footer Editor (Vibe Icons & Year)
  function buildFooterEditor(container) {
    const state = window.AppState;

    // Vibe Icons
    const vibeLabel = document.createElement('label');
    vibeLabel.className = 'popover-label';
    vibeLabel.textContent = 'Select up to 4 Vibe Badges:';
    container.appendChild(vibeLabel);

    const iconGrid = document.createElement('div');
    iconGrid.className = 'vibe-picker-grid';

    if (Array.isArray(window.VIBE_ICONS)) {
      window.VIBE_ICONS.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vibe-picker-item';
        btn.title = `${icon.name}: ${icon.meaning}`;
        btn.innerHTML = `<span class="vibe-emoji">${icon.emoji}</span><span class="vibe-name">${icon.name}</span>`;

        if (state.vibeIconIds.includes(icon.id)) {
          btn.classList.add('selected');
        }

        btn.addEventListener('click', function() {
          const current = [...window.AppState.vibeIconIds];
          const exists = current.indexOf(icon.id);

          if (exists !== -1) {
            current.splice(exists, 1);
            btn.classList.remove('selected');
          } else {
            if (current.length >= 4) {
              // Replace earliest selected or shake
              current.shift();
              const oldSelected = iconGrid.querySelector('.vibe-picker-item.selected');
              if (oldSelected) oldSelected.classList.remove('selected');
            }
            current.push(icon.id);
            btn.classList.add('selected');
          }
          window.updateState({ vibeIconIds: current });
        });

        iconGrid.appendChild(btn);
      });
    }

    container.appendChild(iconGrid);

    // Year Input
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
