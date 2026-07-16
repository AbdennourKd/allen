// Timer engine. Manages active session lifecycle.
// Pure functions take state + callbacks to avoid circular imports with ui.ts.

import { AppState, Phase, Session } from './types';
import { saveState } from './storage';
import { generateId } from './helpers';

let tickInterval: number | null = null;

export type TimerCallbacks = {
  onTick: () => void;           // cheap DOM update only
  onRender: () => void;          // full re-render
  onShowNoteModal: (session: Session) => void;
};

export function startSession(
  state: AppState,
  projectId: string,
  phase: Phase,
  fileId: string,
  fileName: string,
  callbacks: TimerCallbacks
): void {
  // If a session is already running, silently finalize it without prompting for a note
  if (state.activeSession) {
    stopSession(state, false, callbacks);
  }

  state.activeSession = {
    id: generateId(),
    projectId,
    phase,
    startedAt: Date.now(),
    endedAt: null,
    duration: 0,
    note: '',
    fileId,
    fileName,
    idlePaused: false,
    manualPaused: false,
    user: state.settings.userName || undefined,
  };
  saveState(state);
  startTick(state, callbacks.onTick);
  callbacks.onRender();
}

export function pauseSessionManually(state: AppState, onRender: () => void): void {
  const session = state.activeSession;
  if (!session || session.idlePaused || session.manualPaused) return;
  session.manualPaused = true;
  session.manualPauseStartedAt = Date.now();
  saveState(state);
  onRender();
}

export function resumeSessionManually(state: AppState, onRender: () => void): void {
  const session = state.activeSession;
  if (!session || !session.manualPaused) return;
  if (session.manualPauseStartedAt) {
    session.startedAt += Date.now() - session.manualPauseStartedAt;
  }
  session.manualPaused = false;
  session.manualPauseStartedAt = undefined;
  saveState(state);
  onRender();
}

export function startTick(state: AppState, onTick: () => void): void {
  stopTick();
  // Persist a checkpoint every 30 ticks (~30s) for crash recovery only.
  // Per-tick saves were rewriting localStorage every second (dominant cost
  // once sessions[] grew). Duration is recomputed from startedAt on reload,
  // so missing the last <30s is harmless.
  let ticksSinceSave = 0;
  tickInterval = window.setInterval(() => {
    if (!state.activeSession) return;
    if (state.activeSession.idlePaused || state.activeSession.manualPaused) return;
    // Math.max guards against system clock going backwards mid-session.
    state.activeSession.duration = Math.max(
      0,
      Math.floor((Date.now() - state.activeSession.startedAt) / 1000)
    );
    ticksSinceSave += 1;
    if (ticksSinceSave >= 30) {
      saveState(state);
      ticksSinceSave = 0;
    }
    onTick();
  }, 1000);
}

export function stopTick(): void {
  if (tickInterval !== null) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export function stopSession(
  state: AppState,
  askNote: boolean,
  callbacks: TimerCallbacks
): void {
  if (!state.activeSession) return;
  stopTick();

  state.activeSession.endedAt = Date.now();
  // While paused (idle or manual), duration is already frozen at the correct
  // value. startedAt only shifts forward on resume, so recomputing here
  // would wrongly count the paused time as worked time.
  if (!state.activeSession.idlePaused && !state.activeSession.manualPaused) {
    state.activeSession.duration = Math.max(
      0,
      Math.floor(
        (state.activeSession.endedAt - state.activeSession.startedAt) / 1000
      )
    );
  }

  if (askNote) {
    // Pause in memory until note is submitted; do not push to sessions yet
    callbacks.onShowNoteModal(state.activeSession);
  } else {
    finalizeSession(state, '', callbacks.onRender);
  }
}

export function finalizeSession(
  state: AppState,
  note: string,
  onRender: () => void
): void {
  if (!state.activeSession) return;
  state.activeSession.note = note;
  state.sessions.push({ ...state.activeSession });
  state.activeSession = null;
  saveState(state);
  onRender();
}

export function hasActiveTick(): boolean {
  return tickInterval !== null;
}
