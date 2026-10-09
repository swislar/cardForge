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

test('textures.js exports CARD_TEXTURES with 8 textures and AVAILABLE_FONTS', () => {
  const win = loadScriptInWindowContext('./js/textures.js');
  assert.ok(Array.isArray(win.CARD_TEXTURES), 'CARD_TEXTURES must be an array');
  assert.equal(win.CARD_TEXTURES.length, 8, 'Must have exactly 8 textures');

  const expectedIds = ['smooth', 'holographic', 'parchment', 'cosmic', 'linen', 'leather', 'gold', 'carbon'];
  const actualIds = win.CARD_TEXTURES.map(t => t.id);
  expectedIds.forEach(id => {
    assert.ok(actualIds.includes(id), `Missing texture id: ${id}`);
  });

  assert.ok(win.AVAILABLE_FONTS, 'AVAILABLE_FONTS must exist');
  assert.ok(Array.isArray(win.AVAILABLE_FONTS.title), 'AVAILABLE_FONTS.title must be an array');
  assert.ok(Array.isArray(win.AVAILABLE_FONTS.body), 'AVAILABLE_FONTS.body must be an array');
});

test('AppState in app.js initializes expanded custom properties and double-sided state', () => {
  // Load archetypes, textures, then app
  const win = {};
  loadScriptInWindowContext('./js/archetypes.js', win);
  loadScriptInWindowContext('./js/textures.js', win);
  loadScriptInWindowContext('./js/app.js', win);

  const state = win.AppState;
  assert.ok(state, 'AppState must exist');
  assert.equal(state.primaryColor, '#2D7D46');
  assert.equal(state.accentColor, '#7DCEA0');
  assert.equal(state.fontFamilyTitle, 'Cinzel');
  assert.equal(state.fontFamilyBody, 'Outfit');
  assert.equal(state.cardTexture, 'smooth');
  assert.equal(state.backStyle, 'letter');
  assert.equal(state.backTitle, 'Happy Birthday!');
  assert.match(state.backLetter, /unforgettable/i);
  assert.match(state.backSignoff, /love/i);
  assert.equal(state.backDate, 'October 2026');
  assert.equal(state.backSealEmoji, '🎂');
  assert.equal(state.isFlipped, false);
  assert.ok(Array.isArray(state.vibeIcons), 'vibeIcons must be an array');
});
