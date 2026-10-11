const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createMockDom() {
  const elements = {};

  function makeEl(id, tagName = 'div') {
    const el = {
      id,
      tagName,
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
      style: {
        setProperty(k, v) { this[k] = v; },
        getPropertyValue(k) { return this[k] || ''; }
      },
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; },
      children: [],
      appendChild(child) { this.children.push(child); return child; },
      dataset: {}
    };
    elements[id] = el;
    return el;
  }

  // Set up mock DOM elements corresponding to index.html
  const card = makeEl('card');
  const cardBadge = makeEl('card-badge');
  const cardTitle = makeEl('card-title-text');
  const cardHp = makeEl('card-hp-text');
  const cardImageFrame = makeEl('card-image-frame');
  const cardPhoto = makeEl('card-photo', 'img');
  const cardArchetype = makeEl('card-archetype-text');
  const cardDesc = makeEl('card-description-text');
  const cardVibes = makeEl('card-vibes');
  const cardYear = makeEl('card-year-text');

  for (let i = 0; i < 4; i++) {
    makeEl(`stat-name-${i}`);
    makeEl(`stat-bar-${i}`);
    makeEl(`stat-val-${i}`);
  }

  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelector(sel) {
      if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
      return null;
    },
    createElement(tag) { return makeEl(`el-${Math.random()}`, tag); },
    addEventListener() {}
  };

  return { elements, document };
}

function loadScripts(windowContext = {}) {
  const archetypesCode = fs.readFileSync('./js/archetypes.js', 'utf8');
  const iconsCode = fs.readFileSync('./js/icons.js', 'utf8');
  const appCode = fs.readFileSync('./js/app.js', 'utf8');
  const cardCode = fs.readFileSync('./js/card.js', 'utf8');

  const context = { window: windowContext, ...windowContext };
  vm.createContext(context);
  vm.runInContext(archetypesCode, context);
  vm.runInContext(iconsCode, context);
  vm.runInContext(appCode, context);
  vm.runInContext(cardCode, context);
  return context.window;
}

test('AppState initializes with default values and updateState modifies state', () => {
  const { elements, document } = createMockDom();
  const win = { document };
  loadScripts(win);

  assert.ok(win.AppState, 'AppState should exist');
  assert.equal(win.AppState.title, "Friend's Name");
  assert.equal(win.AppState.hp, 100);
  assert.equal(win.AppState.archetypeId, 'the-sunshine');
  assert.equal(win.AppState.photoDataUrl, null);
  assert.equal(win.AppState.frameStyle, 'simple');
  assert.equal(win.AppState.stats.length, 4);

  const arch = win.getArchetype();
  assert.equal(arch.id, 'the-sunshine');

  win.updateState({ title: 'Charlie', hp: 150, archetypeId: 'the-creative' });
  assert.equal(win.AppState.title, 'Charlie');
  assert.equal(win.AppState.hp, 150);
  assert.equal(win.AppState.archetypeId, 'the-creative');
  assert.equal(win.getArchetype().id, 'the-creative');
});

test('renderCard updates DOM elements based on AppState', () => {
  const { elements, document } = createMockDom();
  const win = { document };
  loadScripts(win);

  win.updateState({
    title: 'Sarah',
    hp: 250,
    archetypeId: 'the-spark',
    description: 'Brought 4 boxes of donuts to a 5am flight',
    stats: [
      { name: 'Humor', value: 80 },
      { name: 'Hype', value: 99 },
      { name: 'Chaos', value: 75 },
      { name: 'Warmth', value: 90 }
    ],
    vibeIconIds: ['fire', 'lightning'],
    year: '2019'
  });

  assert.equal(elements['card-title-text'].textContent, 'Sarah');
  assert.equal(elements['card-hp-text'].textContent, '250');
  assert.equal(elements['card-archetype-text'].textContent, 'The Spark');
  assert.equal(elements['card-badge'].textContent, '⚡');
  assert.match(elements['card-description-text'].textContent, /donuts/);
  assert.equal(elements['stat-name-1'].textContent, 'Hype');
  assert.equal(elements['stat-bar-1'].style.width, '99%');
  assert.equal(elements['stat-val-1'].textContent, '99');
  assert.match(elements['card-year-text'].textContent, /2019/);
});
