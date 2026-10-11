const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('assets/placeholder.svg exists and is valid SVG', () => {
  assert.ok(fs.existsSync('./assets/placeholder.svg'), 'placeholder.svg must exist');
  const svg = fs.readFileSync('./assets/placeholder.svg', 'utf8');
  assert.match(svg, /<svg[^>]*viewBox=["']0 0 326 163["']/i);
  assert.match(svg, /Click to add photo/i);
  assert.match(svg, /JPG, PNG or WebP/i);
});

test('index.html contains required DOM elements and script inclusions', () => {
  assert.ok(fs.existsSync('./index.html'), 'index.html must exist');
  const html = fs.readFileSync('./index.html', 'utf8');

  // Verify structure
  assert.match(html, /id=["']app["']/);
  assert.match(html, /id=["']card-container["']/);
  assert.match(html, /id=["'](card|card-front)["']/);
  assert.match(html, /id=["']card-header["'][^>]*data-section=["']header["']/);
  assert.match(html, /id=["']card-image["'][^>]*data-section=["']image["']/);
  assert.match(html, /id=["']card-archetype["'][^>]*data-section=["']archetype["']/);
  assert.match(html, /id=["']card-description["'][^>]*data-section=["']description["']/);
  assert.match(html, /id=["']card-stats["'][^>]*data-section=["']stats["']/);
  assert.match(html, /id=["']card-footer["'][^>]*data-section=["']footer["']/);
  assert.match(html, /id=["']card-purpose-label["']/);
  assert.match(html, /The impression of your friend/);
  const cardScript = fs.readFileSync('./js/card.js', 'utf8');
  assert.match(cardScript, /The message to your friend/);
  assert.match(html, /id=["']download-btn["']/);
  assert.match(html, /id=["']popover-root["']/);

  // Verify scripts
  assert.match(html, /src=["']js\/archetypes\.js["']/);
  assert.match(html, /src=["']js\/icons\.js["']/);
  assert.match(html, /src=["']js\/app\.js["']/);
  assert.match(html, /src=["']js\/card\.js["']/);
  assert.match(html, /src=["']js\/popover\.js["']/);
  assert.match(html, /src=["']js\/export\.js["']/);
});

test('css/styles.css exists and defines card geometry and custom properties', () => {
  assert.ok(fs.existsSync('./css/styles.css'), 'styles.css must exist');
  const css = fs.readFileSync('./css/styles.css', 'utf8');
  assert.match(css, /350px/);
  assert.match(css, /490px/);
  assert.match(css, /--archetype-primary/);
  assert.match(css, /--archetype-accent/);
  assert.match(css, /\.card-section/);
});

test('popover-root is at body level outside #app and backdrop is scoped to mobile', () => {
  const html = fs.readFileSync('./index.html', 'utf8');
  // popover-root must be outside #app (after </div> closing #app) so it does not get trapped in #app stacking context
  const appCloseIdx = html.indexOf('  </div>\n\n  <!-- Scripts -->');
  const popoverRootIdx = html.indexOf('id="popover-root"');
  assert.ok(popoverRootIdx > appCloseIdx, 'popover-root must be outside #app, not trapped inside #app stacking context');

  // Verify styles.css hides popover-backdrop on desktop
  const css = fs.readFileSync('./css/styles.css', 'utf8');
  assert.match(css, /\.popover-backdrop\s*\{[^}]*display:\s*none;/, 'popover-backdrop must have display: none on desktop');
});
