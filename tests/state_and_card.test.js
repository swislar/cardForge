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
  const cardBadge =   makeEl('card-badge');
  makeEl('card-dice-token');
  makeEl('card-dice-number');
  const dicePips = makeEl('card-dice-pips');
  for (let i = 0; i < 6; i++) {
    const pip = makeEl(`dice-pip-${i}`);
    pip.classList.add('pip');
    dicePips.children.push(pip);
  }
  makeEl('card-resource-icon');
  makeEl('card-resource-name');
  makeEl('card-chaos-score');
  const cardTitle = makeEl('card-title-text');
  const cardHp =   makeEl('card-hp-text');
  const cardImageFrame = makeEl('card-image-frame');
  const cardPhoto = makeEl('card-photo', 'img');
  const cardArchetype = makeEl('card-archetype-text');
  const cardVibes = makeEl('card-vibes');
  makeEl('card-back-number');

  for (let i = 0; i < 5; i++) {
    makeEl(`stat-name-${i}`);
    makeEl(`stat-bar-${i}`);
    makeEl(`stat-segments-${i}`);
  }

  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelector(sel) {
      if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
      return null;
    },
    createElement(tag) { return makeEl(`el-${Math.random()}`, tag); },
    createElementNS(namespace, tag) { return makeEl(`el-${Math.random()}`, tag); },
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
  assert.equal(win.AppState.stats.length, 5);

  const arch = win.getArchetype();
  assert.equal(arch.id, 'the-sunshine');

  win.updateState({ title: 'Charlie', hp: 150, archetypeId: 'the-creative' });
  assert.equal(win.AppState.title, 'Charlie');
  assert.equal(win.AppState.hp, 150);
  assert.equal(win.AppState.archetypeId, 'the-creative');
  assert.equal(win.getArchetype().id, 'the-creative');
});

test('dice seven is reserved and invalid dice values are rejected', () => {
  const { elements, document } = createMockDom();
  const win = { document };
  loadScripts(win);
  assert.equal(win.updateState({ diceNumber: 7 }), false);
  assert.equal(win.AppState.diceNumber, 8);
  assert.equal(win.updateState({ diceNumber: 6 }), true);
  assert.equal(win.AppState.diceNumber, 6);
  assert.equal(elements['card-dice-token'].classList.contains('catan-dice-token--red'), true);
  assert.equal(elements['card-dice-pips'].children.filter(pip => pip.classList.contains('is-visible')).length, 5);
  win.updateState({ diceNumber: 8 });
  assert.equal(elements['card-dice-token'].classList.contains('catan-dice-token--red'), true);
  assert.equal(elements['card-dice-pips'].children.filter(pip => pip.classList.contains('is-visible')).length, 5);
});

test('base colours are validated and text automatically switches for readable contrast', () => {
  const { elements, document } = createMockDom();
  const win = { document };
  loadScripts(win);

  assert.equal(win.isValidBaseColor('#28566F'), true);
  assert.equal(win.isValidBaseColor('#9A9A74'), true);
  assert.equal(win.isValidBaseColor('#FFFFFF'), false);
  assert.equal(win.getBaseTextColor('#28566F'), '#F3E7C9');
  assert.equal(win.getBaseTextColor('#9A9A74'), '#30291F');

  assert.equal(win.updateState({ primaryColor: '#9A9A74' }), true);
  assert.equal(elements.card.style['--card-contrast-text'], '#30291F');
  assert.equal(elements.card.style.backgroundColor, '#6B4A2B');
  assert.equal(win.updateState({ primaryColor: '#FFFFFF' }), false);
  assert.equal(win.AppState.primaryColor, '#9A9A74');
});

test('renderCard updates DOM elements based on AppState', () => {
  const { elements, document } = createMockDom();
  const win = { document };
  loadScripts(win);

  win.updateState({
    title: 'Sarah',
    hp: 250,
    archetypeId: 'the-spark',
    resourceId: 'ore',
    developmentRoleId: 'year-of-plenty',
    stats: [
      { name: 'Humor', value: 8 },
      { name: 'Hype', value: 10 },
      { name: 'Chaos', value: 7 },
      { name: 'Warmth', value: 9 }
    ],
    year: '2019'
  });

  assert.equal(elements['card-title-text'].textContent, 'Sarah');
  assert.equal(elements['card-hp-text'].textContent, '10/10');
  assert.equal(elements['card-archetype-text'].textContent, 'YEAR OF PLENTY · Gift');
  assert.equal(elements['card'].style['--resource-color'], '#7A7F87');
  assert.equal(elements['card-resource-name'].textContent, 'ORE');
  assert.equal(elements['card-resource-icon'].textContent, '⛰️');
  assert.equal(elements['stat-name-1'].textContent, 'Hype');
  assert.equal(elements['stat-segments-1'].children.filter(segment => segment.classList.contains('is-filled')).length, 10);
  assert.equal(elements['card-back-number'].textContent, 'Card 3/8');
});

test('Catan identity renders ten SVG hexes per trait and collectible details', () => {
  const { elements, document } = createMockDom();
  const win = { document };
  loadScripts(win);

  assert.equal(win.CATAN_RESOURCES.length * win.CATAN_DEVELOPMENT_ROLES.length, 25);
  win.updateState({
    diceNumber: 2,
    resourceId: 'brick',
    developmentRoleId: 'monopoly',
    stats: win.AppState.stats.map((stat, idx) => ({ ...stat, value: idx === 0 ? 2 : 1 })),
    chaosScore: 82,
    cardNumber: 3,
    deckSize: 8,
  });

  assert.equal(elements['card-dice-number'].textContent, '2');
  assert.equal(elements['card-dice-token'].title, 'Dice number 2, 1 probability pip');
  assert.equal(elements['card-dice-pips'].children.filter(pip => pip.classList.contains('is-visible')).length, 1);
  assert.equal(elements['card'].style['--resource-color'], '#B5532F');
  assert.equal(elements['card-archetype-text'].textContent, 'MONOPOLY · Charmer');
  assert.equal(elements['stat-segments-0'].children.length, 10);
  assert.equal(elements['stat-segments-0'].children.filter(segment => segment.classList.contains('is-filled')).length, 2);
  assert.equal(elements['stat-segments-0'].children[0].tagName, 'svg');
  assert.equal(elements['stat-segments-0'].children[0].children[0].tagName, 'polygon');
  assert.equal(elements['stat-segments-0'].children[0].children[0].getAttribute('fill'), '#B5532F');
  assert.equal(elements['stat-segments-0'].children[2].children[0].getAttribute('fill'), 'rgba(243, 231, 201, 0.18)');
  assert.equal(elements['stat-segments-0'].children[2].children[0].getAttribute('stroke'), 'rgba(243, 231, 201, 0.6)');
  assert.equal(elements['stat-segments-0'].children[2].children[0].getAttribute('stroke-width'), '2');
  assert.equal(elements['card-chaos-score'].textContent, '82');
  assert.equal(elements['card-back-number'].textContent, 'Card 3/8');
});

test('Victory Point score and total are independently editable and clamped', () => {
  const { elements, document } = createMockDom();
  const win = { document };
  loadScripts(win);
  win.updateState({ vpScore: 7, vpTotal: 12 });
  assert.equal(elements['card-hp-text'].textContent, '7/12');
  win.updateState({ vpScore: 99, vpTotal: 4 });
  assert.equal(elements['card-hp-text'].textContent, '4/4');
});
