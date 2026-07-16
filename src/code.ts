// Minimal Figma sandbox. Opens UI, sends file info, handles resize.

const FULL_W = 400;
const FULL_H = 580;
const MINI_W = 220;
const MINI_H = 64;

figma.showUI(__html__, { width: FULL_W, height: FULL_H, title: 'Allen' });

figma.ui.postMessage({
  type: 'INIT',
  fileId: figma.fileKey ?? 'local',
  fileName: figma.root.name,
});

figma.ui.onmessage = (msg: { type?: string; mode?: string }) => {
  if (msg.type === 'CLOSE') {
    figma.closePlugin();
  } else if (msg.type === 'RESIZE') {
    if (msg.mode === 'mini') {
      figma.ui.resize(MINI_W, MINI_H);
    } else {
      figma.ui.resize(FULL_W, FULL_H);
    }
  }
};
