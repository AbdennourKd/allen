// Idle detection — pauses active session duration accumulation after N seconds of inactivity.
// Auto-resumes on any activity. Adjusts session.startedAt on resume so duration stays accurate.

import { AppState } from './types';
import { saveState } from './storage';

let idleTimeout: number | null = null;
let idlePauseStartedAt: number | null = null;
let lastActivityAt: number = Date.now();
let listenersAttached = false;

export type IdleCallbacks = {
  onIdle: () => void;     // show banner + render
  onResume: () => void;   // hide banner + render
};

export function initIdleListeners(
  state: AppState,
  callbacks: IdleCallbacks
): void {
  if (listenersAttached) return;
  listenersAttached = true;

  const handler = () => {
    lastActivityAt = Date.now();
    // If session is paused due to idle, auto-resume on activity
    if (state.activeSession?.idlePaused) {
      resumeFromIdle(state, callbacks.onResume);
    }
    // Always reset the idle timer if a session is running
    if (state.activeSession) {
      resetIdleTimer(state, callbacks.onIdle);
    }
  };

  const events: Array<keyof WindowEventMap> = [
    'mousemove',
    'keydown',
    'click',
    'scroll',
  ];
  for (const ev of events) {
    window.addEventListener(ev, handler, { passive: true });
  }
}

export function resetIdleTimer(state: AppState, onIdle: () => void): void {
  clearIdleTimer();
  if (!state.activeSession || state.activeSession.idlePaused) return;
  const thresholdMs = state.settings.idleThreshold * 1000;
  idleTimeout = window.setTimeout(() => {
    if (!state.activeSession) return;
    state.activeSession.idlePaused = true;
    idlePauseStartedAt = Date.now();
    saveState(state);
    onIdle();
  }, thresholdMs);
}

export function resumeFromIdle(state: AppState, onResume: () => void): void {
  if (!state.activeSession || !state.activeSession.idlePaused) return;
  if (idlePauseStartedAt !== null) {
    // Shift startedAt forward by the idle gap so duration excludes the idle time
    const gap = Date.now() - idlePauseStartedAt;
    state.activeSession.startedAt += gap;
  }
  state.activeSession.idlePaused = false;
  idlePauseStartedAt = null;
  saveState(state);
  onResume();
}

export function clearIdleTimer(): void {
  if (idleTimeout !== null) {
    clearTimeout(idleTimeout);
    idleTimeout = null;
  }
}

export function getLastActivity(): number {
  return lastActivityAt;
}
