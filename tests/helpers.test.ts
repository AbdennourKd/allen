import { describe, expect, it } from 'vitest';
import {
  estimateProject,
  formatDuration,
  formatTime,
  getPeriodRange,
  getPeriodSessions,
  getPhaseColor,
  getSessionsInDateRange,
  groupByDayOfMonth,
  groupByMonth,
  groupByPhase,
  groupByProject,
  matchProjectByFileName,
} from '../src/ui/helpers';
import { AppState, Project, Session } from '../src/ui/types';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    name: overrides.name ?? 'Untitled',
    color: overrides.color ?? '#000000',
    createdAt: overrides.createdAt ?? Date.now(),
    archived: overrides.archived ?? false,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    projectId: overrides.projectId ?? 'p1',
    phase: overrides.phase ?? 'Design',
    startedAt: overrides.startedAt ?? Date.now(),
    endedAt: overrides.endedAt ?? null,
    duration: overrides.duration ?? 0,
    note: overrides.note ?? '',
    fileId: overrides.fileId ?? 'local',
    fileName: overrides.fileName ?? 'Untitled',
    ...overrides,
  };
}

describe('formatTime', () => {
  it('pads hours, minutes and seconds', () => {
    expect(formatTime(0)).toBe('00:00:00');
    expect(formatTime(61)).toBe('00:01:01');
    expect(formatTime(3661)).toBe('01:01:01');
  });
});

describe('formatDuration', () => {
  it('picks the coarsest useful unit', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(125)).toBe('2m 05s');
    expect(formatDuration(3725)).toBe('1h 02m');
  });
});

describe('getPhaseColor', () => {
  it('returns the built-in color for default phases', () => {
    expect(getPhaseColor('Design')).toBe('#8B7CF6');
  });

  it('is deterministic for the same custom phase name', () => {
    const a = getPhaseColor('QA Perso');
    const b = getPhaseColor('QA Perso');
    expect(a).toBe(b);
  });

  it('returns a valid hex color for unknown phases', () => {
    expect(getPhaseColor('Something Custom')).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('matchProjectByFileName', () => {
  it('matches case-insensitively as a substring in either direction', () => {
    const projects = [makeProject({ name: 'Sogpred' })];
    const match = matchProjectByFileName(projects, 'SOGPRED — Landing v2');
    expect(match?.name).toBe('Sogpred');
  });

  it('returns null when nothing matches', () => {
    const projects = [makeProject({ name: 'Sogpred' })];
    expect(matchProjectByFileName(projects, 'Totally Unrelated File')).toBeNull();
  });

  it('breaks ties by picking the most recently created project', () => {
    const older = makeProject({ name: 'Sogpred', createdAt: 100 });
    const newer = makeProject({ name: 'Sogpred Landing', createdAt: 200 });
    const match = matchProjectByFileName([older, newer], 'Sogpred Landing v2');
    expect(match?.id).toBe(newer.id);
  });

  it('ignores empty file names', () => {
    const projects = [makeProject({ name: 'Sogpred' })];
    expect(matchProjectByFileName(projects, '   ')).toBeNull();
  });
});

describe('groupByPhase', () => {
  it('sums durations per phase and sorts descending', () => {
    const sessions = [
      makeSession({ phase: 'Design', duration: 10 }),
      makeSession({ phase: 'Research', duration: 50 }),
      makeSession({ phase: 'Design', duration: 20 }),
    ];
    const grouped = groupByPhase(sessions);
    expect(grouped).toEqual([
      { phase: 'Research', duration: 50 },
      { phase: 'Design', duration: 30 },
    ]);
  });
});

describe('groupByDayOfMonth / groupByMonth', () => {
  it('groups sessions by calendar day', () => {
    const d1 = new Date(2026, 0, 5, 10).getTime();
    const d2 = new Date(2026, 0, 5, 14).getTime();
    const d3 = new Date(2026, 0, 6, 9).getTime();
    const sessions = [
      makeSession({ startedAt: d1, duration: 100 }),
      makeSession({ startedAt: d2, duration: 50 }),
      makeSession({ startedAt: d3, duration: 30 }),
    ];
    const grouped = groupByDayOfMonth(sessions);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].label).toBe('5');
    expect(grouped[0].duration).toBe(150);
    expect(grouped[1].label).toBe('6');
  });

  it('groups sessions by month', () => {
    const jan = new Date(2026, 0, 15).getTime();
    const feb = new Date(2026, 1, 3).getTime();
    const sessions = [
      makeSession({ startedAt: jan, duration: 60 }),
      makeSession({ startedAt: feb, duration: 90 }),
    ];
    const grouped = groupByMonth(sessions);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].duration).toBe(60);
    expect(grouped[1].duration).toBe(90);
  });
});

function makeState(sessions: Session[], projects: Project[] = []): AppState {
  return {
    projects,
    sessions,
    activeSession: null,
    settings: { idleThreshold: 300, workDayHours: 8, lang: 'fr', userName: '' },
    fileProjectMap: {},
    customPhases: [],
  };
}

describe('groupByProject', () => {
  it('sums durations per project and resolves names/colors', () => {
    const p1 = makeProject({ id: 'p1', name: 'Sogpred', color: '#111111' });
    const p2 = makeProject({ id: 'p2', name: 'Kidlee', color: '#222222' });
    const state = makeState(
      [
        makeSession({ projectId: 'p1', duration: 100 }),
        makeSession({ projectId: 'p2', duration: 300 }),
        makeSession({ projectId: 'p1', duration: 50 }),
      ],
      [p1, p2]
    );
    const grouped = groupByProject(state, state.sessions);
    expect(grouped).toEqual([
      { projectId: 'p2', name: 'Kidlee', color: '#222222', duration: 300 },
      { projectId: 'p1', name: 'Sogpred', color: '#111111', duration: 150 },
    ]);
  });
});

describe('getSessionsInDateRange', () => {
  it('includes sessions on the boundary days and excludes others', () => {
    const inRange = new Date(2026, 0, 10, 12).getTime();
    const before = new Date(2026, 0, 4, 23, 59).getTime();
    const after = new Date(2026, 0, 16, 0, 1).getTime();
    const state = makeState([
      makeSession({ startedAt: before, duration: 10 }),
      makeSession({ startedAt: inRange, duration: 20 }),
      makeSession({ startedAt: after, duration: 30 }),
    ]);
    const result = getSessionsInDateRange(state, '2026-01-05', '2026-01-15', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe(20);
  });
});

describe('estimateProject', () => {
  it('computes total time and a weekly average pace', () => {
    const state = makeState([
      makeSession({ projectId: 'p1', startedAt: Date.now(), duration: 3600 }),
    ]);
    const { totalTime, avgWeeklyTime } = estimateProject(state, 'p1');
    expect(totalTime).toBe(3600);
    expect(avgWeeklyTime).toBe(3600);
  });

  it('returns zeroes for a project with no sessions', () => {
    const state = makeState([]);
    const result = estimateProject(state, 'nonexistent');
    expect(result.totalTime).toBe(0);
    expect(result.avgWeeklyTime).toBe(0);
  });
});

describe('getPeriodRange / getPeriodSessions', () => {

  it('day range covers exactly one calendar day', () => {
    const { start, end } = getPeriodRange('day', 0);
    expect(end - start).toBe(86400000 - 1);
  });

  it('year range covers the full year', () => {
    const { start, end } = getPeriodRange('year', 0);
    const startDate = new Date(start);
    const endDate = new Date(end);
    expect(startDate.getMonth()).toBe(0);
    expect(startDate.getDate()).toBe(1);
    expect(endDate.getFullYear()).toBe(startDate.getFullYear());
  });

  it('filters sessions to the requested period and project', () => {
    const now = Date.now();
    const longAgo = now - 400 * 86400000;
    const sessions = [
      makeSession({ startedAt: now, projectId: 'p1', duration: 10 }),
      makeSession({ startedAt: now, projectId: 'p2', duration: 20 }),
      makeSession({ startedAt: longAgo, projectId: 'p1', duration: 30 }),
    ];
    const state = makeState(sessions);
    const result = getPeriodSessions(state, 'year', 0, 'p1');
    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe(10);
  });
});
