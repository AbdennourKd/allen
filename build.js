// build.js — esbuild orchestrator for Figma plugin
// Figma requires: code.js (sandbox) + ui.html (single file with inline JS/CSS)

const esbuild = require('esbuild');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

async function buildUI() {
  const uiResult = await esbuild.build({
    entryPoints: ['src/ui/ui.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2017',
    logLevel: 'info',
  });

  const uiJs = uiResult.outputFiles[0].text;
  const css = fs.readFileSync('src/ui/styles.css', 'utf8');
  const htmlTemplate = fs.readFileSync('src/ui/index.html', 'utf8');

  const html = htmlTemplate
    .replace('{{STYLES}}', css)
    .replace('{{SCRIPT}}', uiJs);

  fs.writeFileSync('dist/ui.html', html);
  console.log('✓ dist/ui.html written');
}

async function build() {
  fs.mkdirSync('dist', { recursive: true });

  await buildUI();

  // Bundle plugin sandbox
  const codeCtx = await esbuild.context({
    entryPoints: ['src/code.ts'],
    bundle: true,
    outfile: 'dist/code.js',
    target: 'es2017',
    logLevel: 'info',
  });

  await codeCtx.rebuild();
  console.log('✓ dist/code.js written');

  if (isWatch) {
    console.log('Watching for changes… (Ctrl+C to stop)');
    await codeCtx.watch();
    // Also watch UI files
    fs.watch('src/ui', { recursive: true }, async (_evt, filename) => {
      if (filename && (filename.endsWith('.ts') || filename.endsWith('.css') || filename.endsWith('.html'))) {
        console.log(`UI change detected (${filename}), rebuilding…`);
        try {
          await buildUI();
        } catch (err) {
          console.error('UI rebuild failed:', err.message);
        }
      }
    });
  } else {
    await codeCtx.dispose();
    console.log('Build complete.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
