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
  makeEl('card-back-number');
  makeEl('card-vibes');
  makeEl('download-btn');

  for (let i = 0; i < 5; i++) {
    makeEl(`stat-name-${i}`);
    makeEl(`stat-bar-${i}`);
    makeEl(`stat-segments-${i}`);
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
  makeEl('card-back-crest-title');

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
    createElementNS(namespace, tag) { return makeEl(`el-${Math.random()}`, tag); },
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
    backDate: ''
  });

  window.renderCard();

  const titleEl = elements['card-back-title'];
  const letterTextEl = elements['card-back-letter-text'];
  const signoffEl = elements['card-back-signoff'];
  const dateEl = elements['card-back-date'];
  const letterContainer = elements['back-letter-container'];
  const headerEl = elements['card-back-header'];

  // Critical assertions: No fallback text should be forced!
  assert.equal(titleEl.textContent, '', 'backTitle must remain empty, not default to "Happy Birthday!"');
  assert.equal(letterTextEl.textContent, '', 'backLetter must remain empty');
  assert.equal(signoffEl.textContent, '', 'backSignoff must remain empty, not default to "With love..."');
  assert.equal(dateEl.textContent, '', 'backDate must remain empty, not default to "October 2026"');

  // The empty handwritten message keeps its ruled writing area.
  assert.ok(headerEl.classList.contains('back-header--empty'), 'Header must have back-header--empty class');
  assert.ok(letterContainer.classList.contains('back-letter--handwritten'), 'empty letter defaults to handwriting mode');
  assert.ok(!letterContainer.classList.contains('back-letter--typed'), 'empty letter is not shown as typed text');

  window.updateState({ backLetter: 'x'.repeat(301), backLetterMode: 'typed' });
  assert.equal(window.AppState.backLetter.length, 300, 'typed message is capped at 300 characters');
  assert.ok(letterContainer.classList.contains('back-letter--typed'), 'typed mode displays the entered message');
  assert.equal(window.updateState({ backLetterMode: 'other' }), false, 'unknown letter modes are rejected');
});

test('popovers allow 1-click clearing of back text without changing the fixed layout', () => {
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
  assert.equal(window.AppState.backLetterMode, 'handwritten');
  assert.equal(window.AppState.backSignoff, '');
  assert.equal(window.AppState.backDate, '');
  assert.equal(window.AppState.backStyle, 'letter');
  assert.equal(popover.querySelector('#back-layout-select'), null);

  // 2. Open the back-letter editor and verify both modes and the fixed limit.
  window.showPopover('back-letter');
  const letterPopover = elements['popover-root'].children[0];
  assert.equal(letterPopover.querySelector('#back-letter-mode').value, 'handwritten');
  assert.equal(letterPopover.querySelector('#back-letter-input').maxLength, 300);
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
  assert.match(css, /#card-back-header\s*\{[^}]*height:\s*60\.63px/, 'back title block is 11 mm tall');
  assert.match(css, /\.back-letter-container\s*\{[^}]*background-color:\s*#F3E7C9/, 'back letter canvas uses the shared light parchment');
  assert.match(css, /\.back-letter--handwritten\s*\{[^}]*33\.07px/, 'handwritten mode uses faint rules at 6 mm spacing');
  assert.match(css, /\.back-letter--typed\s+#card-back-letter-text\s*\{[^}]*display:\s*block/, 'typed mode displays the message');
  assert.match(css, /\.back-letter-container\s*\{[^}]*height:\s*267\.36px/, 'letter panel is fixed at 48.5 mm tall');
  assert.match(css, /\.back-letter-container\s*\{[^}]*padding:\s*16\.54px/, 'letter panel has 3 mm inner padding');
  assert.match(css, /\.back-letter-container\s*\{[^}]*overflow:\s*hidden/, 'back letter panel must not show a scrollbar or allow content to overflow');
  assert.match(css, /\.back-trade-voucher\s*\{[^}]*height:\s*46\.87px/, 'trade voucher has the fixed 8.5 mm height');
  assert.match(css, /\.back-letter-text\s*\{[^}]*overflow:\s*hidden/, 'long messages must be clipped to the fixed message area');
  assert.match(css, /\.back-letter-text\s*\{[^}]*color:\s*#30291f/, 'back letter text must use readable dark ink');
  assert.match(css, /\.back-letter-text\s*\{[^}]*font-size:\s*15\.56px/, 'typed letter text is 8 pt at print size');
  assert.match(css, /\.back-trade-heading\s*\{[^}]*font-size:\s*11\.67px/, 'voucher label is 6 pt at print size');
  assert.match(css, /\.back-trade-offer\s*\{[^}]*font-size:\s*14\.58px/, 'trade offer is 7.5 pt at print size');
  assert.match(css, /\.back-title\s*\{[^}]*font-size:\s*25\.28px/, 'back title is 13 pt at print size');
  assert.match(css, /\.back-subtitle\s*\{[^}]*font-size:\s*13\.61px/, 'back subtitle is 7 pt at print size');
  assert.doesNotMatch(css, /#card-description\s*\{/, 'front memory panel has been removed');
  assert.match(css, /\.card-face,\s*#card\s*\{[^}]*padding:\s*calc\(var\(--panel-inset\)\s*-\s*2\.5px\)/, 'card content must account for its border to keep the 5 mm inset');
  assert.match(css, /\.card-face::after,\s*#card::after\s*\{[^}]*inset:\s*var\(--frame-inset\)/, 'the resource ring must sit 3 mm inside trim');
  assert.match(css, /#card-back-footer\s*\{[^}]*height:\s*35\.28px/, 'footer is fixed at 6.4 mm tall');
  assert.match(css, /\.back-signoff-group\s*\{[^}]*width:\s*228\.74px/, 'sign-off box is 41.5 mm wide');
  assert.match(css, /\.back-signoff\s*\{[^}]*font-size:\s*17\.5px/, 'sign-off is 9 pt at print size');
  assert.match(css, /\.back-card-number\s*\{[^}]*width:\s*57\.87px/, 'card number pill is 10.5 mm wide');
  assert.match(css, /\.back-footer-content\s*\{[^}]*gap:\s*8\.27px/, 'footer elements retain a 1.5 mm gap');
  assert.match(css, /\.download-button--primary\s*\{[^}]*background:\s*var\(--archetype-primary,\s*#28566f\)/i, 'print sheet button must use a solid primary color');
  assert.match(css, /\.back-handwriting-hint/, 'back-handwriting-hint must be styled');
  assert.match(fs.readFileSync('./index.html', 'utf8'), /Write small or keep it concise — about 60–70 words/, 'handwriting hint recommends a concise message');
  assert.match(css, /\.card--exporting\s+\.back-handwriting-hint[^}]*display:\s*none\s*!important/, 'handwriting hints must never show when exported or printed');
});
