# ASCII Art Hero Panel — Design Spec
**Date:** 2026-05-23  
**Status:** Approved

---

## Overview

Add a dynamic ASCII art portrait to the blank right-side space of the landing page (`index.html`). The image (a photo of Parth) is converted to ASCII on page load via HTML Canvas, then animated with a subtle character-drift effect that keeps the portrait recognizable while making it feel alive.

---

## Layout

`.hero` is already `display: flex; align-items: center`. A new `.hero__ascii` div is added as a sibling of `.hero__content` inside `<main class="hero">`:

```
[ ~32vw left gap ] [ .hero__content max-width:520px ] [ .hero__ascii flex:1 ]
```

- `.hero__ascii` has `flex: 1`, `display: flex`, `align-items: center`, `justify-content: flex-start`, `padding: 2rem 2rem 2rem 3rem`, `overflow: hidden`
- Hidden on mobile via `display: none` at `≤768px` — no change to existing responsive behavior
- The existing `.hero__content` layout and CSS are untouched

---

## Image Asset

- Source photo saved as `assets/parth.jpg` (cropped square, compressed ≤200KB)
- Loaded at runtime via `new Image()` into a hidden `<canvas>` — no server-side processing

---

## Canvas Sampling

1. Hidden `<canvas>` draws the image at **70 cols × 85 rows** resolution
2. Per-pixel luminance: `brightness = 0.299R + 0.587G + 0.114B`
3. Brightness (0–255) maps to a 12-character ramp:
   ```
   ' .:,;+*?%S#@'
   ```
   - Index 0 (space) = darkest pixels (jacket, hair)
   - Index 11 (`@`) = brightest pixels (face highlights, building)
4. Each cell stored as `{ baseTier: 0–11, offset: 0 }` in a 2D array

---

## Rendering

- Output target: `<pre id="ascii-art">` inside `.hero__ascii`
- Each frame: rebuild the full string (~6000 chars) from the grid, assign via `pre.textContent`
- Font: `Space Mono`, `font-size: 6px`, `line-height: 1.15`
- Color: `rgba(255, 255, 255, 0.55)` — dim white, non-competing with hero text
- `white-space: pre`, `pointer-events: none`, `user-select: none`

---

## Animation

**Animatable pool:** only cells with `baseTier` in range 2–9 (mid-tones). Pure dark (0–1) and pure bright (10–11) cells are excluded — silhouette and highlight edges stay locked.

**Tick logic** (`setInterval` at 150ms):
1. Pick 8 random cells from the animatable pool
2. Set each cell's `offset` to `+1` or `−1` (random)
3. With 30% probability, reset a random cell's `offset` to `0`

**Render:** clamp final tier to `[0, 11]` when building the output string.

Net effect: ~15–25 characters are one step off their base tier at any moment. Portrait is always recognizable; mid-tone texture zones (face, jacket details, background) drift slowly.

---

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Add `.hero__ascii` div with `<pre id="ascii-art">` |
| `style.css` | Add `.hero__ascii` and `#ascii-art` styles; add mobile hide rule |
| `script.js` | Add `initAsciiArt()` — canvas sampling + animation loop |
| `assets/parth.jpg` | New file — source portrait photo |

---

## Out of Scope

- Color ASCII (tinted characters) — monochrome only
- Runtime image upload — static asset only
- Server-side pre-processing — all canvas work happens in the browser
- Any change to the projects or problems pages
