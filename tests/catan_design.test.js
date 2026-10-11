const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('index.html contains Catan hex overlay, road banners, and era badge without corner ornaments or moon tokens', () => {
  const html = fs.readFileSync('./index.html', 'utf8');

  // Hex overlay SVG patterns must exist
  assert.match(html, /class=["']catan-hex-overlay["']/, 'Hex grid SVG overlay must exist');
  assert.match(html, /id=["']hexPatternFront["']/, 'hexPatternFront pattern must exist');
  assert.match(html, /id=["']hexPatternBack["']/, 'hexPatternBack pattern must exist');

  // Road dividers and terrain elements must exist
  assert.match(html, /catan-road-banner/, 'catan-road-banner must exist on archetype banner');
  assert.match(html, /catan-road-segment/, 'catan-road-segment must exist');
  assert.match(html, /catan-terrain-track/, 'catan-terrain-track must exist on stat tracks');
  assert.match(html, /catan-era-badge/, 'catan-era-badge must exist on year footer');
  assert.match(html, /catan-road-line/, 'catan-road-line must exist on back header');

  // Border ornaments and moon icons must be removed
  assert.ok(!html.includes('catan-corner-ornament'), 'catan-corner-ornament should be removed from all borders');
  assert.ok(!html.includes('catan-number-token'), 'catan-number-token should be removed from HP');
  assert.ok(!html.includes('catan-pips'), 'catan-pips should be removed from HP');
  assert.ok(!html.includes('catan-resource-hex'), 'catan-resource-hex should be removed from stats');
  assert.ok(!html.includes('catan-stat-token'), 'catan-stat-token should be removed from stats');
});

test('css/styles.css defines Catan design system without corner ornaments or moon tokens', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  // Retained Catan styles
  assert.match(css, /\.catan-hex-overlay/, 'catan-hex-overlay must be styled');
  assert.match(css, /\.catan-road-banner/, 'catan-road-banner must be styled');
  assert.match(css, /\.catan-terrain-track/, 'catan-terrain-track must be styled');
  assert.match(css, /\.catan-era-badge/, 'catan-era-badge must be styled');
  assert.match(css, /\.vibe-badge\s*\{[^}]*border-radius:\s*50%/, 'vibe badge backgrounds must export as rounded circles');
  assert.match(css, /\.vibe-badge\s*\{[^}]*align-items:\s*center[^}]*justify-content:\s*center/, 'vibe emoji must be centered in its background');
  assert.match(css, /\.catan-era-badge\s*\{[^}]*align-items:\s*center[^}]*justify-content:\s*center[^}]*text-align:\s*center/, 'established year text must be centered in its background');
  assert.doesNotMatch(css, /back-signoff-group--blank[^}]*border-style:\s*dashed/, 'blank sign-off box must keep a solid border');

  // Removed elements must not have active rules
  assert.ok(!css.includes('.catan-corner-ornament {'), 'catan-corner-ornament must be removed');
  assert.ok(!css.includes('.catan-number-token {'), 'catan-number-token must be removed');
  assert.ok(!css.includes('.catan-pips {'), 'catan-pips must be removed');
  assert.ok(!css.includes('.catan-stat-token {'), 'catan-stat-token must be removed');
  assert.ok(!css.includes('.catan-resource-hex {'), 'catan-resource-hex must be removed');
});
