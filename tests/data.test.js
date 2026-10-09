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

test('archetypes.js exports 8 archetypes with correct schema', () => {
  const win = loadScriptInWindowContext('./js/archetypes.js');
  assert.ok(Array.isArray(win.ARCHETYPES), 'ARCHETYPES should be an array');
  assert.equal(win.ARCHETYPES.length, 8, 'There should be exactly 8 archetypes');

  const expectedIds = [
    'the-adventurer',
    'the-listener',
    'the-comedian',
    'the-ride-or-die',
    'the-creative',
    'the-spark',
    'the-anchor',
    'the-wildcard'
  ];

  win.ARCHETYPES.forEach((arch) => {
    assert.ok(arch.id, 'archetype must have id');
    assert.ok(arch.name, 'archetype must have name');
    assert.ok(arch.tagline, 'archetype must have tagline');
    assert.match(arch.primary, /^#[0-9A-Fa-f]{6}$/, 'primary must be 6-digit hex');
    assert.match(arch.accent, /^#[0-9A-Fa-f]{6}$/, 'accent must be 6-digit hex');
    assert.ok(arch.gradient, 'archetype must have gradient string');
    assert.ok(arch.badgeEmoji, 'archetype must have badgeEmoji');
  });

  const actualIds = [...win.ARCHETYPES.map((a) => a.id)];
  assert.deepEqual(Array.from(actualIds), expectedIds);
});

test('icons.js exports 20 vibe icons with correct schema', () => {
  const win = loadScriptInWindowContext('./js/icons.js');
  assert.ok(Array.isArray(win.VIBE_ICONS), 'VIBE_ICONS should be an array');
  assert.equal(win.VIBE_ICONS.length, 20, 'There should be exactly 20 vibe icons');

  win.VIBE_ICONS.forEach((icon) => {
    assert.ok(icon.id, 'icon must have id');
    assert.ok(icon.emoji, 'icon must have emoji');
    assert.ok(icon.name, 'icon must have name');
    assert.ok(icon.meaning, 'icon must have meaning');
  });
});
