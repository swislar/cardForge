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
            if (selector.startsWith('.') && ch.className.split(/\s+/).includes(selector.slice(1))) {
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

  const sections = ['header', 'image', 'archetype', 'stats'];
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
    createElement(tag) {
      const el = makeEl(`el-${Math.random()}`, tag);
      if (tag === 'canvas') {
        el.getContext = () => ({ drawImage() {} });
        el.toDataURL = () => 'data:image/jpeg;base64,resized';
      }
      return el;
    },
    addEventListener(evt, handler) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push({ el: null, handler });
    }
  };

  const window = {
    document,
    innerWidth: 1024,
    innerHeight: 768,
    FileReader: class {
      readAsDataURL() {
        this.onload({ target: { result: 'data:image/png;base64,original' } });
      }
    },
    Image: class {
      constructor() {
        this.width = 100;
        this.height = 100;
      }
      set src(value) {
        this.onload();
      }
    },
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

test('resource editor no longer shows an archetype color palette', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  window.showPopover('archetype');
  const popover = elements['popover-root'].children[0];
  assert.ok(popover, 'Archetype popover mounted');

  assert.equal(popover.querySelectorAll('.archetype-card-item').length, 0);
});

test('stats, back footer, and image editors mount correctly', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  // Stats
  window.showPopover('stats');
  assert.ok(elements['popover-root'].children[0], 'Stats popover mounted');

  // Back footer
  window.showPopover('back-footer');
  assert.ok(elements['popover-root'].children[0], 'Back footer popover mounted');

  // Image
  window.showPopover('image');
  assert.ok(elements['popover-root'].children[0], 'Image popover mounted');
});

test('successfully uploading a photo closes the image editor', () => {
  const { elements, window } = createMockDom();
  loadAllScripts(window);

  window.showPopover('image');
  const popover = elements['popover-root'].children[0];
  const fileInput = popover.querySelector('.photo-file-input');
  assert.ok(fileInput, 'Image upload input is available');

  fileInput.files = [{ type: 'image/png' }];
  fileInput.dispatchEvent({
    type: 'change',
    target: { files: fileInput.files }
  });

  assert.equal(window.AppState.photoDataUrl, 'data:image/jpeg;base64,resized');
  assert.equal(elements['popover-root'].children.length, 0, 'successful upload closes the editor');
});
