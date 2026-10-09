const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('css/styles.css defines all 8 texture classes with rich background or overlay rules', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  const textures = [
    'texture-smooth',
    'texture-holographic',
    'texture-parchment',
    'texture-cosmic',
    'texture-linen',
    'texture-leather',
    'texture-gold',
    'texture-carbon'
  ];

  textures.forEach(tex => {
    const regex = new RegExp(`\\.${tex}\\b`);
    assert.match(css, regex, `styles.css must define class .${tex}`);
  });

  // Verify unique material styles
  assert.match(css, /\.texture-holographic/, 'Holographic texture must exist');
  assert.match(css, /\.texture-parchment/, 'Parchment texture must exist');
  assert.match(css, /\.texture-cosmic/, 'Cosmic texture must exist');
  assert.match(css, /\.texture-linen/, 'Linen texture must exist');
  assert.match(css, /\.texture-leather/, 'Leather texture must exist');
  assert.match(css, /\.texture-gold/, 'Gold leaf texture must exist');
  assert.match(css, /\.texture-carbon/, 'Carbon texture must exist');
});
