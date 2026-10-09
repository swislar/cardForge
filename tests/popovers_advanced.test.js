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

  const frontSections = ['header', 'image', 'archetype', 'description', 'stats', 'footer'];
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

test('footer popover supports custom emoji badge adding and active badge removal', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  window.showPopover('footer');
  const popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Footer popover mounted');

  const customEmojiInput = popover.querySelector('#custom-emoji-input');
  const customLabelInput = popover.querySelector('#custom-emoji-label');
  const addBtn = popover.querySelector('#add-custom-badge-btn');

  assert.ok(customEmojiInput, 'Custom emoji input exists');
  assert.ok(addBtn, 'Add custom badge button exists');

  // Add custom emoji badge
  customEmojiInput.value = '🎂';
  if (customLabelInput) customLabelInput.value = 'Party Animal';
  addBtn.dispatchEvent({ type: 'click' });

  // Verify AppState.vibeIcons contains custom badge
  const hasCustom = window.AppState.vibeIcons.some(b => b.emoji === '🎂');
  assert.ok(hasCustom, 'Custom badge was added to AppState.vibeIcons');
});

test('archetype editor supports custom archetype name and custom badge emoji', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  window.showPopover('archetype');
  const popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Archetype popover mounted');

  const customNameInput = popover.querySelector('#custom-archetype-name');
  const customBadgeInput = popover.querySelector('#custom-archetype-badge');

  assert.ok(customNameInput, 'Custom archetype name input exists');
  assert.ok(customBadgeInput, 'Custom archetype badge input exists');

  customNameInput.value = 'The Legend';
  customNameInput.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.archetypeName, 'The Legend');

  customBadgeInput.value = '🔥';
  customBadgeInput.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.archetypeBadge, '🔥');
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

  const layoutSelect = popover.querySelector('#back-layout-select');
  if (layoutSelect) {
    layoutSelect.value = 'tcg';
    layoutSelect.dispatchEvent({ type: 'change' });
    assert.equal(window.AppState.backLayout, 'tcg');
  }

  // 2. Back Letter Editor
  window.showPopover('back-letter');
  popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Back letter popover mounted');

  const letterTextarea = popover.querySelector('#back-letter-input');
  assert.ok(letterTextarea, 'Back letter textarea exists');
  letterTextarea.value = 'You are the greatest friend anyone could ask for.';
  letterTextarea.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.backLetter, 'You are the greatest friend anyone could ask for.');

  // 3. Back Footer Editor
  window.showPopover('back-footer');
  popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Back footer popover mounted');

  const signoffInput = popover.querySelector('#back-signoff-input');
  const dateInput = popover.querySelector('#back-date-input');
  assert.ok(signoffInput, 'Back signoff input exists');
  assert.ok(dateInput, 'Back date input exists');

  signoffInput.value = 'Cheers forever, Sam';
  signoffInput.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.backSignoff, 'Cheers forever, Sam');

  dateInput.value = 'November 2026';
  dateInput.dispatchEvent({ type: 'input' });
  assert.equal(window.AppState.backDate, 'November 2026');
});
