import { beforeEach, describe, expect, it } from 'vitest';
import { defaultState, loadState, saveState } from '../src/ui/storage';
import { STORAGE_KEY } from '../src/ui/types';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns a sane default state when nothing is stored', () => {
    const state = loadState();
    expect(state.projects).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.activeSession).toBeNull();
    expect(state.customPhases).toEqual([]);
    expect(state.settings.userName).toBe('');
  });

  it('round-trips a saved state', () => {
    const state = defaultState();
    state.projects.push({
      id: 'p1',
      name: 'Test',
      color: '#fff',
      createdAt: 1,
      archived: false,
    });
    state.customPhases.push('QA Perso');
    state.settings.userName = 'Abdennour';
    saveState(state);

    const loaded = loadState();
    expect(loaded.projects).toHaveLength(1);
    expect(loaded.customPhases).toEqual(['QA Perso']);
    expect(loaded.settings.userName).toBe('Abdennour');
  });

  it('back-fills missing fields from older saved states (schema migration)', () => {
    const legacy = {
      projects: [],
      sessions: [],
      activeSession: null,
      settings: { idleThreshold: 300, workDayHours: 8, lang: 'en' },
      fileProjectMap: {},
      // customPhases intentionally missing, as it would be in a pre-migration save
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadState();
    expect(loaded.customPhases).toEqual([]);
    expect(loaded.settings.userName).toBe('');
  });

  it('falls back to defaults on corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');
    const loaded = loadState();
    expect(loaded).toEqual(defaultState());
  });

  it('recomputes active session duration from startedAt on load, unless paused', () => {
    const state = defaultState();
    state.activeSession = {
      id: 's1',
      projectId: 'p1',
      phase: 'Design',
      startedAt: Date.now() - 10000,
      endedAt: null,
      duration: 0,
      note: '',
      fileId: 'f1',
      fileName: 'File',
    };
    saveState(state);

    const loaded = loadState();
    expect(loaded.activeSession!.duration).toBeGreaterThanOrEqual(9);
  });

  it('does not recompute duration for a manually-paused active session', () => {
    const state = defaultState();
    state.activeSession = {
      id: 's1',
      projectId: 'p1',
      phase: 'Design',
      startedAt: Date.now() - 10000,
      endedAt: null,
      duration: 3,
      note: '',
      fileId: 'f1',
      fileName: 'File',
      manualPaused: true,
    };
    saveState(state);

    const loaded = loadState();
    expect(loaded.activeSession!.duration).toBe(3);
  });
});
