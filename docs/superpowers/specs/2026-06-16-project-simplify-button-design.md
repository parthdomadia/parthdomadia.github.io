# "Simplify" Button — Design Spec
**Date:** 2026-06-16
**Status:** Approved

## Overview

Each project card on `projects.html` gets a "Simplify" button. Clicking it replaces the real project description with a funny, quirky one-liner. The first swap uses a hardcoded joke; every swap after that calls an LLM to generate a fresh one-liner. Every swap (hardcoded or LLM) plays a falling-letters physics animation. The swap is one-way per visit — there's no toggling back to the real description.

## UI / State Machine (per card)

```
[Real description, button: "Simplify"]
        |  click → instant swap, no network call
        v
[Hardcoded joke, button: "Even simpler →"]
        |  click → fetch from proxy (button shows "...")
        v
[LLM joke #1, button: "Even simpler →"]
        |  click → fetch from proxy again
        v
[LLM joke #2, button: "Even simpler →"]
        ... repeats indefinitely
```

- No back button / no toggle to the original description.
- Tags, links, image, and title never change — only the `<p class="project-item__desc">` text swaps.
- Loading state: while waiting on the LLM fetch, button text becomes `...` and is disabled (prevents double-clicks / spamming the proxy).
- On fetch failure (network error or 429 rate-limited): description text is left unchanged, button briefly shows `try again later` for ~1.5s, then resets to `Even simpler →` and re-enables.

## Hardcoded jokes (first swap, no network call)

- **Canvas**: "I built a virtual whiteboard so good it convinced React to mind its own business."
- **Project Hermes**: "I taught a robot to read the entire internet so I wouldn't have to."
- **GluCUE**: "A health app so secure even I need an OAuth flow to see my own blood sugar."

Stored as `data-joke="..."` attributes on each `.project-item` in `projects.html`.

## Falling-text transition (Matter.js)

Plays on every swap (hardcoded reveal and every subsequent LLM reveal).

- Matter.js loaded via CDN `<script>` tag — used only as a physics engine; rendering is DOM-based (absolutely-positioned `<span>` per character synced to body position/angle via `requestAnimationFrame`), not canvas.
- On swap: the `<p class="project-item__desc">` is visually hidden and replaced by a same-width "stage" overlay, height capped (~100–120px), with invisible static Matter bodies for the floor and left/right walls.
- The new text (joke) is split into character spans. Each becomes a small dynamic Matter body, spawned above the stage at a randomized x position with randomized initial rotation/velocity. They fall under gravity, collide with the floor/walls/each other, and tumble/pile for ~1 second.
- After ~1s: the engine stops, the stage fades out (CSS opacity transition, ~200ms), and the real `<p>` fades back in with the actual joke text set as plain readable text. The physics tumble is a pure visual flourish — legibility comes from the subsequent clean text swap, not from where letters land.
- Each project card gets its own isolated Matter.js `Engine`/`World` instance, created on first swap and torn down (or reused/cleared) on each subsequent swap to avoid accumulating physics state across clicks.

## Frontend changes

| File | Change |
|------|--------|
| `projects.html` | Add `data-joke` attribute to each `.project-item`; add "Simplify" `<button>` under each description; add Matter.js CDN `<script>` tag |
| `projects.css` | Style `.project-item__simplify` button (matches `.project-item__link` mono/dim/accent-hover style); style `.project-item__joke-stage` overlay (absolute, same width as description, overflow hidden) |
| `projects.js` (or new `projects-joke.js`) | Click handler per card implementing the state machine above: instant hardcoded swap, fetch-based LLM swaps, falling-text animation, loading/error states |

## Backend: joke proxy

GitHub Pages is static and can't hold a secret API key, so a small separate serverless function proxies the LLM call.

- **New folder in this repo**: `joke-proxy/` — a standalone Vercel project (deployed separately from the GitHub Pages site; Vercel's "Root Directory" project setting points at this folder). Not part of the GitHub Pages build.
- **Endpoint**: `POST /api/joke` — accepts `{ name, description }`, returns `{ joke }`.
- **Model**: Anthropic Claude Haiku (`claude-haiku-4-5`) via the Messages API. Short system prompt instructing a single funny, punchy, ≤20-word explanation of the given project name + description. `max_tokens` capped small (~60) to keep responses short and cost low.
- **API key**: `ANTHROPIC_API_KEY` set as a Vercel environment variable on the proxy project. Never committed to this repo.
- **Rate limiting**: simple in-memory per-IP limiter (e.g. 5 requests/minute) inside the function. Best-effort only — serverless instances are ephemeral/multiple, so this isn't an airtight ceiling, just a deterrent against casual abuse/scripted spam. Acceptable for a low-traffic portfolio site.
- **CORS**: `Access-Control-Allow-Origin` restricted to the portfolio's domain (GitHub Pages URL / custom domain), not `*`.
- **Input validation**: reject/truncate overly long `name`/`description` payloads before building the prompt.

## Error handling

- Proxy network failure, timeout, or non-200 response → frontend shows the "try again later" message on the button and leaves the current text untouched; no console-breaking exceptions.
- Proxy 429 (rate limited) → same handling as above, generic message (don't expose rate-limit internals to the visitor).
- Malformed/empty LLM response → proxy returns a 500; frontend treats it the same as any other fetch failure.

## Testing / verification

- Manual verification in a browser: click through the full state machine on each of the 3 project cards (real → hardcoded joke → LLM joke → LLM joke again), confirm animation plays each time and text ends up readable.
- Manually trigger the proxy's rate limit (6+ rapid clicks) and confirm the frontend's error state shows correctly instead of hanging or breaking.
- Verify CORS by attempting a fetch from a non-portfolio origin (e.g. local file) and confirming it's blocked.

## Out of scope

- Toggling back to the real description.
- Persisting joke state across page reloads.
- Changing tags/links/image as part of the joke.
- Hardened/distributed rate limiting (e.g. Redis-backed) — acceptable to revisit if abuse becomes a real problem.
