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
      checked: false,
      style: {
        setProperty(k, v) { this[k] = v; },
        getPropertyValue(k) { return this[k] || ''; }
      },
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; this[k] = v; },
      getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : this[k]; },
      parentElement: null,
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
      dispatchEvent(event) {
        const list = listeners[event.type] || [];
        list.forEach(entry => {
          if (entry.el === el) entry.handler.call(el, event);
        });
      },
      querySelectorAll(selector) {
        const matches = [];
        function walk(node) {
          for (const ch of node.children) {
            if (selector.startsWith('.') && ch.classList && ch.classList.contains(selector.slice(1))) {
              matches.push(ch);
            } else if (selector.startsWith('#') && ch.id === selector.slice(1)) {
              matches.push(ch);
            } else if (ch.tagName && ch.tagName.toLowerCase() === selector.toLowerCase()) {
              matches.push(ch);
            }
            walk(ch);
          }
        }
        walk(this);
        return matches;
      },
      querySelector(selector) {
        if (selector.startsWith('#') && elements[selector.slice(1)]) return elements[selector.slice(1)];
        return this.querySelectorAll(selector)[0] || null;
      },
      getBoundingClientRect() {
        return { top: 100, left: 100, bottom: 200, right: 300, width: 200, height: 100 };
      },
      dataset: {}
    };
    elements[id] = el;
    return el;
  }

  // Front & Back Elements
  makeEl('card-stage');
  makeEl('card-flipper');
  makeEl('card-front');
  const cardBack = makeEl('card-back');
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

  // Back elements
  makeEl('card-back-header');
  makeEl('card-back-title');
  makeEl('card-back-letter');
  const letterContainer = makeEl('back-letter-container');
  letterContainer.classList.add('back-letter-container');
  cardBack.appendChild(letterContainer);
  makeEl('card-back-letter-text');
  makeEl('card-back-signoff');
  makeEl('card-back-date');
  makeEl('card-back-seal');
  makeEl('card-back-seal-emoji');
  makeEl('card-back-crest-title');
  const tcgContainer = makeEl('back-tcg-container');
  tcgContainer.classList.add('back-tcg-container');
  cardBack.appendChild(tcgContainer);

  const popoverRoot = makeEl('popover-root');

  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelector(s) {
      if (s === '#popover-root' || s === '.popover-root') return popoverRoot;
      if (s === '.back-letter-container') return letterContainer;
      return null;
    },
    querySelectorAll() { return []; },
    createElement(tag) { return makeEl(`el-${Math.random()}`, tag); },
    addEventListener: () => {}
  };

  const window = {
    document,
    addEventListener: () => {},
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    Image: function() { this.onload = null; }
  };
  window.window = window;

  return { elements, document, window };
}

function loadAllScripts(windowContext) {
  const scripts = [
    './js/archetypes.js',
    './js/icons.js',
    './js/textures.js',
    './js/app.js',
    './js/card.js',
    './js/popover.js'
  ];
  const context = { window: windowContext, document: windowContext.document, ...windowContext };
  vm.createContext(context);
  for (const s of scripts) {
    const code = fs.readFileSync(s, 'utf8');
    vm.runInContext(code, context);
  }
}

test('renderCard allows empty text on the backside for personal handwriting without forcing default fallbacks', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  // Set all back text to empty string
  window.updateState({
    backTitle: '',
    backLetter: '',
    backSignoff: '',
    backDate: '',
    backSealEmoji: ''
  });

  window.renderCard();

  const titleEl = elements['card-back-title'];
  const letterTextEl = elements['card-back-letter-text'];
  const signoffEl = elements['card-back-signoff'];
  const dateEl = elements['card-back-date'];
  const sealEl = elements['card-back-seal'];
  const letterContainer = elements['back-letter-container'];
  const headerEl = elements['card-back-header'];

  // Critical assertions: No fallback text should be forced!
  assert.equal(titleEl.textContent, '', 'backTitle must remain empty, not default to "Happy Birthday!"');
  assert.equal(letterTextEl.textContent, '', 'backLetter must remain empty');
  assert.equal(signoffEl.textContent, '', 'backSignoff must remain empty, not default to "With love..."');
  assert.equal(dateEl.textContent, '', 'backDate must remain empty, not default to "October 2026"');
  assert.notEqual(sealEl.style.display, 'none', 'blank seal must stay visible as a signing placeholder');
  assert.ok(sealEl.classList.contains('back-wax-seal--blank'), 'blank seal must use placeholder styling');

  window.updateState({ backSealEmoji: '   ' });
  window.renderCard();
  assert.ok(sealEl.classList.contains('back-wax-seal--blank'), 'whitespace-only seal must remain a blank placeholder');
  assert.equal(elements['card-back-seal-emoji'].textContent, '', 'blank seal must not render whitespace as its content');

  // Classes for empty styling
  assert.ok(headerEl.classList.contains('back-header--empty'), 'Header must have back-header--empty class');
  assert.ok(letterContainer.classList.contains('back-letter--empty'), 'Letter container must have back-letter--empty class');
  assert.ok(!letterContainer.classList.contains('has-ruled-lines'), 'letter canvas must not render ruled lines');
});

test('popovers allow 1-click clearing of back text and toggling blank layout style', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  // 1. Open back-header popover and clear all text
  window.showPopover('back-header');
  const popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Back header popover mounted');

  const clearBackBtn = popover.querySelector('#clear-back-text-btn');
  assert.ok(clearBackBtn, 'Clear all back text button must exist');
  clearBackBtn.dispatchEvent({ type: 'click' });

  assert.equal(window.AppState.backTitle, '');
  assert.equal(window.AppState.backLetter, '');
  assert.equal(window.AppState.backSignoff, '');
  assert.equal(window.AppState.backDate, '');
  assert.equal(window.AppState.backStyle, 'blank');

  // 2. Open back-letter popover and verify ruled lines are no longer offered
  window.showPopover('back-letter');
  const letterPopover = elements['popover-root'].children[0];
  assert.equal(letterPopover.querySelector('#back-ruled-lines-checkbox'), null);

  // 3. Open back-footer popover and verify clear signature button
  window.showPopover('back-footer');
  const footerPopover = elements['popover-root'].children[0];
  const clearFooterBtn = footerPopover.querySelector('#clear-back-footer-btn');
  assert.ok(clearFooterBtn, 'Clear signature button must exist');
  clearFooterBtn.dispatchEvent({ type: 'click' });
  assert.equal(window.AppState.backSignoff, '');
  assert.equal(window.AppState.backDate, '');
});

test('css/styles.css defines export suppression and handwriting styling', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  assert.match(css, /\.back-header--empty/, 'back-header--empty must be styled');
  assert.match(css, /\.back-header--empty\s*\{[^}]*min-height:\s*52px/, 'empty header must reserve height so the letter area cannot collapse');
  assert.match(css, /\.back-letter--empty/, 'back-letter--empty must be styled');
  assert.match(css, /\.back-letter-container\s*\{[^}]*background-color:\s*#f5ecd8[^}]*repeating-linear-gradient/s, 'back letter canvas must use light parchment with faint rules');
  assert.match(css, /\.back-letter-text\s*\{[^}]*color:\s*#30291f/, 'back letter text must use readable dark ink');
  assert.match(css, /#card-description\s*\{[^}]*background:\s*#f5ecd8/, 'front memory quote must sit on a light parchment panel');
  assert.match(css, /\.card-face,\s*#card\s*\{[^}]*padding:\s*23px/, 'card content must stay at least 4 mm inside the trim');
  assert.match(css, /\.card-face::after,\s*#card::after\s*\{[^}]*inset:\s*23px/, 'the decorative frame must stay at least 4 mm inside the trim');
  assert.doesNotMatch(css, /\.back-letter-container\.has-ruled-lines/, 'ruled writing lines must be removed');
  assert.match(css, /\.back-header--empty\s+\.back-ornament-line\s*\{[^}]*display:\s*none/, 'empty back title must hide the ornament lines');
  assert.match(css, /\.back-signoff-group\s*\{[^}]*flex:\s*1\s+1\s+0/, 'sign-off box width must stay fixed when content is entered');
  assert.match(css, /\.back-footer-content\s*\{[^}]*gap:\s*12px/, 'sign-off box must keep a margin before the emblem');
  assert.match(css, /\.download-button--primary\s*\{[^}]*background:\s*var\(--archetype-primary,\s*#92400e\)/i, 'print sheet button must use a solid primary color');
  assert.match(css, /\.back-handwriting-hint/, 'back-handwriting-hint must be styled');
  assert.match(css, /\.back-handwriting-hint\s*\{[^}]*font-size:\s*1\.2rem/, 'handwriting hint must be large enough to read on a printed card');
  assert.match(css, /\.back-wax-seal--blank/, 'blank seal placeholder must be styled');
  assert.match(css, /\.card--exporting\s+\.back-handwriting-hint[^}]*display:\s*none\s*!important/, 'handwriting hints must never show when exported or printed');
});
