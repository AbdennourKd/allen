// Pure utility functions. No side effects, no DOM.

import { AppState, Granularity, Phase, PHASE_COLORS, PROJECT_PALETTE, Project, Session } from './types';
import { getDayShort, getLocale, getMonthName, t } from './i18n';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function startOfWeek(date: Date, offsetWeeks: number = 0): Date {
  const d = new Date(date);
  const day = d.getDay() || 7; // 1 = Mon, 7 = Sun
  d.setDate(d.getDate() - day + 1 + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getWeekKey(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getWeekLabel(weekOffset: number): string {
  const monday = startOfWeek(new Date(), weekOffset);
  const weekNum = getWeekNumber(monday);
  return `${t('week_label')} ${weekNum} · ${getMonthName(monday.getMonth())}`;
}

export function groupByPhase(
  sessions: Session[]
): Array<{ phase: Phase; duration: number }> {
  const map = new Map<Phase, number>();
  for (const s of sessions) {
    map.set(s.phase, (map.get(s.phase) ?? 0) + s.duration);
  }
  return Array.from(map.entries())
    .map(([phase, duration]) => ({ phase, duration }))
    .sort((a, b) => b.duration - a.duration);
}

export function groupByDay(
  sessions: Session[]
): Array<{ day: string; label: string; duration: number }> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = new Date(s.startedAt).toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + s.duration);
  }
  const DAY_LABELS = [0,1,2,3,4,5,6].map(i => getDayShort(i));
  // Return Mon–Sun in order for the current reference week
  const result: Array<{ day: string; label: string; duration: number }> = [];
  for (const [day, duration] of map.entries()) {
    const d = new Date(day);
    const dayNum = d.getDay() || 7;
    result.push({ day, label: DAY_LABELS[dayNum - 1], duration });
  }
  return result.sort((a, b) => a.day.localeCompare(b.day));
}

export function groupByDayOfMonth(
  sessions: Session[]
): Array<{ day: string; label: string; duration: number }> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = new Date(s.startedAt).toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + s.duration);
  }
  return Array.from(map.entries())
    .map(([day, duration]) => ({ day, label: `${new Date(day).getDate()}`, duration }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export function groupByMonth(
  sessions: Session[]
): Array<{ month: string; label: string; duration: number }> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + s.duration);
  }
  return Array.from(map.entries())
    .map(([key, duration]) => ({
      month: key,
      label: getMonthName(Number(key.split('-')[1])).slice(0, 3),
      duration,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function groupByProject(
  state: AppState,
  sessions: Session[]
): Array<{ projectId: string; name: string; color: string; duration: number }> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    map.set(s.projectId, (map.get(s.projectId) ?? 0) + s.duration);
  }
  return Array.from(map.entries())
    .map(([projectId, duration]) => {
      const project = state.projects.find((p) => p.id === projectId);
      return {
        projectId,
        name: project?.name ?? t('unknown_project'),
        color: project?.color ?? '#888888',
        duration,
      };
    })
    .sort((a, b) => b.duration - a.duration);
}

// Custom date range for on-demand exports (inclusive of both bounds' full days).
export function getSessionsInDateRange(
  state: AppState,
  fromDateStr: string,
  toDateStr: string,
  projectFilter: string
): Session[] {
  const start = new Date(fromDateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(toDateStr);
  end.setHours(23, 59, 59, 999);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return state.sessions.filter((s) => {
    const inRange = s.startedAt >= startMs && s.startedAt <= endMs;
    const inProject = projectFilter === 'all' || s.projectId === projectFilter;
    return inRange && inProject;
  });
}

export function getTodaySessions(state: AppState): Session[] {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = start + 86400000;
  const completed = state.sessions.filter(
    (s) => s.startedAt >= start && s.startedAt < end
  );
  return completed;
}

export function getTodayPhaseBreakdown(
  state: AppState
): Array<{ phase: Phase; duration: number; pct: number }> {
  const sessions = getTodaySessions(state);
  // Include active session if it started today
  if (state.activeSession) {
    const activeDay = new Date(state.activeSession.startedAt);
    const today = new Date();
    if (
      activeDay.getDate() === today.getDate() &&
      activeDay.getMonth() === today.getMonth() &&
      activeDay.getFullYear() === today.getFullYear()
    ) {
      sessions.push(state.activeSession);
    }
  }
  const grouped = groupByPhase(sessions);
  const total = grouped.reduce((a, b) => a + b.duration, 0);
  return grouped.map((g) => ({
    phase: g.phase,
    duration: g.duration,
    pct: total > 0 ? (g.duration / total) * 100 : 0,
  }));
}

export function getProjectName(state: AppState, projectId: string): string {
  return state.projects.find((p) => p.id === projectId)?.name ?? t('unknown_project');
}

export function getProjectTotalTime(state: AppState, projectId: string): number {
  return state.sessions
    .filter((s) => s.projectId === projectId)
    .reduce((acc, s) => acc + s.duration, 0);
}

export type ProjectEstimate = {
  totalTime: number;
  avgWeeklyTime: number;
  estimatedDaysLeft: number;
};

export function estimateProject(
  state: AppState,
  projectId: string
): ProjectEstimate {
  const sessions = state.sessions.filter((s) => s.projectId === projectId);
  const totalTime = sessions.reduce((acc, s) => acc + s.duration, 0);
  const weeks = new Set(sessions.map((s) => getWeekKey(s.startedAt)));
  const avgWeeklyTime = totalTime / Math.max(weeks.size, 1);
  const estimatedDaysLeft =
    avgWeeklyTime > 0 ? Math.ceil((totalTime / avgWeeklyTime) * 5) : 0;
  return { totalTime, avgWeeklyTime, estimatedDaysLeft };
}

export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Deterministic color for phases outside the built-in PHASE_COLORS map
// (i.e. user-added custom phases); hashes the name into PROJECT_PALETTE.
export function getPhaseColor(phase: Phase): string {
  const known = PHASE_COLORS[phase];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < phase.length; i++) {
    hash = (hash * 31 + phase.charCodeAt(i)) | 0;
  }
  return PROJECT_PALETTE[Math.abs(hash) % PROJECT_PALETTE.length];
}

// Finds the project whose name best matches a Figma file name (case-
// insensitive substring in either direction), used to auto-select a project
// the first time a file is opened. Ties broken by most recently created.
export function matchProjectByFileName(
  projects: Project[],
  fileName: string
): Project | null {
  const needle = fileName.trim().toLowerCase();
  if (!needle) return null;
  const candidates = projects.filter((p) => {
    const name = p.name.trim().toLowerCase();
    return name.length > 0 && (needle.includes(name) || name.includes(needle));
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((best, p) =>
    p.createdAt > best.createdAt ? p : best
  );
}

// ----------------------------------------------------------------
// Period-based report aggregation (day / week / month / year)
// ----------------------------------------------------------------

export function getPeriodRange(
  granularity: Granularity,
  offset: number
): { start: number; end: number; label: string } {
  const now = new Date();
  if (granularity === 'day') {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    const start = d.getTime();
    const end = start + 86400000 - 1;
    const label = d.toLocaleDateString(getLocale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return { start, end, label };
  }
  if (granularity === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1;
    const label = `${getMonthName(d.getMonth())} ${d.getFullYear()}`;
    return { start, end, label };
  }
  if (granularity === 'year') {
    const y = now.getFullYear() + offset;
    const start = new Date(y, 0, 1).getTime();
    const end = new Date(y + 1, 0, 1).getTime() - 1;
    return { start, end, label: `${y}` };
  }
  // week
  const monday = startOfWeek(now, offset);
  const sunday = endOfWeek(monday);
  return { start: monday.getTime(), end: sunday.getTime(), label: getWeekLabel(offset) };
}

export function getPeriodSessions(
  state: AppState,
  granularity: Granularity,
  offset: number,
  projectFilter: string
): Session[] {
  const { start, end } = getPeriodRange(granularity, offset);
  return state.sessions.filter((s) => {
    const inRange = s.startedAt >= start && s.startedAt <= end;
    const inProject = projectFilter === 'all' || s.projectId === projectFilter;
    return inRange && inProject;
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
