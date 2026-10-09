const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('index.html contains 3D card stage, flipper, front, back, flip button, and back sections', () => {
  assert.ok(fs.existsSync('./index.html'), 'index.html must exist');
  const html = fs.readFileSync('./index.html', 'utf8');

  // Verify 3D stage and flipper
  assert.match(html, /id=["']card-stage["']/, 'card-stage element must exist');
  assert.match(html, /id=["']card-flipper["']/, 'card-flipper element must exist');
  assert.match(html, /id=["']card-front["']/, 'card-front element must exist');
  assert.match(html, /id=["']card-back["']/, 'card-back element must exist');
  assert.match(html, /id=["']flip-btn["']/, 'flip-btn element must exist');

  // Verify back face sections
  assert.match(html, /id=["']card-back-header["'][^>]*data-section=["']back-header["']/, 'back-header section must exist');
  assert.match(html, /id=["']card-back-letter["'][^>]*data-section=["']back-letter["']/, 'back-letter section must exist');
  assert.match(html, /id=["']card-back-footer["'][^>]*data-section=["']back-footer["']/, 'back-footer section must exist');
});

test('css/styles.css defines 3D perspective, flipper transitions, face visibility, and flip state', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  assert.match(css, /perspective:\s*1200px/, '3D perspective must be defined');
  assert.match(css, /transform-style:\s*preserve-3d/, 'transform-style preserve-3d must be defined');
  assert.match(css, /backface-visibility:\s*hidden/, 'backface-visibility hidden must be defined');
  assert.match(css, /rotateY\(180deg\)/, 'rotateY(180deg) must be defined for flip');
  assert.match(css, /\.card-face--back/, 'card-face--back class must be defined');
  assert.match(css, /\.is-flipped/, 'is-flipped class must be defined');
  assert.match(css, /\.flip-toggle-btn|#flip-btn/, 'flip button styling must be defined');
});
