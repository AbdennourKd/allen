// localStorage wrapper with safe defaults.

import { AppState, STORAGE_KEY } from './types';

export function defaultState(): AppState {
  return {
    projects: [],
    sessions: [],
    activeSession: null,
    settings: {
      idleThreshold: 300,
      workDayHours: 8,
      lang: 'fr',
      userName: '',
    },
    fileProjectMap: {},
    customPhases: [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    const activeSession = parsed.activeSession ?? null;
    // Recompute duration from startedAt. The tick checkpoints every 30s,
    // so the persisted duration is up to 30s stale on reload.
    if (activeSession && !activeSession.idlePaused && !activeSession.manualPaused) {
      activeSession.duration = Math.max(
        0,
        Math.floor((Date.now() - activeSession.startedAt) / 1000)
      );
    }
    // Defensive: ensure required fields exist (schema evolution safety)
    return {
      projects: parsed.projects ?? [],
      sessions: parsed.sessions ?? [],
      activeSession,
      settings: {
        idleThreshold: parsed.settings?.idleThreshold ?? 300,
        workDayHours: parsed.settings?.workDayHours ?? 8,
        lang: parsed.settings?.lang ?? 'fr',
        userName: parsed.settings?.userName ?? '',
      },
      fileProjectMap: parsed.fileProjectMap ?? {},
      customPhases: parsed.customPhases ?? [],
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state', err);
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
