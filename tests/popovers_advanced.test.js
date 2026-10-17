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
        walk(el);
        return matches;
      },
      querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
      },
      addEventListener(evt, handler) {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push({ el, handler });
      },
      dispatchEvent(event) {
        const list = listeners[event.type] || [];
        list.forEach(entry => {
          if (entry.el === el) entry.handler(event);
        });
      },
      getBoundingClientRect() {
        return { top: 100, left: 100, bottom: 200, right: 300, width: 200, height: 100 };
      },
      dataset: {}
    };
    elements[id] = el;
    return el;
  }

  // Essential elements
  const app = makeEl('app');
  const cardFront = makeEl('card-front');
  const cardBack = makeEl('card-back');
  const popoverRoot = makeEl('popover-root');

  const frontSections = ['header', 'image', 'archetype', 'stats'];
  frontSections.forEach(s => {
    const secEl = makeEl(`card-${s}`);
    secEl.dataset.section = s;
    secEl.classList.add('card-section');
    cardFront.appendChild(secEl);
  });

  const backSections = ['back-header', 'back-letter', 'back-footer'];
  backSections.forEach(s => {
    const secEl = makeEl(`card-${s}`);
    secEl.dataset.section = s;
    secEl.classList.add('card-section');
    cardBack.appendChild(secEl);
  });

  const document = {
    body: makeEl('body'),
    getElementById(id) { return elements[id] || null; },
    querySelectorAll(selector) {
      if (selector === '.card-section') {
        return [
          ...frontSections.map(s => elements[`card-${s}`]),
          ...backSections.map(s => elements[`card-${s}`])
        ];
      }
      return [];
    },
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

function loadAllScripts(win) {
  const texturesCode = fs.readFileSync('./js/textures.js', 'utf8');
  const archetypesCode = fs.readFileSync('./js/archetypes.js', 'utf8');
  const iconsCode = fs.readFileSync('./js/icons.js', 'utf8');
  const appCode = fs.readFileSync('./js/app.js', 'utf8');
  const cardCode = fs.readFileSync('./js/card.js', 'utf8');
  const popoverCode = fs.readFileSync('./js/popover.js', 'utf8');

  const context = { window: win, document: win.document, ...win };
  vm.createContext(context);
  vm.runInContext(texturesCode, context);
  vm.runInContext(archetypesCode, context);
  vm.runInContext(iconsCode, context);
  vm.runInContext(appCode, context);
  vm.runInContext(cardCode, context);
  vm.runInContext(popoverCode, context);
  return context.window;
}

test('header editor enforces the dice range without a seven token', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  window.showPopover('header');
  const headerEditor = elements['popover-root'].children[0];
  const diceSelect = headerEditor.querySelector('#dice-number-select');
  assert.equal(diceSelect.children.length, 10);
  assert.equal(diceSelect.children.some(option => option.value === '7'), false);
  diceSelect.value = '12';
  diceSelect.dispatchEvent({ type: 'change' });
  assert.equal(window.AppState.diceNumber, 12);
  const vpScore = headerEditor.querySelector('#vp-score-input');
  const vpTotal = headerEditor.querySelector('#vp-total-input');
  assert.ok(vpScore && vpTotal, 'VP score and total inputs exist');
  vpScore.value = '7';
  vpScore.dispatchEvent({ type: 'input' });
  vpTotal.value = '12';
  vpTotal.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.vpScore, 7);
  assert.equal(window.AppState.vpTotal, 12);

});

test('back footer popover edits collectible number and deck size without vibe controls', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  window.showPopover('back-footer');
  const popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Footer popover mounted');

  const cardNumberInput = popover.querySelector('#card-number-input');
  const deckSizeInput = popover.querySelector('#deck-size-input');

  assert.ok(cardNumberInput, 'Card number is editable');
  assert.ok(deckSizeInput, 'Deck size is editable');
  assert.equal(popover.querySelector('#custom-emoji-input'), null, 'custom vibe icon input is removed');
  assert.equal(popover.querySelector('.vibe-picker-grid'), null, 'vibe preset picker is removed');
  cardNumberInput.value = '4';
  cardNumberInput.dispatchEvent({ type: 'input' });
  deckSizeInput.value = '8';
  deckSizeInput.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.cardNumber, '4');
  assert.equal(window.AppState.deckSize, '8');
});

test('resource and development-card choices stay available without a background palette', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  window.showPopover('archetype');
  const popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Archetype popover mounted');

  const resourceSelect = popover.querySelector('#catan-resource-select');
  const roleSelect = popover.querySelector('#catan-role-select');

  assert.ok(resourceSelect, 'Catan resource selection exists');
  assert.ok(roleSelect, 'Development-card role selection exists');
  assert.equal(resourceSelect.children.length, 5, 'All five Catan resources are selectable');
  assert.equal(roleSelect.children.length, 5, 'All five development-card roles are selectable');

  resourceSelect.value = 'ore';
  resourceSelect.dispatchEvent({ type: 'change' });
  roleSelect.value = 'victory-point';
  roleSelect.dispatchEvent({ type: 'change' });
  assert.equal(window.AppState.resourceId, 'ore');
  assert.equal(window.AppState.developmentRoleId, 'victory-point');

  const buttons = popover.querySelectorAll('.archetype-card-item');
  assert.equal(buttons.length, 0, 'archetype background palette is removed');
  assert.doesNotMatch(popover.textContent, /Optional background colour palette/i);
  assert.equal(window.AppState.resourceId, 'ore');
  assert.equal(window.AppState.developmentRoleId, 'victory-point');
});

test('card-back popovers mount and update back face content and layout', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  // 1. Back Header Editor
  window.showPopover('back-header');
  let popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Back header popover mounted');

  const titleInput = popover.querySelector('#back-title-input');
  assert.ok(titleInput, 'Back title input exists');
  titleInput.value = 'Happy 30th Birthday!';
  titleInput.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.backTitle, 'Happy 30th Birthday!');

  const subtitleInput = popover.querySelector('#back-subtitle-input');
  assert.ok(subtitleInput, 'Back subtitle input exists');
  subtitleInput.value = 'Turn 30';
  subtitleInput.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.backSubtitle, 'Turn 30');

  assert.equal(popover.querySelector('#back-layout-select'), null, 'back layout is locked for the deck');

  // 2. Back Letter Editor
  window.showPopover('back-letter');
  popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Back letter popover mounted');

  const letterMode = popover.querySelector('#back-letter-mode');
  assert.ok(letterMode, 'letter editor offers handwritten and typed modes');
  assert.equal(letterMode.value, 'handwritten');
  const letterTextarea = popover.querySelector('#back-letter-input');
  assert.ok(letterTextarea, 'Back letter textarea exists');
  assert.equal(letterTextarea.maxLength, 300);
  letterTextarea.value = 'You are the greatest friend anyone could ask for.';
  letterTextarea.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.backLetter, 'You are the greatest friend anyone could ask for.');
  assert.equal(window.AppState.backLetterMode, 'typed');
  assert.equal(letterMode.value, 'typed');
  assert.equal(popover.querySelector('#back-letter-counter').textContent, '49 / 300');

  const giveInput = popover.querySelector('#back-trade-give-input');
  const getInput = popover.querySelector('#back-trade-get-input');
  const voucherInput = popover.querySelector('#back-voucher-input');
  assert.ok(giveInput, 'I give offer input exists');
  assert.ok(getInput, 'You give offer input exists');
  assert.ok(voucherInput, 'voucher text input exists');
  giveInput.value = 'a home-cooked meal';
  giveInput.dispatchEvent({ type: 'input' });
  getInput.value = 'your favorite story';
  getInput.dispatchEvent({ type: 'input' });
  voucherInput.value = 'One dinner, redeemable any time';
  voucherInput.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.backTradeGive, 'a home-cooked meal');
  assert.equal(window.AppState.backTradeGet, 'your favorite story');
  assert.equal(window.AppState.backVoucher, 'One dinner, redeemable any time');

  // 3. Back Footer Editor
  window.showPopover('back-footer');
  popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Back footer popover mounted');

  const signoffInput = popover.querySelector('#back-signoff-input');
  assert.ok(signoffInput, 'Back signoff input exists');

  signoffInput.value = 'Cheers forever, Sam';
  signoffInput.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.backSignoff, 'Cheers forever, Sam');

});
