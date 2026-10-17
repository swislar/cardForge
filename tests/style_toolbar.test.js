const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('index.html contains only the retained background color controls', () => {
  const html = fs.readFileSync('./index.html', 'utf8');

  assert.match(html, /id=["']style-toolbar["']/, 'style-toolbar must exist');
  assert.match(html, /id=["']primary-color-picker["']/, 'primary-color-picker must exist');
  assert.match(html, /id=["']accent-color-picker["']/, 'accent-color-picker must exist');
  assert.match(html, /class=["']base-color-presets["'][\s\S]*data-base-color=/, 'fixed base-colour presets must be available');
  assert.match(html, /id=["']base-color-error["'][^>]*aria-live=["']polite["']/, 'rejected base colours must explain the contrast guard');
  assert.doesNotMatch(html, /id=["'](?:texture-select|font-title-select|font-body-select|font-title-size|font-body-size)["']/, 'old finish and typography selectors must be removed');
  assert.doesNotMatch(html, /Vibe Badges|Vibe Icons|Active Vibe Badges/, 'vibe controls must be removed');
});

test('css/styles.css retains background toolbar and photo frame styling without old customization controls', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  assert.match(css, /#style-toolbar|\.style-toolbar/, 'style toolbar styling must exist');
  assert.doesNotMatch(css, /\.toolbar-select|\.texture-chip|\.toolbar-paired-controls/, 'removed texture and typography controls must not retain toolbar styles');
  assert.doesNotMatch(css, /\.vibe-(?:badge|picker)/, 'removed vibe controls must not retain styling');

  // Verify upgraded frame styles
  assert.match(css, /\.frame-simple/, '.frame-simple must exist');
  assert.match(css, /\.frame-gold/, '.frame-gold must exist');
  assert.match(css, /\.frame-filigree/, '.frame-filigree must exist');
  assert.match(css, /\.frame-parchment/, '.frame-parchment must exist');
  assert.match(css, /\.frame-holographic/, '.frame-holographic must exist');
  assert.match(css, /\.frame-dark/, '.frame-dark must exist');
  assert.match(css, /\.frame-none/, '.frame-none must exist');
  assert.match(css, /\.back-title\s*\{[^}]*font-size:\s*25\.28px/, 'back title is 13 pt at print size');
  assert.match(css, /\.back-letter-text\s*\{[^}]*font-size:\s*15\.56px/, 'typed back letter is 8 pt at print size');
});
