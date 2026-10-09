# Friendship Game Card Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page web app that generates personalized friendship/birthday memoir game cards with archetype theming, personality stats, vibe icons, and PNG export.

**Architecture:** Pure client-side SPA using vanilla HTML/CSS/JS. Card renders as DOM elements in the page center. Clicking card sections opens floating popovers with editing controls. State is held in a single JS object and re-rendered on change. Export uses html2canvas.

**Tech Stack:** HTML5, vanilla CSS, vanilla JavaScript, html2canvas (vendored), Google Fonts (Outfit, Cinzel)

**Spec:** `docs/superpowers/specs/2026-10-09-game-card-generator-design.md`

## Global Constraints

- No build tools, no framework, no npm — just files served from disk or a simple HTTP server
- All state is in-memory (no localStorage, no backend)
- Card dimensions: 350x490px on screen (2.5:3.5 aspect ratio)
- Export at 2x (700x980px)
- html2canvas loaded from `lib/html2canvas.min.js` (vendored, not CDN)
- Browser support: modern evergreen browsers only (Chrome, Firefox, Safari, Edge)
- All JS modules loaded via `<script>` tags (no ES modules/import — keep it simple for file:// serving)

## Review Focus

1. **Image upload with large files:** A 20MB photo should not freeze the UI — resize on upload to max 1200px wide before storing.
2. **html2canvas rendering fidelity:** CSS gradients, box-shadows, and custom fonts may not render identically — test export with each archetype and verify color accuracy.
3. **Popover overflow on small screens:** A popover that renders off-screen on a narrow viewport should fall back to bottom-sheet mode.
4. **Character limits enforced visually:** Text overflow in the card (24-char title, 180-char description) must not break the card layout — enforce with CSS `overflow: hidden` and JS validation.
5. **Photo repositioning within frame:** Drag-to-reposition must work on touch devices (use `touchstart`/`touchmove`, not just mouse events).

---

### Task 1: Data Layer — Archetypes and Icons

**Files:**
- Create: `js/archetypes.js`
- Create: `js/icons.js`

**Interfaces:**
- Consumes: nothing (standalone data)
- Produces:
  - `window.ARCHETYPES` — array of `{ id: string, name: string, tagline: string, primary: string, accent: string, gradient: string }`
  - `window.VIBE_ICONS` — array of `{ id: string, emoji: string, name: string, meaning: string }`

- [ ] **Step 1: Create `js/archetypes.js`**

Define `window.ARCHETYPES` as an array of 8 archetype objects, each with:
- `id`: kebab-case identifier (e.g., `"the-adventurer"`)
- `name`: display name (e.g., `"The Adventurer"`)
- `tagline`: short descriptor (e.g., `"Explorer, spontaneous"`)
- `primary`: hex color string
- `accent`: hex color string
- `gradient`: CSS gradient string (e.g., `"linear-gradient(135deg, #2D7D46, #1a4a2a)"`)
- `badgeEmoji`: a single emoji representing the archetype (e.g., compass for Adventurer)

Use exact color values from the spec's archetype table.

- [ ] **Step 2: Create `js/icons.js`**

Define `window.VIBE_ICONS` as an array of 20 icon objects, each with:
- `id`: kebab-case identifier
- `emoji`: the emoji character
- `name`: display name
- `meaning`: one-line meaning string

Use all 20 icons from the spec.

- [ ] **Step 3: Verify data loads**

Create a temporary `index.html` that loads both scripts and `console.log(ARCHETYPES.length, VIBE_ICONS.length)`. Open in browser, verify console shows `8 20`.

- [ ] **Step 4: Commit**

```bash
git add js/archetypes.js js/icons.js
git commit -m "feat: add archetype and vibe icon data modules"
```

---

### Task 2: Card HTML Structure and Base CSS

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `assets/placeholder.svg`

**Interfaces:**
- Consumes: `window.ARCHETYPES` (for default archetype colors)
- Produces:
  - DOM structure with `#card` container and six section elements: `#card-header`, `#card-image`, `#card-archetype`, `#card-description`, `#card-stats`, `#card-footer`
  - CSS custom properties `--archetype-primary`, `--archetype-accent` on `#card` element (set by JS later)

- [ ] **Step 1: Create `assets/placeholder.svg`**

A simple silhouette placeholder: a rounded rectangle with a person-outline icon and "Click to add photo" text, in muted gray (#555 on transparent). Dimensions: 300x260 viewBox.

- [ ] **Step 2: Create `index.html`**

Structure:
- Google Fonts link (`Outfit:wght@400;500;600;700` and `Cinzel:wght@700`)
- `<div id="app">` wrapping everything
- `<header>` with app title "Card Forge" and a subtle subtitle
- `<main>` containing `<div id="card-container">` > `<div id="card">`
- Inside `#card`: six `<div>` sections each with a `data-section` attribute and class `card-section`
  - `#card-header`: badge emoji span, title h2, HP span
  - `#card-image`: `<div class="image-frame">` containing an `<img>` (src=placeholder.svg initially)
  - `#card-archetype`: archetype name span
  - `#card-description`: paragraph with placeholder text
  - `#card-stats`: four stat rows, each with label span + bar div + value span
  - `#card-footer`: vibe icons container + year span
- Below `#card-container`: download button `<button id="download-btn">`
- Script tags for all JS files (in order: archetypes, icons, app, card, popover, export)
- `<div id="popover-root">` — empty container for popovers (positioned absolute)

- [ ] **Step 3: Create `css/styles.css` — Page styles**

- CSS reset (minimal)
- `body`: background `#0F1119`, font-family `'Outfit', sans-serif`, color `#e0e0e0`, flex column center, min-height 100vh
- Subtle background: use a `::before` pseudo-element on body with a repeating radial-gradient for faint dot pattern, and a slow CSS animation that shifts the background position
- App header styling: "Card Forge" in `Cinzel`, subtle gradient text

- [ ] **Step 4: Create `css/styles.css` — Card styles**

- `#card-container`: flex center, padding around card
- `#card`: width 350px, height 490px, border-radius 12px, position relative, overflow hidden
  - Background: `var(--archetype-primary)` with gradient
  - Border: 2px solid `var(--archetype-accent)`
  - Box-shadow glow using `var(--archetype-accent)`
  - CSS custom properties `--archetype-primary` and `--archetype-accent` set to default Adventurer colors
- Each `.card-section`: padding, cursor pointer, position relative, transition on outline
- `.card-section:hover`: dashed outline, show edit icon via `::after` pseudo-element
- Section-specific styles for header, image, archetype banner, description, stats, footer

- [ ] **Step 5: Verify card renders with placeholder content**

Open `index.html` in browser. Verify:
- Dark background with dot pattern
- Card is centered with green (Adventurer) theme
- All six sections are visible with placeholder content
- Hover on sections shows dashed outline

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css assets/placeholder.svg
git commit -m "feat: card HTML structure and base CSS with placeholder state"
```

---

### Task 3: App State and Card Rendering Engine

**Files:**
- Create: `js/app.js`
- Create: `js/card.js`

**Interfaces:**
- Consumes: `window.ARCHETYPES`, `window.VIBE_ICONS`, DOM elements from Task 2
- Produces:
  - `window.AppState` — object with all card fields
  - `window.updateState(partialState)` — merges partial updates into AppState and calls `renderCard()`
  - `window.renderCard()` — reads AppState and updates all DOM elements
  - `window.getArchetype()` — returns the current archetype object from ARCHETYPES

- [ ] **Step 1: Create `js/app.js` — State management**

Define `window.AppState` with default values:
- title: "Friend's Name"
- hp: 100
- archetypeId: 'the-adventurer'
- photoDataUrl: null
- photoOffsetX/Y: 0, photoScale: 1
- frameStyle: 'simple'
- description: 'Click to add your memory...'
- stats: 4 default stats at 50
- vibeIconIds: []
- year: current year

Define `window.updateState(partial)` and `window.getArchetype()`.

- [ ] **Step 2: Create `js/card.js` — Rendering**

Define `window.renderCard()` that updates all DOM elements based on AppState:
- Sets CSS custom properties for archetype colors
- Updates all text content (title, HP, archetype name, description, stats, year)
- Updates image (photo or placeholder)
- Updates stat bar widths and colors
- Updates vibe icon emojis

Wire up `DOMContentLoaded` listener.

- [ ] **Step 3: Verify rendering works**

Test via console: `updateState({title: 'Alice', archetypeId: 'the-comedian'})` — verify card re-themes.

- [ ] **Step 4: Commit**

```bash
git add js/app.js js/card.js
git commit -m "feat: app state management and card rendering engine"
```

---

### Task 4: Popover System

**Files:**
- Create: `js/popover.js`
- Modify: `css/styles.css` (add popover styles)

**Interfaces:**
- Consumes: `window.updateState()`, `window.AppState`, `window.getArchetype()`, `window.ARCHETYPES`, `window.VIBE_ICONS`, DOM section elements
- Produces:
  - `window.showPopover(sectionId, contentBuilderFn)` — creates and positions a popover near the given section
  - `window.hidePopover()` — removes the current popover
  - Registers click handlers on all `.card-section` elements

- [ ] **Step 1: Implement popover container and positioning**

`showPopover()`: creates popover div, positions to the right of card (bottom-sheet on mobile), calls content builder, handles click-outside dismissal. `hidePopover()`: removes popover from DOM.

- [ ] **Step 2: Add popover CSS**

Dark slate background, glassmorphism, glowing border, fade-in animation, dark-themed form inputs with accent-colored focus states, mobile bottom-sheet media query.

- [ ] **Step 3: Wire up section click handlers**

Each section click opens the appropriate editor builder function.

- [ ] **Step 4: Implement Header editor**

Text input for title (max 24 chars) + number input for HP (1-999). Live updates via `updateState()`.

- [ ] **Step 5: Implement Archetype editor**

Grid of 8 archetype cards with name, tagline, color preview. Selected state with glow. Clicking re-themes the card.

- [ ] **Step 6: Implement Description editor**

Textarea (max 180 chars) + live character counter.

- [ ] **Step 7: Implement Stats editor**

Four rows: text input (label, max 12 chars) + range slider (0-99) + value display.

- [ ] **Step 8: Implement Footer editor**

Vibe icons grid (toggle select, max 4) + year text input.

- [ ] **Step 9: Implement Image editor**

Drag-and-drop upload zone + file input. On upload: resize to max 1200px, store as data URL. Scale slider. Frame style select dropdown. Drag-to-reposition support (mouse + touch).

- [ ] **Step 10: Verify all popovers**

Click each section, edit, verify live updates, verify dismiss behavior.

- [ ] **Step 11: Commit**

```bash
git add js/popover.js css/styles.css
git commit -m "feat: popover editing system with all section editors"
```

---

### Task 5: PNG Export

**Files:**
- Create: `js/export.js`
- Download: `lib/html2canvas.min.js`

**Interfaces:**
- Consumes: `#card` DOM element, `window.AppState`, `window.hidePopover()`
- Produces: click handler on `#download-btn` that exports the card as PNG

- [ ] **Step 1: Vendor html2canvas**

Download html2canvas v1.4.1 and save to `lib/html2canvas.min.js`.

- [ ] **Step 2: Implement `js/export.js`**

Download button handler: hide popover, add exporting class (strips hover/shimmer), call html2canvas at 2x scale, download as `{name}-card.png`, remove exporting class, show loading state during render.

- [ ] **Step 3: Add export-related CSS**

Exporting class hides interactive states. Download button: pill shape with archetype gradient, hover glow.

- [ ] **Step 4: Verify export**

Customize card, download, verify PNG renders correctly at 700x980px.

- [ ] **Step 5: Commit**

```bash
git add js/export.js lib/html2canvas.min.js css/styles.css
git commit -m "feat: PNG export with html2canvas"
```

---

### Task 6: Visual Polish

**Files:**
- Modify: `css/styles.css`
- Modify: `js/card.js`

**Interfaces:**
- Consumes: existing CSS and card rendering
- Produces: holographic shimmer, placeholder states, micro-animations, frame styles, responsive behavior

- [ ] **Step 1: Add holographic shimmer effect**

`#card::before` pseudo-element with diagonal gradient, animated on hover (light sweep), `mix-blend-mode: overlay`. Hidden during export.

- [ ] **Step 2: Add placeholder state styling**

`card--placeholder` class with muted colors and pulsing animation on image area. Toggle based on whether defaults have been customized.

- [ ] **Step 3: Add micro-animations**

Card entrance fade+scale, stat bar width transitions, archetype color transitions, download button hover scale.

- [ ] **Step 4: Add frame style visuals**

Simple (2px solid), Gold Foil (gold gradient border-image), Holographic (animated rainbow border), None.

- [ ] **Step 5: Responsive bottom-sheet verification**

Verify mobile popovers, card scaling, backdrop overlay.

- [ ] **Step 6: Commit**

```bash
git add css/styles.css js/card.js
git commit -m "feat: visual polish — holographic shimmer, animations, responsive"
```

---

### Task 7: Final Integration and Testing

**Files:**
- Modify: `index.html` (meta tags)
- All files (bug fixes)

**Interfaces:**
- Consumes: everything
- Produces: a fully working, polished app

- [ ] **Step 1: Add SEO and meta tags**

Title, description, viewport, charset, emoji favicon.

- [ ] **Step 2: End-to-end walkthrough**

Full user flow test: placeholder state -> edit all sections -> change archetype -> download PNG -> test mobile viewport.

- [ ] **Step 3: Fix any bugs**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: final integration, meta tags, and bug fixes"
```
