const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('css/styles.css includes visual polish features', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  // Placeholder state & pulse animation
  assert.match(css, /\.card--placeholder/);
  assert.match(css, /placeholderPulse/);

  // Holographic shimmer
  assert.match(css, /shimmerSweep/);

  // Frame styles
  assert.match(css, /\.frame-simple/);
  assert.match(css, /\.frame-gold/);
  assert.match(css, /\.frame-holographic/);
  assert.match(css, /\.frame-none/);

  // Card entrance animation
  assert.match(css, /cardEntrance/);

  // Popover backdrop for mobile
  assert.match(css, /\.popover-backdrop/);
});
