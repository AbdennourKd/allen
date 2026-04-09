// DOM rendering layer — 4 views + modals + nav.
// render() = full re-render (state/view change).
// updateTimerDisplay() = cheap per-tick update (timer text only).

import {
  AppState,
  Phase,
  PHASES,
  PHASE_COLORS,
  PROJECT_PALETTE,
  Project,
  Session,
  ViewName,
} from './types';
import {
  escapeHtml,
  formatDuration,
  formatTime,
  getProjectName,
  getProjectTotalTime,
  getTodayPhaseBreakdown,
  getWeekLabel,
  getWeekSessions,
  groupByDay,
  groupByPhase,
} from './helpers';

export type RenderState = {
  view: ViewName;
  weekOffset: number;
  reportProjectFilter: string;
  selectedProjectId: string;
  selectedPhase: Phase;
  showNoteModal: boolean;
  showNewProjectForm: boolean;
  newProjectColor: string;
  confirmingClear: boolean;
};

export type Callbacks = {
  onStart: () => void;
  onStop: () => void;
  onWeekPrev: () => void;
  onWeekNext: () => void;
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
  if (session.idlePaused) {
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
  return `
    <div class="header">
      <span class="header-title">Project Tracker</span>
      ${state.activeSession ? `<span class="header-sub">\u25cf en cours</span>` : ''}
    </div>
    <div class="content">
      ${renderView(state, rs)}
    </div>
    ${renderNavTabs(rs.view)}
    ${rs.showNoteModal ? renderNoteModal() : ''}
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
  const tabs: Array<{ id: ViewName; icon: string; label: string }> = [
    { id: 'timer', icon: '\u23f1', label: 'Timer' },
    { id: 'report', icon: '\ud83d\udcca', label: 'Rapport' },
    { id: 'projects', icon: '\ud83d\udcc1', label: 'Projets' },
    { id: 'settings', icon: '\u2699', label: 'R\u00e9glages' },
  ];
  return `
    <nav class="nav-tabs">
      ${tabs
        .map(
          (t) => `
        <button class="nav-tab ${view === t.id ? 'active' : ''}" data-view="${t.id}">
          <span class="nav-tab-icon">${t.icon}</span>
          <span>${t.label}</span>
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

  const canStart = !active && activeProjects.length > 0 && !!selectedProjectId;
  const canStop = !!active;

  const timerText = active ? formatTime(active.duration) : '00:00:00';
  const timerClass = active
    ? active.idlePaused
      ? 'idle'
      : 'running'
    : '';

  const phaseColor = PHASE_COLORS[selectedPhase];

  return `
    <div class="selects-row">
      <div class="field">
        <label class="field-label">Projet</label>
        <select id="project-select" class="select" ${active ? 'disabled' : ''}>
          ${
            activeProjects.length === 0
              ? `<option value="">Cr\u00e9er un projet d'abord</option>`
              : `${
                  !selectedProjectId
                    ? `<option value="">\u2014 Choisir \u2014</option>`
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
      <div class="field">
        <label class="field-label">Phase</label>
        <select id="phase-select" class="select" ${active ? 'disabled' : ''}>
          ${PHASES.map(
            (ph) => `
            <option value="${ph}" ${ph === selectedPhase ? 'selected' : ''}>${ph}</option>
          `
          ).join('')}
        </select>
      </div>
    </div>

    <div class="timer-block">
      <div class="timer-display ${timerClass}" id="timer-display">${timerText}</div>
      <div class="phase-badge">
        <span class="phase-dot" style="background:${phaseColor}"></span>
        ${selectedPhase}
      </div>
    </div>

    ${
      active?.idlePaused
        ? `
      <div class="idle-banner">
        <span class="idle-banner-text">\u23f8 Idle d\u00e9tect\u00e9 \u2014 session en pause</span>
        <button id="btn-resume-idle" class="btn btn-sm btn-secondary">Reprendre</button>
      </div>
    `
        : ''
    }

    <div class="buttons-row">
      <button id="btn-start" class="btn btn-primary" ${canStart ? '' : 'disabled'}>\u25b6 Start</button>
      <button id="btn-stop" class="btn btn-danger" ${canStop ? '' : 'disabled'}>\u25a0 Stop</button>
    </div>

    ${renderTodayBreakdown(state)}
  `;
}

function renderTodayBreakdown(state: AppState): string {
  const breakdown = getTodayPhaseBreakdown(state);
  if (breakdown.length === 0) {
    return `
      <div class="section-title">Aujourd'hui</div>
      <div class="empty-state">
        <div class="empty-state-text">Aucune session aujourd'hui.<br>Appuie sur \u25b6 Start pour commencer.</div>
      </div>
    `;
  }
  const total = breakdown.reduce((a, b) => a + b.duration, 0);
  return `
    <div class="section-title">Aujourd'hui</div>
    ${breakdown
      .map(
        (b) => `
      <div class="phase-bar-row">
        <div class="phase-bar-label">${b.phase}</div>
        <div class="phase-bar-track">
          <div class="phase-bar-fill" style="width:${b.pct}%; background:${PHASE_COLORS[b.phase]}"></div>
        </div>
        <div class="phase-bar-duration">${formatDuration(b.duration)}</div>
        <div class="phase-bar-pct">${Math.round(b.pct)}%</div>
      </div>
    `
      )
      .join('')}
    <div class="today-total">
      <span>Total</span>
      <span class="today-total-value">${formatDuration(total)}</span>
    </div>
  `;
}

// ----------------------------------------------------------------
// Report View
// ----------------------------------------------------------------

function renderReportView(state: AppState, rs: RenderState): string {
  const label = getWeekLabel(rs.weekOffset);
  const sessions = getWeekSessions(state, rs.weekOffset, rs.reportProjectFilter);
  const total = sessions.reduce((a, s) => a + s.duration, 0);
  const isCurrentWeek = rs.weekOffset >= 0;

  const filterLabel =
    rs.reportProjectFilter !== 'all'
      ? getProjectName(state, rs.reportProjectFilter)
      : null;

  return `
    <div class="report-nav">
      <button id="btn-week-prev" class="btn-icon">\u25c0</button>
      <div class="week-label-block">
        <div class="week-label-text">${label}</div>
        ${
          filterLabel
            ? `<div class="week-filter-badge">
                 <span>\ud83d\udcc1 ${escapeHtml(filterLabel)}</span>
                 <button id="btn-clear-filter" class="week-filter-clear">\u2715</button>
               </div>`
            : `<div class="week-filter-badge" style="color:var(--text-muted)">Tous les projets</div>`
        }
      </div>
      <button id="btn-week-next" class="btn-icon" ${isCurrentWeek ? 'disabled' : ''}>\u25b6</button>
    </div>

    <div class="report-total">
      <span class="report-total-label">Total semaine</span>
      <span class="report-total-value">${formatDuration(total)}</span>
    </div>

    ${
      sessions.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">\ud83d\udcca</div>
            <div class="empty-state-text">Pas de sessions cette semaine.</div>
          </div>`
        : `
      ${renderPhaseBreakdown(sessions)}
      ${renderDayBreakdown(sessions)}
      ${renderSessionsList(sessions, state)}
      <div class="export-buttons">
        <button id="btn-export-csv" class="btn btn-secondary">Export CSV</button>
        <button id="btn-export-pdf" class="btn btn-secondary">Export PDF</button>
      </div>
    `
    }
  `;
}

function renderPhaseBreakdown(sessions: Session[]): string {
  const grouped = groupByPhase(sessions);
  if (grouped.length === 0) return '';
  const total = grouped.reduce((a, b) => a + b.duration, 0);
  const max = Math.max(...grouped.map((g) => g.duration));
  return `
    <div class="section-title">Par phase</div>
    ${grouped
      .map((g) => {
        const pctOfMax = (g.duration / max) * 100;
        const pctOfTotal = Math.round((g.duration / total) * 100);
        return `
      <div class="phase-bar-row">
        <div class="phase-bar-label">${g.phase}</div>
        <div class="phase-bar-track">
          <div class="phase-bar-fill" style="width:${pctOfMax}%; background:${PHASE_COLORS[g.phase]}"></div>
        </div>
        <div class="phase-bar-duration">${formatDuration(g.duration)}</div>
        <div class="phase-bar-pct">${pctOfTotal}%</div>
      </div>
    `;
      })
      .join('')}
  `;
}

function renderDayBreakdown(sessions: Session[]): string {
  const grouped = groupByDay(sessions);
  if (grouped.length === 0) return '';
  const max = Math.max(...grouped.map((g) => g.duration));
  return `
    <div class="section-title">Par jour</div>
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
  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  return `
    <div class="section-title">Sessions (${sessions.length})</div>
    <div class="sessions-list">
      ${sorted
        .map((s) => {
          const date = new Date(s.startedAt);
          const dayLabel = date.toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
          });
          const timeLabel = date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          return `
        <div class="session-card">
          <div class="session-card-header">
            <span class="session-phase-badge" style="background:${PHASE_COLORS[s.phase]}25;color:${PHASE_COLORS[s.phase]}">${s.phase}</span>
            <span class="session-date">${dayLabel} ${timeLabel}</span>
            <span class="session-project">${escapeHtml(getProjectName(state, s.projectId))}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
            <div class="session-duration">${formatDuration(s.duration)}</div>
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

function renderProjectsView(state: AppState, rs: RenderState): string {
  const active = state.projects.filter((p) => !p.archived);
  const archived = state.projects.filter((p) => p.archived);

  return `
    <div class="projects-header">
      <span class="projects-header-title">Projets</span>
      <button id="btn-toggle-new-project" class="btn btn-primary btn-sm">
        ${rs.showNewProjectForm ? '\u2715 Annuler' : '+ Nouveau'}
      </button>
    </div>

    ${rs.showNewProjectForm ? renderNewProjectForm(rs.newProjectColor) : ''}

    ${
      active.length === 0 && archived.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">\ud83d\udcc1</div>
            <div class="empty-state-text">Aucun projet.<br>Cr\u00e9e ton premier projet pour commencer.</div>
          </div>`
        : ''
    }

    ${active.map((p) => renderProjectItem(p, state)).join('')}

    ${
      archived.length > 0
        ? `
      <div class="section-title">Archiv\u00e9s</div>
      ${archived.map((p) => renderProjectItem(p, state)).join('')}
    `
        : ''
    }
  `;
}

function renderProjectItem(p: Project, state: AppState): string {
  const total = getProjectTotalTime(state, p.id);
  const isActive = state.activeSession?.projectId === p.id;
  return `
    <div class="project-item ${p.archived ? 'archived' : ''}" data-project-id="${p.id}">
      <div class="color-dot" style="background:${p.color}"></div>
      <div class="project-info">
        <div class="project-name">${escapeHtml(p.name)}</div>
        <div class="project-meta">${
          state.sessions.filter((s) => s.projectId === p.id).length
        } session${
    state.sessions.filter((s) => s.projectId === p.id).length > 1 ? 's' : ''
  }</div>
      </div>
      ${isActive ? '<span class="active-badge">Actif</span>' : ''}
      <div class="project-time">${formatDuration(total)}</div>
      <button class="project-archive-btn" data-archive-id="${p.id}" title="${p.archived ? 'D\u00e9sarchiver' : 'Archiver'}">
        ${p.archived ? '\u21a9' : '\ud83d\uddc4'}
      </button>
    </div>
  `;
}

function renderNewProjectForm(selectedColor: string): string {
  return `
    <div class="new-project-form">
      <div class="new-project-form-title">Nouveau projet</div>
      <input
        id="new-project-name"
        class="input"
        type="text"
        placeholder="Nom du projet"
        maxlength="60"
      />
      <div class="field-label" style="margin-top:12px;margin-bottom:6px">Couleur</div>
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
        <button id="btn-create-project" class="btn btn-primary btn-sm">Cr\u00e9er</button>
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

  return `
    <div class="settings-section">
      <div class="field">
        <label class="field-label">Idle timeout</label>
        <select id="idle-select" class="select">
          ${idleOptions
            .map(
              (o) =>
                `<option value="${o.v}" ${o.v === idleThreshold ? 'selected' : ''}>${o.label}</option>`
            )
            .join('')}
        </select>
      </div>
      <div class="field">
        <label class="field-label">Journ\u00e9e type</label>
        <select id="workday-select" class="select">
          ${hoursOptions
            .map(
              (h) =>
                `<option value="${h}" ${h === workDayHours ? 'selected' : ''}>${h}h</option>`
            )
            .join('')}
        </select>
      </div>
    </div>

    <div class="section-title">\u00c0 propos</div>
    <div class="empty-state" style="text-align:left;padding:12px;font-size:11px">
      <div><strong>${state.projects.length}</strong> projets</div>
      <div><strong>${state.sessions.length}</strong> sessions enregistr\u00e9es</div>
    </div>

    <div class="danger-zone">
      <div class="section-title" style="color:var(--danger);margin-top:0">Zone dangereuse</div>
      ${
        rs.confirmingClear
          ? `
        <div class="confirm-text">
          Cette action effacera tous les projets, sessions et r\u00e9glages. Impossible \u00e0 annuler.
        </div>
        <div class="danger-buttons">
          <button id="btn-cancel-clear" class="btn btn-ghost btn-sm">Annuler</button>
          <button id="btn-confirm-clear-real" class="btn btn-danger btn-sm">Oui, tout effacer</button>
        </div>
      `
          : `
        <button id="btn-clear-data" class="btn btn-danger-outline btn-sm">Effacer toutes les donn\u00e9es</button>
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
        <div class="modal-title">Note de session</div>
        <div class="modal-sub">Optionnel \u2014 d\u00e9cris bri\u00e8vement ce que tu as fait.</div>
        <textarea
          id="session-note-input"
          class="textarea"
          placeholder="Ex: Refonte du dashboard composants..."
          autofocus
        ></textarea>
        <div class="modal-actions">
          <button id="btn-skip-note" class="btn btn-ghost btn-sm">Ignorer</button>
          <button id="btn-save-note" class="btn btn-primary btn-sm">Enregistrer</button>
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
  // Nav tabs
  app.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const v = tab.getAttribute('data-view') as ViewName | null;
      if (v) cb.onViewChange(v);
    });
  });

  // View-specific
  if (rs.view === 'timer') attachTimerListeners(app, cb);
  if (rs.view === 'report') attachReportListeners(app, cb);
  if (rs.view === 'projects') attachProjectsListeners(app, rs, cb);
  if (rs.view === 'settings') attachSettingsListeners(app, state, cb);

  // Modal
  if (rs.showNoteModal) attachModalListeners(app, cb);
}

function attachTimerListeners(app: HTMLElement, cb: Callbacks): void {
  const projectSelect = app.querySelector<HTMLSelectElement>('#project-select');
  const phaseSelect = app.querySelector<HTMLSelectElement>('#phase-select');
  const btnStart = app.querySelector<HTMLButtonElement>('#btn-start');
  const btnStop = app.querySelector<HTMLButtonElement>('#btn-stop');
  const btnResumeIdle = app.querySelector<HTMLButtonElement>('#btn-resume-idle');

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
  if (btnResumeIdle) btnResumeIdle.addEventListener('click', cb.onResumeIdle);
}

function attachReportListeners(app: HTMLElement, cb: Callbacks): void {
  app
    .querySelector<HTMLButtonElement>('#btn-week-prev')
    ?.addEventListener('click', cb.onWeekPrev);
  app
    .querySelector<HTMLButtonElement>('#btn-week-next')
    ?.addEventListener('click', cb.onWeekNext);
  app
    .querySelector<HTMLButtonElement>('#btn-clear-filter')
    ?.addEventListener('click', cb.onClearFilter);
  app
    .querySelector<HTMLButtonElement>('#btn-export-csv')
    ?.addEventListener('click', cb.onExportCSV);
  app
    .querySelector<HTMLButtonElement>('#btn-export-pdf')
    ?.addEventListener('click', cb.onExportPDF);
}

function attachProjectsListeners(
  app: HTMLElement,
  rs: RenderState,
  cb: Callbacks
): void {
  app
    .querySelector<HTMLButtonElement>('#btn-toggle-new-project')
    ?.addEventListener('click', cb.onToggleNewProjectForm);

  // Project items (click -> drill into report)
  app.querySelectorAll<HTMLElement>('.project-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      // If the archive button was clicked, handle separately
      const target = e.target as HTMLElement;
      if (target.closest('.project-archive-btn')) return;
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
}

function attachSettingsListeners(
  app: HTMLElement,
  state: AppState,
  cb: Callbacks
): void {
  const idleSelect = app.querySelector<HTMLSelectElement>('#idle-select');
  const workdaySelect = app.querySelector<HTMLSelectElement>('#workday-select');

  const saveIfChanged = () => {
    if (!idleSelect || !workdaySelect) return;
    cb.onSaveSettings({
      idleThreshold: parseInt(idleSelect.value, 10),
      workDayHours: parseInt(workdaySelect.value, 10),
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
