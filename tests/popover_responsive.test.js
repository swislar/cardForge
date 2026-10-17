const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createMockDom(options = {}) {
  const innerWidth = options.innerWidth || 1024;
  const innerHeight = options.innerHeight || 768;
  const cardRect = options.cardRect || {
    top: 150,
    bottom: 640,
    left: Math.round((innerWidth - 350) / 2),
    right: Math.round((innerWidth + 350) / 2),
    width: 350,
    height: 490
  };

  const elements = {};
  const listeners = {};

  function makeEl(id, tagName = 'div') {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      className: '',
      offsetWidth: 330,
      offsetHeight: 400,
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
        top: '',
        left: '',
        right: '',
        bottom: '',
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
        if (id === 'card-front' || id === 'card' || id === 'card-back') {
          return cardRect;
        }
        return {
          top: cardRect.top + 20,
          bottom: cardRect.top + 70,
          left: cardRect.left,
          right: cardRect.right,
          width: 350,
          height: 50
        };
      },
      dataset: {}
    };
    elements[id] = el;
    return el;
  }

  const app = makeEl('app');
  const cardFront = makeEl('card-front');
  const popoverRoot = makeEl('popover-root');
  const popoverBackdrop = makeEl('popover-backdrop');

  const sections = ['header', 'image', 'archetype', 'stats'];
  sections.forEach(s => {
    const secEl = makeEl(`card-${s}`);
    secEl.dataset.section = s;
    secEl.classList.add('card-section');
    cardFront.appendChild(secEl);
  });

  const document = {
    body: makeEl('body'),
    documentElement: { scrollTop: 0, scrollLeft: 0 },
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
    innerWidth,
    innerHeight,
    pageXOffset: 0,
    pageYOffset: 0,
    addEventListener(evt, handler) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push({ el: null, handler });
    }
  };

  return { elements, document, window, listeners, cardRect };
}

function loadScripts(win) {
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

test('at large widths (e.g. 1280px), customization popup appears on the right side of the card', () => {
  const { elements, window, cardRect } = createMockDom({ innerWidth: 1280 });
  loadScripts(window);

  window.showPopover('header');
  const popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Popover must be mounted');

  const leftVal = parseInt(popover.style.left, 10);
  assert.ok(
    leftVal >= cardRect.right,
    `Popover left (${leftVal}px) must be to the right of card (${cardRect.right}px) on large screens`
  );
});

test('at medium widths (e.g. 900px), customization popup does not appear on the left overlapping the card', () => {
  const { elements, window, cardRect } = createMockDom({ innerWidth: 900 });
  loadScripts(window);

  window.showPopover('header');
  const popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Popover must be mounted');

  // At medium widths (900px), cardRect is left: 275, right: 625.
  // Previously, popover left was set to 12px, spanning 12..342px, overlapping the card (starts at 275px).
  // The popup should be in bottom-sheet mode (style.left should NOT be a pixel coordinate overlapping card).
  if (popover.style.left && popover.style.left !== '') {
    const leftVal = parseInt(popover.style.left, 10);
    const popoverRight = leftVal + popover.offsetWidth;
    const overlapsCard = leftVal < cardRect.right && popoverRight > cardRect.left;
    assert.ok(!overlapsCard, `Popover (${leftVal}px..${popoverRight}px) must not overlap card (${cardRect.left}px..${cardRect.right}px)`);
  } else {
    // Bottom-sheet mode has empty/unassigned inline style.left so CSS bottom sheet applies
    assert.equal(popover.style.left, '', 'Popover in bottom-sheet mode should clear inline left style');
  }
});

test('css/styles.css defines bottom-sheet styling covering medium widths (up to 1024px)', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  // Verify that bottom-sheet styling applies to medium screens (at least up to 1024px)
  const hasMediumSheet = /@media[^{]*\([^{]*max-width:\s*(?:1024|1080)px[^{]*\)[\s\S]*?\.popover-card[\s\S]*?position:\s*fixed[\s\S]*?bottom:\s*0/.test(css);
  assert.ok(
    hasMediumSheet,
    'styles.css must include bottom-sheet rules for .popover-card covering medium widths (up to 1024px or 1080px)'
  );
});
