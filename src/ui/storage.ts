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
    },
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    // Defensive: ensure required fields exist (schema evolution safety)
    return {
      projects: parsed.projects ?? [],
      sessions: parsed.sessions ?? [],
      activeSession: parsed.activeSession ?? null,
      settings: {
        idleThreshold: parsed.settings?.idleThreshold ?? 300,
        workDayHours: parsed.settings?.workDayHours ?? 8,
      },
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
