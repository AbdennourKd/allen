// Core domain types + constants for Allen

// Phases are free-form strings: PHASES lists the built-in defaults, but users
// can add their own (stored in AppState.customPhases). Colors for custom
// phases are derived deterministically; see helpers.ts getPhaseColor().
export type Phase = string;

export const PHASES: Phase[] = [
  'Research',
  'Ideation',
  'Wireframe',
  'Prototype',
  'Design',
  'Review',
  'Handoff',
];

export const PHASE_COLORS: Record<string, string> = {
  Research: '#4C8DFF',
  Ideation: '#FF8A65',
  Wireframe: '#F5A623',
  Prototype: '#4ECDC4',
  Design: '#8B7CF6',
  Review: '#F5A623',
  Handoff: '#22C55E',
};

export const PROJECT_PALETTE: string[] = [
  '#4C8DFF',
  '#8B7CF6',
  '#F5A623',
  '#22C55E',
  '#FF8A65',
  '#4ECDC4',
  '#EC6FBB',
  '#F7DC6F',
];

export type Session = {
  id: string;
  projectId: string;
  phase: Phase;
  startedAt: number;
  endedAt: number | null;
  duration: number;
  note: string;
  fileId: string;
  fileName: string;
  idlePaused?: boolean;
  // Manual pause via the Pause button, distinct from idle auto-pause.
  manualPaused?: boolean;
  manualPauseStartedAt?: number;
  // Snapshot of settings.userName at session start. Identifies who logged
  // the session when a file is shared between multiple people.
  user?: string;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  archived: boolean;
};

export type AppSettings = {
  idleThreshold: number;
  workDayHours: number;
  lang: string;
  // Optional. Shown on sessions so a shared file can tell who tracked what.
  userName: string;
};

export type AppState = {
  projects: Project[];
  sessions: Session[];
  activeSession: Session | null;
  settings: AppSettings;
  // Map of Figma fileId → projectId. Lets the plugin auto-select the
  // project the user last tracked in this file when reopening it.
  fileProjectMap: Record<string, string>;
  // User-added phases, on top of the PHASES defaults.
  customPhases: Phase[];
};

export type ViewName = 'timer' | 'report' | 'projects' | 'settings';

export type Granularity = 'day' | 'week' | 'month' | 'year';

export const STORAGE_KEY = 'ux_tracker_state';
