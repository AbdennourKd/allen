import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  pauseSessionManually,
  resumeSessionManually,
  startSession,
  stopSession,
  stopTick,
  TimerCallbacks,
} from '../src/ui/timer';
import { defaultState } from '../src/ui/storage';
import { AppState } from '../src/ui/types';

function noopCallbacks(): TimerCallbacks {
  return { onTick: () => {}, onRender: () => {}, onShowNoteModal: () => {} };
}

describe('timer manual pause/resume', () => {
  let state: AppState;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    state = defaultState();
    state.projects.push({
      id: 'p1',
      name: 'Test',
      color: '#000',
      createdAt: Date.now(),
      archived: false,
    });
  });

  afterEach(() => {
    stopTick();
    vi.useRealTimers();
  });

  it('freezes duration accumulation while manually paused', () => {
    startSession(state, 'p1', 'Design', 'f1', 'File', noopCallbacks());
    vi.advanceTimersByTime(5000);
    expect(state.activeSession!.duration).toBe(5);

    pauseSessionManually(state, () => {});
    vi.advanceTimersByTime(10000);
    expect(state.activeSession!.duration).toBe(5); // frozen — tick loop skips paused sessions

    resumeSessionManually(state, () => {});
    vi.advanceTimersByTime(3000);
    expect(state.activeSession!.duration).toBe(8); // 5 worked + 3 more, pause gap excluded
  });

  it('does not double-pause or resume when called out of order', () => {
    startSession(state, 'p1', 'Design', 'f1', 'File', noopCallbacks());
    pauseSessionManually(state, () => {});
    const pausedAt = state.activeSession!.manualPauseStartedAt;
    pauseSessionManually(state, () => {}); // second call should be a no-op
    expect(state.activeSession!.manualPauseStartedAt).toBe(pausedAt);

    resumeSessionManually(state, () => {});
    expect(state.activeSession!.manualPaused).toBe(false);
    resumeSessionManually(state, () => {}); // second call should be a no-op
    expect(state.activeSession!.manualPaused).toBe(false);
  });

  it('stopping while manually paused keeps the frozen duration (does not count paused time)', () => {
    startSession(state, 'p1', 'Design', 'f1', 'File', noopCallbacks());
    vi.advanceTimersByTime(4000);
    pauseSessionManually(state, () => {});
    vi.advanceTimersByTime(60000); // long pause, never resumed

    let finalized: any = null;
    stopSession(state, false, {
      ...noopCallbacks(),
      onRender: () => {
        finalized = state.sessions[state.sessions.length - 1];
      },
    });

    expect(finalized.duration).toBe(4);
  });

  it('stopping while idle-paused also keeps the frozen duration', () => {
    startSession(state, 'p1', 'Design', 'f1', 'File', noopCallbacks());
    vi.advanceTimersByTime(2000);
    state.activeSession!.idlePaused = true;
    vi.advanceTimersByTime(120000);

    let finalized: any = null;
    stopSession(state, false, {
      ...noopCallbacks(),
      onRender: () => {
        finalized = state.sessions[state.sessions.length - 1];
      },
    });

    expect(finalized.duration).toBe(2);
  });

  it('snapshots the current user name onto the session', () => {
    state.settings.userName = 'Abdennour';
    startSession(state, 'p1', 'Design', 'f1', 'File', noopCallbacks());
    expect(state.activeSession!.user).toBe('Abdennour');
  });
});
