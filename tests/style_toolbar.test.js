const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('index.html contains #style-toolbar with texture dropdown, font selectors, font size options, and color pickers', () => {
  const html = fs.readFileSync('./index.html', 'utf8');

  assert.match(html, /id=["']style-toolbar["']/, 'style-toolbar must exist');
  assert.match(html, /id=["']texture-select["']/, 'texture-select dropdown must exist');
  assert.match(html, /id=["']font-title-select["']/, 'font-title-select must exist');
  assert.match(html, /id=["']font-body-select["']/, 'font-body-select must exist');
  assert.match(html, /id=["']font-title-size["']/, 'font-title-size select must exist');
  assert.match(html, /id=["']font-body-size["']/, 'font-body-size select must exist');
  assert.match(html, /id=["']primary-color-picker["']/, 'primary-color-picker must exist');
  assert.match(html, /id=["']accent-color-picker["']/, 'accent-color-picker must exist');

  // Verify side-by-side paired layout
  assert.match(html, /toolbar-group--paired/, 'toolbar-group--paired must exist for side-by-side controls');
  assert.match(html, /toolbar-paired-controls/, 'toolbar-paired-controls must exist');
});

test('css/styles.css defines styling for #style-toolbar, dropdowns, font size scaling, and frame styles', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  assert.match(css, /#style-toolbar|\.style-toolbar/, 'style toolbar styling must exist');
  assert.match(css, /--font-title-size-mult/, 'font-title-size-mult CSS variable must exist');
  assert.match(css, /--font-body-size-mult/, 'font-body-size-mult CSS variable must exist');
  assert.match(css, /\.toolbar-group--paired/, '.toolbar-group--paired styling must exist');
  assert.match(css, /\.toolbar-paired-controls/, '.toolbar-paired-controls styling must exist');

  // Verify upgraded frame styles
  assert.match(css, /\.frame-simple/, '.frame-simple must exist');
  assert.match(css, /\.frame-gold/, '.frame-gold must exist');
  assert.match(css, /\.frame-filigree/, '.frame-filigree must exist');
  assert.match(css, /\.frame-parchment/, '.frame-parchment must exist');
  assert.match(css, /\.frame-holographic/, '.frame-holographic must exist');
  assert.match(css, /\.frame-dark/, '.frame-dark must exist');
  assert.match(css, /\.frame-none/, '.frame-none must exist');
});
