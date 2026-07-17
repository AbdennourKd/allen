// UI entry point. Owns all mutable UI state, wires callbacks, handles postMessage.

import {
  AppSettings,
  AppState,
  Granularity,
  Phase,
  PROJECT_PALETTE,
  Project,
  ViewName,
} from './types';
import { defaultState, loadState, parseState, saveState, clearState } from './storage';
import {
  finalizeSession,
  hasActiveTick,
  pauseSessionManually,
  resumeSessionManually,
  startSession,
  startTick,
  stopSession,
  stopTick,
  TimerCallbacks,
} from './timer';
import {
  clearIdleTimer,
  initIdleListeners,
  resetIdleTimer,
  resumeFromIdle,
} from './idle';
import {
  Callbacks,
  render,
  RenderState,
  updateTimerDisplay,
} from './render';
import { exportCSV, exportPDF } from './export';
import {
  generateId,
  getPeriodRange,
  getPeriodSessions,
  getProjectName as getProjectNameHelper,
  getSessionsInDateRange,
  matchProjectByFileName,
} from './helpers';
import { Lang, setLang } from './i18n';

// ================================================================
// MUTABLE STATE
// ================================================================

let state: AppState = loadState();

let currentView: ViewName = 'timer';
let periodOffset = 0;
let granularity: Granularity = 'week';
let reportProjectFilter: string = 'all';
let currentFileId = 'local';
let currentFileName = 'Untitled';

let selectedProjectId: string =
  state.activeSession?.projectId ??
  state.projects.find((p) => !p.archived)?.id ??
  '';
let selectedPhase: Phase = state.activeSession?.phase ?? 'Design';

let showNoteModal = false;
let showNewProjectForm = false;
let newProjectColor: string = PROJECT_PALETTE[0];
let confirmingClear = false;
let isMinimized = false;
let showNewPhaseForm = false;
let editingSessionId: string | null = null;
let editingProjectId: string | null = null;
let editProjectColor: string = PROJECT_PALETTE[0];
let showCustomExport = false;
let customExportFrom = '';
let customExportTo = '';

function postToSandbox(msg: { type: string; mode?: string }): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

// ================================================================
// HELPERS
// ================================================================

function getProjectName(id: string): string {
  return getProjectNameHelper(state, id);
}

function getCurrentRenderState(): RenderState {
  return {
    view: currentView,
    periodOffset,
    granularity,
    reportProjectFilter,
    selectedProjectId,
    selectedPhase,
    showNoteModal,
    showNewProjectForm,
    newProjectColor,
    confirmingClear,
    isMinimized,
    showNewPhaseForm,
    editingSessionId,
    editingProjectId,
    editProjectColor,
    showCustomExport,
    customExportFrom,
    customExportTo,
  };
}

// Coalesce multiple doRender() calls in the same frame into a single
// innerHTML rebuild. Several callbacks (e.g. resume-from-idle) chain into
// 2–3 renders synchronously; without this they all run.
let renderRAF: number | null = null;
function doRender(): void {
  if (renderRAF !== null) return;
  renderRAF = requestAnimationFrame(() => {
    renderRAF = null;
    render(state, getCurrentRenderState(), callbacks);
  });
}

function onTick(): void {
  updateTimerDisplay(state);
}

// Timer callbacks used by timer.ts
const timerCallbacks: TimerCallbacks = {
  onTick,
  onRender: doRender,
  onShowNoteModal: (_session) => {
    showNoteModal = true;
    doRender();
  },
};

// Idle callbacks used by idle.ts
const idleCallbacks = {
  onIdle: () => {
    doRender();
  },
  onResume: () => {
    doRender();
  },
};

// ================================================================
// CALLBACKS (passed to render)
// ================================================================

const callbacks: Callbacks = {
  onStart() {
    if (!selectedProjectId) return;
    // Remember which project the user picked for this file so we can
    // pre-select it next time they open the plugin in the same file.
    state.fileProjectMap[currentFileId] = selectedProjectId;
    startSession(
      state,
      selectedProjectId,
      selectedPhase,
      currentFileId,
      currentFileName,
      timerCallbacks
    );
    resetIdleTimer(state, idleCallbacks.onIdle);
  },

  onStop() {
    // In mini mode the note modal would be invisible (mini bar replaces
    // the full UI). The user minimized to stay focused, so skip the note
    // and just finalize. They can still add notes when stopping from
    // the full UI.
    stopSession(state, !isMinimized, timerCallbacks);
    clearIdleTimer();
  },

  onPause() {
    pauseSessionManually(state, doRender);
  },

  onResumePause() {
    resumeSessionManually(state, doRender);
    // Idle detection should only resume once the user is actually back.
    resetIdleTimer(state, idleCallbacks.onIdle);
  },

  onPeriodPrev() {
    periodOffset -= 1;
    doRender();
  },

  onPeriodNext() {
    if (periodOffset < 0) {
      periodOffset += 1;
      doRender();
    }
  },

  onGranularityChange(g) {
    granularity = g;
    periodOffset = 0;
    doRender();
  },

  onClearFilter() {
    reportProjectFilter = 'all';
    doRender();
  },

  onProjectClick(projectId: string) {
    reportProjectFilter = projectId;
    currentView = 'report';
    periodOffset = 0;
    doRender();
  },

  onNewProject(name: string, color: string) {
    const project: Project = {
      id: generateId(),
      name,
      color,
      createdAt: Date.now(),
      archived: false,
    };
    state.projects.push(project);
    saveState(state);
    showNewProjectForm = false;
    newProjectColor = PROJECT_PALETTE[0];
    if (!selectedProjectId) selectedProjectId = project.id;
    doRender();
  },

  onToggleEditProject(projectId: string) {
    if (editingProjectId === projectId) {
      editingProjectId = null;
    } else {
      editingProjectId = projectId;
      editProjectColor = state.projects.find((p) => p.id === projectId)?.color ?? PROJECT_PALETTE[0];
      showNewProjectForm = false;
    }
    doRender();
  },

  onEditProjectColorChange(color: string) {
    editProjectColor = color;
  },

  onSaveProjectEdit(projectId: string, name: string, color: string) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    const trimmed = name.trim();
    if (trimmed) project.name = trimmed;
    project.color = color;
    saveState(state);
    editingProjectId = null;
    doRender();
  },

  onArchiveProject(projectId: string) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    project.archived = !project.archived;
    saveState(state);
    // If the active selection was archived, clear it
    if (
      selectedProjectId === projectId &&
      project.archived
    ) {
      selectedProjectId =
        state.projects.find((p) => !p.archived)?.id ?? '';
    }
    doRender();
  },

  onSaveSettings(settings: AppSettings) {
    state.settings = settings;
    saveState(state);
    if (state.activeSession) {
      resetIdleTimer(state, idleCallbacks.onIdle);
    }
  },

  onConfirmClear() {
    confirmingClear = true;
    doRender();
  },

  onCancelClear() {
    confirmingClear = false;
    doRender();
  },

  onClearData() {
    stopTick();
    clearIdleTimer();
    clearState();
    postToSandbox({ type: 'CLEAR_STORAGE' });
    state = defaultState();
    selectedProjectId = '';
    selectedPhase = 'Design';
    currentView = 'timer';
    periodOffset = 0;
    reportProjectFilter = 'all';
    showNoteModal = false;
    showNewProjectForm = false;
    confirmingClear = false;
    editingProjectId = null;
    editingSessionId = null;
    showCustomExport = false;
    doRender();
  },

  onNoteSubmit(note: string) {
    finalizeSession(state, note, () => {
      showNoteModal = false;
      doRender();
    });
  },

  onNoteSkip() {
    finalizeSession(state, '', () => {
      showNoteModal = false;
      doRender();
    });
  },

  onResumeIdle() {
    resumeFromIdle(state, idleCallbacks.onResume);
    resetIdleTimer(state, idleCallbacks.onIdle);
    // Resume tick if it was stopped
    if (!hasActiveTick()) {
      startTick(state, onTick);
    }
  },

  onExportCSV() {
    const sessions = getPeriodSessions(state, granularity, periodOffset, reportProjectFilter);
    const label = getPeriodRange(granularity, periodOffset).label;
    exportCSV(sessions, getProjectName, label);
  },

  onExportPDF() {
    const sessions = getPeriodSessions(state, granularity, periodOffset, reportProjectFilter);
    const label = getPeriodRange(granularity, periodOffset).label;
    exportPDF(sessions, label, getProjectName);
  },

  onToggleCustomExport() {
    showCustomExport = !showCustomExport;
    doRender();
  },

  onCustomExportFromChange(v: string) {
    customExportFrom = v;
  },

  onCustomExportToChange(v: string) {
    customExportTo = v;
  },

  onCustomExportCSV() {
    if (!customExportFrom || !customExportTo) return;
    const sessions = getSessionsInDateRange(state, customExportFrom, customExportTo, reportProjectFilter);
    exportCSV(sessions, getProjectName, `${customExportFrom}_${customExportTo}`);
  },

  onCustomExportPDF() {
    if (!customExportFrom || !customExportTo) return;
    const sessions = getSessionsInDateRange(state, customExportFrom, customExportTo, reportProjectFilter);
    exportPDF(sessions, `${customExportFrom} → ${customExportTo}`, getProjectName);
  },

  onEditSessionOpen(id: string) {
    editingSessionId = id;
    doRender();
  },

  onEditSessionCancel() {
    editingSessionId = null;
    doRender();
  },

  onEditSessionSave(id: string, updates: { phase: string; durationMinutes: number; note: string }) {
    const session = state.sessions.find((s) => s.id === id);
    if (!session) return;
    session.phase = updates.phase;
    session.duration = Math.max(0, Math.round(updates.durationMinutes * 60));
    session.note = updates.note;
    saveState(state);
    editingSessionId = null;
    doRender();
  },

  onEditSessionDelete(id: string) {
    state.sessions = state.sessions.filter((s) => s.id !== id);
    saveState(state);
    editingSessionId = null;
    doRender();
  },

  onViewChange(view: ViewName) {
    currentView = view;
    if (view !== 'report') {
      // Keep filter sticky, but reset period to current when leaving
      periodOffset = 0;
    }
    confirmingClear = false;
    showNewProjectForm = false;
    showNewPhaseForm = false;
    editingProjectId = null;
    editingSessionId = null;
    showCustomExport = false;
    doRender();
  },

  onPhaseChange(phase: Phase) {
    selectedPhase = phase;
  },

  onProjectSelectChange(projectId: string) {
    selectedProjectId = projectId;
  },

  onToggleNewProjectForm() {
    showNewProjectForm = !showNewProjectForm;
    newProjectColor = PROJECT_PALETTE[0];
    editingProjectId = null;
    doRender();
  },

  onNewProjectColorChange(color: string) {
    newProjectColor = color;
  },

  onToggleNewPhaseForm() {
    showNewPhaseForm = !showNewPhaseForm;
    doRender();
  },

  onCreatePhase(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = [...state.customPhases].some(
      (p) => p.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      state.customPhases.push(trimmed);
      saveState(state);
    }
    selectedPhase = trimmed;
    showNewPhaseForm = false;
    doRender();
  },

  onDeletePhase(name: string) {
    state.customPhases = state.customPhases.filter(
      (p) => p.toLowerCase() !== name.toLowerCase()
    );
    saveState(state);
    // If the deleted phase was selected and no session is running, fall back
    // to the first built-in default so the select never points at nothing.
    if (!state.activeSession && selectedPhase.toLowerCase() === name.toLowerCase()) {
      selectedPhase = 'Design';
    }
    doRender();
  },

  onUserNameChange(name: string) {
    state.settings.userName = name.trim();
    saveState(state);
  },

  onLangChange(lang: Lang) {
    setLang(lang);
    state.settings.lang = lang;
    saveState(state);
    doRender();
  },

  onToggleMinimize() {
    isMinimized = !isMinimized;
    postToSandbox({ type: 'RESIZE', mode: isMinimized ? 'mini' : 'full' });
    doRender();
  },
};

// ================================================================
// INITIALIZATION
// ================================================================

function init() {
  // Restore saved language
  setLang((state.settings.lang || 'fr') as Lang);

  // Attach idle listeners immediately. Pass a getter so listeners always
  // see the current `state` reference (it is rebound on Clear Data).
  initIdleListeners(() => state, idleCallbacks);

  // Resume tick independently of INIT message. Works both in Figma
  // (where INIT arrives instantly) and in isolated preview contexts.
  if (state.activeSession) {
    startTick(state, onTick);
    if (!state.activeSession.idlePaused && !state.activeSession.manualPaused) {
      resetIdleTimer(state, idleCallbacks.onIdle);
    }
  }

  // Pause the tick when the document is hidden (e.g. user switched to another
  // tab or another Figma file). Duration is recomputed from startedAt on
  // resume, so the timer jumps to the correct value with no drift.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTick();
    } else if (
      state.activeSession &&
      !state.activeSession.idlePaused &&
      !state.activeSession.manualPaused
    ) {
      // Recompute and repaint immediately, then restart the per-second tick.
      state.activeSession.duration = Math.max(
        0,
        Math.floor((Date.now() - state.activeSession.startedAt) / 1000)
      );
      onTick();
      startTick(state, onTick);
    }
  });

  // Keyboard shortcuts: S start, P pause/resume, E end (stop). Ignored while
  // typing in a field or with a modifier held (avoid clobbering OS/browser shortcuts).
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (showNoteModal || editingSessionId) return;

    const key = e.key.toLowerCase();
    if (key === 's') {
      if (!state.activeSession) callbacks.onStart();
    } else if (key === 'e') {
      if (state.activeSession) callbacks.onStop();
    } else if (key === 'p') {
      if (state.activeSession?.manualPaused) callbacks.onResumePause();
      else if (state.activeSession && !state.activeSession.idlePaused) callbacks.onPause();
    }
  });

  // Listen for INIT from Figma sandbox. Updates file metadata on active session
  window.onmessage = (event: MessageEvent) => {
    const msg = event.data?.pluginMessage;
    if (!msg) return;
    if (msg.type === 'INIT') {
      currentFileId = msg.fileId ?? 'local';
      currentFileName = msg.fileName ?? 'Untitled';
      // clientStorage is the durable source (survives Figma closing this
      // plugin's iframe to launch another one); localStorage was only a
      // fast synchronous guess at module load. Adopt it now if present.
      if (msg.persistedState) {
        try {
          Object.assign(state, parseState(msg.persistedState));
          selectedProjectId =
            state.activeSession?.projectId ??
            state.projects.find((p) => !p.archived)?.id ??
            selectedProjectId;
          selectedPhase = state.activeSession?.phase ?? selectedPhase;
          if (state.activeSession && !hasActiveTick()) {
            startTick(state, onTick);
          }
        } catch {
          // Corrupt clientStorage payload: keep whatever localStorage gave us.
        }
      }
      // Auto-select the project last tracked in this file. Only override if
      // no session is running and the mapped project still exists and is
      // not archived. Otherwise keep whatever was already selected.
      if (!state.activeSession) {
        const mapped = state.fileProjectMap[currentFileId];
        if (mapped) {
          const project = state.projects.find(
            (p) => p.id === mapped && !p.archived
          );
          if (project) selectedProjectId = mapped;
        } else {
          // Never seen this file before, so try to auto-detect the project
          // from the Figma file name (e.g. file "Sogpred — Landing" matches
          // project "Sogpred").
          const match = matchProjectByFileName(
            state.projects.filter((p) => !p.archived),
            currentFileName
          );
          if (match) {
            selectedProjectId = match.id;
            state.fileProjectMap[currentFileId] = match.id;
            saveState(state);
          }
        }
      } else {
        // Session running, so patch its file metadata in case the user moved
        // to a different file mid-session.
        state.activeSession.fileId = currentFileId;
        state.activeSession.fileName = currentFileName;
        saveState(state);
      }
      doRender();
    }
  };

  // Initial render
  doRender();
}

init();
