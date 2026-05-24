# ASCII Art Reveal Lens — Design Spec
**Date:** 2026-05-24  
**Status:** Approved

---

## Overview

On hover over the ASCII art portrait, a circular "lens" follows the cursor and reveals the original photo through it. Outside the circle: ASCII art. Inside the circle: the real image. The circle collapses smoothly when the cursor leaves.

---

## Structure

In `index.html`, wrap the existing `<pre id="ascii-art">` in a new `.ascii-wrapper` div and add `<img id="ascii-reveal">` as a sibling:

```html
<div class="ascii-wrapper">
  <pre id="ascii-art"></pre>
  <img id="ascii-reveal" src="assets/parth.jpg" alt="">
</div>
```

---

## CSS

Move `transform: scale(1.3) translateX(23%)` and `transform-origin` from `#ascii-art` to `.ascii-wrapper`. Both elements move/scale together as one unit.

```css
.ascii-wrapper {
  position: relative;
  display: inline-block;
  transform: scale(1.3) translateX(23%);
  transform-origin: center center;
  cursor: crosshair;
}

/* remove transform from #ascii-art */

#ascii-reveal {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  clip-path: circle(0px at 50% 50%);
  transition: clip-path 0.3s ease;
  pointer-events: none;
}
```

---

## JS

Inside `initAsciiArt()` in `script.js`, after the animation `setInterval`, add the reveal lens logic:

```javascript
const wrapper = pre.closest('.ascii-wrapper')
const reveal  = document.getElementById('ascii-reveal')

wrapper.addEventListener('mousemove', (e) => {
  const rect = reveal.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  reveal.style.transition = 'none'
  reveal.style.clipPath = `circle(80px at ${x}px ${y}px)`
})

wrapper.addEventListener('mouseleave', () => {
  reveal.style.transition = 'clip-path 0.3s ease'
  reveal.style.clipPath = 'circle(0px at 50% 50%)'
})
```

`getBoundingClientRect()` on `#ascii-reveal` returns screen coordinates that account for the CSS transform — no manual transform math needed.

---

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Wrap `<pre>` in `.ascii-wrapper`, add `<img id="ascii-reveal">` |
| `style.css` | Add `.ascii-wrapper` styles; move transform off `#ascii-art`; add `#ascii-reveal` styles |
| `script.js` | Add mousemove/mouseleave handlers inside `initAsciiArt()` |

---

## Out of Scope

- Variable circle radius (fixed at 80px)
- Touch/mobile support (panel is hidden on mobile)
- Soft feathered edge on circle (hard edge only)
