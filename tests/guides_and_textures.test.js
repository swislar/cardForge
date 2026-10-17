const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('index.html contains guide toggle button and guide badges for all customizable sections', () => {
  const html = fs.readFileSync('./index.html', 'utf8');

  // Verify guide toggle button and initial ON label
  assert.match(html, /id=["']guide-toggle-btn["']/, 'guide-toggle-btn must exist');
  assert.match(html, /Edit Guides:\s*ON/, 'Guides should be ON by default');

  // Verify guide badges on Front face
  assert.match(html, /<span class="card-guide-badge[^"]*" data-for="header">/, 'header guide badge must exist');
  assert.match(html, /<span class="card-guide-badge[^"]*" data-for="image">/, 'image guide badge must exist');
  assert.match(html, /<span class="card-guide-badge[^"]*" data-for="archetype">/, 'archetype guide badge must exist');
  assert.match(html, /<span class="card-guide-badge[^"]*" data-for="stats">/, 'stats guide badge must exist');
  assert.doesNotMatch(html, /data-for=["'](?:description|footer)["']/, 'front memory and footer guides are removed');

  // Verify guide badges on Back face
  assert.match(html, /<span class="card-guide-badge[^"]*" data-for="back-header">/, 'back-header guide badge must exist');
  assert.match(html, /<span class="card-guide-badge[^"]*" data-for="back-letter">/, 'back-letter guide badge must exist');
  assert.match(html, /<span class="card-guide-badge[^"]*" data-for="back-footer">/, 'back-footer guide badge must exist');
});

test('css/styles.css defines guide badge styles and export suppression', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  assert.match(css, /\.card-guide-badge/, 'card-guide-badge must be styled');
  assert.match(css, /\.guide-toggle-btn/, 'guide-toggle-btn must be styled');
  assert.match(css, /\.guides-hidden/, 'guides-hidden state must be defined');
  assert.match(css, /\.card--exporting\s+\.card-guide-badge[^}]*display:\s*none\s*!important/, 'guide badges must be hidden during export');
});
