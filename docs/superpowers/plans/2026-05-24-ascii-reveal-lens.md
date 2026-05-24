# ASCII Art Reveal Lens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a circular hover lens to the ASCII art portrait that reveals the original photo under the cursor.

**Architecture:** Wrap the existing `<pre id="ascii-art">` and a new `<img id="ascii-reveal">` in a `.ascii-wrapper` div. The wrapper inherits the existing transform. The image overlays the pre with `clip-path: circle(0px)` and JS updates it on `mousemove` to reveal a 80px circle at the cursor position.

**Tech Stack:** Plain HTML, CSS `clip-path`, vanilla JS. No dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `index.html` | **Modify** | Wrap `<pre>` in `.ascii-wrapper`, add `<img id="ascii-reveal">` |
| `style.css` | **Modify** | Add `.ascii-wrapper` + `#ascii-reveal` styles; move transform off `#ascii-art` |
| `script.js` | **Modify** | Add `mousemove`/`mouseleave` handlers inside `initAsciiArt()` |

> **Local testing note:** Test via `npx serve .` at `http://localhost:3000` — Canvas requires a server, not `file://`.

---

## Task 1: Update HTML structure

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Wrap `<pre>` in `.ascii-wrapper` and add reveal image**

In `index.html`, locate the `.hero__ascii` div (currently lines 63–65). Replace it with:

```html
    <div class="hero__ascii">
      <div class="ascii-wrapper">
        <pre id="ascii-art"></pre>
        <img id="ascii-reveal" src="assets/parth.jpg" alt="">
      </div>
    </div>
```

- [ ] **Step 2: Verify structure in browser**

Open `http://localhost:3000`. Open DevTools → Elements. Confirm:
- `div.ascii-wrapper` is a direct child of `div.hero__ascii`
- `pre#ascii-art` and `img#ascii-reveal` are both children of `.ascii-wrapper`

The page should look identical to before (no visual change yet — CSS comes next).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "html: wrap ascii art in wrapper div, add reveal image"
```

---

## Task 2: Update CSS

**Files:**
- Modify: `style.css`

Three changes in one task: add `.ascii-wrapper`, move transform off `#ascii-art`, add `#ascii-reveal`.

- [ ] **Step 1: Add `.ascii-wrapper` styles**

In `style.css`, locate the `/* ── ASCII Art Panel ── */` section. After the `.hero__ascii` block and before the `#ascii-art` block, insert:

```css
.ascii-wrapper {
  position: relative;
  display: inline-block;
  transform: scale(1.3) translateX(23%);
  transform-origin: center center;
  cursor: crosshair;
}
```

- [ ] **Step 2: Remove transform from `#ascii-art`**

In `style.css`, find the `#ascii-art` block. Remove the two transform lines. The block should become:

```css
#ascii-art {
  font-family: var(--font-mono);
  font-size: 6px;
  line-height: 1.15;
  color: rgba(255, 255, 255, 0.55);
  white-space: pre;
  pointer-events: none;
  user-select: none;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 3: Add `#ascii-reveal` styles**

Immediately after the `#ascii-art` block, add:

```css
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

- [ ] **Step 4: Verify in browser**

Reload `http://localhost:3000`. The ASCII art should look exactly the same as before (same size, same position). The reveal image is present in the DOM but fully hidden (`clip-path: circle(0px)`). No visual change yet.

- [ ] **Step 5: Commit**

```bash
git add style.css
git commit -m "style: add ascii-wrapper, reveal image styles, move transform"
```

---

## Task 3: Add JS hover lens

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Add mousemove/mouseleave handlers inside `initAsciiArt()`**

In `script.js`, locate the end of `initAsciiArt()`. The function currently ends with:

```javascript
  img.onerror = () => {
    console.warn('initAsciiArt: failed to load assets/parth.jpg')
  }
  img.src = 'assets/parth.jpg'
}

initAsciiArt()
```

Insert the reveal lens block **before** `img.onerror` (i.e., after the `setInterval` closing `}, 150)` and before `img.onerror`):

```javascript
  // ── Reveal lens ──
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

The full end of `initAsciiArt()` should now read:

```javascript
    setInterval(() => {
      if (!animatable.length) return
      if (document.visibilityState !== 'visible') return
      for (let i = 0; i < 8; i++) {
        const cell = animatable[Math.floor(Math.random() * animatable.length)]
        cell.offset = Math.random() < 0.5 ? 1 : -1
      }
      if (Math.random() < 0.3) {
        const cell = animatable[Math.floor(Math.random() * animatable.length)]
        cell.offset = 0
      }
      render()
    }, 150)
  }

  // ── Reveal lens ──
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

  img.onerror = () => {
    console.warn('initAsciiArt: failed to load assets/parth.jpg')
  }
  img.src = 'assets/parth.jpg'
}

initAsciiArt()
```

> **Note:** The reveal lens block is placed **outside** `img.onload` (between the closing `}` of `onload` and `img.onerror`). This is intentional — `wrapper` and `reveal` are DOM elements that exist immediately, independent of the image load. The event listeners attach right away.

- [ ] **Step 2: Verify in browser**

Reload `http://localhost:3000`. Hover over the ASCII art. You should see:
- Cursor changes to crosshair on entry
- A circular window (~160px diameter) follows the cursor, showing the real photo
- Moving the cursor moves the circle instantly (no lag)
- Moving the cursor off the ASCII art causes the circle to smoothly shrink to nothing (0.3s ease)

If the circle appears but is misaligned from the cursor, check that `reveal.getBoundingClientRect()` is being called (not the wrapper's rect). The rect accounts for the CSS transform automatically.

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: add circular reveal lens on ascii art hover"
```
