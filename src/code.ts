// Minimal Figma sandbox — opens UI and sends file info.

figma.showUI(__html__, { width: 400, height: 580, title: 'Project Tracker' });

figma.ui.postMessage({
  type: 'INIT',
  fileId: figma.fileKey ?? 'local',
  fileName: figma.root.name,
});

figma.ui.onmessage = (msg: { type?: string }) => {
  if (msg.type === 'CLOSE') figma.closePlugin();
};
