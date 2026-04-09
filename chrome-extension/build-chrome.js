const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const OUT = path.join(DIR, '..', 'dist-chrome');

async function build() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  // Bundle popup.ts
  await esbuild.build({
    entryPoints: [path.join(DIR, 'popup.ts')],
    bundle: true,
    format: 'iife',
    outfile: path.join(OUT, 'popup.js'),
    target: 'chrome120',
  });

  // Bundle background.ts
  await esbuild.build({
    entryPoints: [path.join(DIR, 'background.ts')],
    bundle: true,
    format: 'esm',
    outfile: path.join(OUT, 'background.js'),
    target: 'chrome120',
  });

  // Copy static files
  fs.copyFileSync(path.join(DIR, 'popup.html'), path.join(OUT, 'popup.html'));
  fs.copyFileSync(path.join(DIR, 'manifest.json'), path.join(OUT, 'manifest.json'));

  // Create placeholder icons directory
  const iconsDir = path.join(OUT, 'icons');
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  console.log('dist-chrome/ built successfully');
}

build().catch((e) => { console.error(e); process.exit(1); });
