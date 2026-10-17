const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createFace(id) {
  const classes = new Set(['texture-gold']);
  return {
    id,
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      }
    },
    style: {
      setProperty(name, value) { this[name] = value; }
    }
  };
}

test('renderCard synchronizes front and back typography and renders editable card scores', () => {
  const elements = {
    'card-front': createFace('card-front'),
    'card-back': createFace('card-back'),
    'card-title-text': { textContent: '', style: {} },
    'card-back-title': { textContent: '', style: {} },
    'card-back-subtitle': { textContent: '', style: {} },
    'card-back-number': { textContent: '', style: {} },
    'card-back-letter-text': { textContent: '', style: {} },
    'card-back-trade-give': { textContent: '' },
    'card-back-trade-get': { textContent: '' },
    'card-back-voucher': { textContent: '' },
    'card-back-signoff': { textContent: '', style: {} },
    'card-back-date': { textContent: '', style: {} },
    'card-hp-text': { textContent: '' },
    'card-dice-number': { textContent: '' },
    'card-dice-token': { title: '', classList: { toggle() {} } },
    'card-archetype-text': { textContent: '', style: {} }
  };
  const document = {
    getElementById(id) { return elements[id] || null; }
  };
  elements['card-back'].querySelector = () => null;
  const window = { document };
  const context = { window, document };
  vm.createContext(context);
  for (const script of ['./js/archetypes.js', './js/textures.js', './js/app.js', './js/card.js']) {
    vm.runInContext(fs.readFileSync(script, 'utf8'), context);
  }

  window.updateState({
    title: 'Maya',
    backTitle: 'A celebration',
    backLetter: 'A lovely letter',
    backLetterMode: 'typed',
    backSubtitle: 'Harvest Day',
    backTradeGive: 'one dinner',
    backTradeGet: 'your company',
    backVoucher: 'Dinner, redeemable any time',
    fontFamilyTitle: 'Marcellus',
    fontFamilyBody: 'Cormorant Garamond',
    fontSizeTitle: 'xlarge',
    fontSizeBody: 'small',
    backLayout: 'tcg',
    backStyle: 'tcg',
    backSealEmoji: '🧁',
    vpScore: 7,
    vpTotal: 10
  });

  assert.equal(elements['card-back'].style['--font-title'], elements['card-front'].style['--font-title']);
  assert.equal(elements['card-back'].style['--font-body'], elements['card-front'].style['--font-body']);
  assert.equal(elements['card-back-title'].style.fontFamily, elements['card-title-text'].style.fontFamily);
  assert.equal(elements['card-title-text'].style.fontFamily, "'Cinzel', serif");
  assert.equal(elements['card-front'].style['--font-title-size-mult'], undefined);
  assert.equal(elements['card-front'].style['--font-body-size-mult'], undefined);
  assert.equal(elements['card-back'].classList.contains('back-layout--tcg'), false);
  assert.equal(elements['card-back-letter-text'].style.fontFamily, 'Georgia, "Times New Roman", serif');
  assert.equal(elements['card-back-subtitle'].textContent, 'Harvest Day');
  assert.equal(elements['card-back-trade-give'].textContent, 'one dinner');
  assert.equal(elements['card-back-trade-get'].textContent, 'your company');
  assert.equal(elements['card-back-voucher'].textContent, 'Dinner, redeemable any time');
  assert.equal(elements['card-hp-text'].textContent, '7/10');
  assert.equal(elements['card-dice-number'].textContent, '8');
  assert.equal(elements['card-back-number'].textContent, 'Card 3/8');
});
