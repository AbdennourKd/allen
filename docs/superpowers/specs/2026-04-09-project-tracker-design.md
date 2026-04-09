# Figma Project Time Tracker — Design Document

**Date:** 2026-04-09
**Status:** Approved

---

## Overview

A Figma plugin for UX/UI time tracking. Users track work sessions by project and phase (Research, Ideation, Wireframe, Prototype, Design, Review, Handoff). Sessions persist in `localStorage`. The plugin features automatic idle detection, a weekly report with CSV/PDF export, and project management with per-project drill-down.

---

## Architecture

### Approach: Module split, inlined at build (Approach B)

Source is split into focused TypeScript modules. esbuild bundles them into a single IIFE and inlines it into `dist/ui.html` at build time. Figma sees one self-contained HTML file. No runtime overhead vs. a monolith.

### File Structure

```
figma-plugins/project-tracker/
├── manifest.json
├── package.json
├── tsconfig.json
├── build.js                        ← esbuild orchestrator (mirrors font-replacer)
├── src/
│   ├── code.ts                     ← sandbox: INIT message + CLOSE handler only
│   └── ui/
│       ├── index.html              ← {{STYLES}} + {{SCRIPT}} placeholders
│       ├── styles.css              ← CSS custom properties + all component styles
│       ├── types.ts                ← Session, Project, AppState, Phase, PHASE_COLORS, PROJECT_PALETTE
│       ├── storage.ts              ← loadState() / saveState() / defaultState()
│       ├── timer.ts                ← startSession / stopSession / finalizeSession / startTick
│       ├── idle.ts                 ← onActivity / resetIdleTimer / onIdle / resumeFromIdle
│       ├── render.ts               ← render() + updateTimerDisplay() + view renderers + modal
│       ├── export.ts               ← exportCSV() + exportPDF()
│       └── ui.ts                   ← entry point: init, postMessage bridge, view state, wiring
├── dist/
│   ├── code.js
│   └── ui.html
└── docs/superpowers/specs/
    └── 2026-04-09-project-tracker-design.md
```

---

## Data Model

```typescript
type Phase =
  | 'Research' | 'Ideation' | 'Wireframe'
  | 'Prototype' | 'Design' | 'Review' | 'Handoff'

const PHASE_COLORS: Record<Phase, string> = {
  Research: '#7B61FF', Ideation: '#FF6B6B', Wireframe: '#FFB347',
  Prototype: '#4ECDC4', Design: '#0D99FF', Review: '#A8E063', Handoff: '#C9A0DC',
}

const PROJECT_PALETTE = [
  '#FF6B6B','#FFB347','#4ECDC4','#0D99FF',
  '#A8E063','#C9A0DC','#7B61FF','#F7DC6F',
]

type Session = {
  id: string
  projectId: string
  phase: Phase
  startedAt: number       // ms timestamp
  endedAt: number | null
  duration: number        // seconds (updated every tick + on stop)
  note: string
  fileId: string
  fileName: string
  idlePaused?: boolean    // true when idle detection has paused accumulation
}

type Project = {
  id: string
  name: string
  color: string           // hex from PROJECT_PALETTE
  createdAt: number
  archived: boolean
}

type AppState = {
  projects: Project[]
  sessions: Session[]
  activeSession: Session | null
  settings: {
    idleThreshold: number   // seconds; default 300 (5 min)
    workDayHours: number    // default 8
  }
}
```

**Storage:** Single `localStorage` key `ux_tracker_state`. `loadState()` returns `defaultState()` if key is absent or parse fails. `saveState()` serializes the full state object.

---

## Timer Engine (`timer.ts`)

- `startSession(projectId, phase)` — stops any active session silently, creates new Session, saves, starts tick, resets idle timer, calls `render()`
- `startTick()` — `setInterval` every 1000ms; if `!idlePaused`, increments `duration = floor((now - startedAt) / 1000)`, saves, calls `updateTimerDisplay()` (cheap DOM update, no full re-render)
- `stopSession(askNote = true)` — clears interval + idle timeout; sets `endedAt`; if `askNote` shows note modal else calls `finalizeSession()`
- `finalizeSession(note)` — sets note, pushes to `sessions[]`, clears `activeSession`, saves, calls `render()`

**Idle interaction with tick:** The tick checks `state.activeSession?.idlePaused`. When `true`, it skips duration increment (clock pauses). When `resumeFromIdle()` is called, `idlePaused` is cleared and `startedAt` is adjusted to exclude the idle gap so total duration is accurate.

---

## Idle Detection (`idle.ts`)

- Event listeners on `window`: `mousemove`, `keydown`, `click`, `scroll` (all `passive: true`)
- `onActivity()` — updates `lastActivityAt`, calls `resetIdleTimer()`, auto-resumes if `idlePaused`
- `resetIdleTimer()` — clears existing timeout, sets new `setTimeout(onIdle, threshold * 1000)`
- `onIdle()` — sets `activeSession.idlePaused = true`, saves state, calls `showIdleBanner()`
- `resumeFromIdle()` — clears `idlePaused`, adjusts session `startedAt` to compensate for idle gap, hides banner, saves

---

## Render Layer (`render.ts`)

**Two render paths:**
- `render()` — full re-render on view/state change. Called after start/stop/finalize, view switch, project create/delete, settings change.
- `updateTimerDisplay()` — updates only the timer `HH:MM:SS` text node. Called every tick. No DOM reconstruction.

**Views (controlled by `currentView` in `ui.ts`):**

### Timer View (default)
- Project dropdown (lists non-archived projects)
- Phase dropdown (7 options, colored badge preview)
- Timer display: `HH:MM:SS` in tabular-nums, phase name below
- Start / Stop buttons (Stop disabled when no active session)
- Today's breakdown: phase name + duration + progress bar + % for each phase with sessions today
- Idle banner (conditionally rendered above buttons)

### Report View
- Week navigation: `◀ Semaine préc.` / `Semaine suiv. ▶` + week label
- Project filter badge at top: shows "All projects" or selected project name (set from Projects view)
- Total week time
- Phase bars: colored fill, phase name, duration, %
- Day bars: Mon–Fri, proportional width
- Scrollable session list (newest first), each card shows date/time, phase badge, duration, note
- Export CSV + Export PDF buttons (operate on current week + project filter)

### Projects View
- List items: color dot, project name, total time, "actif" badge if it has an active session
- Click on project → sets `reportProjectFilter` to project ID, navigates to Report view
- Archived projects shown greyed at bottom with archive indicator
- "+ Nouveau" button → expands inline form: text input for name, color swatches (8 palette colors), "Créer" button

### Settings View
- Idle timeout: dropdown [2 min / 5 min / 10 min / 15 min / 30 min]
- Work day hours: dropdown [6h / 7h / 8h / 9h / 10h]
- "Effacer toutes les données": shows inline confirmation ("Confirmer la suppression ?") before wiping localStorage

### Note Modal
- Overlays the timer view (dim background)
- Textarea for note (optional)
- "Enregistrer" button → `finalizeSession(note.value)`
- "Ignorer" button → `finalizeSession('')`

### Idle Banner
- Shown when `activeSession?.idlePaused === true`
- Text: "Idle détecté — session en pause"
- "Reprendre" button → `resumeFromIdle()`

---

## Navigation

4 tab icons at bottom: `⏱` Timer · `📊` Rapport · `📁` Projets · `⚙` Réglages

`currentView` variable in `ui.ts`. Navigating to Report from Projects carries the project filter.

---

## Report Logic

```typescript
// Week boundaries (Monday 00:00 → Sunday 23:59:59)
function getWeekSessions(weekOffset: number, projectId: 'all' | string): Session[]

// Phase totals
function groupByPhase(sessions: Session[]): Record<Phase, number>  // Phase → seconds

// Day totals
function groupByDay(sessions: Session[]): Record<string, number>   // 'YYYY-MM-DD' → seconds

// Project estimation (shown in Projects view, per project)
function estimateProject(projectId: string): { totalTime: number; avgWeeklyTime: number; estimatedDaysLeft: number }
```

---

## Export

### CSV (`export.ts`)
- BOM prefix (`\uFEFF`) for Excel compatibility
- Headers: `Date,Projet,Phase,Durée (min),Note,Fichier`
- Rows: one per session in current report filter
- Filename: `tracker-<week-label>.csv`

### PDF (`export.ts`)
- Uses `window.jspdf.jsPDF` — loaded via CDN `<script>` tag in `index.html` before `{{SCRIPT}}`
- Dark background `#1e1e1e`, light text
- Header: "Rapport UX/UI — Semaine XX · Mois"
- Phase bars in phase colors, proportional to max phase
- Session list: max 20 entries, stops before page overflow (y > 270mm)
- Filename: `tracker-<week-label>.pdf`

---

## Build System

`build.js` (Node.js, no extra deps):
1. esbuild `src/ui/ui.ts` → IIFE bundle in memory (`write: false`)
2. Read `src/ui/styles.css` + `src/ui/index.html`
3. Replace `{{STYLES}}` → CSS, `{{SCRIPT}}` → JS bundle
4. Write `dist/ui.html`
5. esbuild `src/code.ts` → `dist/code.js`

`package.json` devDependencies: `@figma/plugin-typings`, `esbuild`, `typescript` — no `concurrently`. Scripts: `build`, `watch`, `typecheck`.

---

## Sandbox (`code.ts`)

Minimal — exactly as spec:
```typescript
figma.showUI(__html__, { width: 400, height: 580, title: 'Project Tracker' })
figma.ui.postMessage({ type: 'INIT', fileId: figma.fileKey ?? 'local', fileName: figma.root.name })
figma.ui.onmessage = (msg) => { if (msg.type === 'CLOSE') figma.closePlugin() }
```

---

## Delivery Checklist

- [ ] Timer starts/stops, persists across plugin close/reopen (localStorage)
- [ ] Idle detection: banner shown, clock pauses, auto-resumes on activity
- [ ] Weekly report: prev/next week navigation correct
- [ ] Report filters by project when navigating from Projects view
- [ ] CSV: downloadable, Excel-compatible (BOM)
- [ ] PDF: dark theme, readable, max 20 sessions
- [ ] Project estimation shown in per-project report
- [ ] New project: name + color picker from 8-color palette
- [ ] Note modal after stopping session
- [ ] Settings: idle timeout and work day hours persist
- [ ] Zero npm dependencies except devDeps; jsPDF via CDN only
