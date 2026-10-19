// Copies the static site into dist/ after `vite build`.
// The site is plain HTML/CSS/JS; Vite only bundles the React entry in
// index.html. Everything else (games, emulators, prox1es, uv, css, js, ...)
// must ship verbatim, so this script mirrors it next to vite's output.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

// Build-only inputs and VCS/tooling metadata — never part of the site.
const EXCLUDE = new Set([
  'node_modules',
  'dist',
  // Deploy pipeline staging (its own packaging workspace) — a stale copy
  // here previously got bundled INTO dist/, doubling the artifact and
  // blowing the deploy file-count limit.
  'isolate',
  'src',
  'scripts',
  'package.json',
  'package-lock.json',
  'bun.lock',
  'bun.lockb',
  'vite.config.js',
  // index.html is emitted by vite with the bundled React entry;
  // the raw source copy would clobber it and break the build output.
  'index.html',
]);

if (!existsSync(dist)) {
  mkdirSync(dist, { recursive: true });
}

let copied = 0;
for (const entry of readdirSync(root)) {
  if (entry.startsWith('.') || EXCLUDE.has(entry)) continue;
  cpSync(join(root, entry), join(dist, entry), { recursive: true });
  copied += 1;
}

console.log(`copy-static: copied ${copied} top-level entries into dist/`);
