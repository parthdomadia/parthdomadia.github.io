# Simplify Button + Falling-Text Joke Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Simplify" button to each project card on `projects.html` that swaps the real description for a funny one-liner (hardcoded first, LLM-generated on every click after) with a Matter.js falling-letters transition, backed by a small Vercel proxy that keeps the Anthropic API key secret.

**Architecture:** Frontend (`projects.html`/`projects.css`/new `projects-joke.js`) drives a one-way per-card state machine and a DOM-rendered Matter.js physics animation. A standalone serverless project (`joke-proxy/`, deployed separately to Vercel) exposes `POST /api/joke`, rate-limits by IP, builds a prompt, and calls Anthropic's Messages API (Haiku) server-side.

**Tech Stack:** Vanilla JS/CSS/HTML (frontend, no build step), Matter.js via CDN, Node.js Vercel serverless function (backend, no framework), Node's built-in `node:test` for backend unit tests.

---

## Spec reference

Full design: `docs/superpowers/specs/2026-06-16-project-simplify-button-design.md`

## File Structure

| File | Responsibility |
|------|-----------------|
| `joke-proxy/package.json` | Standalone Node project manifest for the proxy (separate deploy unit) |
| `joke-proxy/lib/rateLimiter.js` | Pure in-memory per-IP rate limiter |
| `joke-proxy/lib/rateLimiter.test.js` | Unit tests for the rate limiter |
| `joke-proxy/lib/buildPrompt.js` | Pure function: turns `{name, description}` into a system/user prompt, with input validation |
| `joke-proxy/lib/buildPrompt.test.js` | Unit tests for prompt building/validation |
| `joke-proxy/api/joke.js` | Vercel serverless handler: CORS, method check, rate limit, validation, calls Anthropic, returns `{joke}` |
| `joke-proxy/.gitignore` | Ignore `node_modules`, `.vercel` |
| `projects.css` | New styles: `.project-item__simplify` button, `.project-item__joke-stage`, `.project-item__joke-letter`, `.project-item__desc--hidden` |
| `projects.html` | Add `data-joke` attribute per project item; add Matter.js CDN `<script>`; add `<script src="projects-joke.js">` |
| `projects-joke.js` | Frontend state machine: button creation, instant hardcoded swap, LLM fetch swap, falling-text animation, error handling |

---

## Task 1: Scaffold the joke-proxy backend project

**Files:**
- Create: `joke-proxy/package.json`
- Create: `joke-proxy/.gitignore`

- [ ] **Step 1: Create the directory and package.json**

```json
{
  "name": "joke-proxy",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
.vercel/
```

- [ ] **Step 3: Commit**

```bash
git add joke-proxy/package.json joke-proxy/.gitignore
git commit -m "chore: scaffold joke-proxy backend project"
```

---

## Task 2: Rate limiter with unit tests

**Files:**
- Create: `joke-proxy/lib/rateLimiter.js`
- Create: `joke-proxy/lib/rateLimiter.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// joke-proxy/lib/rateLimiter.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkRateLimit, _resetRateLimitState } from './rateLimiter.js'

test('allows requests under the limit', () => {
  _resetRateLimitState()
  const now = 1000
  for (let i = 0; i < 5; i++) {
    assert.equal(checkRateLimit('1.2.3.4', now), true)
  }
})

test('blocks the 6th request within the window', () => {
  _resetRateLimitState()
  const now = 1000
  for (let i = 0; i < 5; i++) {
    checkRateLimit('1.2.3.4', now)
  }
  assert.equal(checkRateLimit('1.2.3.4', now), false)
})

test('different IPs have independent limits', () => {
  _resetRateLimitState()
  const now = 1000
  for (let i = 0; i < 5; i++) {
    checkRateLimit('1.2.3.4', now)
  }
  assert.equal(checkRateLimit('5.6.7.8', now), true)
})

test('allows requests again after the window passes', () => {
  _resetRateLimitState()
  const now = 1000
  for (let i = 0; i < 5; i++) {
    checkRateLimit('1.2.3.4', now)
  }
  assert.equal(checkRateLimit('1.2.3.4', now + 60_001), true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd joke-proxy && node --test`
Expected: FAIL with "Cannot find module './rateLimiter.js'"

- [ ] **Step 3: Implement the rate limiter**

```javascript
// joke-proxy/lib/rateLimiter.js
const WINDOW_MS = 60_000
const MAX_REQUESTS = 5

let hits = new Map() // ip -> array of timestamps (ms)

export function checkRateLimit(ip, now = Date.now()) {
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)

  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(ip, timestamps)
    return false
  }

  timestamps.push(now)
  hits.set(ip, timestamps)
  return true
}

export function _resetRateLimitState() {
  hits = new Map()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd joke-proxy && node --test`
Expected: PASS (4 tests passing)

- [ ] **Step 5: Commit**

```bash
git add joke-proxy/lib/rateLimiter.js joke-proxy/lib/rateLimiter.test.js
git commit -m "feat: add per-IP rate limiter for joke proxy"
```

---

## Task 3: Prompt builder with unit tests

**Files:**
- Create: `joke-proxy/lib/buildPrompt.js`
- Create: `joke-proxy/lib/buildPrompt.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// joke-proxy/lib/buildPrompt.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPrompt } from './buildPrompt.js'

test('builds a prompt from name and description', () => {
  const prompt = buildPrompt('Canvas', 'A drag-and-drop diagramming tool.')
  assert.match(prompt.system, /one sentence/i)
  assert.match(prompt.user, /Canvas/)
  assert.match(prompt.user, /drag-and-drop diagramming tool/)
})

test('trims whitespace', () => {
  const prompt = buildPrompt('  Canvas  ', '  does things  ')
  assert.match(prompt.user, /Project name: Canvas\n/)
})

test('truncates an overly long name', () => {
  const longName = 'x'.repeat(200)
  const prompt = buildPrompt(longName, 'desc')
  const nameLine = prompt.user.split('\n')[0]
  assert.ok(nameLine.length <= 'Project name: '.length + 80)
})

test('truncates an overly long description', () => {
  const longDesc = 'y'.repeat(2000)
  const prompt = buildPrompt('Canvas', longDesc)
  assert.ok(prompt.user.length < 1000)
})

test('throws on non-string input', () => {
  assert.throws(() => buildPrompt(123, 'desc'))
  assert.throws(() => buildPrompt('name', null))
})

test('throws on empty input after trimming', () => {
  assert.throws(() => buildPrompt('   ', 'desc'))
  assert.throws(() => buildPrompt('name', '   '))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd joke-proxy && node --test`
Expected: FAIL with "Cannot find module './buildPrompt.js'"

- [ ] **Step 3: Implement the prompt builder**

```javascript
// joke-proxy/lib/buildPrompt.js
const MAX_NAME_LEN = 80
const MAX_DESC_LEN = 600

const SYSTEM_PROMPT =
  'You write one-line, funny, self-deprecating jokes that describe a ' +
  'software project in a quirky way. Respond with exactly one sentence, ' +
  'no more than 20 words, no quotes, no preamble, no markdown.'

export function buildPrompt(name, description) {
  if (typeof name !== 'string' || typeof description !== 'string') {
    throw new Error('name and description must be strings')
  }

  const safeName = name.slice(0, MAX_NAME_LEN).trim()
  const safeDescription = description.slice(0, MAX_DESC_LEN).trim()

  if (!safeName || !safeDescription) {
    throw new Error('name and description must not be empty')
  }

  return {
    system: SYSTEM_PROMPT,
    user: `Project name: ${safeName}\nReal description: ${safeDescription}\n\nWrite the joke description now.`,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd joke-proxy && node --test`
Expected: PASS (10 tests passing total, across both files)

- [ ] **Step 5: Commit**

```bash
git add joke-proxy/lib/buildPrompt.js joke-proxy/lib/buildPrompt.test.js
git commit -m "feat: add prompt builder with input validation for joke proxy"
```

---

## Task 4: Serverless handler

**Files:**
- Create: `joke-proxy/api/joke.js`

- [ ] **Step 1: Implement the handler**

```javascript
// joke-proxy/api/joke.js
import { checkRateLimit } from '../lib/rateLimiter.js'
import { buildPrompt } from '../lib/buildPrompt.js'

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://parthdomadia.github.io'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim()

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Too many requests' })
    return
  }

  const { name, description } = req.body || {}

  let prompt
  try {
    prompt = buildPrompt(name, description)
  } catch {
    res.status(400).json({ error: 'Invalid request' })
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server misconfigured' })
    return
  }

  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 60,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      }),
    })

    if (!anthropicRes.ok) {
      res.status(502).json({ error: 'Upstream error' })
      return
    }

    const data = await anthropicRes.json()
    const joke = data?.content?.[0]?.text?.trim()

    if (!joke) {
      res.status(502).json({ error: 'Empty response' })
      return
    }

    res.status(200).json({ joke })
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
}
```

- [ ] **Step 2: Manually verify locally with the Vercel CLI**

Run: `cd joke-proxy && npx vercel dev`

In a second terminal, with the dev server running and `ANTHROPIC_API_KEY` set in `joke-proxy/.env.local`:

```bash
curl -X POST http://localhost:3000/api/joke \
  -H "Content-Type: application/json" \
  -d '{"name":"Canvas","description":"A drag-and-drop diagramming tool."}'
```

Expected: JSON response like `{"joke":"..."}` with a short funny sentence.

- [ ] **Step 3: Manually verify rate limiting**

Run the same `curl` command 6 times in a row.
Expected: first 5 return `{"joke": "..."}`, the 6th returns `{"error":"Too many requests"}` with a 429 status.

- [ ] **Step 4: Commit**

```bash
git add joke-proxy/api/joke.js
git commit -m "feat: add /api/joke serverless handler calling Anthropic Haiku"
```

---

## Task 5: Frontend styles

**Files:**
- Modify: `projects.css`

- [ ] **Step 1: Append the new styles to the end of `projects.css`**

```css
/* ── Simplify button ── */
.project-item__simplify {
  display: inline-block;
  margin-top: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.project-item__simplify:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.project-item__simplify:disabled {
  opacity: 0.6;
  cursor: default;
}

/* ── Falling-text joke transition ── */
.project-item__desc--hidden {
  display: none;
}

.project-item__joke-stage {
  position: relative;
  height: 110px;
  overflow: hidden;
  margin-bottom: 0.5rem;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.project-item__joke-stage--fade-out {
  opacity: 0;
}

.project-item__joke-letter {
  position: absolute;
  top: 0;
  left: 0;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 300;
  color: var(--text-dim);
  will-change: transform;
}
```

- [ ] **Step 2: Commit**

```bash
git add projects.css
git commit -m "style: add Simplify button and falling-text joke styles"
```

---

## Task 6: Frontend state machine (no animation yet)

**Files:**
- Create: `projects-joke.js`

- [ ] **Step 1: Implement the button + state machine, with a no-op animation stub**

```javascript
// projects-joke.js
const JOKE_PROXY_URL = 'https://parth-joke-proxy.vercel.app/api/joke'

function initSimplifyButtons() {
  document.querySelectorAll('.project-item[data-joke]').forEach((item) => {
    const desc = item.querySelector('.project-item__desc')
    const nameEl = item.querySelector('.project-item__name')
    const originalDescription = desc.textContent.trim()
    const originalName = nameEl.textContent.trim()
    const hardcodedJoke = item.dataset.joke

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'project-item__simplify'
    button.textContent = 'Simplify'
    desc.insertAdjacentElement('afterend', button)

    let revealed = false // false = showing real description, true = showing a joke

    button.addEventListener('click', async () => {
      if (button.disabled) return

      if (!revealed) {
        revealed = true
        await swapText(desc, hardcodedJoke)
        button.textContent = 'Even simpler →'
        return
      }

      button.disabled = true
      const restoreLabel = button.textContent
      button.textContent = '...'

      try {
        const joke = await fetchJoke(originalName, originalDescription)
        await swapText(desc, joke)
        button.textContent = restoreLabel
      } catch {
        button.textContent = 'try again later'
        setTimeout(() => {
          button.textContent = restoreLabel
        }, 1500)
      } finally {
        button.disabled = false
      }
    })
  })
}

async function fetchJoke(name, description) {
  const res = await fetch(JOKE_PROXY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })

  if (!res.ok) {
    throw new Error(`Proxy responded ${res.status}`)
  }

  const data = await res.json()

  if (!data.joke) {
    throw new Error('Empty joke in response')
  }

  return data.joke
}

async function swapText(desc, newText) {
  desc.textContent = newText
}

initSimplifyButtons()
```

- [ ] **Step 2: Wire it into `projects.html`**

Find this line near the bottom of `projects.html`:

```html
  <script src="script.js"></script>
  <script src="projects.js"></script>
```

Replace with:

```html
  <script src="script.js"></script>
  <script src="projects.js"></script>
  <script src="projects-joke.js"></script>
```

- [ ] **Step 3: Add `data-joke` to each project item**

In `projects.html`, find the Canvas `<li class="project-item" data-image="assets/canvas-preview.png">` and change it to:

```html
        <li class="project-item" data-image="assets/canvas-preview.png" data-joke="I built a virtual whiteboard so good it convinced React to mind its own business.">
```

Find the Project Hermes `<li>` (`data-image="data:image/svg+xml,...Project 02...c0392b...`) and add the attribute:

```html
        <li class="project-item" data-image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23c0392b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='32' font-family='monospace'%3EProject 02%3C/text%3E%3C/svg%3E" data-joke="I taught a robot to read the entire internet so I wouldn't have to.">
```

Find the GluCUE `<li>` (`data-image="data:image/svg+xml,...Project 03...2980b9...`) and add the attribute:

```html
        <li class="project-item" data-image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%232980b9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='32' font-family='monospace'%3EProject 03%3C/text%3E%3C/svg%3E" data-joke="A health app so secure even I need an OAuth flow to see my own blood sugar.">
```

- [ ] **Step 4: Manually verify in a browser (no animation yet, plain text swap)**

Run: `npx serve .` (from the repo root), open the printed local URL, navigate to `/projects.html`.

Click "Simplify" on the Canvas card.
Expected: description instantly becomes "I built a virtual whiteboard so good it convinced React to mind its own business." and the button now reads "Even simpler →".

Click it again.
Expected: button shows "..." briefly, then either a new joke appears (if `joke-proxy` happens to already be deployed and `JOKE_PROXY_URL` updated) or — since the proxy isn't deployed yet — the button shows "try again later" then resets to "Even simpler →". Either outcome is correct at this stage; this step only confirms the state machine and error path work.

- [ ] **Step 5: Commit**

```bash
git add projects-joke.js projects.html
git commit -m "feat: add Simplify button state machine (real -> hardcoded joke -> LLM joke)"
```

---

## Task 7: Falling-text physics animation

**Files:**
- Modify: `projects.html`
- Modify: `projects-joke.js`

- [ ] **Step 1: Add the Matter.js CDN script to `projects.html`**

Find:

```html
  <script src="script.js"></script>
  <script src="projects.js"></script>
  <script src="projects-joke.js"></script>
```

Replace with:

```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
  <script src="script.js"></script>
  <script src="projects.js"></script>
  <script src="projects-joke.js"></script>
```

- [ ] **Step 2: Replace the `swapText` stub in `projects-joke.js` with the real animation**

Find:

```javascript
async function swapText(desc, newText) {
  desc.textContent = newText
}
```

Replace with:

```javascript
const TUMBLE_DURATION_MS = 1000
const FADE_DURATION_MS = 200

async function swapText(desc, newText) {
  await playFallingText(desc, newText)
  desc.textContent = newText
  desc.classList.remove('project-item__desc--hidden')
}

function playFallingText(desc, text) {
  return new Promise((resolve) => {
    const rect = desc.getBoundingClientRect()

    const stage = document.createElement('div')
    stage.className = 'project-item__joke-stage'
    stage.style.width = `${rect.width}px`

    desc.classList.add('project-item__desc--hidden')
    desc.insertAdjacentElement('beforebegin', stage)

    const stageWidth = rect.width
    const stageHeight = stage.clientHeight

    const engine = Matter.Engine.create()
    const world = engine.world

    const floor = Matter.Bodies.rectangle(stageWidth / 2, stageHeight + 10, stageWidth, 20, {
      isStatic: true,
    })
    const leftWall = Matter.Bodies.rectangle(-10, stageHeight / 2, 20, stageHeight * 2, {
      isStatic: true,
    })
    const rightWall = Matter.Bodies.rectangle(stageWidth + 10, stageHeight / 2, 20, stageHeight * 2, {
      isStatic: true,
    })
    Matter.World.add(world, [floor, leftWall, rightWall])

    const letters = []
    let x = 8

    for (const char of text) {
      const span = document.createElement('span')
      span.className = 'project-item__joke-letter'
      span.textContent = char
      stage.appendChild(span)

      const width = span.getBoundingClientRect().width || 6

      const body = Matter.Bodies.rectangle(x + width / 2, -Math.random() * 100 - 20, width, 14, {
        restitution: 0.4,
        friction: 0.3,
        angle: (Math.random() - 0.5) * 1.2,
      })
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 0 })
      Matter.World.add(world, body)

      letters.push({ span, body, halfWidth: width / 2 })
      x += width
    }

    let running = true

    function tick() {
      if (!running) return
      Matter.Engine.update(engine, 1000 / 60)
      for (const { span, body, halfWidth } of letters) {
        span.style.transform =
          `translate(${body.position.x - halfWidth}px, ${body.position.y}px) rotate(${body.angle}rad)`
      }
      requestAnimationFrame(tick)
    }
    tick()

    setTimeout(() => {
      running = false
      stage.classList.add('project-item__joke-stage--fade-out')
      setTimeout(() => {
        stage.remove()
        resolve()
      }, FADE_DURATION_MS)
    }, TUMBLE_DURATION_MS)
  })
}
```

- [ ] **Step 3: Manually verify in a browser**

Run: `npx serve .` from the repo root, open `/projects.html`.

Click "Simplify" on each of the 3 cards.
Expected: for each card, letters tumble and bounce inside a contained box below the title for about 1 second, then fade out and the readable joke text fades in cleanly. Layout doesn't shift/break on any card.

- [ ] **Step 4: Commit**

```bash
git add projects.html projects-joke.js
git commit -m "feat: animate joke reveal with Matter.js falling letters"
```

---

## Task 8: Deploy the proxy and wire up the real URL

**Files:**
- Modify: `projects-joke.js`

- [ ] **Step 1: Deploy `joke-proxy/` as its own Vercel project**

This is a manual one-time setup step (requires your Vercel account):

```bash
cd joke-proxy
npx vercel
```

Follow the prompts to create a new Vercel project rooted at this folder. Note the deployment URL it gives you (e.g. `https://joke-proxy-xyz.vercel.app`).

- [ ] **Step 2: Set the Anthropic API key as an environment variable**

In the Vercel dashboard for the `joke-proxy` project: Settings → Environment Variables → add `ANTHROPIC_API_KEY` with your key, for the Production environment. Redeploy if prompted.

- [ ] **Step 3: Promote to production and get the stable URL**

```bash
cd joke-proxy
npx vercel --prod
```

Note the production URL (e.g. `https://joke-proxy.vercel.app`).

- [ ] **Step 4: Update `JOKE_PROXY_URL` in `projects-joke.js`**

Find:

```javascript
const JOKE_PROXY_URL = 'https://parth-joke-proxy.vercel.app/api/joke'
```

Replace with your real production URL plus `/api/joke`, for example:

```javascript
const JOKE_PROXY_URL = 'https://joke-proxy.vercel.app/api/joke'
```

- [ ] **Step 5: Manually verify end-to-end against the live proxy**

Run: `npx serve .` from the repo root, open `/projects.html`.

Click "Simplify" then "Even simpler →" on a card.
Expected: after the tumble animation, a freshly LLM-generated joke appears (different each click). Click "Even simpler →" 6 times rapidly to trigger the proxy's rate limit.
Expected: the 6th click shows "try again later" instead of a joke.

- [ ] **Step 6: Commit**

```bash
git add projects-joke.js
git commit -m "chore: point Simplify button at deployed joke-proxy URL"
```

---

## Self-Review Notes

- **Spec coverage:** state machine (Task 6), hardcoded jokes (Task 6 Step 3), falling-text transition (Task 7), backend proxy + rate limiting + CORS + Anthropic call (Tasks 1-4), error handling on the frontend (Task 6 Step 1's catch block), deploy/env var setup (Task 8). All spec sections have a corresponding task.
- **Out of scope items confirmed excluded:** no toggle-back behavior, no joke persistence across reloads, no tag/link/image changes — none of the tasks above implement any of these.
- **Type/name consistency checked:** `checkRateLimit`/`_resetRateLimitState` (Task 2) match their usage in `api/joke.js` (Task 4). `buildPrompt` signature `(name, description) => {system, user}` (Task 3) matches its usage in `api/joke.js` (Task 4). `swapText`/`playFallingText` defined once in Task 6/7 and not redefined elsewhere.
