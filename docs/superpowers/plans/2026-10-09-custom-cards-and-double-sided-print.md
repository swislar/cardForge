# Full Customization, 3D Flip Card & Double-Sided Physical Print Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Card Forge into an unbundled, fully customizable double-sided physical birthday gift card generator featuring 8 card textures, freeform color/font pickers, custom emoji vibe badges, a 3D flip card canvas, and an all-in-one printable card sheet export.

**Architecture:** A pure client-side SPA. The central card element becomes a 3D perspective stage hosting an interactive flipping container (`card-flipper`) containing discrete `#card-front` and `#card-back` faces. State is expanded in `AppState` to unbundle styling tokens (primary/accent colors, fonts, textures) from archetype presets, allow arbitrary custom emoji vibe badges, and store birthday memoir letter details. The export engine renders both faces flat via `html2canvas` at 2x resolution and composes a side-by-side printable card sheet with fold/cut alignment guides on an offscreen canvas.

**Tech Stack:** HTML5, CSS3 3D Transforms, Vanilla JavaScript (ES2022), html2canvas (vendored `lib/html2canvas.min.js`), Google Fonts (Cinzel, Outfit, Playfair Display, Caveat, Orbitron, Inter), Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-09-custom-cards-and-double-sided-print-design.md`

## Global Constraints

- No build tools, no framework, no npm packages — pure static files served from disk or simple HTTP server.
- All state is in-memory inside `window.AppState`.
- Card dimensions on screen remain 350×490px (2.5:3.5 aspect ratio).
- Card faces use `backface-visibility: hidden` inside a 3D perspective flipper.
- Print Sheet export renders at 2x print quality (1440×1040px) with front on left, back on right, and center fold line.
- Back face supports two layout modes: 'letter' (Birthday Memoir Letter) and 'tcg' (TCG Deck Back).
- 8 textures supported: smooth, holographic, parchment, cosmic, linen, leather, gold, carbon.
- All JS modules loaded via `<script>` tags without ES module syntax for file:// compatibility.

## Review Focus

1. **3D Flip html2canvas distortion:** Exporting while flipped must not capture a mirror image or perspective-skewed canvas — capture each face in flat resting coordinates.
2. **Custom Emoji Rendering in Canvas:** User-pasted emojis or unicode sequences must render cleanly on canvas without clipping or placeholder fallback boxes.
3. **Large Memoir Letter Overflow:** Long letters (up to 600 chars) must fit comfortably within the 350×490px card boundary without breaking layout — enforce font size auto-scaling or scroll bounds.
4. **Color Picker Synchronization:** Changing primary/accent colors must update live glow variables, borders, and gradients immediately on both front and back faces.
5. **Popover Positioning on Back Face:** Clicking sections on `#card-back` while flipped must anchor popovers correctly alongside the card without jumping or disappearing.

---

### Task 1: Data Layer & Google Fonts Expansion

**Files:**
- Create: `js/textures.js`
- Modify: `js/app.js:1-72`
- Modify: `index.html:12-16`
- Test: `tests/textures_and_fonts.test.js`

**Interfaces:**
- Consumes: `window.ARCHETYPES`, `window.VIBE_ICONS`
- Produces:
  - `window.CARD_TEXTURES` — array of 8 texture definitions: `{ id: string, name: string, description: string, className: string }`
  - `window.AVAILABLE_FONTS` — `{ title: Array<{ id: string, name: string, family: string }>, body: Array<{ id: string, name: string, family: string }> }`
  - `window.AppState` expanded with: `primaryColor`, `accentColor`, `fontFamilyTitle`, `fontFamilyBody`, `cardTexture`, `backStyle`, `backTitle`, `backLetter`, `backSignoff`, `backDate`, `backSealEmoji`, `isFlipped`, `vibeIcons`

- [ ] **Step 1: Write the failing test for textures and expanded state**

Create `tests/textures_and_fonts.test.js` testing that `CARD_TEXTURES` has 8 textures, `AVAILABLE_FONTS` contains the required fonts, and `AppState` initializes all new styling, texture, and card-back fields with defaults.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/textures_and_fonts.test.js`  
Expected: FAIL (cannot find `CARD_TEXTURES` or missing properties on `AppState`)

- [ ] **Step 3: Add Google Fonts link to `index.html`**

In `index.html`, update Google Fonts `<link>` to load:
`Cinzel:wght@600;700;800`, `Outfit:wght@300;400;500;600;700`, `Playfair+Display:ital,wght@0,600;0,700;1,400`, `Caveat:wght@600;700`, `Orbitron:wght@600;700`, and `Inter:wght@400;500;600;700`.

- [ ] **Step 4: Create `js/textures.js`**

Define `window.CARD_TEXTURES` (smooth, holographic, parchment, cosmic, linen, leather, gold, carbon) and `window.AVAILABLE_FONTS`. Include script tag in `index.html`.

- [ ] **Step 5: Expand `window.AppState` and `updateState` in `js/app.js`**

Add `primaryColor: '#2D7D46'`, `accentColor: '#7DCEA0'`, `fontFamilyTitle: 'Cinzel'`, `fontFamilyBody: 'Outfit'`, `cardTexture: 'smooth'`, `backStyle: 'letter'`, `backTitle: 'Happy Birthday!'`, `backLetter: '...'`, `backSignoff: 'With love, Your Best Friend'`, `backDate: 'October 2026'`, `backSealEmoji: '🎂'`, `backCrestTitle: 'LEGENDARY FRIENDSHIP'`, `isFlipped: false`, and `vibeIcons: []`.

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/textures_and_fonts.test.js`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add index.html js/textures.js js/app.js tests/textures_and_fonts.test.js
git commit -m "feat: add textures, font collections, and expanded double-sided app state"
```

---

### Task 2: 3D Flip Card DOM Structure & Card-Back Layout

**Files:**
- Modify: `index.html:26-105`
- Modify: `css/styles.css:60-150, 400-550`
- Test: `tests/flip_structure.test.js`

**Interfaces:**
- Consumes: `AppState`
- Produces:
  - DOM elements: `#card-stage`, `#card-flipper`, `#card-front`, `#card-back`, `#flip-btn`
  - Back face sections: `#card-back-header`, `#card-back-letter`, `#card-back-footer`
  - CSS 3D flip classes: `.card-stage`, `.card-flipper`, `.card-face`, `.card-face--front`, `.card-face--back`, `.is-flipped`

- [ ] **Step 1: Write failing test for 3D flip DOM structure**

Create `tests/flip_structure.test.js` checking that `index.html` contains `#card-stage`, `#card-flipper`, `#card-front`, `#card-back`, `#flip-btn`, and the 3 back face sections with `data-section` attributes (`back-header`, `back-letter`, `back-footer`).

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/flip_structure.test.js`  
Expected: FAIL

- [ ] **Step 3: Update `index.html` with 3D Flip Card and Back Face elements**

Wrap the card in `#card-stage` and `#card-flipper`. Rename `#card` to `#card-front` (maintaining its inner structure). Add `#card-back` alongside it with Birthday Letter and TCG Deck layout templates. Add `#flip-btn` floating control.

- [ ] **Step 4: Add 3D Flip, Face and Back Layout CSS in `css/styles.css`**

Add:
- `#card-stage`: `perspective: 1200px; display: flex; flex-direction: column; align-items: center; gap: 1rem; position: relative;`
- `#card-flipper`: `position: relative; width: 350px; height: 490px; transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);`
- `#card-flipper.is-flipped`: `transform: rotateY(180deg);`
- `.card-face`: `position: absolute; inset: 0; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 12px;`
- `.card-face--back`: `transform: rotateY(180deg); display: flex; flex-direction: column; justify-content: space-between;`
- Back layout styling: `.back-letter-container`, `.back-letter-text`, `.back-wax-seal`, `.back-tcg-crest`.
- `#flip-btn`: tactile pill button with 3D hover feedback.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/flip_structure.test.js`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css tests/flip_structure.test.js
git commit -m "feat: implement 3D flip card structure, flip button, and card-back layout"
```

---

### Task 3: Card Textures & Materials CSS Engine

**Files:**
- Modify: `css/styles.css`
- Test: `tests/textures.test.js`

**Interfaces:**
- Consumes: Texture IDs from `window.CARD_TEXTURES`
- Produces: CSS texture classes: `.texture-smooth`, `.texture-holographic`, `.texture-parchment`, `.texture-cosmic`, `.texture-linen`, `.texture-leather`, `.texture-gold`, `.texture-carbon`

- [ ] **Step 1: Write failing test for texture CSS classes**

Create `tests/textures.test.js` verifying that `css/styles.css` defines rules for all 8 texture classes and handles custom texture overlays on `.card-face`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/textures.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement 8 card textures in `css/styles.css`**

Implement:
1. `.texture-smooth`: Crisp satin card with subtle vertical reflection gradient.
2. `.texture-holographic`: Prismatic rainbow gradient overlay with blend mode and shimmer.
3. `.texture-parchment`: Warm vintage paper texture with aged sepia vignette edges.
4. `.texture-cosmic`: High-density starfield and deep nebula radial gradients.
5. `.texture-linen`: Repeating SVG cross-hatch micro-texture mimicking card stock.
6. `.texture-leather`: Embossed warm organic leather grain overlay.
7. `.texture-gold`: Golden foil metallic reflection with gilded highlight border.
8. `.texture-carbon`: Precision diagonal carbon-fiber weave pattern.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/textures.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add css/styles.css tests/textures.test.js
git commit -m "feat: add 8 premium card textures and material finishes in CSS"
```

---

### Task 4: Card Rendering Engine Updates (Both Faces, Fonts, Colors & Flip)

**Files:**
- Modify: `js/card.js:1-130`
- Test: `tests/card_render.test.js`

**Interfaces:**
- Consumes: `AppState`, `window.ARCHETYPES`, `window.CARD_TEXTURES`
- Produces: Updated `window.renderCard()` and `window.toggleFlip(isFlipped?: boolean)`

- [ ] **Step 1: Write failing test for double-sided renderCard and flip handling**

Create `tests/card_render.test.js` testing that `renderCard()`:
- Applies `primaryColor`, `accentColor`, `fontFamilyTitle`, `fontFamilyBody` to both faces.
- Toggles `.texture-<name>` class on card faces.
- Renders custom vibe badges (both emojis and custom names).
- Populates back face elements (`#card-back-title`, `#card-back-letter-text`, `#card-back-signoff`, `#card-back-date`, `#card-back-seal`).
- Renders TCG deck view when `backStyle === 'tcg'`.
- Toggles `.is-flipped` on `#card-flipper` via `toggleFlip()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/card_render.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement updated `renderCard` and `toggleFlip` in `js/card.js`**

Update `js/card.js`:
- Set CSS variables `--archetype-primary`, `--archetype-accent`, `--font-title`, `--font-body` on both `#card-front` and `#card-back`.
- Update texture class on both faces.
- Render vibe badges supporting `{ emoji, name }` objects and pasted emojis.
- Render back face content (letter text with line-breaks preserved, sign-off, date, and seal emoji).
- Switch back face layout between `.back-layout--letter` and `.back-layout--tcg`.
- Wire up `#flip-btn` click and keydown listener for `f`/`F` to toggle `AppState.isFlipped`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/card_render.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/card.js tests/card_render.test.js
git commit -m "feat: update card render engine for two-sided rendering, custom fonts, and 3D flip"
```

---

### Task 5: Style Toolbar Component & Global Customizers

**Files:**
- Modify: `index.html`
- Modify: `css/styles.css`
- Modify: `js/popover.js`
- Test: `tests/style_toolbar.test.js`

**Interfaces:**
- Consumes: `CARD_TEXTURES`, `AVAILABLE_FONTS`, `ARCHETYPES`, `updateState()`
- Produces: Interactive `#style-toolbar` containing texture chips, title/body font pickers, primary/accent color inputs, and quick preset buttons.

- [ ] **Step 1: Write failing test for style toolbar**

Create `tests/style_toolbar.test.js` testing that `#style-toolbar` contains texture buttons, font dropdowns, and color inputs, and that changing them triggers `updateState()` with correct properties.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/style_toolbar.test.js`  
Expected: FAIL

- [ ] **Step 3: Add `#style-toolbar` markup in `index.html` & CSS in `css/styles.css`**

Place `#style-toolbar` above `#card-stage`. Style as a sleek glassmorphic bar with:
- Texture chips strip with icon/swatch previews.
- Title & Body Font `<select>` inputs with preview fonts.
- Primary & Accent `<input type="color">` pickers with hex text inputs.
- Quick archetype palette chips to instantly load starter themes.

- [ ] **Step 4: Wire up `#style-toolbar` listeners in `js/popover.js`**

Bind `change`/`input` listeners on color pickers, font selectors, and texture buttons to call `updateState(...)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/style_toolbar.test.js`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css js/popover.js tests/style_toolbar.test.js
git commit -m "feat: add global style toolbar for textures, typography, and color customization"
```

---

### Task 6: Custom Emoji Input & Unbundled Section Popovers

**Files:**
- Modify: `js/popover.js`
- Modify: `css/styles.css`
- Test: `tests/popovers_advanced.test.js`

**Interfaces:**
- Consumes: `AppState`, `updateState()`
- Produces:
  - Custom Emoji input & badge manager in `buildFooterEditor`
  - Freeform Archetype name & badge editor in `buildArchetypeEditor`
  - Back face section popover builders: `buildBackHeaderEditor`, `buildBackLetterEditor`, `buildBackFooterEditor`

- [ ] **Step 1: Write failing test for advanced popovers**

Create `tests/popovers_advanced.test.js` testing:
- Vibe editor allows typing/pasting custom emoji + label and updates `vibeIcons`.
- Archetype editor allows typing custom archetype name and custom badge emoji.
- Back face editors mount and update `backTitle`, `backLetter`, `backSignoff`, and `backSealEmoji`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/popovers_advanced.test.js`  
Expected: FAIL

- [ ] **Step 3: Enhance Vibe Editor (`buildFooterEditor`) in `js/popover.js`**

Add an "Add Custom Emoji" section with:
- Emoji input field (`placeholder="e.g. 🍕 or 🎮"`, `maxlength="4"`).
- Custom label input field (`placeholder="Label (optional)"`).
- "Add Badge" button.
- Active badges tray displaying current badges with `×` remove buttons.

- [ ] **Step 4: Enhance Archetype Editor (`buildArchetypeEditor`) in `js/popover.js`**

Add custom name text input, custom badge emoji input, and primary/accent color inputs alongside archetype preset cards.

- [ ] **Step 5: Implement Back Face Popovers in `js/popover.js`**

Implement:
- `buildBackHeaderEditor(container)`: Edit back title and toggle between 'letter' and 'tcg'.
- `buildBackLetterEditor(container)`: Textarea for personal letter with 600-character counter.
- `buildBackFooterEditor(container)`: Sign-off input, date input, and wax seal emoji selector (presets + custom input).

- [ ] **Step 6: Wire back face section clicks to `showPopover`**

In `setupInteractions()`, bind click events on `.card-face--back .card-section` to open `back-header`, `back-letter`, and `back-footer` popovers.

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test tests/popovers_advanced.test.js`  
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add js/popover.js css/styles.css tests/popovers_advanced.test.js
git commit -m "feat: implement custom emoji vibe input and card-back section popovers"
```

---

### Task 7: Physical Print Sheet & Double-Sided Export Suite

**Files:**
- Modify: `index.html`
- Modify: `js/export.js`
- Modify: `css/styles.css`
- Test: `tests/export_print_sheet.test.js`

**Interfaces:**
- Consumes: `#card-front`, `#card-back`, `AppState`, `html2canvas`
- Produces:
  - `window.exportPrintSheet()`
  - `window.exportCardAsPng('front' | 'back')`
  - Action bar buttons: `#download-sheet-btn`, `#download-front-btn`, `#download-back-btn`

- [ ] **Step 1: Write failing test for print sheet export functions**

Create `tests/export_print_sheet.test.js` validating that `exportPrintSheet` and `exportCardAsPng` exist, take proper parameters, and bind to action buttons.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/export_print_sheet.test.js`  
Expected: FAIL

- [ ] **Step 3: Update action bar in `index.html`**

Add primary button: "Download Print Sheet (Front + Back)" with printer icon, and secondary dropdown/buttons for "Download Front (PNG)" and "Download Back (PNG)".

- [ ] **Step 4: Implement Print Sheet Composer in `js/export.js`**

Implement `exportPrintSheet()`:
- Temporarily ensure both `#card-front` and `#card-back` are rendered without 3D rotation or hover states.
- Capture `#card-front` at 2x scale (700×980px) via `html2canvas`.
- Capture `#card-back` at 2x scale (700×980px) via `html2canvas`.
- Create offscreen canvas sized 1520×1060px (with 40px outer padding and 80px center gutter).
- Draw `#card-front` on the left and `#card-back` on the right.
- Draw center dashed fold line with text: `✂ FOLD & CUT GUIDE`.
- Draw corner crop tick marks.
- Trigger download of `{friendname}-print-sheet.png`.
- Restore card to user's active 3D flip state.

- [ ] **Step 5: Update `exportCardAsPng` in `js/export.js`**

Allow parameter `face` (`'front'` or `'back'`), capturing the specified face flat without 3D rotation.

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/export_print_sheet.test.js`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add index.html js/export.js css/styles.css tests/export_print_sheet.test.js
git commit -m "feat: implement double-sided print sheet generator and export suite"
```

---

### Task 8: End-to-End Browser Verification & Polish

**Files:**
- Modify: `css/styles.css`
- Modify: `js/popover.js`

- [ ] **Step 1: Run complete test suite**

Run: `node --test tests/*.test.js`  
Expected: All tests pass.

- [ ] **Step 2: Interactive Browser Verification**

Using the browser tool:
1. Navigate to `http://localhost:8765/index.html`.
2. Test texture switching (e.g. Vintage Parchment, Cosmic, Gold Leaf).
3. Test custom color picker and font switcher.
4. Click "Flip to Back", verify smooth 3D flip animation.
5. Click on Back Letter, edit personal birthday letter, sign-off, and wax seal emoji.
6. Flip back to front, add a custom emoji vibe badge (e.g. 🍕).
7. Click "Download Print Sheet", verify execution and export.
8. Capture verification screenshot.

- [ ] **Step 3: Commit final integration verification**

```bash
git add -A
git commit -m "chore: complete end-to-end polish and verification for custom double-sided cards"
```
