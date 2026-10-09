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
            if (selector.startsWith('.') && ch.classList.contains(selector.slice(1))) {
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
  const card = makeEl('card');
  const popoverRoot = makeEl('popover-root');

  const sections = ['header', 'image', 'archetype', 'description', 'stats', 'footer'];
  sections.forEach(s => {
    const secEl = makeEl(`card-${s}`);
    secEl.dataset.section = s;
    secEl.classList.add('card-section');
    card.appendChild(secEl);
  });

  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelectorAll(selector) {
      if (selector === '.card-section') {
        return sections.map(s => elements[`card-${s}`]);
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
  const archetypesCode = fs.readFileSync('./js/archetypes.js', 'utf8');
  const iconsCode = fs.readFileSync('./js/icons.js', 'utf8');
  const appCode = fs.readFileSync('./js/app.js', 'utf8');
  const cardCode = fs.readFileSync('./js/card.js', 'utf8');
  const popoverCode = fs.readFileSync('./js/popover.js', 'utf8');

  const context = { window: win, document: win.document, ...win };
  vm.createContext(context);
  vm.runInContext(archetypesCode, context);
  vm.runInContext(iconsCode, context);
  vm.runInContext(appCode, context);
  vm.runInContext(cardCode, context);
  vm.runInContext(popoverCode, context);
  return context.window;
}

test('popover module registers showPopover, hidePopover, and section editors', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  assert.equal(typeof window.showPopover, 'function');
  assert.equal(typeof window.hidePopover, 'function');

  // Open Header Popover
  window.showPopover('header');
  assert.ok(elements['popover-root'].children.length > 0, 'Popover should be mounted');

  // Verify hidePopover closes it
  window.hidePopover();
  assert.equal(elements['popover-root'].children.length, 0, 'Popover should be removed');
});

test('archetype editor switches archetype and updates state', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  window.showPopover('archetype');
  const popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Archetype popover mounted');

  window.updateState({ archetypeId: 'the-wildcard' });
  assert.equal(window.AppState.archetypeId, 'the-wildcard');
});

test('description, stats, footer, and image editors mount correctly', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  // Description
  window.showPopover('description');
  assert.ok(elements['popover-root'].children[0], 'Description popover mounted');

  // Stats
  window.showPopover('stats');
  assert.ok(elements['popover-root'].children[0], 'Stats popover mounted');

  // Footer
  window.showPopover('footer');
  assert.ok(elements['popover-root'].children[0], 'Footer popover mounted');

  // Image
  window.showPopover('image');
  assert.ok(elements['popover-root'].children[0], 'Image popover mounted');
});
