const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('index.html contains the Catan resource-role card anatomy', () => {
  const html = fs.readFileSync('./index.html', 'utf8');

  // Hex overlay SVG patterns must exist
  assert.match(html, /class=["']catan-hex-overlay["']/, 'Hex grid SVG overlay must exist');
  assert.match(html, /id=["']hexPatternFront["']/, 'hexPatternFront pattern must exist');
  assert.match(html, /id=["']hexPatternBack["']/, 'hexPatternBack pattern must exist');

  // Resource/development-card identity and collectible details
  assert.match(html, /catan-role-ribbon/, 'development-card role must use a ribbon');
  assert.match(html, /card-dice-token/, 'dice-number token must replace the sun badge');
  assert.match(html, /card-dice-pips/, 'dice token includes probability dots');
  assert.match(html, /card-chaos-score/, 'robber badge must show a chaos score');
  assert.match(html, /card-segments-4|stat-segments-4/, 'the fifth resource row must have segmented rating cells');
  assert.equal((html.match(/class="stat-segments"/g) || []).length, 5, 'all five ratings use segmented hexes');
  assert.doesNotMatch(html, /stat-bar-fill|stat-bar-\d/, 'legacy smooth rating bars are removed');
  assert.doesNotMatch(html, /memory-label|card-description-text/, 'front memory panel is omitted');
  assert.match(html, /card-back-number/, 'collectible deck attribution must appear on the back');
  assert.doesNotMatch(html, /card-year-text|card-chaos-score[^<]*<\/div>/, 'front footer content is removed');
  assert.doesNotMatch(html, /card-description|data-for="description"/, 'front memory strip is removed');
  assert.match(html, /photo-resource-pill[\s\S]*card-resource-name/, 'photo shows the selected resource label');
  assert.match(html, /photo-chaos-pill[\s\S]*card-chaos-score/, 'photo shows the chaos badge');
  assert.equal((html.match(/class="catan-dice-pips"/g) || []).length, 1, 'front dice token has probability pips');
  assert.doesNotMatch(html, /id="stat-val-\d+"/, 'rating values are conveyed by filled hexes only');
  assert.match(html, /card-back-title["'][^>]*class=["']back-title["']>Happy Birthday!/, 'back title must retain Happy Birthday');
  assert.match(html, /card-back-subtitle/, 'back title must include an editable subtitle');
  assert.match(html, /card-back-trade-give/, 'back face must show the I give trade offer');
  assert.match(html, /card-back-trade-get/, 'back face must show the You give trade offer');
  assert.match(html, /card-back-voucher/, 'back face must include a redeemable voucher');
  assert.match(html, /card-back-letter-text["'][^>]*class=["']back-letter-text["']><\/p>/, 'back letter must not contain sample copy by default');
  assert.match(html, /With love, \[Your name\]/, 'back sign-off must prompt for the sender name');
  assert.match(html, /back-subtitle-row[\s\S]*?🎂[\s\S]*?card-back-subtitle[\s\S]*?🎂/, 'birthday cake icons flank the back subtitle');
  assert.doesNotMatch(html, /card-back-seal|back-wax-seal/, 'birthday cake is no longer in the footer');
  assert.match(html, /primary-color-picker["'][^>]*value=["']#28566F/, 'shared base color starts at warm sea blue');
  assert.equal((html.match(/data-base-color=/g) || []).length, 3, 'base colour toolbar offers three fixed presets');
  assert.match(html, /accent-color-picker["'][^>]*value=["']#6B4A2B/, 'shared accent color starts at wood');
  assert.doesNotMatch(html, /back-layout--(?:blank|tcg)|back-tcg-container/, 'back layout remains identical across the deck');
  assert.doesNotMatch(html, /card-vibes|Dealt by:/, 'legacy vibe icons and dealer prefix must be absent');
  assert.match(html, /catan-road-line/, 'catan-road-line must exist on back header');

  // Border ornaments and moon icons must be removed
  assert.ok(!html.includes('catan-corner-ornament'), 'catan-corner-ornament should be removed from all borders');
  assert.ok(!html.includes('catan-number-token'), 'catan-number-token should be removed from HP');
  assert.ok(!html.includes('catan-pips'), 'catan-pips should be removed from HP');
  assert.ok(!html.includes('catan-resource-hex'), 'catan-resource-hex should be removed from stats');
  assert.ok(!html.includes('catan-stat-token'), 'catan-stat-token should be removed from stats');
});

test('css/styles.css defines the printable Catan resource-role design', () => {
  const css = fs.readFileSync('./css/styles.css', 'utf8');
  const renderer = fs.readFileSync('./js/card.js', 'utf8');
  const html = fs.readFileSync('./index.html', 'utf8');

  // Retained Catan styles
  assert.match(css, /\.catan-hex-overlay/, 'catan-hex-overlay must be styled');
  assert.match(css, /\.catan-role-ribbon/, 'development-card role ribbon must be styled');
  assert.match(css, /\.stat-segments\s*\{[^}]*repeat\(10/, 'rating bars must use ten segments');
  assert.match(css, /\.back-body-section\s*\{[^}]*height:\s*322\.5px[^}]*flex:\s*0\s+0\s+322\.5px/, 'back letter and voucher section uses fixed geometry');
  assert.match(css, /\.back-letter-container\s*\{[^}]*height:\s*267\.36px[^}]*flex:\s*0\s+0\s+267\.36px[^}]*padding:\s*16\.54px[^}]*overflow:\s*hidden/, 'personal message panel has fixed 48.5 mm height, 3 mm padding and no overflow');
  assert.match(css, /\.back-letter-text\s*\{[^}]*overflow:\s*hidden/, 'typed message must be clipped within its fixed panel');
  assert.match(css, /\.back-letter-text\s*\{[^}]*font-family:\s*Georgia/, 'typed birthday letter must use a readable serif');
  assert.match(css, /\.back-letter-container\s*\{[^}]*background-color:\s*#F3E7C9/, 'all back letter panels use the shared parchment color');
  assert.match(css, /--panel-inset:\s*27\.56px/, 'panels use the 5 mm inset token at card preview scale');
  assert.match(css, /--safe-zone-inset:\s*35\.83px/, 'text uses the 6.5 mm safe-zone token at card preview scale');
  assert.match(css, /--frame-inset:\s*16\.54px/, 'resource frame uses the 3 mm inset token at card preview scale');
  assert.match(css, /--min-line-weight:\s*1\.66px/, 'minimum print line weight is fixed at 0.3 mm');
  assert.match(css, /--element-gap:\s*8\.27px/, 'element spacing is fixed at 1.5 mm');
  assert.match(css, /--panel-radius:\s*6\.61px/, 'panel radius is fixed at 1.2 mm');
  assert.match(css, /--card-field-radius:\s*11\.02px/, 'base-colour field uses a 2 mm corner radius');
  assert.match(css, /\.card-face,\s*#card\s*\{[^}]*padding:\s*calc\(var\(--panel-inset\)\s*-\s*2\.5px\)/, 'panel content starts 5 mm from the card edge after accounting for its 2.5 px border');
  assert.match(css, /#card-header\s*\{[^}]*height:\s*49\.61px/, 'header height matches its 9 mm target');
  assert.match(css, /#card-image\s*\{[^}]*height:\s*228\.82px/, 'photo height includes the requested 9.5 mm from removing the front memory panel');
  assert.match(css, /#card-archetype\s*\{[^}]*height:\s*30\.32px/, 'role ribbon is 5.5 mm tall');
  assert.match(css, /#card-stats\s*\{[^}]*height:\s*109\.6px/, 'five resource rows fit within the lower safe area');
  assert.match(css, /\.stat-row\s*\{[^}]*height:\s*21\.92px/, 'each resource row is about 4 mm tall');
  assert.match(css, /\.stat-bar-track\s*\{[^}]*width:\s*144\.7px/, 'each of ten rating hexes measures 2.4 mm with 0.25 mm gaps');
  assert.match(css, /\.card-face::after,\s*#card::after\s*\{[^}]*inset:\s*var\(--frame-inset\)/, 'resource frame is 3 mm inside trim');
  assert.match(css, /\.card-face::before,\s*#card::before\s*\{[^}]*inset:\s*var\(--frame-inset\)[^}]*background:\s*var\(--archetype-primary/, 'base field is inset into an accent-colour frame');
  assert.match(css, /\.card-face,\s*#card\s*\{[^}]*background-color:\s*var\(--archetype-accent/, 'accent colour fills the card and print bleed');
  assert.match(css, /\.catan-hex-overlay\s*\{[^}]*opacity:\s*0\.08/, 'hex lattice stays under 8% opacity');
  assert.match(html, /stroke-width="1\.1"/, 'hex lattice uses a 0.2 mm stroke at preview scale');
  assert.match(css, /\.back-letter-container\s*\{[^}]*width:\s*auto/, 'back letter panel stays within the shared panel inset');
  assert.match(css, /\.print-guides-overlay\s*\{[^}]*display:\s*none/, 'print geometry guides are hidden until enabled');
  assert.match(css, /\.print-guides-visible \.print-guides-overlay\s*\{[^}]*display:\s*block/, 'print geometry guides appear when enabled');
  assert.match(html, /id="print-guides-toggle-btn"[^>]*aria-pressed="false"/, 'print guides have an accessible off-by-default toggle');
  assert.equal((html.match(/class="print-guides-overlay"/g) || []).length, 2, 'front and back each show trim, panel, and safe-zone guides');
  assert.match(renderer, /print-guides-visible/, 'print-guide toggle controls the geometry overlay');
  assert.match(renderer, /getBaseTextColor\(primary\)/, 'card text color follows base-colour luminance');
  assert.match(renderer, /6 - Math\.abs\(7 - diceNumber\)/, 'dice pips reflect number probability');
  assert.match(renderer, /diceNumber === 6 \|\| diceNumber === 8/, 'six and eight tokens are emphasized in red');
  assert.match(renderer, /requestedDiceNumber !== 7/, 'seven is reserved and omitted from regular dice tokens');
  assert.match(css, /\.back-trade-voucher\s*\{/, 'trade offer must be styled as a voucher');
  assert.match(css, /\.card--exporting \.catan-hex-overlay[^}]*opacity:\s*0\.08/, 'hex lattice remains faint in exports');
  assert.match(css, /#card-back\.card--exporting \.catan-hex-overlay\s*\{[^}]*display:\s*block/, 'back hex lattice must remain in card exports');
  assert.match(renderer, /createElementNS[\s\S]*?polygon/, 'rating segments must use inline SVG hexagons that survive PNG export');
  assert.match(renderer, /resolveFontFamily\("Cinzel", "title"\)/, 'title typography is fixed throughout the card set');
  assert.match(renderer, /resolveFontFamily\("Outfit", "body"\)/, 'body typography is fixed throughout the card set');
  assert.doesNotMatch(renderer, /backLayout\s*===|backStyle\s*===/, 'back rendering must not vary its layout per card');
  assert.doesNotMatch(renderer, /state\.backSealEmoji/, 'birthday icon is fixed throughout the card set');
  assert.match(fs.readFileSync('./js/app.js', 'utf8'), /color:\s*'#B5532F'/, 'brick uses the shared resource palette');
  assert.match(fs.readFileSync('./js/app.js', 'utf8'), /color:\s*'#2F6B3A'/, 'lumber uses the shared resource palette');
  assert.match(fs.readFileSync('./js/app.js', 'utf8'), /color:\s*'#A8D26B'/, 'wool uses the shared resource palette');
  assert.match(fs.readFileSync('./js/app.js', 'utf8'), /color:\s*'#E3B93C'/, 'grain uses the shared resource palette');
  assert.match(fs.readFileSync('./js/app.js', 'utf8'), /color:\s*'#7A7F87'/, 'ore uses the shared resource palette');
  assert.doesNotMatch(fs.readFileSync('./js/popover.js', 'utf8'), /Optional background colour palette|archetype-card-item/, 'the extra background palette is removed');
  assert.doesNotMatch(fs.readFileSync('./js/popover.js', 'utf8'), /back-seal-input|seal-preset-btn/, 'the fixed icon set has no per-card editor');
  assert.doesNotMatch(css, /\.stat-segment\s*\{[^}]*clip-path/, 'rating hexagons must not rely on unsupported CSS clipping');
  assert.match(css, /\.photo-chaos-pill/, 'robber chaos score must be positioned over the photo');
  assert.doesNotMatch(css, /\.vibe-(?:badge|picker)/, 'old vibe badge and picker styling must be removed');
  assert.match(css, /\.hp-badge\s*\{[^}]*justify-content:\s*center[^}]*text-align:\s*center/, 'VP score must be centered inside its border');
  assert.match(css, /\.back-card-number/, 'deck number styling is moved to the back face');
  assert.doesNotMatch(css, /back-signoff-group--blank[^}]*border-style:\s*dashed/, 'blank sign-off box must keep a solid border');

  // Removed elements must not have active rules
  assert.ok(!css.includes('.catan-corner-ornament {'), 'catan-corner-ornament must be removed');
  assert.ok(!css.includes('.catan-number-token {'), 'catan-number-token must be removed');
  assert.ok(!css.includes('.catan-pips {'), 'catan-pips must be removed');
  assert.ok(!css.includes('.catan-stat-token {'), 'catan-stat-token must be removed');
  assert.ok(!css.includes('.catan-resource-hex {'), 'catan-resource-hex must be removed');
});
