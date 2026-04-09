// Pure utility functions — no side effects, no DOM.

import { AppState, Phase, Session } from './types';
import { getDayShort, getMonthName, t } from './i18n';

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

export function getWeekSessions(
  state: AppState,
  weekOffset: number,
  projectFilter: string
): Session[] {
  const monday = startOfWeek(new Date(), weekOffset);
  const sunday = endOfWeek(monday);
  const start = monday.getTime();
  const end = sunday.getTime();
  return state.sessions.filter((s) => {
    const inWeek = s.startedAt >= start && s.startedAt <= end;
    const inProject = projectFilter === 'all' || s.projectId === projectFilter;
    return inWeek && inProject;
  });
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

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
