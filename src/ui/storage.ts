// localStorage wrapper with safe defaults.
// Also mirrors every save to figma.clientStorage via the sandbox (code.ts),
// since localStorage alone doesn't reliably survive Figma tearing down this
// plugin's iframe when another plugin is launched.

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

// Shared by loadState (localStorage) and the clientStorage payload that
// arrives later via the INIT message, since both hold the same JSON shape.
export function parseState(raw: string): AppState {
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
}

// Figma serves this UI from a data: URL in some environments, where
// localStorage throws SecurityError on every access. Probe once so saveState
// doesn't spam the console on every call; clientStorage (via the postMessage
// bridge below) is then the only persistence path.
let localStorageAvailable = true;
try {
  localStorage.setItem(STORAGE_KEY, localStorage.getItem(STORAGE_KEY) ?? '');
} catch {
  localStorageAvailable = false;
  console.warn('localStorage unavailable (data: URL context), relying on clientStorage only');
}

export function loadState(): AppState {
  if (!localStorageAvailable) return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return parseState(raw);
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  const raw = JSON.stringify(state);
  if (localStorageAvailable) {
    try {
      localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      localStorageAvailable = false;
    }
  }
  try {
    parent.postMessage({ pluginMessage: { type: 'PERSIST_STATE', payload: raw } }, '*');
  } catch (err) {
    console.error('Failed to persist state to clientStorage bridge', err);
  }
}

export function clearState(): void {
  if (!localStorageAvailable) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    localStorageAvailable = false;
  }
}
