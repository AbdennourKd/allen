// DOM rendering layer: 4 views + modals + nav.
// render() = full re-render (state/view change).
// updateTimerDisplay() = cheap per-tick update (timer text only).

import {
  AppState,
  Granularity,
  Phase,
  PHASES,
  PROJECT_PALETTE,
  Project,
  Session,
  ViewName,
} from './types';
import {
  escapeHtml,
  estimateProject,
  formatDuration,
  formatTime,
  getPeriodRange,
  getPeriodSessions,
  getPhaseColor,
  getProjectName,
  getTodayPhaseBreakdown,
  groupByDay,
  groupByDayOfMonth,
  groupByMonth,
  groupByPhase,
  groupByProject,
} from './helpers';
import { getLang, getLocale, isRTL, Lang, LANGS, LANG_LABELS, t } from './i18n';

export type RenderState = {
  view: ViewName;
  periodOffset: number;
  granularity: Granularity;
  reportProjectFilter: string;
  selectedProjectId: string;
  selectedPhase: Phase;
  showNoteModal: boolean;
  showNewProjectForm: boolean;
  newProjectColor: string;
  confirmingClear: boolean;
  isMinimized: boolean;
  showNewPhaseForm: boolean;
  editingSessionId: string | null;
  editingProjectId: string | null;
  editProjectColor: string;
  showCustomExport: boolean;
  customExportFrom: string;
  customExportTo: string;
};

export type Callbacks = {
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResumePause: () => void;
  onPeriodPrev: () => void;
  onPeriodNext: () => void;
  onGranularityChange: (g: Granularity) => void;
  onClearFilter: () => void;
  onProjectClick: (id: string) => void;
  onNewProject: (name: string, color: string) => void;
  onArchiveProject: (id: string) => void;
  onSaveSettings: (settings: AppState['settings']) => void;
  onClearData: () => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
  onNoteSubmit: (note: string) => void;
  onNoteSkip: () => void;
  onResumeIdle: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onViewChange: (view: ViewName) => void;
  onPhaseChange: (phase: Phase) => void;
  onProjectSelectChange: (projectId: string) => void;
  onToggleNewProjectForm: () => void;
  onNewProjectColorChange: (color: string) => void;
  onToggleNewPhaseForm: () => void;
  onCreatePhase: (name: string) => void;
  onDeletePhase: (name: string) => void;
  onUserNameChange: (name: string) => void;
  onLangChange: (lang: Lang) => void;
  onToggleMinimize: () => void;
  onEditSessionOpen: (id: string) => void;
  onEditSessionCancel: () => void;
  onEditSessionSave: (
    id: string,
    updates: { phase: string; durationMinutes: number; note: string }
  ) => void;
  onEditSessionDelete: (id: string) => void;
  onToggleEditProject: (id: string) => void;
  onEditProjectColorChange: (color: string) => void;
  onSaveProjectEdit: (id: string, name: string, color: string) => void;
  onToggleCustomExport: () => void;
  onCustomExportFromChange: (v: string) => void;
  onCustomExportToChange: (v: string) => void;
  onCustomExportCSV: () => void;
  onCustomExportPDF: () => void;
};

// ================================================================
// MAIN RENDER
// ================================================================

export function render(
  state: AppState,
  renderState: RenderState,
  callbacks: Callbacks
): void {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = buildHTML(state, renderState);
  attachListeners(app, state, renderState, callbacks);
}

export function updateTimerDisplay(state: AppState): void {
  const el = document.getElementById('timer-display');
  if (!el) return;
  const session = state.activeSession;
  if (!session) {
    el.textContent = '00:00:00';
    el.classList.remove('running', 'idle');
    return;
  }
  el.textContent = formatTime(session.duration);
  if (session.idlePaused || session.manualPaused) {
    el.classList.remove('running');
    el.classList.add('idle');
  } else {
    el.classList.add('running');
    el.classList.remove('idle');
  }
}

// ================================================================
// HTML BUILDERS
// ================================================================

function buildHTML(state: AppState, rs: RenderState): string {
  const dir = isRTL() ? 'rtl' : 'ltr';
  if (rs.isMinimized) {
    return renderMiniBar(state, rs, dir);
  }
  return `
    <div class="header" dir="${dir}">
      <span class="header-title">${t('header_title')}</span>
      ${state.activeSession ? `<span class="header-sub">${t('header_running')}</span>` : ''}
      <button id="btn-minimize" class="header-icon-btn" title="${t('minimize')}">
        <span class="material-symbols-outlined">close_fullscreen</span>
      </button>
    </div>
    <div class="content" dir="${dir}">
      ${renderView(state, rs)}
    </div>
    ${renderNavTabs(rs.view)}
    ${rs.showNoteModal ? renderNoteModal() : ''}
    ${rs.editingSessionId ? renderEditSessionModal(state, rs.editingSessionId) : ''}
  `;
}

function renderMiniBar(state: AppState, rs: RenderState, dir: string): string {
  const session = state.activeSession;
  if (session) {
    const phaseColor = getPhaseColor(session.phase);
    const cls = session.idlePaused || session.manualPaused ? 'idle' : 'running';
    const showResumePause = !!session.manualPaused;
    return `
      <div class="mini-bar ${cls}" dir="${dir}">
        <span class="phase-dot" style="background:${phaseColor}"></span>
        <span class="mini-timer ${cls}" id="timer-display">${formatTime(session.duration)}</span>
        ${
          !session.idlePaused
            ? showResumePause
              ? `<button id="btn-resume-pause" class="mini-action" title="${t('btn_resume')}">
                   <span class="material-symbols-outlined">play_arrow</span>
                 </button>`
              : `<button id="btn-pause" class="mini-action" title="${t('btn_pause')}">
                   <span class="material-symbols-outlined">pause</span>
                 </button>`
            : ''
        }
        <button id="btn-stop" class="mini-action mini-stop" title="${t('btn_stop')}">
          <span class="material-symbols-outlined">stop</span>
        </button>
        <button id="btn-expand" class="mini-action" title="${t('expand')}">
          <span class="material-symbols-outlined">open_in_full</span>
        </button>
      </div>
    `;
  }
  const activeProjects = state.projects.filter((p) => !p.archived);
  const canStart = activeProjects.length > 0 && !!rs.selectedProjectId;
  return `
    <div class="mini-bar idle-empty" dir="${dir}">
      <span class="mini-title">${t('header_title')}</span>
      <button id="btn-start" class="mini-action" title="${t('btn_start')}" ${canStart ? '' : 'disabled'}>
        <span class="material-symbols-outlined">play_arrow</span>
      </button>
      <button id="btn-expand" class="mini-action" title="${t('expand')}">
        <span class="material-symbols-outlined">open_in_full</span>
      </button>
    </div>
  `;
}

function renderView(state: AppState, rs: RenderState): string {
  switch (rs.view) {
    case 'timer':
      return renderTimerView(state, rs);
    case 'report':
      return renderReportView(state, rs);
    case 'projects':
      return renderProjectsView(state, rs);
    case 'settings':
      return renderSettingsView(state, rs);
    default:
      return '';
  }
}

function renderNavTabs(view: ViewName): string {
  const tabs: Array<{ id: ViewName; icon: string; key: string }> = [
    { id: 'timer', icon: '<span class="material-symbols-outlined">timer</span>', key: 'nav_timer' },
    { id: 'report', icon: '<span class="material-symbols-outlined">pie_chart</span>', key: 'nav_report' },
    { id: 'projects', icon: '<span class="material-symbols-outlined">folder</span>', key: 'nav_projects' },
    { id: 'settings', icon: '<span class="material-symbols-outlined">settings</span>', key: 'nav_settings' },
  ];
  return `
    <nav class="nav-tabs">
      ${tabs
        .map(
          (tab) => `
        <button class="nav-tab ${view === tab.id ? 'active' : ''}" data-view="${tab.id}">
          <span class="nav-tab-icon">${tab.icon}</span>
          <span>${t(tab.key)}</span>
        </button>
      `
        )
        .join('')}
    </nav>
  `;
}

// ----------------------------------------------------------------
// Timer View
// ----------------------------------------------------------------

function renderTimerView(state: AppState, rs: RenderState): string {
  const active = state.activeSession;
  const activeProjects = state.projects.filter((p) => !p.archived);
  const selectedProjectId = active ? active.projectId : rs.selectedProjectId;
  const selectedPhase = active ? active.phase : rs.selectedPhase;
  const allPhases = [...PHASES, ...state.customPhases];

  const canStart = !active && activeProjects.length > 0 && !!selectedProjectId;
  const canStop = !!active;
  const isPaused = !!(active?.idlePaused || active?.manualPaused);
  const canResumePause = !!active?.manualPaused;

  const timerText = active ? formatTime(active.duration) : '00:00:00';
  const timerClass = active ? (isPaused ? 'idle' : 'running') : '';

  // The hero circle mirrors Start when idle, Pause/Resume when a session is
  // running: one primary action instead of duplicating it in the row below.
  const heroIcon = !active ? 'play_arrow' : canResumePause ? 'play_arrow' : 'pause';
  const heroId = !active ? 'btn-start' : canResumePause ? 'btn-resume-pause' : 'btn-pause';
  const heroDisabled = !active && !canStart;

  const statusClass = !active ? '' : isPaused ? 'paused' : 'running';
  const statusLabel = !active
    ? ''
    : isPaused
      ? t('status_paused')
      : t('status_running');

  return `
    <div class="timer-hero">
      <button id="${heroId}" class="timer-circle-btn" ${heroDisabled ? 'disabled' : ''}>
        <span class="material-symbols-outlined">${heroIcon}</span>
      </button>
      <div class="timer-hero-info">
        <div class="timer-display ${timerClass}" id="timer-display">${timerText}</div>
        ${statusLabel ? `<div class="timer-status ${statusClass}"><span class="status-dot"></span>${statusLabel}</div>` : ''}
      </div>
    </div>

    ${
      active?.idlePaused
        ? `
      <div class="idle-banner">
        <span class="material-symbols-outlined">pause_circle</span>
        <span class="idle-banner-text">${t('idle_banner')}</span>
        <button id="btn-resume-idle" class="btn btn-sm btn-secondary"><span class="material-symbols-outlined">play_arrow</span> ${t('btn_resume')}</button>
      </div>
    `
        : ''
    }

    <div class="field">
      <label class="field-label">${t('label_project')}</label>
      <div class="project-field-wrap">
        <span class="project-field-icon material-symbols-outlined">description</span>
        <select id="project-select" class="select" ${active ? 'disabled' : ''}>
          ${
            activeProjects.length === 0
              ? `<option value="">${t('empty_project')}</option>`
              : `${
                  !selectedProjectId
                    ? `<option value="">${t('choose_project')}</option>`
                    : ''
                }${activeProjects
                  .map(
                    (p) =>
                      `<option value="${p.id}" ${
                        p.id === selectedProjectId ? 'selected' : ''
                      }>${escapeHtml(p.name)}</option>`
                  )
                  .join('')}`
          }
        </select>
      </div>
    </div>

    <div class="field">
      <label class="field-label">${t('label_phase')}</label>
      <div class="phase-select-row">
        <select id="phase-select" class="select" ${active ? 'disabled' : ''}>
          ${allPhases
            .map(
              (ph) => `
            <option value="${escapeHtml(ph)}" ${ph === selectedPhase ? 'selected' : ''}>${escapeHtml(ph)}</option>
          `
            )
            .join('')}
        </select>
        ${
          !active
            ? `<button id="btn-toggle-new-phase" class="btn-icon" title="${t('btn_add_phase')}"><span class="material-symbols-outlined">add</span></button>`
            : ''
        }
      </div>
    </div>

    ${rs.showNewPhaseForm && !active ? renderNewPhaseForm(state.customPhases) : ''}

    <div class="buttons-row">
      <button id="btn-stop" class="btn btn-danger" ${canStop ? '' : 'disabled'}><span class="material-symbols-outlined">stop</span> ${t('btn_stop')}</button>
    </div>

    ${renderTodayBreakdown(state)}
    ${renderDayGoal(state)}
  `;
}

function renderDayGoal(state: AppState): string {
  const goalSeconds = state.settings.workDayHours * 3600;
  if (goalSeconds <= 0) return '';
  const breakdown = getTodayPhaseBreakdown(state);
  const total = breakdown.reduce((a, b) => a + b.duration, 0);
  const pct = Math.min(100, (total / goalSeconds) * 100);
  return `
    <div class="day-goal">
      <div class="day-goal-label">
        <span>${t('day_goal')}</span>
        <span>${formatDuration(total)} / ${state.settings.workDayHours}h</span>
      </div>
      <div class="day-goal-track">
        <div class="day-goal-fill" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function renderNewPhaseForm(customPhases: Phase[]): string {
  return `
    <div class="new-project-form">
      <div class="new-project-form-title">${t('new_phase')}</div>
      <input
        id="new-phase-name"
        class="input"
        type="text"
        placeholder="${t('new_phase_placeholder')}"
        maxlength="40"
      />
      <div class="form-actions">
        <button id="btn-create-phase" class="btn btn-primary btn-sm">${t('btn_create')}</button>
      </div>
      ${
        customPhases.length > 0
          ? `
        <div class="field-label" style="margin-top:12px;margin-bottom:6px">${t('your_phases')}</div>
        <div class="phase-chip-list">
          ${customPhases
            .map(
              (ph) => `
            <span class="phase-chip">
              ${escapeHtml(ph)}
              <button class="phase-chip-remove" data-phase="${escapeHtml(ph)}" title="${t('btn_delete_phase')}">
                <span class="material-symbols-outlined">close</span>
              </button>
            </span>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }
    </div>
  `;
}

function renderTodayBreakdown(state: AppState): string {
  const breakdown = getTodayPhaseBreakdown(state);
  if (breakdown.length === 0) {
    return `
      <div class="section-title">${t('today')}</div>
      <div class="empty-state">
        <div class="empty-state-text">${t('today_empty').replace('\n', '<br>')}</div>
      </div>
    `;
  }
  const total = breakdown.reduce((a, b) => a + b.duration, 0);
  return `
    <div class="section-title-row">
      <span class="section-title">${t('today')}</span>
      <span class="section-title-value">${formatDuration(total)}</span>
    </div>
    <div class="segmented-bar">
      ${breakdown
        .map(
          (b) =>
            `<div class="segmented-bar-fill" style="width:${b.pct}%; background:${getPhaseColor(b.phase)}"></div>`
        )
        .join('')}
    </div>
    <div class="segmented-legend">
      ${breakdown
        .map(
          (b) => `
        <span class="segmented-legend-item">
          <span class="phase-dot" style="background:${getPhaseColor(b.phase)}"></span>
          ${escapeHtml(b.phase)}
          <span class="segmented-legend-duration">${formatDuration(b.duration)}</span>
        </span>
      `
        )
        .join('')}
    </div>
  `;
}

// ----------------------------------------------------------------
// Report View
// ----------------------------------------------------------------

function renderReportView(state: AppState, rs: RenderState): string {
  const { label } = getPeriodRange(rs.granularity, rs.periodOffset);
  const sessions = getPeriodSessions(state, rs.granularity, rs.periodOffset, rs.reportProjectFilter);
  const total = sessions.reduce((a, s) => a + s.duration, 0);
  const isCurrentPeriod = rs.periodOffset >= 0;

  const filterLabel =
    rs.reportProjectFilter !== 'all'
      ? getProjectName(state, rs.reportProjectFilter)
      : null;

  const granularities: Granularity[] = ['day', 'week', 'month', 'year'];
  const granLabels: Record<Granularity, string> = {
    day: t('gran_day'),
    week: t('gran_week'),
    month: t('gran_month'),
    year: t('gran_year'),
  };

  return `
    <div class="granularity-tabs">
      ${granularities
        .map(
          (g) => `
        <button class="granularity-tab ${rs.granularity === g ? 'active' : ''}" data-granularity="${g}">${granLabels[g]}</button>
      `
        )
        .join('')}
    </div>

    <div class="report-nav">
      <button id="btn-period-prev" class="btn-icon"><span class="material-symbols-outlined">chevron_left</span></button>
      <div class="week-label-block">
        <div class="week-label-text">${label}</div>
        ${
          filterLabel
            ? `<div class="week-filter-badge">
                 <span><span class="material-symbols-outlined">folder</span> ${escapeHtml(filterLabel)}</span>
                 <button id="btn-clear-filter" class="week-filter-clear"><span class="material-symbols-outlined">close</span></button>
               </div>`
            : `<div class="week-filter-badge" style="color:var(--text-muted)">${t('all_projects')}</div>`
        }
      </div>
      <button id="btn-period-next" class="btn-icon" ${isCurrentPeriod ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_right</span></button>
    </div>

    <div class="report-total">
      <span class="report-total-label">${t('period_total')}</span>
      <span class="report-total-value">${formatDuration(total)}</span>
    </div>

    ${
      sessions.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon"><span class="material-symbols-outlined">bar_chart</span></div>
            <div class="empty-state-text">${t('period_empty')}</div>
          </div>`
        : `
      ${rs.reportProjectFilter === 'all' ? renderProjectBreakdown(state, sessions) : ''}
      ${renderPhaseBreakdown(sessions)}
      ${renderSubBreakdown(sessions, rs.granularity)}
      ${renderSessionsList(sessions, state)}
      <div class="export-buttons">
        <button id="btn-export-csv" class="btn btn-secondary"><span class="material-symbols-outlined">download</span> ${t('export_csv')}</button>
        <button id="btn-export-pdf" class="btn btn-secondary"><span class="material-symbols-outlined">picture_as_pdf</span> ${t('export_pdf')}</button>
      </div>
    `
    }

    ${renderCustomExportSection(rs)}
  `;
}

function renderProjectBreakdown(state: AppState, sessions: Session[]): string {
  const grouped = groupByProject(state, sessions);
  if (grouped.length < 2) return ''; // not useful with a single project in view
  const max = Math.max(...grouped.map((g) => g.duration));
  return `
    <div class="section-title">${t('by_project')}</div>
    ${grouped
      .map((g) => {
        const pct = (g.duration / max) * 100;
        return `
      <div class="phase-bar-row">
        <div class="phase-bar-label">${escapeHtml(g.name)}</div>
        <div class="phase-bar-track">
          <div class="phase-bar-fill" style="width:${pct}%; background:${g.color}"></div>
        </div>
        <div class="phase-bar-duration">${formatDuration(g.duration)}</div>
      </div>
    `;
      })
      .join('')}
  `;
}

function renderCustomExportSection(rs: RenderState): string {
  return `
    <div class="custom-export">
      <button id="btn-toggle-custom-export" class="link-btn">
        <span class="material-symbols-outlined">event</span> ${t('custom_export')}
      </button>
      ${
        rs.showCustomExport
          ? `
        <div class="custom-export-form">
          <div class="custom-export-dates">
            <input id="custom-export-from" class="input" type="date" value="${rs.customExportFrom}" />
            <span>→</span>
            <input id="custom-export-to" class="input" type="date" value="${rs.customExportTo}" />
          </div>
          <div class="export-buttons">
            <button id="btn-custom-export-csv" class="btn btn-secondary"><span class="material-symbols-outlined">download</span> ${t('export_csv')}</button>
            <button id="btn-custom-export-pdf" class="btn btn-secondary"><span class="material-symbols-outlined">picture_as_pdf</span> ${t('export_pdf')}</button>
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;
}

// Day → nothing extra (already a single day). Week → by day. Month → by day
// of month. Year → by month.
function renderSubBreakdown(sessions: Session[], granularity: Granularity): string {
  if (granularity === 'day') return '';
  if (granularity === 'year') {
    const grouped = groupByMonth(sessions);
    if (grouped.length === 0) return '';
    const max = Math.max(...grouped.map((g) => g.duration));
    return `
      <div class="section-title">${t('by_month')}</div>
      ${grouped
        .map((g) => {
          const pct = (g.duration / max) * 100;
          return `
        <div class="day-bar-row">
          <div class="day-bar-label">${g.label}</div>
          <div class="day-bar-track">
            <div class="day-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="day-bar-duration">${formatDuration(g.duration)}</div>
        </div>
      `;
        })
        .join('')}
    `;
  }
  const grouped = granularity === 'month' ? groupByDayOfMonth(sessions) : groupByDay(sessions);
  return renderDayBreakdown(grouped);
}

function renderPhaseBreakdown(sessions: Session[]): string {
  const grouped = groupByPhase(sessions);
  if (grouped.length === 0) return '';
  const total = grouped.reduce((a, b) => a + b.duration, 0);
  const max = Math.max(...grouped.map((g) => g.duration));
  return `
    <div class="section-title">${t('by_phase')}</div>
    ${grouped
      .map((g) => {
        const pctOfMax = (g.duration / max) * 100;
        const pctOfTotal = Math.round((g.duration / total) * 100);
        return `
      <div class="phase-bar-row">
        <div class="phase-bar-label">${escapeHtml(g.phase)}</div>
        <div class="phase-bar-track">
          <div class="phase-bar-fill" style="width:${pctOfMax}%; background:${getPhaseColor(g.phase)}"></div>
        </div>
        <div class="phase-bar-duration">${formatDuration(g.duration)}</div>
        <div class="phase-bar-pct">${pctOfTotal}%</div>
      </div>
    `;
      })
      .join('')}
  `;
}

function renderDayBreakdown(
  grouped: Array<{ label: string; duration: number }>
): string {
  if (grouped.length === 0) return '';
  const max = Math.max(...grouped.map((g) => g.duration));
  return `
    <div class="section-title">${t('by_day')}</div>
    ${grouped
      .map((g) => {
        const pct = (g.duration / max) * 100;
        return `
      <div class="day-bar-row">
        <div class="day-bar-label">${g.label}</div>
        <div class="day-bar-track">
          <div class="day-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="day-bar-duration">${formatDuration(g.duration)}</div>
      </div>
    `;
      })
      .join('')}
  `;
}

function renderSessionsList(sessions: Session[], state: AppState): string {
  // sessions came from getPeriodSessions which returns a fresh filter()
  // array, so we can sort it in place; no need to copy.
  const sorted = sessions.sort((a, b) => b.startedAt - a.startedAt);
  return `
    <div class="section-title">${t('sessions_count')} (${sessions.length})</div>
    <div class="sessions-list">
      ${sorted
        .map((s) => {
          const date = new Date(s.startedAt);
          const locale = getLocale();
          const dayLabel = date.toLocaleDateString(locale, {
            weekday: 'short',
            day: 'numeric',
          });
          const timeLabel = date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          });
          const phaseColor = getPhaseColor(s.phase);
          return `
        <div class="session-card">
          <div class="session-card-header">
            <span class="session-phase-badge" style="background:${phaseColor}25;color:${phaseColor}">${escapeHtml(s.phase)}</span>
            <span class="session-date">${dayLabel} ${timeLabel}</span>
            <span class="session-project">${escapeHtml(getProjectName(state, s.projectId))}</span>
            <button class="session-edit-btn" data-session-id="${s.id}" title="${t('btn_edit_session')}">
              <span class="material-symbols-outlined">edit</span>
            </button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
            <div class="session-duration">${formatDuration(s.duration)}</div>
            ${s.user ? `<div class="session-user"><span class="material-symbols-outlined">person</span> ${escapeHtml(s.user)}</div>` : ''}
          </div>
          ${s.note ? `<div class="session-note">${escapeHtml(s.note)}</div>` : ''}
        </div>
      `;
        })
        .join('')}
    </div>
  `;
}

// ----------------------------------------------------------------
// Projects View
// ----------------------------------------------------------------

type ProjectStat = { count: number; total: number };

function buildProjectStats(state: AppState): Map<string, ProjectStat> {
  // Single pass over sessions instead of 3 filter()s per project per render.
  const map = new Map<string, ProjectStat>();
  for (const s of state.sessions) {
    const cur = map.get(s.projectId);
    if (cur) {
      cur.count += 1;
      cur.total += s.duration;
    } else {
      map.set(s.projectId, { count: 1, total: s.duration });
    }
  }
  return map;
}

function renderProjectsView(state: AppState, rs: RenderState): string {
  const active = state.projects.filter((p) => !p.archived);
  const archived = state.projects.filter((p) => p.archived);
  const stats = buildProjectStats(state);

  return `
    <div class="projects-header">
      <span class="projects-header-title">${t('projects_title')}</span>
      <button id="btn-toggle-new-project" class="btn btn-primary btn-sm">
        ${rs.showNewProjectForm ? `<span class="material-symbols-outlined">close</span> ${t('btn_cancel')}` : `<span class="material-symbols-outlined">add</span> ${t('btn_new')}`}
      </button>
    </div>

    ${rs.showNewProjectForm ? renderNewProjectForm(rs.newProjectColor) : ''}

    ${
      active.length === 0 && archived.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon"><span class="material-symbols-outlined">folder_open</span></div>
            <div class="empty-state-text">${t('projects_empty').replace('\n', '<br>')}</div>
          </div>`
        : ''
    }

    ${active.map((p) => renderProjectItem(p, state, stats, rs)).join('')}

    ${
      archived.length > 0
        ? `
      <div class="section-title">${t('archived')}</div>
      ${archived.map((p) => renderProjectItem(p, state, stats, rs)).join('')}
    `
        : ''
    }
  `;
}

function renderProjectItem(
  p: Project,
  state: AppState,
  stats: Map<string, ProjectStat>,
  rs: RenderState
): string {
  const stat = stats.get(p.id) ?? { count: 0, total: 0 };
  const isActive = state.activeSession?.projectId === p.id;
  const sessionLabel = stat.count > 1 ? t('session_plural') : t('session_singular');
  const { avgWeeklyTime } = estimateProject(state, p.id);
  const isEditing = rs.editingProjectId === p.id;

  return `
    <div class="project-item-wrap">
      <div class="project-item ${p.archived ? 'archived' : ''}" data-project-id="${p.id}">
        <div class="color-dot" style="background:${p.color}"></div>
        <div class="project-info">
          <div class="project-name">${escapeHtml(p.name)}</div>
          <div class="project-meta">
            ${stat.count} ${sessionLabel}
            ${avgWeeklyTime > 0 ? ` · ${t('pace_avg')} ${formatDuration(avgWeeklyTime)}/${t('pace_week')}` : ''}
          </div>
        </div>
        ${isActive ? `<span class="active-badge">${t('active_badge')}</span>` : ''}
        <div class="project-time">${formatDuration(stat.total)}</div>
        <button class="project-edit-btn" data-edit-id="${p.id}" title="${t('btn_edit_project')}">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="project-archive-btn" data-archive-id="${p.id}" title="${p.archived ? t('unarchive_title') : t('archive_title')}">
          ${p.archived ? '<span class="material-symbols-outlined">unarchive</span>' : '<span class="material-symbols-outlined">archive</span>'}
        </button>
      </div>
      ${isEditing ? renderEditProjectForm(p, rs.editProjectColor) : ''}
    </div>
  `;
}

function renderEditProjectForm(p: Project, selectedColor: string): string {
  return `
    <div class="new-project-form">
      <input
        id="edit-project-name"
        class="input"
        type="text"
        value="${escapeHtml(p.name)}"
        maxlength="60"
      />
      <div class="field-label" style="margin-top:12px;margin-bottom:6px">${t('label_color')}</div>
      <div class="color-palette">
        ${PROJECT_PALETTE.map(
          (c) => `
          <button
            class="color-swatch ${c === selectedColor ? 'selected' : ''}"
            data-color="${c}"
            style="background:${c}"
          ></button>
        `
        ).join('')}
      </div>
      <div class="form-actions">
        <button id="btn-cancel-edit-project" class="btn btn-ghost btn-sm">${t('btn_cancel')}</button>
        <button id="btn-save-edit-project" class="btn btn-primary btn-sm">${t('btn_save')}</button>
      </div>
    </div>
  `;
}

function renderNewProjectForm(selectedColor: string): string {
  return `
    <div class="new-project-form">
      <div class="new-project-form-title">${t('new_project')}</div>
      <input
        id="new-project-name"
        class="input"
        type="text"
        placeholder="${t('project_name_placeholder')}"
        maxlength="60"
      />
      <div class="field-label" style="margin-top:12px;margin-bottom:6px">${t('label_color')}</div>
      <div class="color-palette">
        ${PROJECT_PALETTE.map(
          (c) => `
          <button
            class="color-swatch ${c === selectedColor ? 'selected' : ''}"
            data-color="${c}"
            style="background:${c}"
          ></button>
        `
        ).join('')}
      </div>
      <div class="form-actions">
        <button id="btn-create-project" class="btn btn-primary btn-sm">${t('btn_create')}</button>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------
// Settings View
// ----------------------------------------------------------------

function renderSettingsView(state: AppState, rs: RenderState): string {
  const { idleThreshold, workDayHours } = state.settings;

  const idleOptions = [
    { v: 120, label: '2 min' },
    { v: 300, label: '5 min' },
    { v: 600, label: '10 min' },
    { v: 900, label: '15 min' },
    { v: 1800, label: '30 min' },
  ];

  const hoursOptions = [6, 7, 8, 9, 10];

  const currentLang = getLang();

  return `
    <div class="settings-section">
      <div class="field">
        <label class="field-label">${t('label_user')}</label>
        <input
          id="username-input"
          class="input"
          type="text"
          placeholder="${t('user_name_placeholder')}"
          maxlength="40"
          value="${escapeHtml(state.settings.userName)}"
        />
      </div>
      <div class="field">
        <label class="field-label">${t('label_language')}</label>
        <select id="lang-select" class="select">
          ${LANGS.map(
            (l) =>
              `<option value="${l}" ${l === currentLang ? 'selected' : ''}>${LANG_LABELS[l]}</option>`
          ).join('')}
        </select>
      </div>
      <div class="field">
        <label class="field-label">${t('idle_timeout')}</label>
        <select id="idle-select" class="select" dir="ltr">
          ${idleOptions
            .map(
              (o) =>
                `<option value="${o.v}" ${o.v === idleThreshold ? 'selected' : ''}>${o.label}</option>`
            )
            .join('')}
        </select>
      </div>
      <div class="field">
        <label class="field-label">${t('work_day')}</label>
        <select id="workday-select" class="select" dir="ltr">
          ${hoursOptions
            .map(
              (h) =>
                `<option value="${h}" ${h === workDayHours ? 'selected' : ''}>${h}h</option>`
            )
            .join('')}
        </select>
      </div>
    </div>

    <div class="section-title">${t('about')}</div>
    <div class="empty-state" style="text-align:left;padding:12px;font-size:11px">
      <div><strong>${state.projects.length}</strong> ${state.projects.length === 1 ? t('project_singular') : t('projects_count')}</div>
      <div><strong>${state.sessions.length}</strong> ${state.sessions.length === 1 ? t('sessions_recorded_singular') : t('sessions_recorded')}</div>
    </div>

    <div class="danger-zone">
      <div class="section-title" style="color:var(--danger);margin-top:0">${t('danger_zone')}</div>
      ${
        rs.confirmingClear
          ? `
        <div class="confirm-text">
          ${t('danger_confirm')}
        </div>
        <div class="danger-buttons">
          <button id="btn-cancel-clear" class="btn btn-ghost btn-sm">${t('btn_cancel_clear')}</button>
          <button id="btn-confirm-clear-real" class="btn btn-danger btn-sm">${t('btn_confirm_clear')}</button>
        </div>
      `
          : `
        <button id="btn-clear-data" class="btn btn-danger-outline btn-sm">${t('btn_clear_data')}</button>
      `
      }
    </div>
  `;
}

// ----------------------------------------------------------------
// Note Modal
// ----------------------------------------------------------------

function renderNoteModal(): string {
  return `
    <div class="modal-overlay">
      <div class="modal-card">
        <div class="modal-title">${t('note_title')}</div>
        <div class="modal-sub">${t('note_sub')}</div>
        <textarea
          id="session-note-input"
          class="textarea"
          placeholder="${t('note_placeholder')}"
          autofocus
        ></textarea>
        <div class="modal-actions">
          <button id="btn-skip-note" class="btn btn-ghost btn-sm">${t('btn_skip')}</button>
          <button id="btn-save-note" class="btn btn-primary btn-sm">${t('btn_save')}</button>
        </div>
      </div>
    </div>
  `;
}

function renderEditSessionModal(state: AppState, sessionId: string): string {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return '';
  // Include the session's own phase even if it's since been deleted from
  // customPhases, so editing never silently discards the original value.
  const allPhases = Array.from(new Set([...PHASES, ...state.customPhases, session.phase]));
  const minutes = Math.round(session.duration / 60);

  return `
    <div class="modal-overlay">
      <div class="modal-card">
        <div class="modal-title">${t('edit_session_title')}</div>
        <div class="field">
          <label class="field-label">${t('label_phase')}</label>
          <select id="edit-session-phase" class="select">
            ${allPhases
              .map(
                (ph) =>
                  `<option value="${escapeHtml(ph)}" ${ph === session.phase ? 'selected' : ''}>${escapeHtml(ph)}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="field">
          <label class="field-label">${t('label_duration_minutes')}</label>
          <input id="edit-session-duration" class="input" type="number" min="0" step="1" value="${minutes}" />
        </div>
        <div class="field">
          <label class="field-label">${t('note_title')}</label>
          <textarea id="edit-session-note" class="textarea">${escapeHtml(session.note)}</textarea>
        </div>
        <div class="modal-actions" style="justify-content:space-between">
          <button id="btn-delete-session" class="btn btn-danger-outline btn-sm">${t('btn_delete_session')}</button>
          <div style="display:flex;gap:8px">
            <button id="btn-cancel-edit-session" class="btn btn-ghost btn-sm">${t('btn_cancel')}</button>
            <button id="btn-save-edit-session" class="btn btn-primary btn-sm">${t('btn_save')}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ================================================================
// EVENT LISTENERS
// ================================================================

function attachListeners(
  app: HTMLElement,
  state: AppState,
  rs: RenderState,
  cb: Callbacks
): void {
  // Mini bar (replaces full UI)
  if (rs.isMinimized) {
    app
      .querySelector<HTMLButtonElement>('#btn-expand')
      ?.addEventListener('click', cb.onToggleMinimize);
    app
      .querySelector<HTMLButtonElement>('#btn-start')
      ?.addEventListener('click', cb.onStart);
    app
      .querySelector<HTMLButtonElement>('#btn-stop')
      ?.addEventListener('click', cb.onStop);
    app
      .querySelector<HTMLButtonElement>('#btn-pause')
      ?.addEventListener('click', cb.onPause);
    app
      .querySelector<HTMLButtonElement>('#btn-resume-pause')
      ?.addEventListener('click', cb.onResumePause);
    return;
  }

  // Header minimize
  app
    .querySelector<HTMLButtonElement>('#btn-minimize')
    ?.addEventListener('click', cb.onToggleMinimize);

  // Nav tabs
  app.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const v = tab.getAttribute('data-view') as ViewName | null;
      if (v) cb.onViewChange(v);
    });
  });

  // View-specific
  if (rs.view === 'timer') attachTimerListeners(app, rs, cb);
  if (rs.view === 'report') attachReportListeners(app, rs, cb);
  if (rs.view === 'projects') attachProjectsListeners(app, rs, cb);
  if (rs.view === 'settings') attachSettingsListeners(app, state, cb);

  // Modal
  if (rs.showNoteModal) attachModalListeners(app, cb);
  if (rs.editingSessionId) attachEditSessionModalListeners(app, rs.editingSessionId, cb);
}

function attachTimerListeners(app: HTMLElement, rs: RenderState, cb: Callbacks): void {
  const projectSelect = app.querySelector<HTMLSelectElement>('#project-select');
  const phaseSelect = app.querySelector<HTMLSelectElement>('#phase-select');
  const btnStart = app.querySelector<HTMLButtonElement>('#btn-start');
  const btnStop = app.querySelector<HTMLButtonElement>('#btn-stop');
  const btnPause = app.querySelector<HTMLButtonElement>('#btn-pause');
  const btnResumePause = app.querySelector<HTMLButtonElement>('#btn-resume-pause');
  const btnResumeIdle = app.querySelector<HTMLButtonElement>('#btn-resume-idle');
  const btnToggleNewPhase = app.querySelector<HTMLButtonElement>('#btn-toggle-new-phase');

  if (projectSelect) {
    projectSelect.addEventListener('change', () =>
      cb.onProjectSelectChange(projectSelect.value)
    );
  }
  if (phaseSelect) {
    phaseSelect.addEventListener('change', () =>
      cb.onPhaseChange(phaseSelect.value as Phase)
    );
  }
  if (btnStart) btnStart.addEventListener('click', cb.onStart);
  if (btnStop) btnStop.addEventListener('click', cb.onStop);
  if (btnPause) btnPause.addEventListener('click', cb.onPause);
  if (btnResumePause) btnResumePause.addEventListener('click', cb.onResumePause);
  if (btnResumeIdle) btnResumeIdle.addEventListener('click', cb.onResumeIdle);
  if (btnToggleNewPhase) btnToggleNewPhase.addEventListener('click', cb.onToggleNewPhaseForm);

  if (rs.showNewPhaseForm) {
    const btnCreate = app.querySelector<HTMLButtonElement>('#btn-create-phase');
    const nameInput = app.querySelector<HTMLInputElement>('#new-phase-name');
    const submit = () => {
      const name = nameInput?.value.trim() ?? '';
      if (!name) {
        nameInput?.focus();
        return;
      }
      cb.onCreatePhase(name);
    };
    if (btnCreate) btnCreate.addEventListener('click', submit);
    if (nameInput) {
      nameInput.focus();
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    }

    app.querySelectorAll<HTMLButtonElement>('.phase-chip-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ph = btn.getAttribute('data-phase');
        if (ph) cb.onDeletePhase(ph);
      });
    });
  }
}

function attachReportListeners(app: HTMLElement, rs: RenderState, cb: Callbacks): void {
  app
    .querySelector<HTMLButtonElement>('#btn-period-prev')
    ?.addEventListener('click', cb.onPeriodPrev);
  app
    .querySelector<HTMLButtonElement>('#btn-period-next')
    ?.addEventListener('click', cb.onPeriodNext);
  app
    .querySelector<HTMLButtonElement>('#btn-clear-filter')
    ?.addEventListener('click', cb.onClearFilter);
  app
    .querySelector<HTMLButtonElement>('#btn-export-csv')
    ?.addEventListener('click', cb.onExportCSV);
  app
    .querySelector<HTMLButtonElement>('#btn-export-pdf')
    ?.addEventListener('click', cb.onExportPDF);
  app.querySelectorAll<HTMLButtonElement>('.granularity-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const g = tab.getAttribute('data-granularity') as Granularity | null;
      if (g) cb.onGranularityChange(g);
    });
  });

  app
    .querySelector<HTMLButtonElement>('#btn-toggle-custom-export')
    ?.addEventListener('click', cb.onToggleCustomExport);

  if (rs.showCustomExport) {
    const fromInput = app.querySelector<HTMLInputElement>('#custom-export-from');
    const toInput = app.querySelector<HTMLInputElement>('#custom-export-to');
    fromInput?.addEventListener('change', () => cb.onCustomExportFromChange(fromInput.value));
    toInput?.addEventListener('change', () => cb.onCustomExportToChange(toInput.value));
    app
      .querySelector<HTMLButtonElement>('#btn-custom-export-csv')
      ?.addEventListener('click', cb.onCustomExportCSV);
    app
      .querySelector<HTMLButtonElement>('#btn-custom-export-pdf')
      ?.addEventListener('click', cb.onCustomExportPDF);
  }

  // Edit button on each session card
  app.querySelectorAll<HTMLButtonElement>('.session-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-session-id');
      if (id) cb.onEditSessionOpen(id);
    });
  });
}

function attachProjectsListeners(
  app: HTMLElement,
  rs: RenderState,
  cb: Callbacks
): void {
  app
    .querySelector<HTMLButtonElement>('#btn-toggle-new-project')
    ?.addEventListener('click', cb.onToggleNewProjectForm);

  // Project items (click → drill into report)
  app.querySelectorAll<HTMLElement>('.project-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      // If the archive/edit button was clicked, handle separately
      const target = e.target as HTMLElement;
      if (target.closest('.project-archive-btn') || target.closest('.project-edit-btn')) return;
      const id = el.getAttribute('data-project-id');
      if (id) cb.onProjectClick(id);
    });
  });

  // Archive buttons
  app.querySelectorAll<HTMLButtonElement>('.project-archive-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-archive-id');
      if (id) cb.onArchiveProject(id);
    });
  });

  // Edit buttons
  app.querySelectorAll<HTMLButtonElement>('.project-edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-edit-id');
      if (id) cb.onToggleEditProject(id);
    });
  });

  // New project form
  if (rs.showNewProjectForm) {
    app.querySelectorAll<HTMLButtonElement>('.color-swatch').forEach((sw) => {
      sw.addEventListener('click', () => {
        const c = sw.getAttribute('data-color');
        if (c) {
          cb.onNewProjectColorChange(c);
          // Update selection visually without full re-render
          app
            .querySelectorAll('.color-swatch')
            .forEach((s) => s.classList.remove('selected'));
          sw.classList.add('selected');
        }
      });
    });

    const btnCreate = app.querySelector<HTMLButtonElement>('#btn-create-project');
    const nameInput = app.querySelector<HTMLInputElement>('#new-project-name');

    const submit = () => {
      const name = nameInput?.value.trim() ?? '';
      if (!name) {
        nameInput?.focus();
        return;
      }
      cb.onNewProject(name, rs.newProjectColor);
    };

    if (btnCreate) btnCreate.addEventListener('click', submit);
    if (nameInput) {
      nameInput.focus();
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    }
  }

  // Edit project form
  if (rs.editingProjectId) {
    app.querySelectorAll<HTMLButtonElement>('.color-swatch').forEach((sw) => {
      sw.addEventListener('click', () => {
        const c = sw.getAttribute('data-color');
        if (c) {
          cb.onEditProjectColorChange(c);
          app
            .querySelectorAll('.color-swatch')
            .forEach((s) => s.classList.remove('selected'));
          sw.classList.add('selected');
        }
      });
    });

    const nameInput = app.querySelector<HTMLInputElement>('#edit-project-name');
    const submit = () => {
      const name = nameInput?.value.trim() ?? '';
      if (!name || !rs.editingProjectId) return;
      cb.onSaveProjectEdit(rs.editingProjectId, name, rs.editProjectColor);
    };

    app
      .querySelector<HTMLButtonElement>('#btn-save-edit-project')
      ?.addEventListener('click', submit);
    app
      .querySelector<HTMLButtonElement>('#btn-cancel-edit-project')
      ?.addEventListener('click', () => cb.onToggleEditProject(rs.editingProjectId!));
    if (nameInput) {
      nameInput.focus();
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    }
  }
}

function attachSettingsListeners(
  app: HTMLElement,
  state: AppState,
  cb: Callbacks
): void {
  const langSelect = app.querySelector<HTMLSelectElement>('#lang-select');
  const idleSelect = app.querySelector<HTMLSelectElement>('#idle-select');
  const workdaySelect = app.querySelector<HTMLSelectElement>('#workday-select');
  const usernameInput = app.querySelector<HTMLInputElement>('#username-input');

  if (usernameInput) {
    usernameInput.addEventListener('change', () => {
      cb.onUserNameChange(usernameInput.value);
    });
  }

  if (langSelect) {
    langSelect.addEventListener('change', () => {
      cb.onLangChange(langSelect.value as Lang);
    });
  }

  const saveIfChanged = () => {
    if (!idleSelect || !workdaySelect) return;
    cb.onSaveSettings({
      idleThreshold: parseInt(idleSelect.value, 10),
      workDayHours: parseInt(workdaySelect.value, 10),
      lang: getLang(),
      userName: state.settings.userName,
    });
  };

  if (idleSelect) idleSelect.addEventListener('change', saveIfChanged);
  if (workdaySelect) workdaySelect.addEventListener('change', saveIfChanged);

  app
    .querySelector<HTMLButtonElement>('#btn-clear-data')
    ?.addEventListener('click', cb.onConfirmClear);
  app
    .querySelector<HTMLButtonElement>('#btn-cancel-clear')
    ?.addEventListener('click', cb.onCancelClear);
  app
    .querySelector<HTMLButtonElement>('#btn-confirm-clear-real')
    ?.addEventListener('click', cb.onClearData);
}

function attachModalListeners(app: HTMLElement, cb: Callbacks): void {
  const input = app.querySelector<HTMLTextAreaElement>('#session-note-input');
  const btnSave = app.querySelector<HTMLButtonElement>('#btn-save-note');
  const btnSkip = app.querySelector<HTMLButtonElement>('#btn-skip-note');

  if (input) input.focus();

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const note = input?.value.trim() ?? '';
      cb.onNoteSubmit(note);
    });
  }
  if (btnSkip) btnSkip.addEventListener('click', cb.onNoteSkip);

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const note = input.value.trim();
        cb.onNoteSubmit(note);
      }
    });
  }
}

function attachEditSessionModalListeners(
  app: HTMLElement,
  sessionId: string,
  cb: Callbacks
): void {
  const phaseSelect = app.querySelector<HTMLSelectElement>('#edit-session-phase');
  const durationInput = app.querySelector<HTMLInputElement>('#edit-session-duration');
  const noteInput = app.querySelector<HTMLTextAreaElement>('#edit-session-note');

  app
    .querySelector<HTMLButtonElement>('#btn-save-edit-session')
    ?.addEventListener('click', () => {
      cb.onEditSessionSave(sessionId, {
        phase: phaseSelect?.value ?? 'Design',
        durationMinutes: parseFloat(durationInput?.value ?? '0') || 0,
        note: noteInput?.value.trim() ?? '',
      });
    });
  app
    .querySelector<HTMLButtonElement>('#btn-cancel-edit-session')
    ?.addEventListener('click', cb.onEditSessionCancel);
  app
    .querySelector<HTMLButtonElement>('#btn-delete-session')
    ?.addEventListener('click', () => cb.onEditSessionDelete(sessionId));
}
