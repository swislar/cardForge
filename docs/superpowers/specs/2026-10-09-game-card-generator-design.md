# Friendship Game Card Generator — Design Spec

## Purpose

A single-page web app for creating personalized "friendship memoir" game cards as birthday gifts. The user uploads a photo of their friend and customizes symbolic fields — archetypes, personality stats, vibe icons — that give the card personal meaning. The card renders live in the center of the page, and the user exports it as a downloadable PNG.

**Who it's for:** The creator (the user) is making a card *for* a friend. The output is a digital card image they print or share.

**Success criteria:** A first-time user can produce a beautiful, personalized card in under 5 minutes. The card must look like a premium collectible, not a birthday e-card.

---

## Architecture

Pure client-side single-page application. No backend, no framework, no build step.

- **Stack:** HTML + vanilla CSS + vanilla JavaScript
- **Image export:** `html2canvas` library (renders the card DOM to a canvas, then exports PNG)
- **Font:** Google Fonts — `Outfit` for UI, `Cinzel` for card title (premium serif feel)
- **No dependencies** beyond html2canvas and Google Fonts

---

## Card Anatomy

The card has a **2.5 x 3.5 inch** aspect ratio (standard trading card, rendered at ~350x490px on screen). It is structured into these clickable, editable sections:

```
+----------------------------------+
|  [BADGE]   CARD TITLE       HP   |  <- Section 1: Header
+----------------------------------+
|                                  |
|          +-----------+           |
|          |           |           |
|          |   PHOTO   |           |  <- Section 2: Image
|          |           |           |
|          +-----------+           |
|                                  |
+----------------------------------+
|  Archetype: "The Adventurer"     |  <- Section 3: Archetype Banner
+----------------------------------+
|                                  |
|  "Always the first to say yes   |
|   to a road trip, even at 2am"  |  <- Section 4: Description/Narrative
|                                  |
+----------------------------------+
|  Humor     ||||||||..  82        |
|  Loyalty   ||||||||||  99        |  <- Section 5: Personality Stats
|  Chaos     ||||||....  65        |
|  Warmth    |||||||||.  90        |
+----------------------------------+
|  Fire Moon Lightning  Est.2018   |  <- Section 6: Vibe Icons + Year
+----------------------------------+
```

### Section 1: Header

| Field | Type | Details |
|-------|------|---------|
| Card Title | Text input | Friend's name or nickname. Max 24 chars. Rendered in `Cinzel` bold. |
| HP (Hype Points) | Number input | 1-999. Represents how much hype/energy this friend brings. Displayed top-right. |
| Archetype Badge | Auto-derived | Small colored icon/emblem in top-left corner, determined by the selected archetype (Section 3). Not directly edited here. |

### Section 2: Image

| Field | Type | Details |
|-------|------|---------|
| Photo | File upload | User uploads a photo. Accepts JPG/PNG/WEBP. Cropped/positioned within a rounded-rect frame (16:14 aspect ratio within the card). |
| Frame Style | Select | Choice of frame border style: `Gold Foil`, `Holographic`, `Simple`, `None`. Purely decorative border around the image. |

Clicking the image area opens a modal with:
- Upload button (or drag-and-drop zone)
- After upload: repositioning controls (drag to reposition, pinch/scroll to zoom) within the frame

### Section 3: Archetype Banner

The archetype defines the **entire card's color theme**. This is the most impactful customization.

| Archetype | Primary Color | Accent Color | Gradient Direction | Vibe |
|-----------|--------------|--------------|-------------------|------|
| The Adventurer | `#2D7D46` (forest green) | `#7DCEA0` (mint) | top-left to bottom-right | Explorer, spontaneous |
| The Listener | `#2C3E8C` (deep blue) | `#85C1E9` (sky blue) | top to bottom | Empathetic, wise |
| The Comedian | `#F39C12` (amber) | `#F7DC6F` (gold) | radial from center | Funny, light-hearted |
| The Ride-or-Die | `#922B21` (crimson) | `#F1948A` (rose) | bottom-left to top-right | Fierce loyalty |
| The Creative | `#6C3483` (purple) | `#D2B4DE` (lavender) | left to right | Artistic, dreamy |
| The Spark | `#D35400` (burnt orange) | `#F5B041` (tangerine) | radial from top | Energetic, inspiring |
| The Anchor | `#1A5276` (navy) | `#AED6F1` (ice blue) | top to bottom | Stable, grounding |
| The Wildcard | `#17202A` (charcoal) | `#E74C3C` (red) | diagonal | Unpredictable, exciting |

The archetype name is rendered as a banner/ribbon between the image and description.

Clicking this section opens a modal with a grid of archetype cards — each showing the name, a short tagline, and a color swatch preview. Selecting one immediately re-themes the card.

### Section 4: Description / Narrative

| Field | Type | Details |
|-------|------|---------|
| Description | Textarea | Free-form text, max 180 characters. This is where the user writes the personal memory or narrative. Rendered in italic `Outfit`. |

Clicking this section opens a modal with a textarea and a live character counter.

### Section 5: Personality Stats

Four stat bars. Each stat has:

| Field | Type | Details |
|-------|------|---------|
| Stat Name | Text input | Customizable label (default: "Humor", "Loyalty", "Chaos", "Warmth"). Max 12 chars each. |
| Stat Value | Slider / number | 0-99. Rendered as a filled progress bar + numeric value. Bar color matches the archetype accent color. |

The user can rename stats to anything meaningful (e.g., "Karaoke", "Dad Jokes", "Reliability", "Sarcasm").

Clicking the stats section opens a modal with four rows, each having a text input (for the label) and a slider (for the value).

### Section 6: Footer — Vibe Icons and Year

| Field | Type | Details |
|-------|------|---------|
| Vibe Icons | Multi-select | Choose up to 4 icons from a palette of ~20 options. Each icon has a name and meaning. Displayed as small icons in the bottom-left. |
| Friendship Year | Text input | "Est. YYYY" — the year the friendship started. Displayed bottom-right. |

**Vibe Icon Palette:**

| Icon | Name | Meaning |
|------|------|---------|
| Fire | Fire | Passionate, intense |
| Moon | Moon | Chill, night owl |
| Lightning | Lightning | Quick-witted, energetic |
| Wave | Wave | Go-with-the-flow |
| Blossom | Blossom | Gentle, nurturing |
| Music | Music | Musical soul |
| Books | Books | Intellectual, curious |
| Gaming | Gaming | Gamer buddy |
| Sun | Sun | Bright, optimistic |
| Gem | Gem | Rare, precious friend |
| Mountain | Mountain | Steadfast, strong |
| Palette | Palette | Creative, artistic |
| Compass | Compass | Guide, mentor |
| Pizza | Pizza | Foodie, comfort friend |
| Trophy | Trophy | Achiever, motivator |
| Sparkle | Sparkle | Magical, uplifting |
| Shield | Shield | Protective |
| Rainbow | Rainbow | Inclusive, joyful |
| Fox | Fox | Clever, resourceful |
| Chat | Chat | Always there to talk |

Clicking the footer area opens a modal with:
- A grid of icons (with names/meanings shown on hover) — click to toggle selection, max 4
- A text input for the friendship year

---

## Interaction Model

### Card-Centric Editing

The card is always visible, centered on the page. Each section has a **subtle hover highlight** (a faint glow outline) and a **click cursor** indicating it is editable.

**Clicking a section:**
1. A floating **popover modal** appears anchored near the clicked section
2. The popover contains the editing controls for that section
3. Changes apply **live** — the card updates in real-time as the user types/selects
4. A small x button or clicking outside dismisses the popover
5. Only one popover open at a time

**Popover positioning:**
- For header/image (top half of card): popover appears to the right of the card
- For description/stats/footer (bottom half of card): popover appears to the right of the card
- On narrow screens (< 768px): popover appears below the card as a bottom sheet

### Initial State

When the page loads, the card shows a **placeholder state** with:
- Title: "Friend's Name"
- HP: 100
- Image: a silhouette placeholder with a "Click to add photo" overlay
- Archetype: "The Adventurer" (default)
- Description: "Click to add your memory..."
- Stats: Default labels at 50/99 each
- Vibe Icons: None selected
- Year: Current year

The placeholder state uses muted colors. As the user fills in sections, they come alive with full color and polish.

---

## Visual Design

### Page Background

- Deep navy/charcoal: `#0F1119` base
- Subtle animated particle effect: very slow-moving faint dots/stars (CSS-only, using radial gradients and keyframes — NOT a canvas/JS library)
- Barely visible grid pattern overlay for texture

### Card Rendering

- **Card background:** Gradient based on archetype colors with a subtle noise texture overlay
- **Card border:** 2px solid with a **glow effect** matching the archetype accent color (`box-shadow: 0 0 20px <accent>, 0 0 40px <accent-at-30%-opacity>`)
- **Card corners:** 12px border-radius
- **Holographic shimmer:** On hover, a subtle CSS shimmer effect sweeps across the card (using a moving gradient overlay with `mix-blend-mode`). This makes the card feel like a real holographic trading card.
- **Inner sections:** separated by thin 1px lines in a slightly lighter shade of the archetype primary color

### Typography on Card

| Element | Font | Size (relative to card) | Weight |
|---------|------|------------------------|--------|
| Title | Cinzel | 18px | 700 |
| HP | Outfit | 14px | 700 |
| Archetype banner | Outfit | 11px | 600 uppercase tracking |
| Description | Outfit | 10px | 400 italic |
| Stat labels | Outfit | 9px | 500 |
| Stat values | Outfit | 9px | 700 |
| Vibe icon names | (icons only, no text on card) | — | — |
| Year | Outfit | 9px | 400 |

### Section Hover State

When hovering over a card section:
- The section gets a faint `outline: 1px dashed rgba(255,255,255,0.3)` 
- A small pencil/edit icon appears in the top-right corner of the section
- Cursor changes to `pointer`

### Popover Modals

- **Background:** `#1A1D2E` (dark slate) with `backdrop-filter: blur(12px)`
- **Border:** 1px solid `rgba(255,255,255,0.1)` with the same glow as the card
- **Border radius:** 12px
- **Shadow:** deep shadow for elevation
- **Animation:** fade-in + slight slide-up (200ms ease-out)
- **Width:** 320px (auto-height based on content)
- **Inputs:** dark-themed inputs with glowing focus states matching archetype color

---

## Export

### Download Button

A floating action button below the card: **"Download Card"**

- Styled as a pill-shaped button with the archetype gradient
- On click: uses `html2canvas` to render the card DOM element to a canvas at 2x resolution (700x980px for print quality), then triggers a PNG download
- Filename: `{friendname}-card.png` (sanitized)
- During rendering: briefly show a loading spinner on the button

### Export Considerations

- The holographic shimmer and hover states are **not** included in the export (they are interactive-only effects)
- The export captures the card in its resting state with full archetype colors
- The downloaded image has no page background — just the card with transparent or matched background

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| >= 1024px (desktop) | Card centered with ample padding. Popovers float to the right of the card. |
| 768-1023px (tablet) | Card centered, slightly smaller. Popovers float to the right but narrower. |
| < 768px (mobile) | Card centered and scaled down. Popovers become bottom sheets (slide up from bottom, full width). |

The card itself is always rendered at its native aspect ratio and scaled via CSS `transform: scale()` to fit the viewport.

---

## File Structure

```
Game Card Generator/
  index.html          # Single page, all structure
  css/
    styles.css        # All styles: page, card, popovers, animations
  js/
    app.js            # Main app initialization, state management
    card.js           # Card rendering logic, section click handlers
    popover.js        # Popover creation, positioning, form controls
    archetypes.js     # Archetype definitions (colors, names, taglines)
    icons.js          # Vibe icon definitions
    export.js         # html2canvas integration, download logic
  assets/
    placeholder.svg   # Silhouette placeholder for empty photo
  lib/
    html2canvas.min.js  # Vendored html2canvas
```

---

## Non-Goals (Explicit Exclusions)

- No user accounts or saving/loading cards to a server
- No AI-generated images or text
- No sharing to social media (just download)
- No gallery/collection view — one card at a time
- No print-layout page (just the PNG download)
- No "attack/move" slots (this is not a game — stats are symbolic)
- No backend whatsoever
