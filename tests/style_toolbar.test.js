const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('index.html contains #style-toolbar with textures, font selectors, and color pickers', () => {
  const html = fs.readFileSync('./index.html', 'utf8');

  assert.match(html, /id=["']style-toolbar["']/, 'style-toolbar must exist');
  assert.match(html, /id=["']texture-picker["']/, 'texture-picker must exist');
  assert.match(html, /id=["']font-title-select["']/, 'font-title-select must exist');
  assert.match(html, /id=["']font-body-select["']/, 'font-body-select must exist');
  assert.match(html, /id=["']primary-color-picker["']/, 'primary-color-picker must exist');
  assert.match(html, /id=["']accent-color-picker["']/, 'accent-color-picker must exist');
});

test('css/styles.css defines styling for #style-toolbar and controls', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  assert.match(css, /#style-toolbar|\.style-toolbar/, 'style toolbar styling must exist');
  assert.match(css, /\.texture-chip/, 'texture chip styling must exist');
});
