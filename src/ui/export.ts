// CSV + PDF export for weekly reports.
// jsPDF is lazy-loaded on first PDF export, keeping the ~500 KB out of the
// initial plugin open. Without this, every plugin launch downloads jsPDF
// even if the user never exports.

import { Session } from './types';
import {
  formatDuration,
  getPhaseColor,
  groupByPhase,
  hexToRGB,
} from './helpers';

declare global {
  interface Window {
    jspdf: {
      jsPDF: new (options?: {
        unit?: string;
        format?: string;
        orientation?: string;
      }) => JsPDFInstance;
    };
  }
}

const JSPDF_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

let jspdfLoadPromise: Promise<void> | null = null;

function loadJsPDF(): Promise<void> {
  if (window.jspdf?.jsPDF) return Promise.resolve();
  if (jspdfLoadPromise) return jspdfLoadPromise;
  jspdfLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JSPDF_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      jspdfLoadPromise = null;
      reject(new Error('Failed to load jsPDF'));
    };
    document.head.appendChild(script);
  });
  return jspdfLoadPromise;
}

type JsPDFInstance = {
  setFillColor: (r: number, g?: number, b?: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setFontSize: (size: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  text: (text: string, x: number, y: number) => void;
  save: (filename: string) => void;
};

export function exportCSV(
  sessions: Session[],
  getProjectName: (id: string) => string,
  weekLabel: string
): void {
  const headers = ['Date', 'Projet', 'Phase', 'Durée (min)', 'Utilisateur', 'Note', 'Fichier'];
  const rows = sessions.map((s) => [
    new Date(s.startedAt).toLocaleDateString('fr-FR'),
    csvEscape(getProjectName(s.projectId)),
    s.phase,
    Math.round(s.duration / 60).toString(),
    csvEscape(s.user ?? ''),
    csvEscape(s.note),
    csvEscape(s.fileName),
  ]);
  // BOM for Excel UTF-8 compatibility
  const csv = '\uFEFF' + [headers, ...rows].map((r) => r.join(',')).join('\n');
  downloadBlob(
    `tracker-${slugify(weekLabel)}.csv`,
    'text/csv;charset=utf-8;',
    csv
  );
}

function csvEscape(value: string): string {
  if (value == null) return '';
  const needsQuoting = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

function downloadBlob(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(label: string): string {
  return label
    .replace(/[\s·]+/g, '-')
    .replace(/[^a-zA-Z0-9\-]/g, '')
    .toLowerCase();
}

export async function exportPDF(
  sessions: Session[],
  weekLabel: string,
  getProjectName: (id: string) => string
): Promise<void> {
  try {
    await loadJsPDF();
  } catch (err) {
    console.error(err);
    alert('Erreur: jsPDF non chargé. Vérifie la connexion internet.');
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('Erreur: jsPDF non chargé.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Dark background
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, 210, 297, 'F');

  // Header
  doc.setTextColor(232, 232, 232);
  doc.setFontSize(18);
  doc.text(`Rapport UX/UI : ${weekLabel}`, 20, 25);

  // Total
  const total = sessions.reduce((a, s) => a + s.duration, 0);
  doc.setFontSize(12);
  doc.setTextColor(180, 180, 180);
  doc.text(`Total : ${formatDuration(total)}`, 20, 38);
  doc.text(`Sessions : ${sessions.length}`, 20, 46);

  // Phase breakdown label
  let y = 60;
  doc.setTextColor(232, 232, 232);
  doc.setFontSize(13);
  doc.text('Par phase', 20, y);
  y += 8;

  // Phase bars
  const byPhase = groupByPhase(sessions);
  const maxVal = byPhase.length > 0 ? Math.max(...byPhase.map((p) => p.duration)) : 1;

  doc.setFontSize(10);
  for (const { phase, duration } of byPhase) {
    const pct = duration / maxVal;
    const color = hexToRGB(getPhaseColor(phase));
    doc.setFillColor(color.r, color.g, color.b);
    doc.rect(20, y, Math.max(pct * 100, 1), 5, 'F');
    doc.setTextColor(200, 200, 200);
    doc.text(`${phase}`, 125, y + 4);
    doc.text(formatDuration(duration), 170, y + 4);
    y += 10;
  }

  // Sessions list
  y += 6;
  doc.setTextColor(232, 232, 232);
  doc.setFontSize(13);
  doc.text('Sessions', 20, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);

  for (const s of sessions.slice(0, 20)) {
    if (y > 270) break;
    const date = new Date(s.startedAt).toLocaleDateString('fr-FR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const projectName = getProjectName(s.projectId);
    const line = `${date}  ${projectName}  ${s.phase}  ${formatDuration(s.duration)}`;
    doc.text(line.substring(0, 95), 20, y);
    y += 5;
    if (s.note) {
      doc.setTextColor(140, 140, 140);
      doc.text(`  "${s.note.substring(0, 80)}"`, 20, y);
      doc.setTextColor(200, 200, 200);
      y += 5;
    }
  }

  doc.save(`tracker-${slugify(weekLabel)}.pdf`);
}
