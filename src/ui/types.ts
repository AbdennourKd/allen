// Core domain types + constants for Project Tracker

export type Phase =
  | 'Research'
  | 'Ideation'
  | 'Wireframe'
  | 'Prototype'
  | 'Design'
  | 'Review'
  | 'Handoff';

export const PHASES: Phase[] = [
  'Research',
  'Ideation',
  'Wireframe',
  'Prototype',
  'Design',
  'Review',
  'Handoff',
];

export const PHASE_COLORS: Record<Phase, string> = {
  Research: '#7B61FF',
  Ideation: '#FF6B6B',
  Wireframe: '#FFB347',
  Prototype: '#4ECDC4',
  Design: '#0D99FF',
  Review: '#A8E063',
  Handoff: '#C9A0DC',
};

export const PROJECT_PALETTE: string[] = [
  '#FF6B6B',
  '#FFB347',
  '#4ECDC4',
  '#0D99FF',
  '#A8E063',
  '#C9A0DC',
  '#7B61FF',
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
};

export type AppState = {
  projects: Project[];
  sessions: Session[];
  activeSession: Session | null;
  settings: AppSettings;
  // Map of Figma fileId → projectId. Lets the plugin auto-select the
  // project the user last tracked in this file when reopening it.
  fileProjectMap: Record<string, string>;
};

export type ViewName = 'timer' | 'report' | 'projects' | 'settings';

export const STORAGE_KEY = 'ux_tracker_state';
