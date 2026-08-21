#!/usr/bin/env node
/**
 * Scans the /pages directory and rebuilds /data/issues.json.
 *
 * Expected layout:
 *   pages/
 *     2026-08-21/
 *       1.jpg
 *       2.jpg
 *       ...
 *     2026-08-20/
 *       1.jpg
 *       ...
 *
 * Folder names must be dates in YYYY-MM-DD format. Page files inside each
 * folder must be numbered (1.jpg, 2.jpg, 2.png, ...) — any image extension
 * works, they don't need to match across issues.
 *
 * Run with:  node scripts/build-manifest.js
 * (The GitHub Action runs this automatically on every push — see
 *  .github/workflows/deploy.yml — so most of the time you never need to
 *  run it by hand.)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PAGES_DIR = path.join(ROOT, "pages");
const OUT_FILE = path.join(ROOT, "data", "issues.json");
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const DATE_DIR = /^\d{4}-\d{2}-\d{2}$/;

function buildManifest() {
  if (!fs.existsSync(PAGES_DIR)) {
    console.error(`No pages/ directory found at ${PAGES_DIR}`);
    process.exit(1);
  }

  const dateDirs = fs
    .readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && DATE_DIR.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse(); // newest first

  const issues = [];

  for (const date of dateDirs) {
    const dir = path.join(PAGES_DIR, date);
    const files = fs
      .readdirSync(dir)
      .filter((f) => IMAGE_EXT.test(f))
      .sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });

    if (files.length === 0) {
      console.warn(`Skipping ${date}: no page images found`);
      continue;
    }

    issues.push({
      date,
      pageCount: files.length,
      pages: files.map((f) => `pages/${date}/${f}`),
    });
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ issues }, null, 2) + "\n");

  console.log(`Wrote ${issues.length} issue(s) to ${path.relative(ROOT, OUT_FILE)}`);
  for (const i of issues) console.log(`  ${i.date}: ${i.pageCount} page(s)`);
}

buildManifest();
