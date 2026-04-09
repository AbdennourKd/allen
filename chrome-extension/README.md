# Project Tracker — Chrome Extension

## Build

From the project root:

```bash
npm install
cd chrome-extension
npm install --save-dev @types/chrome
node build-chrome.js
```

## Load in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist-chrome/` directory
5. Click the extension icon to open the popup

## Features

Same as the Figma plugin:
- Track time by project and design phase
- Automatic idle detection (via Chrome idle API)
- Timer continues running even when popup is closed (background service worker)
- Badge shows elapsed time on the extension icon
- Weekly reports with phase/day breakdowns
- CSV and PDF export
- Dark theme UI
