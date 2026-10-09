# Card Forge: Full Customization, 3D Flip Card & Double-Sided Physical Print Design Spec

**Date:** 2026-10-09  
**Status:** Approved  
**Topic:** Custom Card Textures, Unbundled Styling, 3D Double-Sided Card, Birthday Letter Canvas, and Print Sheet Export  

---

## 1. Overview & Goals

This specification details the architecture and features for upgrading **Card Forge** from preset-based templates into a fully unbundled, highly customizable gift card creation tool. It enables users to forge truly personalized physical cards for friends' birthdays, featuring:

1. **Unbundled Theming:** Freeform primary/accent color pickers, custom archetype naming, custom badge emojis, and customizable typography pairings instead of locked preset combinations.
2. **Custom Emoji Vibe Badges:** Direct input and pasting of any arbitrary emoji alongside curated presets, with custom labels and up to 4 active badges.
3. **8 Selectable Card Textures:** Smooth Cardstock, Holographic Rainbow Foil, Vintage Parchment, Cosmic Starlight, Fine Linen Weave, Weathered Leather, Gold Leaf Foil, and Matte Carbon.
4. **3D Flip Double-Sided Card Canvas:** Smooth 3D perspective flip (`rotateY(180deg)`) revealing a customizable card back.
5. **Birthday Memoir Letter Back:** Dedicated physical canvas for heartfelt birthday greetings (custom title, generous 600-character personal letter, sign-off signature, date, and decorative wax seal emblem) with an alternate collectible TCG deck back mode.
6. **All-in-One Print Sheet & High-Res PNG Export:** Export Front PNG, Back PNG, and a printable 2x side-by-side sheet with center fold/cut guidelines sized for standard cardstock.

---

## 2. Decoupled Data Model

State in `window.AppState` is updated to support independent styling, texture definitions, and double-sided card content:

```javascript
window.AppState = {
  // Identity
  title: "Friend's Name",
  hp: 100,

  // Unbundled Design Tokens
  archetypeId: 'custom',
  archetypeName: 'The Adventurer',
  archetypeBadge: '🧭',
  primaryColor: '#2D7D46',
  accentColor: '#7DCEA0',
  fontFamilyTitle: 'Cinzel', // 'Cinzel' | 'Outfit' | 'Playfair Display' | 'Caveat' | 'Orbitron' | 'Inter'
  fontFamilyBody: 'Outfit', // 'Outfit' | 'Inter' | 'Playfair Display' | 'Caveat'
  cardTexture: 'smooth', // 'smooth' | 'holographic' | 'parchment' | 'cosmic' | 'linen' | 'leather' | 'gold' | 'carbon'

  // Front Content
  photoDataUrl: null,
  photoOffsetX: 0,
  photoOffsetY: 0,
  photoScale: 1,
  frameStyle: 'simple', // 'simple' | 'gold' | 'holographic' | 'none'
  description: 'Click to add your memory...',
  stats: [
    { name: 'Humor', value: 50 },
    { name: 'Loyalty', value: 50 },
    { name: 'Chaos', value: 50 },
    { name: 'Warmth', value: 50 }
  ],
  vibeIcons: [
    // Array of { id: string, emoji: string, name: string }
  ],
  year: '2026',

  // Back Content (Birthday Physical Canvas)
  backStyle: 'letter', // 'letter' | 'tcg'
  backTitle: 'Happy Birthday!',
  backLetter: 'Dearest friend,\n\nThank you for all the unforgettable adventures, late-night talks, and laughter. Happy Birthday to someone truly one of a kind!',
  backSignoff: 'With love, Your Best Friend',
  backDate: 'October 2026',
  backSealEmoji: '🎂', // 🎂, 📜, 💖, ⭐, or custom emoji
  backCrestTitle: 'LEGENDARY FRIENDSHIP',

  // View State
  isFlipped: false,
  isCustomized: false
};
```

---

## 3. 3D Flip Card Architecture & Layout

### 3.1 3D Perspective Hierarchy
The card stage hosts a flipping 3D wrapper containing two discrete face containers:

```html
<div id="card-stage" class="card-stage">
  <div id="card-flipper" class="card-flipper">
    <!-- FRONT FACE -->
    <div id="card-front" class="card-face card-face--front" style="...">
      <!-- 6 Front Sections: header, image, archetype, description, stats, footer -->
    </div>

    <!-- BACK FACE -->
    <div id="card-back" class="card-face card-face--back" style="...">
      <!-- Back Sections: back-header, back-letter, back-footer -->
    </div>
  </div>

  <button id="flip-btn" class="flip-toggle-btn" type="button" aria-label="Flip card">
    <span class="flip-icon">↺</span>
    <span id="flip-label">Flip to Back</span>
  </button>
</div>
```

### 3.2 CSS 3D Transforms & Interaction
- `#card-stage`: `perspective: 1200px;` display flex, center aligned.
- `#card-flipper`: `transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); position: relative; width: 350px; height: 490px;`
- `.card-face`: `position: absolute; inset: 0; backface-visibility: hidden; border-radius: 12px;`
- `.card-face--front`: `transform: rotateY(0deg);`
- `.card-face--back`: `transform: rotateY(180deg);`
- When `AppState.isFlipped` is true: `#card-flipper.is-flipped` applies `transform: rotateY(180deg);`
- Shortcut: Pressing keyboard key `f` or `F` flips the card.

### 3.3 Card Back Layouts
1. **Birthday Memoir Letter (`backStyle === 'letter'`):**
   - **Header (`data-section="back-header"`):** Editable title banner (*"Happy 25th Birthday!"*) framed with ornate divider lines.
   - **Letter Canvas (`data-section="back-letter"`):** Generous personal letter area (600 characters max) with styled margins, comfortable line-height, and user-selected body font (including handwritten *Caveat* or editorial *Playfair Display*).
   - **Footer & Seal (`data-section="back-footer"`):** Personalized sign-off, date, and a circular embossed wax seal / emblem displaying the chosen emoji (*🎂*, *📜*, *💖*, *⭐*, or custom).
2. **TCG Deck Back (`backStyle === 'tcg'`):**
   - Dual-line geometric border in archetype accent color with filigree corners.
   - Central heraldic Friendship Crest medallion with glowing jewel and decorative starburst.
   - Commemorative banner: *"CARD FORGE — FIRST EDITION MEMOIR"*.
   - Dedication plaque at the foot.

---

## 4. Textures & Materials System

Textures apply dynamically across both front and back faces via the `.texture-<name>` class:
1. **Smooth Cardstock (`texture-smooth`):** Clean satin card surface with subtle gradient sheen.
2. **Holographic Rainbow Foil (`texture-holographic`):** Dynamic multi-angle rainbow iridescence overlay with blend-mode highlights.
3. **Vintage Parchment (`texture-parchment`):** Warm antique paper grain with soft vignette edges.
4. **Cosmic Starlight (`texture-cosmic`):** Deep interstellar dust, faint nebulae, and pin-light stars.
5. **Fine Linen Weave (`texture-linen`):** Micro cross-hatch fabric weave reminiscent of premium board game cards.
6. **Weathered Leather (`texture-leather`):** Embossed organic texture with warm, deep tone.
7. **Gold Leaf Foil (`texture-gold`):** Reflective metallic gilded luster with golden specular border.
8. **Matte Carbon (`texture-carbon`):** High-tech diagonal carbon weave texture.

---

## 5. Freeform Custom Vibe Badges

- **Built-in Badges:** 20 curated presets remain available for quick selection.
- **Custom Emoji Input:** In the vibe editor popover:
  - Input field for entering or pasting *any* Unicode emoji (e.g., 🍕, 🚀, 🐱, 🎮, 🧗).
  - Text input for custom badge label (e.g., *"Pizza Night"*, *"Gamer"*).
  - "Add Emoji" button to append to active badges.
- **Badge Management:**
  - Up to 4 active vibe badges rendered on the card footer.
  - Active badges list shows quick `×` remove buttons.

---

## 6. Typography & Color Pickers

### 6.1 Font Inclusions
Loaded via Google Fonts in `<head>`:
- **Title Fonts:**
  - `Cinzel` (Default serif / fantasy)
  - `Outfit` (Modern geometric sans)
  - `Playfair Display` (Classic editorial serif)
  - `Caveat` (Warm personal handwritten script)
  - `Orbitron` (Futuristic tech)
  - `Inter` (Clean modern sans)
- **Body & Letter Fonts:**
  - `Outfit`
  - `Inter`
  - `Playfair Display`
  - `Caveat`

### 6.2 Colors & Presets
- Native `<input type="color">` pickers for **Primary Color** and **Accent Color**.
- Hex input fields for precise hex code entry.
- Palette row of 8 quick archetype presets to instantly populate colors and archetypes, while permitting full individual adjustment afterwards.

---

## 7. Popover Editing Suite

### 7.1 Global Style Bar
Mounted directly above the card stage:
- Texture chips (8 finishes).
- Primary & Accent color swatches.
- Font family dropdowns for Title and Body.
- Quick archetype preset buttons.

### 7.2 Front Section Popovers
- `header`: Name (24 chars) and HP (1-999).
- `image`: Drag-and-drop file upload, zoom/pan sliders, frame styles.
- `archetype`: Freeform Archetype Name, custom badge emoji, and color pickers.
- `description`: Front memoir quote (180 chars).
- `stats`: 4 customizable trait names (12 chars) and sliders (0-99).
- `footer`: Preset vibe picker + custom emoji adder, and established year.

### 7.3 Back Section Popovers
- `back-header`: Back title input and style toggle (Letter vs TCG).
- `back-letter`: Multiline letter editor (600 chars) with live preview.
- `back-footer`: Sign-off text, date, and wax seal emoji selector (preset & custom).

---

## 8. Export Engine & Print-Ready Sheet Generator

### 8.1 Export Options
Located in the action bar below the card:
1. **"Download Print Sheet" (Primary Action):**
   - High-resolution 2x rendering (1440×1040px).
   - Front and Back placed side-by-side with 40px margin.
   - Center vertical dashed fold line: `✂ FOLD & CUT LINE`.
   - Corner crop marks for clean physical trimming.
   - Sized for standard cardstock (folds into 2.5″ × 3.5″ standard card).
2. **"Download Front (PNG)":** 700×980px standalone front card image.
3. **"Download Back (PNG)":** 700×980px standalone back card image.

### 8.2 Rendering Pipeline
- When export is triggered:
  - Active popovers are closed.
  - Card faces are rendered flat (stripping 3D rotation) to ensure pixel-perfect canvas rasterization via `html2canvas`.
  - An offscreen canvas composes the side-by-side print sheet with borders, labels, and alignment guides.
  - Generates downloadable PNG data URL.
  - Restores card to user's current 3D view state.

---

## 9. Verification & Testing Plan

1. **Unit & Data Tests:**
   - AppState schema validation with new tokens (textures, fonts, colors, back properties).
   - Custom vibe badge appending and deduplication.
   - Font and texture class application tests.
2. **DOM & Structure Tests:**
   - 3D card stage DOM elements (`card-stage`, `card-flipper`, `card-front`, `card-back`).
   - Back face section attributes (`back-header`, `back-letter`, `back-footer`).
   - Style toolbar and export button presence.
3. **Interactive & Browser Testing:**
   - Flip button toggle changes `is-flipped` and rotates the card.
   - Back sections open corresponding popover editors.
   - Custom emoji input adds new badge to card footer.
   - Print sheet export generates valid PNG without console errors.
