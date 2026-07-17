// Minimal Figma sandbox. Opens UI, sends file info, handles resize.
// Also bridges state to figma.clientStorage: the UI iframe's localStorage
// is not guaranteed to survive Figma closing this plugin to launch another
// one, but clientStorage is (it's Figma's own durable per-plugin storage).

const FULL_W = 400;
const FULL_H = 580;
const MINI_W = 220;
const MINI_H = 64;
const CLIENT_STORAGE_KEY = 'ux_tracker_state';

figma.showUI(__html__, { width: FULL_W, height: FULL_H, title: 'Allen' });

figma.clientStorage
  .getAsync(CLIENT_STORAGE_KEY)
  .then((raw) => {
    figma.ui.postMessage({
      type: 'INIT',
      fileId: figma.fileKey ?? 'local',
      fileName: figma.root.name,
      persistedState: raw ?? null,
    });
  })
  .catch((err) => {
    console.error('clientStorage read failed', err);
    figma.ui.postMessage({
      type: 'INIT',
      fileId: figma.fileKey ?? 'local',
      fileName: figma.root.name,
      persistedState: null,
    });
  });

figma.ui.onmessage = (msg: { type?: string; mode?: string; payload?: string }) => {
  if (msg.type === 'CLOSE') {
    figma.closePlugin();
  } else if (msg.type === 'RESIZE') {
    if (msg.mode === 'mini') {
      figma.ui.resize(MINI_W, MINI_H);
    } else {
      figma.ui.resize(FULL_W, FULL_H);
    }
  } else if (msg.type === 'PERSIST_STATE' && msg.payload) {
    figma.clientStorage
      .setAsync(CLIENT_STORAGE_KEY, msg.payload)
      .catch((err) => console.error('clientStorage write failed', err));
  } else if (msg.type === 'CLEAR_STORAGE') {
    figma.clientStorage
      .deleteAsync(CLIENT_STORAGE_KEY)
      .catch((err) => console.error('clientStorage clear failed', err));
  }
};
