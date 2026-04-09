# Figma Project Time Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build a Figma plugin for UX/UI time tracking — sessions by project/phase, idle detection, weekly reports, CSV/PDF export.

**Architecture:** Module-split TypeScript bundled into a single IIFE by esbuild, inlined into `dist/ui.html`. State persists in `localStorage`. Sandbox `code.ts` stays minimal.

**Tech Stack:** TypeScript 5, esbuild, vanilla HTML/CSS, localStorage, jsPDF (CDN), @figma/plugin-typings

---

## File Map

| File | Responsibility |
|---|---|
| `manifest.json` | Figma plugin manifest |
| `package.json` | Scripts + devDeps |
| `tsconfig.json` | TS strict config |
| `build.js` | esbuild orchestrator |
| `src/code.ts` | Sandbox: INIT + CLOSE |
| `src/ui/types.ts` | Types, constants, palettes |
| `src/ui/helpers.ts` | Pure utilities (format, date, grouping) |
| `src/ui/storage.ts` | localStorage wrapper |
| `src/ui/timer.ts` | Timer engine |
| `src/ui/idle.ts` | Idle detection |
| `src/ui/export.ts` | CSV + PDF |
| `src/ui/styles.css` | Dark theme |
| `src/ui/index.html` | Template with {{STYLES}}/{{SCRIPT}} |
| `src/ui/render.ts` | DOM rendering, all 4 views |
| `src/ui/ui.ts` | Entry point — wires everything |

---

## Task 1: Scaffold

**Files:** `manifest.json`, `package.json`, `tsconfig.json`, `build.js`, `src/`, `src/ui/`

- [ ] Create directory structure: `src/ui/`, `dist/`
- [ ] Write `manifest.json`
- [ ] Write `package.json`
- [ ] Write `tsconfig.json`
- [ ] Write `build.js` (mirror font-replacer pattern)
- [ ] Run `npm install`

## Task 2: types.ts + helpers.ts

Write full types module and pure utility helpers. Typecheck.

## Task 3: storage.ts

localStorage wrapper with defaultState() fallback. Typecheck.

## Task 4: timer.ts

Timer engine: `startSession`, `stopSession`, `finalizeSession`, `startTick`, `stopTick`. Uses callbacks to avoid circular imports. Typecheck.

## Task 5: idle.ts

Idle detection: `initIdleListeners`, `resetIdleTimer`, `resumeFromIdle`, `clearIdleTimer`. Adjusts `session.startedAt` on resume to exclude idle gap. Typecheck.

## Task 6: export.ts

CSV (with BOM) + PDF (jsPDF from CDN). Typecheck.

## Task 7: styles.css + index.html

Dark theme CSS with design tokens. HTML template loads jsPDF via CDN.

## Task 8: render.ts

Complete rendering layer — 4 views, modals, idle banner, nav tabs, listeners. Uses `innerHTML` + re-attach pattern. Typecheck.

## Task 9: ui.ts

Entry point: module-level state, postMessage bridge, wires all callbacks, triggers initial render, resumes tick if session was active before reopen. Typecheck.

## Task 10: code.ts

Minimal Figma sandbox. Typecheck.

## Task 11: Build and verify

- [ ] `npm run typecheck` → pass
- [ ] `npm run build` → `dist/code.js` and `dist/ui.html` exist
- [ ] Manual verification checklist:
  - Plugin loads in Figma without console errors
  - Can create a project
  - Timer starts/stops
  - Close plugin, reopen → active session still running (persistence verified)
  - Weekly report navigates prev/next
  - Settings persist
