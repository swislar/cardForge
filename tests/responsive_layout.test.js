const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('css/styles.css defines responsive layout for header to prevent edit guide button overlap on small screens', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  // Verify responsive header styles inside media queries
  // 1. .header-inner must switch to flex-direction: column on small screens (< 768px)
  assert.match(
    css,
    /@media[^{]*\([^{]*max-width:\s*(?:768|800)px[^{]*\)[\s\S]*?\.header-inner[\s\S]*?flex-direction:\s*column/,
    'header-inner must switch to column layout on small screens'
  );

  // 2. .header-actions must not remain absolute or overlapping on small screens
  assert.match(
    css,
    /@media[^{]*\([^{]*max-width:\s*(?:768|800)px[^{]*\)[\s\S]*?\.header-actions[\s\S]*?position:\s*static/,
    'header-actions must switch to static position on small screens to prevent overlap'
  );
});

test('css/styles.css defines responsive layout for customisation toolbar to prevent overflow on small screens', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');

  // Verify responsive styling for toolbar container
  assert.match(
    css,
    /@media[^{]*\([^{]*max-width:\s*(?:768|800)px[^{]*\)[\s\S]*?(?:#style-toolbar|\.style-toolbar)[\s\S]*?padding/,
    'style-toolbar must have responsive padding on small screens'
  );

  // The retained background color controls should stay centered and fit the toolbar.
  assert.match(
    css,
    /@media[^{]*\([^{]*max-width:\s*(?:768|800)px[^{]*\)[\s\S]*?\.toolbar-group--colors[\s\S]*?justify-content:\s*center/,
    'background color controls must remain centered on small screens'
  );

  // Old typography and texture controls should stay removed.
  assert.match(
    fs.readFileSync('./index.html', 'utf8'),
    /id=["'](?:primary-color-picker|accent-color-picker)["']/,
    'background color controls must remain available'
  );
});
