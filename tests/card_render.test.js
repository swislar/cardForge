const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createMockDom() {
  const elements = {};
  const listeners = {};

  function makeEl(id, tagName = 'div') {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      className: '',
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); el.className = Array.from(this.classes).join(' '); },
        remove(c) { this.classes.delete(c); el.className = Array.from(this.classes).join(' '); },
        contains(c) { return this.classes.has(c); },
        toggle(c, force) {
          if (force !== undefined) {
            if (force) this.add(c); else this.remove(c);
          } else {
            if (this.contains(c)) this.remove(c); else this.add(c);
          }
        }
      },
      textContent: '',
      innerText: '',
      innerHTML: '',
      value: '',
      title: '',
      style: {
        setProperty(k, v) { this[k] = v; },
        getPropertyValue(k) { return this[k] || ''; }
      },
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; },
      children: [],
      appendChild(child) {
        this.children.push(child);
        child.parentElement = this;
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) this.children.splice(idx, 1);
        child.parentElement = null;
        return child;
      },
      addEventListener(evt, handler) {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push({ el, handler });
      },
      dataset: {}
    };
    elements[id] = el;
    return el;
  }

  // Card Structure elements
  makeEl('card-stage');
  makeEl('card-flipper');
  makeEl('card-purpose-label');
  makeEl('card-front');
  makeEl('card-back');
  makeEl('flip-btn');
  makeEl('flip-label');
  makeEl('card-badge');
  makeEl('card-title-text');
  makeEl('card-hp-text');
  makeEl('card-image-frame');
  makeEl('card-photo', 'img');
  makeEl('card-archetype-text');
  makeEl('card-description-text');
  makeEl('card-vibes');
  makeEl('card-year-text');
  makeEl('download-btn');

  for (let i = 0; i < 4; i++) {
    makeEl(`stat-name-${i}`);
    makeEl(`stat-bar-${i}`);
    makeEl(`stat-val-${i}`);
  }

  // Back face elements
  makeEl('card-back-header');
  makeEl('card-back-title');
  makeEl('card-back-letter');
  makeEl('card-back-letter-text');
  makeEl('card-back-signoff');
  makeEl('card-back-date');
  makeEl('card-back-seal');
  makeEl('card-back-seal-emoji');

  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelectorAll() { return []; },
    createElement(tag) { return makeEl(`el-${Math.random()}`, tag); },
    addEventListener(evt, handler) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push({ el: null, handler });
    }
  };

  const window = {
    document,
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener(evt, handler) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push({ el: null, handler });
    }
  };

  return { elements, document, window, listeners };
}

function loadCardScripts(win) {
  const archetypesCode = fs.readFileSync('./js/archetypes.js', 'utf8');
  const iconsCode = fs.readFileSync('./js/icons.js', 'utf8');
  const texturesCode = fs.readFileSync('./js/textures.js', 'utf8');
  const appCode = fs.readFileSync('./js/app.js', 'utf8');
  const cardCode = fs.readFileSync('./js/card.js', 'utf8');

  const context = { window: win, document: win.document, ...win };
  vm.createContext(context);
  vm.runInContext(archetypesCode, context);
  vm.runInContext(iconsCode, context);
  vm.runInContext(texturesCode, context);
  vm.runInContext(appCode, context);
  vm.runInContext(cardCode, context);
  return context.window;
}

test('renderCard updates both front and back faces with custom fonts, colors, and textures', () => {
  const { elements, window } = createMockDom();
  loadCardScripts(window);

  window.updateState({
    primaryColor: '#9B59B6',
    accentColor: '#F4D03F',
    fontFamilyTitle: 'Playfair Display',
    fontFamilyBody: 'Caveat',
    cardTexture: 'parchment',
    backTitle: 'Celebration!',
    backLetter: 'Happy birthday to the legend!',
    backSignoff: 'From Alex',
    backDate: 'Nov 2026',
    backSealEmoji: '👑',
    vibeIcons: [
      { id: 'custom-1', emoji: '🍕', name: 'Pizza Master' },
      { id: 'coffee', emoji: '☕', name: 'Coffee Addict' }
    ]
  });

  const front = elements['card-front'];
  const back = elements['card-back'];
  assert.equal(front.style['--archetype-primary'], '#9B59B6');
  assert.equal(front.style['--archetype-accent'], '#F4D03F');
  assert.equal(front.style['--font-title'], "'Playfair Display', serif");
  assert.equal(front.style['--font-body'], "'Caveat', cursive");
  assert.ok(front.classList.contains('texture-parchment'), 'Front must have texture-parchment class');
  assert.ok(back.classList.contains('texture-parchment'), 'Back must have texture-parchment class');

  // Back letter content
  assert.equal(elements['card-back-title'].textContent, 'Celebration!');
  assert.equal(elements['card-back-letter-text'].textContent, 'Happy birthday to the legend!');
  assert.equal(elements['card-back-signoff'].textContent, 'From Alex');
  assert.equal(elements['card-back-date'].textContent, 'Nov 2026');
  assert.equal(elements['card-back-seal-emoji'].textContent, '👑');

  // Vibe badges
  assert.equal(elements['card-vibes'].children.length, 2);
});

test('toggleFlip toggles isFlipped state and updates flipper DOM class', () => {
  const { elements, window } = createMockDom();
  loadCardScripts(window);
  window.renderCard();

  assert.equal(window.AppState.isFlipped, false);
  assert.equal(elements['card-flipper'].classList.contains('is-flipped'), false);
  assert.equal(elements['card-purpose-label'].textContent, 'The impression of your friend');

  window.toggleFlip();
  assert.equal(window.AppState.isFlipped, true);
  assert.equal(elements['card-flipper'].classList.contains('is-flipped'), true);
  assert.equal(elements['card-purpose-label'].textContent, 'The message to your friend');

  window.toggleFlip(false);
  assert.equal(window.AppState.isFlipped, false);
  assert.equal(elements['card-flipper'].classList.contains('is-flipped'), false);
  assert.equal(elements['card-purpose-label'].textContent, 'The impression of your friend');
});
