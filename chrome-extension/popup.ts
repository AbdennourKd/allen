// Adapted entry point for Chrome Extension popup
import {
  AppSettings,
  AppState,
  Phase,
  PROJECT_PALETTE,
  Project,
  ViewName,
} from './types';
import { defaultState, loadState, saveState, clearState } from './storage-chrome';
import {
  Callbacks,
  render,
  RenderState,
  updateTimerDisplay,
} from './render';
import { exportCSV, exportPDF } from './export-chrome';
import {
  generateId,
  getProjectName as getProjectNameHelper,
  getWeekLabel,
  getWeekSessions,
  formatTime,
} from './helpers';

let state: AppState = defaultState(); // will be loaded async

let currentView: ViewName = 'timer';
let weekOffset = 0;
let reportProjectFilter = 'all';
let selectedProjectId = '';
let selectedPhase: Phase = 'Design';
let showNoteModal = false;
let showNewProjectForm = false;
let newProjectColor: string = PROJECT_PALETTE[0];
let confirmingClear = false;

let tickInterval: ReturnType<typeof setInterval> | null = null;

function getProjectName(id: string): string {
  return getProjectNameHelper(state, id);
}

function getCurrentRenderState(): RenderState {
  return {
    view: currentView, weekOffset, reportProjectFilter,
    selectedProjectId, selectedPhase, showNoteModal,
    showNewProjectForm, newProjectColor, confirmingClear,
  };
}

function doRender(): void {
  render(state, getCurrentRenderState(), callbacks);
}

function startLocalTick(): void {
  stopLocalTick();
  tickInterval = setInterval(() => {
    if (state.activeSession && !state.activeSession.idlePaused) {
      state.activeSession.duration = Math.floor(
        (Date.now() - state.activeSession.startedAt) / 1000
      );
      updateTimerDisplay(state);
    }
  }, 1000);
}

function stopLocalTick(): void {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

const callbacks: Callbacks = {
  onStart() {
    if (!selectedProjectId) return;
    const session = {
      id: generateId(),
      projectId: selectedProjectId,
      phase: selectedPhase,
      startedAt: Date.now(),
      endedAt: 0,
      duration: 0,
      note: '',
      fileId: 'browser',
      fileName: document.title || 'Browser',
    };
    state.activeSession = session;
    saveState(state);
    chrome.runtime.sendMessage({
      type: 'START_TIMER',
      idleThreshold: state.settings.idleThreshold,
    });
    startLocalTick();
    doRender();
  },

  onStop() {
    if (!state.activeSession) return;
    showNoteModal = true;
    stopLocalTick();
    chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
    // Finalize duration
    state.activeSession.duration = Math.floor(
      (Date.now() - state.activeSession.startedAt) / 1000
    );
    state.activeSession.endedAt = Date.now();
    doRender();
  },

  onNoteSubmit(note: string) {
    if (state.activeSession) {
      state.activeSession.note = note;
      state.sessions.push({ ...state.activeSession });
      state.activeSession = null;
      saveState(state);
    }
    showNoteModal = false;
    doRender();
  },

  onNoteSkip() {
    if (state.activeSession) {
      state.sessions.push({ ...state.activeSession });
      state.activeSession = null;
      saveState(state);
    }
    showNoteModal = false;
    doRender();
  },

  onResumeIdle() {
    if (state.activeSession) {
      state.activeSession.idlePaused = false;
      state.activeSession.duration = Math.floor(
        (Date.now() - state.activeSession.startedAt) / 1000
      );
      saveState(state);
      startLocalTick();
    }
    doRender();
  },

  onWeekPrev() { weekOffset -= 1; doRender(); },
  onWeekNext() { if (weekOffset < 0) { weekOffset += 1; doRender(); } },
  onClearFilter() { reportProjectFilter = 'all'; doRender(); },

  onProjectClick(projectId: string) {
    reportProjectFilter = projectId;
    currentView = 'report';
    weekOffset = 0;
    doRender();
  },

  onNewProject(name: string, color: string) {
    const project: Project = {
      id: generateId(), name, color, createdAt: Date.now(), archived: false,
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
    if (selectedProjectId === projectId && project.archived) {
      selectedProjectId = state.projects.find((p) => !p.archived)?.id ?? '';
    }
    doRender();
  },

  onSaveSettings(settings: AppSettings) {
    state.settings = settings;
    saveState(state);
    if (state.activeSession) {
      chrome.runtime.sendMessage({
        type: 'START_TIMER',
        idleThreshold: settings.idleThreshold,
      });
    }
  },

  onConfirmClear() { confirmingClear = true; doRender(); },
  onCancelClear() { confirmingClear = false; doRender(); },

  onClearData() {
    stopLocalTick();
    chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
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

  onExportCSV() {
    const sessions = getWeekSessions(state, weekOffset, reportProjectFilter);
    exportCSV(sessions, getProjectName, getWeekLabel(weekOffset));
  },

  onExportPDF() {
    const sessions = getWeekSessions(state, weekOffset, reportProjectFilter);
    exportPDF(sessions, getWeekLabel(weekOffset), getProjectName);
  },

  onViewChange(view: ViewName) {
    currentView = view;
    if (view !== 'report') weekOffset = 0;
    confirmingClear = false;
    showNewProjectForm = false;
    doRender();
  },

  onPhaseChange(phase: Phase) { selectedPhase = phase; },
  onProjectSelectChange(projectId: string) { selectedProjectId = projectId; },

  onToggleNewProjectForm() {
    showNewProjectForm = !showNewProjectForm;
    newProjectColor = PROJECT_PALETTE[0];
    doRender();
  },

  onNewProjectColorChange(color: string) { newProjectColor = color; },
};

async function init() {
  state = await loadState();
  selectedProjectId =
    state.activeSession?.projectId ??
    state.projects.find((p) => !p.archived)?.id ?? '';
  selectedPhase = state.activeSession?.phase ?? 'Design';

  if (state.activeSession) {
    // Sync duration from background
    state.activeSession.duration = Math.floor(
      (Date.now() - state.activeSession.startedAt) / 1000
    );
    startLocalTick();
  }

  doRender();
}

init();
