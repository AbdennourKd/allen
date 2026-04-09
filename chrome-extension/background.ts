import { AppState } from './types';
import { formatTime } from './helpers';

const ALARM_NAME = 'project-tracker-tick';
const STORAGE_KEY = 'ux_tracker_state';

// --- State helpers ---
async function getState(): Promise<AppState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? null;
}

async function setState(state: AppState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

// --- Badge ---
function updateBadge(seconds: number): void {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const text = h > 0 ? `${h}:${String(m % 60).padStart(2, '0')}` : `${m}m`;
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#0d99ff' });
}

function clearBadge(): void {
  chrome.action.setBadgeText({ text: '' });
}

// --- Alarm tick ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const state = await getState();
  if (!state?.activeSession || state.activeSession.idlePaused) return;

  state.activeSession.duration = Math.floor(
    (Date.now() - state.activeSession.startedAt) / 1000
  );
  await setState(state);
  updateBadge(state.activeSession.duration);
});

// --- Idle detection ---
chrome.idle.onStateChanged.addListener(async (idleState) => {
  const state = await getState();
  if (!state?.activeSession) return;

  if (idleState === 'idle' || idleState === 'locked') {
    if (!state.activeSession.idlePaused) {
      state.activeSession.idlePaused = true;
      (state.activeSession as any)._idlePauseStart = Date.now();
      await setState(state);
    }
  } else if (idleState === 'active') {
    if (state.activeSession.idlePaused) {
      const pauseStart = (state.activeSession as any)._idlePauseStart ?? Date.now();
      const idleGap = Date.now() - pauseStart;
      state.activeSession.startedAt += idleGap;
      state.activeSession.idlePaused = false;
      delete (state.activeSession as any)._idlePauseStart;
      state.activeSession.duration = Math.floor(
        (Date.now() - state.activeSession.startedAt) / 1000
      );
      await setState(state);
      updateBadge(state.activeSession.duration);
    }
  }
});

// --- Messages from popup ---
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_TIMER') {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 / 60 }); // every 1s
    chrome.idle.setDetectionInterval(msg.idleThreshold || 300);
    sendResponse({ ok: true });
  } else if (msg.type === 'STOP_TIMER') {
    chrome.alarms.clear(ALARM_NAME);
    clearBadge();
    sendResponse({ ok: true });
  } else if (msg.type === 'GET_STATE') {
    getState().then((state) => sendResponse({ state }));
    return true; // async response
  }
});

// --- On install: clear badge ---
chrome.runtime.onInstalled.addListener(() => clearBadge());
