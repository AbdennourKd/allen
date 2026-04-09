import { AppState, AppSettings, STORAGE_KEY } from './types';

export function defaultState(): AppState {
  return {
    projects: [],
    sessions: [],
    activeSession: null,
    settings: { idleThreshold: 300, workDayHours: 8 },
  };
}

export async function loadState(): Promise<AppState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY];
  if (!raw) return defaultState();
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
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

export async function saveState(state: AppState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export async function clearState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
