# Figma Project Time Tracker — Spec for Claude Code

## Objectif

Plugin Figma de **time tracking UX/UI** : suivi des sessions de travail par phase (Ideation, Research, Wireframe, Prototype, Design, Review, Handoff), avec détection d'idle automatique, rapport hebdomadaire et export PDF/CSV. Tout est stocké en `localStorage`. UI minimaliste, dark theme.

---

## Stack & Contraintes

- **Langage** : TypeScript strict
- **UI** : HTML + CSS vanilla (pas de framework — sandbox Figma)
- **Stockage** : `localStorage` (côté UI iframe)
- **Build** : esbuild, bundle unique
- **Zéro dépendance externe** sauf `jsPDF` (via CDN dans le HTML) pour l'export PDF

---

## Architecture

```
figma-project-tracker/
├── manifest.json
├── src/
│   ├── code.ts          # Sandbox Figma (minimal — idle ping, file info)
│   └── ui/
│       ├── index.html
│       ├── ui.ts        # Toute la logique (state, timer, storage, export)
│       └── styles.css
├── dist/
├── package.json
└── tsconfig.json
```

### manifest.json

```json
{
  "name": "Project Tracker",
  "id": "ux-project-tracker",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "networkAccess": { "allowedDomains": [] }
}
```

---

## Data Model

```typescript
// Une session de travail
type Session = {
  id: string                // uuid v4 simple (Date.now() + random)
  projectId: string
  phase: Phase
  startedAt: number         // timestamp ms
  endedAt: number | null    // null si en cours
  duration: number          // secondes (mis à jour à chaque tick et à la fin)
  note: string              // optionnel, ajouté en fin de session
  fileId: string            // figma.fileKey si disponible
  fileName: string
}

// Un projet
type Project = {
  id: string
  name: string
  color: string             // hex, choisi parmi une palette de 8
  createdAt: number
  archived: boolean
}

// State global stocké dans localStorage
type AppState = {
  projects: Project[]
  sessions: Session[]
  activeSession: Session | null
  settings: {
    idleThreshold: number   // secondes avant détection idle (défaut: 300 = 5min)
    workDayHours: number    // pour estimation (défaut: 8h)
  }
}

type Phase =
  | 'Research'
  | 'Ideation'
  | 'Wireframe'
  | 'Prototype'
  | 'Design'
  | 'Review'
  | 'Handoff'

const PHASE_COLORS: Record<Phase, string> = {
  Research:   '#7B61FF',
  Ideation:   '#FF6B6B',
  Wireframe:  '#FFB347',
  Prototype:  '#4ECDC4',
  Design:     '#0D99FF',
  Review:     '#A8E063',
  Handoff:    '#C9A0DC',
}
```

### localStorage keys

```typescript
const STORAGE_KEY = 'ux_tracker_state'  // tout dans un seul objet JSON
```

---

## code.ts — Sandbox Figma (minimal)

Le sandbox sert uniquement à :
1. Récupérer `figma.fileKey` et `figma.root.name` → envoyer à l'UI au démarrage
2. Recevoir des pings de l'UI pour détecter l'activité Figma (optionnel, idle géré côté UI)
3. Fermer le plugin sur demande

```typescript
figma.showUI(__html__, { width: 400, height: 580, title: 'Project Tracker' })

figma.ui.postMessage({
  type: 'INIT',
  fileId: figma.fileKey ?? 'local',
  fileName: figma.root.name,
})

figma.ui.onmessage = (msg) => {
  if (msg.type === 'CLOSE') figma.closePlugin()
}
```

---

## ui.ts — Logique complète

### State Management

```typescript
// Charger/sauvegarder
function loadState(): AppState { ... }   // JSON.parse(localStorage.getItem(STORAGE_KEY))
function saveState(state: AppState): void { ... }  // localStorage.setItem(...)

// State en mémoire (source of vérité)
let state: AppState = loadState()
```

### Timer Engine

```typescript
let tickInterval: number | null = null
let idleTimeout: number | null = null
let lastActivityAt: number = Date.now()

// Démarrer une session
function startSession(projectId: string, phase: Phase): void {
  // Stopper session active si existante
  if (state.activeSession) stopSession(false)

  state.activeSession = {
    id: generateId(),
    projectId,
    phase,
    startedAt: Date.now(),
    endedAt: null,
    duration: 0,
    note: '',
    fileId: currentFileId,
    fileName: currentFileName,
  }
  saveState(state)
  startTick()
  resetIdleTimer()
  render()
}

// Tick toutes les secondes
function startTick(): void {
  tickInterval = window.setInterval(() => {
    if (!state.activeSession) return
    state.activeSession.duration = Math.floor((Date.now() - state.activeSession.startedAt) / 1000)
    saveState(state)
    updateTimerDisplay()  // mise à jour UI légère (pas re-render complet)
  }, 1000)
}

// Stopper une session
function stopSession(askNote: boolean = true): void {
  if (!state.activeSession) return
  clearInterval(tickInterval!)
  clearTimeout(idleTimeout!)

  state.activeSession.endedAt = Date.now()
  state.activeSession.duration = Math.floor((state.activeSession.endedAt - state.activeSession.startedAt) / 1000)

  if (askNote) showNoteModal(state.activeSession)  // modal inline pour ajouter une note
  else finalizeSession()
}

function finalizeSession(note: string = ''): void {
  if (!state.activeSession) return
  state.activeSession.note = note
  state.sessions.push({ ...state.activeSession })
  state.activeSession = null
  saveState(state)
  render()
}
```

### Idle Detection

```typescript
// Écouter les interactions dans l'UI iframe
['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
  window.addEventListener(event, onActivity, { passive: true })
})

function onActivity(): void {
  lastActivityAt = Date.now()
  resetIdleTimer()
  // Si session en pause idle → reprendre automatiquement
  if (state.activeSession?.idlePaused) resumeFromIdle()
}

function resetIdleTimer(): void {
  clearTimeout(idleTimeout!)
  const threshold = state.settings.idleThreshold * 1000
  idleTimeout = window.setTimeout(onIdle, threshold)
}

function onIdle(): void {
  if (!state.activeSession) return
  // Mettre la session en pause idle (ne pas stopper)
  state.activeSession.idlePaused = true
  // Afficher banner "Idle détecté — session en pause"
  showIdleBanner()
}
```

> Ajouter `idlePaused?: boolean` au type `Session`.

---

## UI — Vues

### Vue 1 : Timer (vue principale)

```
┌──────────────────────────────────────┐
│  Project Tracker            [⚙] [×] │
├──────────────────────────────────────┤
│  Projet :  [Dropdown projet    ▾]    │
│  Phase  :  [Design             ▾]    │
│                                      │
│         ┌──────────────────┐         │
│         │   02 : 34 : 17   │  ← timer│
│         │   Inter Medium   │  (phase)│
│         └──────────────────┘         │
│                                      │
│  [  ▶ Start  ]    [  ■ Stop  ]       │
│                                      │
│  ── Aujourd'hui ──────────────────   │
│  Design     1h 22m  ████████░░ 68%  │
│  Research     34m   ████░░░░░░ 28%  │
│  Review        5m   ░░░░░░░░░░  4%  │
│                                      │
│  Total : 2h 01m                      │
└──────────────────────────────────────┘
```

### Vue 2 : Rapport hebdo

```
┌──────────────────────────────────────┐
│  ← Rapport    Semaine 28 · Juillet   │
├──────────────────────────────────────┤
│  [◀ Semaine préc.]  [Semaine suiv. ▶]│
│                                      │
│  Total semaine : 18h 42m             │
│  Estimation projet : ~23 jours       │
│                                      │
│  Par phase :                         │
│  ██████████ Design      8h 12m  44% │
│  ██████░░░░ Wireframe   4h 30m  24% │
│  ████░░░░░░ Research    3h 10m  17% │
│  ██░░░░░░░░ Prototype   1h 45m   9% │
│  █░░░░░░░░░ Review        45m   4%  │
│  ░░░░░░░░░░ Handoff        20m   2% │
│                                      │
│  Par jour :                          │
│  Lu  ████████████ 4h20              │
│  Ma  ████████     3h10              │
│  Me  ██████████   3h45              │
│  Je  ███████      2h50              │
│  Ve  ████████████ 4h37              │
│                                      │
│  Sessions (15)                       │
│  ┌─────────────────────────────────┐ │
│  │ Lun 14:32  Design  1h 12m      │ │
│  │ "Refonte dashboard composants"  │ │
│  └─────────────────────────────────┘ │
│                                      │
│  [Export CSV]      [Export PDF]      │
└──────────────────────────────────────┘
```

### Vue 3 : Projets

```
┌──────────────────────────────────────┐
│  ← Projets              [+ Nouveau] │
├──────────────────────────────────────┤
│  ● App Mobile          12h 34m  actif│
│  ● Dashboard B2B        8h 10m       │
│  ● Design System        34h 00m      │
│  ○ Landing Page [arch]  5h 20m       │
└──────────────────────────────────────┘
```

### Vue 4 : Settings

```
┌──────────────────────────────────────┐
│  ← Paramètres                        │
├──────────────────────────────────────┤
│  Idle timeout    [5 min        ▾]    │
│  Journée type    [8h           ▾]    │
│  Semaine type    [5 jours      ▾]    │
│                                      │
│  [Effacer toutes les données]        │
└──────────────────────────────────────┘
```

---

## Logique Rapport & Estimation

### Calcul rapport hebdo

```typescript
function getWeekSessions(weekOffset: number = 0): Session[] {
  const now = new Date()
  const monday = startOfWeek(now, weekOffset)  // lundi 00:00:00
  const sunday = endOfWeek(monday)              // dimanche 23:59:59
  return state.sessions.filter(s =>
    s.startedAt >= monday.getTime() && s.startedAt <= sunday.getTime()
  )
}

function groupByPhase(sessions: Session[]): Record<Phase, number> { ... }
function groupByDay(sessions: Session[]): Record<string, number> { ... }  // 'YYYY-MM-DD' → secondes
```

### Estimation projet

```typescript
// Logique : basé sur le total du projet (toutes semaines confondues)
// + vitesse moyenne hebdo pour projeter la fin
function estimateProject(projectId: string): {
  totalTime: number       // secondes
  avgWeeklyTime: number   // secondes par semaine
  estimatedDaysLeft: number
} {
  const sessions = state.sessions.filter(s => s.projectId === projectId)
  const totalTime = sessions.reduce((acc, s) => acc + s.duration, 0)

  // Semaines actives (semaines avec au moins 1 session)
  const weeks = new Set(sessions.map(s => getWeekKey(s.startedAt)))
  const avgWeeklyTime = totalTime / Math.max(weeks.size, 1)

  // Estimation : si l'utilisateur renseigne une cible (ex: 40h)
  // sinon afficher juste le rythme : "X h/semaine au rythme actuel"
  const workDaySeconds = state.settings.workDayHours * 3600
  const estimatedDaysLeft = avgWeeklyTime > 0
    ? Math.ceil((totalTime / avgWeeklyTime) * 5)  // projection sur 5j/semaine
    : 0

  return { totalTime, avgWeeklyTime, estimatedDaysLeft }
}
```

---

## Export CSV

```typescript
function exportCSV(sessions: Session[]): void {
  const headers = ['Date', 'Projet', 'Phase', 'Durée (min)', 'Note', 'Fichier']
  const rows = sessions.map(s => [
    new Date(s.startedAt).toLocaleDateString('fr-FR'),
    getProjectName(s.projectId),
    s.phase,
    Math.round(s.duration / 60),
    `"${s.note.replace(/"/g, '""')}"`,
    s.fileName,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  downloadFile(`tracker-${getWeekLabel()}.csv`, 'text/csv', csv)
}
```

## Export PDF

Utiliser **jsPDF** via CDN dans `index.html` :
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

```typescript
function exportPDF(weekSessions: Session[], weekLabel: string): void {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(30, 30, 30)
  doc.rect(0, 0, 210, 297, 'F')
  doc.setTextColor(232, 232, 232)
  doc.setFontSize(18)
  doc.text(`Rapport UX/UI — ${weekLabel}`, 20, 25)

  // Total
  const total = weekSessions.reduce((a, s) => a + s.duration, 0)
  doc.setFontSize(12)
  doc.text(`Total : ${formatDuration(total)}`, 20, 38)

  // Barres par phase
  let y = 55
  const byPhase = groupByPhase(weekSessions)
  const maxVal = Math.max(...Object.values(byPhase))
  for (const [phase, seconds] of Object.entries(byPhase)) {
    const pct = seconds / maxVal
    const color = hexToRGB(PHASE_COLORS[phase as Phase])
    doc.setFillColor(color.r, color.g, color.b)
    doc.rect(20, y, pct * 120, 6, 'F')
    doc.setTextColor(200, 200, 200)
    doc.text(`${phase}  ${formatDuration(seconds)}`, 148, y + 5)
    y += 12
  }

  // Liste des sessions
  y += 10
  doc.setFontSize(10)
  doc.setTextColor(180, 180, 180)
  doc.text('Sessions', 20, y); y += 8
  for (const s of weekSessions.slice(0, 20)) {  // max 20 pour éviter overflow
    const line = `${formatDate(s.startedAt)}  ${s.phase}  ${formatDuration(s.duration)}  ${s.note}`
    doc.text(line.substring(0, 90), 20, y)
    y += 6
    if (y > 270) break
  }

  doc.save(`tracker-${weekLabel}.pdf`)
}
```

---

## Design System (CSS)

```css
:root {
  --bg: #1e1e1e;
  --surface: #2c2c2c;
  --surface-2: #353535;
  --border: #3a3a3a;
  --text-primary: #e8e8e8;
  --text-secondary: #888;
  --text-muted: #555;
  --accent: #0d99ff;
  --danger: #f24822;
  --success: #14ae5c;
  --warning: #ffb347;
  --radius: 6px;
  --radius-lg: 10px;
  --font: 'Inter', system-ui, sans-serif;
  --timer-size: 2.8rem;
}

/* Timer display */
.timer-display {
  font-size: var(--timer-size);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

/* Phase badge */
.phase-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

/* Barre de progression phase */
.phase-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--surface-2);
  overflow: hidden;
}
.phase-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Idle banner */
.idle-banner {
  background: #332a00;
  border: 1px solid var(--warning);
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 12px;
  color: var(--warning);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Navigation tabs */
.nav-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}
.nav-tab {
  flex: 1;
  padding: 10px;
  text-align: center;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.nav-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
```

---

## Helpers utilitaires

```typescript
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

function getWeekKey(timestamp: number): string {
  const d = new Date(timestamp)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

function startOfWeek(date: Date, offsetWeeks: number = 0): Date {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function downloadFile(name: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
```

---

## Navigation

4 onglets en bas (icônes uniquement, tooltip au hover) :
- `⏱` Timer (vue principale)
- `📊` Rapport
- `📁` Projets
- `⚙` Réglages

Navigation gérée via un `currentView` dans le state UI (pas de routing).

---

## Build

### package.json
```json
{
  "scripts": {
    "build": "esbuild src/code.ts --bundle --outfile=dist/code.js && node scripts/build-ui.js",
    "watch": "concurrently \"esbuild src/code.ts --bundle --watch --outfile=dist/code.js\" \"node scripts/build-ui.js --watch\"",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.x",
    "esbuild": "^0.x",
    "typescript": "^5.x",
    "concurrently": "^8.x"
  }
}
```

`build-ui.js` : compile `ui.ts` → inline dans `index.html` (remplacer `<script src="ui.js">` par le bundle inliné).

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["es2017", "dom"],
    "strict": true,
    "moduleResolution": "node",
    "typeRoots": ["./node_modules/@figma/plugin-typings"]
  },
  "include": ["src/**/*.ts"]
}
```

---

## Checklist de livraison

- [ ] Timer démarre/stoppe correctement, persiste si plugin fermé (localStorage)
- [ ] Idle détecté après N minutes → banner → reprise auto à l'activité
- [ ] Rapport hebdo correct (navigation semaine précédente/suivante)
- [ ] Export CSV téléchargeable et lisible dans Excel
- [ ] Export PDF lisible, dark theme, max 20 sessions listées
- [ ] Estimation projet calculée et affichée dans Vue Projets
- [ ] Nouveau projet créable avec nom + couleur
- [ ] Note ajoutée à la fin de chaque session (modal inline)
- [ ] Aucune dépendance externe sauf jsPDF (CDN)

---

## Notes pour Claude Code

1. **Tout le state** vit dans `localStorage` — pas de communication sandbox→UI pour les données
2. **Le sandbox `code.ts` est volontairement minimal** — juste `INIT` + `CLOSE`
3. **jsPDF** : charger via CDN dans `index.html`, pas via npm (évite les problèmes de bundling dans le sandbox)
4. **Re-render** : ne jamais tout re-rendre à chaque seconde — seulement `updateTimerDisplay()` sur le tick, `render()` complet uniquement sur changement de vue ou d'état
5. **Démarrer par** : types → storage → timer engine → render → export
