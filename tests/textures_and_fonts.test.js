const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadScriptInWindowContext(filePath, windowContext = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  const context = { window: windowContext, ...windowContext };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window;
}

test('textures.js exports CARD_TEXTURES with textures including bright finishes and AVAILABLE_FONTS', () => {
  const win = loadScriptInWindowContext('./js/textures.js');
  assert.ok(Array.isArray(win.CARD_TEXTURES), 'CARD_TEXTURES must be an array');
  assert.equal(win.CARD_TEXTURES.length, 12, 'Must have exactly 12 textures');

  const expectedIds = ['smooth', 'holographic', 'parchment', 'cosmic', 'linen', 'leather', 'gold', 'carbon', 'pearl', 'crystal', 'aurora', 'prismatic'];
  const actualIds = win.CARD_TEXTURES.map(t => t.id);
  expectedIds.forEach(id => {
    assert.ok(actualIds.includes(id), `Missing texture id: ${id}`);
  });

  assert.ok(win.AVAILABLE_FONTS, 'AVAILABLE_FONTS must exist');
  assert.ok(Array.isArray(win.AVAILABLE_FONTS.title), 'AVAILABLE_FONTS.title must be an array');
  assert.ok(Array.isArray(win.AVAILABLE_FONTS.body), 'AVAILABLE_FONTS.body must be an array');

  const titleIds = win.AVAILABLE_FONTS.title.map(f => f.id);
  const bodyIds = win.AVAILABLE_FONTS.body.map(f => f.id);

  assert.ok(!titleIds.includes('Orbitron'), 'Orbitron sci-fi font must be removed from title fonts');
  assert.ok(titleIds.includes('Cinzel Decorative'), 'Cinzel Decorative card font must be included');
  assert.ok(titleIds.includes('Cormorant Garamond'), 'Cormorant Garamond card font must be included');
  assert.ok(titleIds.includes('Marcellus'), 'Marcellus card font must be included');
  assert.ok(titleIds.includes('EB Garamond'), 'EB Garamond card font must be included');

  assert.ok(bodyIds.includes('EB Garamond'), 'EB Garamond lore font must be included in body fonts');
  assert.ok(bodyIds.includes('Cormorant Garamond'), 'Cormorant Garamond lore font must be included in body fonts');
});

test('AppState in app.js initializes expanded custom properties and double-sided state', () => {
  // Load archetypes, textures, then app
  const win = {};
  loadScriptInWindowContext('./js/archetypes.js', win);
  loadScriptInWindowContext('./js/textures.js', win);
  loadScriptInWindowContext('./js/app.js', win);

  const state = win.AppState;
  assert.ok(state, 'AppState must exist');
  assert.equal(state.primaryColor, '#28566F');
  assert.equal(state.accentColor, '#6B4A2B');
  assert.equal(state.fontFamilyTitle, 'Cinzel');
  assert.equal(state.fontFamilyBody, 'Outfit');
  assert.equal(state.cardTexture, 'gold');
  assert.equal(
    JSON.stringify(state.stats.map(({ name, value }) => [name, value])),
    JSON.stringify([
      ['Reliable', 5],
      ['Growing', 5],
      ['Comforting', 5],
      ['Nourishing', 5],
      ['Resilient', 5]
    ])
  );
  assert.equal(state.backStyle, 'letter');
  assert.equal(state.backTitle, 'Happy Birthday!');
  assert.equal(state.backSubtitle, 'Harvest Day');
  assert.equal(state.backLetter, '');
  assert.equal(state.backLetterMode, 'handwritten');
  assert.match(state.backSignoff, /With love, \[Your name\]/);
  assert.equal(state.backTradeGive, 'one dinner');
  assert.equal(state.backTradeGet, 'your company');
  assert.equal(state.backVoucher, '1 dinner, redeemable any time');
  assert.equal(state.backDate, '');
  assert.equal(state.backSealEmoji, undefined, 'deck icon set is fixed, not card-customizable');
  assert.equal(state.isFlipped, false);
  assert.equal(state.vibeIcons, undefined, 'legacy vibe icon state must be removed');
});
