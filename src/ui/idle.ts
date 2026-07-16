// Idle detection. Pauses active session duration accumulation after N seconds of inactivity.
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
  getState: () => AppState,
  callbacks: IdleCallbacks
): void {
  if (listenersAttached) return;
  listenersAttached = true;

  // Throttle: mousemove can fire hundreds of times per second. Coalesce
  // activity signals into 250 ms buckets so we only touch the idle timer
  // a few times per second at most.
  const handler = () => {
    const now = Date.now();
    if (now - lastActivityAt < 250) return;
    lastActivityAt = now;

    // Resolve state lazily so listeners track the current state object
    // even after Clear Data swaps the reference.
    const state = getState();
    if (state.activeSession?.idlePaused) {
      resumeFromIdle(state, callbacks.onResume);
    }
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
  if (!state.activeSession || state.activeSession.idlePaused || state.activeSession.manualPaused) return;
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
