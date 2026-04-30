// UI entry point — owns all mutable UI state, wires callbacks, handles postMessage.

import {
  AppSettings,
  AppState,
  Phase,
  PROJECT_PALETTE,
  Project,
  ViewName,
} from './types';
import { defaultState, loadState, saveState, clearState } from './storage';
import {
  finalizeSession,
  hasActiveTick,
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
  getProjectName as getProjectNameHelper,
  getWeekLabel,
  getWeekSessions,
} from './helpers';
import { Lang, setLang } from './i18n';

// ================================================================
// MUTABLE STATE
// ================================================================

let state: AppState = loadState();

let currentView: ViewName = 'timer';
let weekOffset = 0;
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

// ================================================================
// HELPERS
// ================================================================

function getProjectName(id: string): string {
  return getProjectNameHelper(state, id);
}

function getCurrentRenderState(): RenderState {
  return {
    view: currentView,
    weekOffset,
    reportProjectFilter,
    selectedProjectId,
    selectedPhase,
    showNoteModal,
    showNewProjectForm,
    newProjectColor,
    confirmingClear,
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
    stopSession(state, true, timerCallbacks);
    clearIdleTimer();
  },

  onWeekPrev() {
    weekOffset -= 1;
    doRender();
  },

  onWeekNext() {
    if (weekOffset < 0) {
      weekOffset += 1;
      doRender();
    }
  },

  onClearFilter() {
    reportProjectFilter = 'all';
    doRender();
  },

  onProjectClick(projectId: string) {
    reportProjectFilter = projectId;
    currentView = 'report';
    weekOffset = 0;
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
    state = defaultState();
    selectedProjectId = '';
    selectedPhase = 'Design';
    currentView = 'timer';
    weekOffset = 0;
    reportProjectFilter = 'all';
    showNoteModal = false;
    showNewProjectForm = false;
    confirmingClear = false;
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
    const sessions = getWeekSessions(state, weekOffset, reportProjectFilter);
    const label = getWeekLabel(weekOffset);
    exportCSV(sessions, getProjectName, label);
  },

  onExportPDF() {
    const sessions = getWeekSessions(state, weekOffset, reportProjectFilter);
    const label = getWeekLabel(weekOffset);
    exportPDF(sessions, label, getProjectName);
  },

  onViewChange(view: ViewName) {
    currentView = view;
    if (view !== 'report') {
      // Keep filter sticky, but reset week to current when leaving
      weekOffset = 0;
    }
    confirmingClear = false;
    showNewProjectForm = false;
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
    doRender();
  },

  onNewProjectColorChange(color: string) {
    newProjectColor = color;
  },

  onLangChange(lang: Lang) {
    setLang(lang);
    state.settings.lang = lang;
    saveState(state);
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

  // Resume tick independently of INIT message — works both in Figma
  // (where INIT arrives instantly) and in isolated preview contexts.
  if (state.activeSession) {
    startTick(state, onTick);
    if (!state.activeSession.idlePaused) {
      resetIdleTimer(state, idleCallbacks.onIdle);
    }
  }

  // Listen for INIT from Figma sandbox — updates file metadata on active session
  window.onmessage = (event: MessageEvent) => {
    const msg = event.data?.pluginMessage;
    if (!msg) return;
    if (msg.type === 'INIT') {
      currentFileId = msg.fileId ?? 'local';
      currentFileName = msg.fileName ?? 'Untitled';
      // If a session is running, update its file metadata
      if (state.activeSession) {
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
