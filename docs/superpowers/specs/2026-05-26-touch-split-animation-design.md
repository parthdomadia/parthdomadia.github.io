# Touch Split Animation — Design Spec
**Date:** 2026-05-26
**Status:** Approved

## Overview

On touch devices (iPad, mobile), replace the hover lens with an animated vertical split: bottom portion shows the real photo, top portion shows ASCII art, with a soft feathered boundary that slowly oscillates up and down on a sine wave loop.

## Touch Detection

```javascript
const isTouch = window.matchMedia('(hover: none)').matches
```

Checked inside `initAsciiArt()` after the hover lens block. If touch: run split animation. If pointer: existing hover lens runs unchanged.

## Split Animation

Uses `mask-image` (not `clip-path`) on `#ascii-reveal` for a soft feathered edge.

- Boundary oscillates between ~38%–62% from the bottom
- Amplitude: ±12% from center (50%)
- Period: 18 seconds per full cycle
- Feather: 8% blend zone on each side (~16% total soft edge)
- Driven by `requestAnimationFrame` using timestamp

```javascript
const SPLIT_AMPLITUDE = 12
const SPLIT_PERIOD    = 18000
const FEATHER         = 8

function animateSplit(ts) {
  const split = 50 + SPLIT_AMPLITUDE * Math.sin((ts / SPLIT_PERIOD) * Math.PI * 2)
  const mask  = `linear-gradient(to top,
    black 0%,
    black ${split - FEATHER}%,
    transparent ${split + FEATHER}%,
    transparent 100%)`
  reveal.style.webkitMaskImage = mask
  reveal.style.maskImage       = mask
  requestAnimationFrame(animateSplit)
}

requestAnimationFrame(animateSplit)
```

## Files Changed

| File | Change |
|------|--------|
| `script.js` | Add `isTouch` detection + `animateSplit` RAF loop inside `initAsciiArt()`, after hover lens block |

## Out of Scope

- Tap-to-toggle interaction on touch
- Pausing animation when tab is hidden (the existing `setInterval` already handles this for the ASCII drift; the RAF loop runs independently — acceptable for a portfolio)
