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

  // Verify paired controls flex without overflow (min-width: 0 or responsive width)
  assert.match(
    css,
    /@media[^{]*\([^{]*max-width:\s*(?:768|800)px[^{]*\)[\s\S]*?\.toolbar-paired-controls[\s\S]*?min-width:\s*0/,
    'toolbar-paired-controls must allow shrinking with min-width: 0 on small screens'
  );

  // Verify selects have max-width or width constraint to prevent long option text overflow
  assert.match(
    css,
    /\.toolbar-select[\s\S]*?max-width:\s*100%/,
    'toolbar-select must have max-width: 100% to prevent option text overflow'
  );
});
