# Responsive Breakpoints — Design Spec
**Date:** 2026-05-24  
**Status:** Approved

## Overview

Add a `1100px` breakpoint across `style.css` and `projects.css` to hide layout-heavy elements on medium screens (tablets, small laptops). Also add `overflow-x: hidden` to `body` to prevent horizontal scroll from the ASCII art transform.

## Breakpoint Strategy

| Range | Landing | Projects | Problems |
|-------|---------|----------|---------|
| `> 1100px` | ASCII art visible | Preview + callout lines visible | Full layout |
| `768px–1100px` | ASCII art hidden | Preview + callout lines hidden | No change (text-only, already fluid) |
| `< 768px` | Existing mobile rules | Existing mobile rules | Existing mobile rules |

## Changes

**`style.css`:**
- Add `overflow-x: hidden` to `body`
- Add `@media (max-width: 1100px) { .hero__ascii { display: none; } }` before the existing `@media (max-width: 768px)` block

**`projects.css`:**
- Add `@media (max-width: 1100px) { .project-preview { display: none; } .callout-svg { display: none; } }` before the existing `@media (max-width: 768px)` block

**`problems.css`:** No changes.
