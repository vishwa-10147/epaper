# E-Paper

A static, page-flip digital newspaper reader. No backend, no database —
"uploading" a new edition just means adding image files to a folder and
pushing to GitHub.

## How it works

```
epaper/
├── index.html                 the whole site (single page)
├── assets/
│   ├── css/style.css
│   └── js/app.js               loads data/issues.json, drives the viewer
├── data/
│   └── issues.json             auto-generated list of editions (don't hand-edit)
├── pages/
│   ├── 2026-08-21/             one folder per edition, named YYYY-MM-DD
│   │   ├── 1.jpg
│   │   ├── 2.jpg
│   │   └── 3.jpg
│   └── 2026-08-20/
│       ├── 1.jpg
│       └── 2.jpg
├── scripts/
│   └── build-manifest.js       scans pages/ and rewrites data/issues.json
└── .github/workflows/deploy.yml
```

Two sample editions with placeholder pages are already included so you can
see the layout working immediately.

## Publishing a new edition

1. Scan or export each page of the day's paper as a JPG or PNG, in order.
2. Create a folder under `pages/` named with today's date: `pages/2026-08-22/`.
3. Drop the page images in as `1.jpg`, `2.jpg`, `3.jpg`, … (any image
   extension works — jpg, jpeg, png, webp — numbering just controls order).
4. Commit and push:
   ```
   git add pages/2026-08-22
   git commit -m "Add 2026-08-22 edition"
   git push
   ```

That's it. The GitHub Action rebuilds `data/issues.json` automatically and
redeploys the site, so the new edition appears on the site within a minute
or two, newest first, with no manual manifest editing.

## Using the admin page

Open `/manage` from the running site. In Chrome or Edge, choose the project
folder, enter an edition date, select replacement page images if needed, and
save. The editor writes the numbered images and `data/issues.json` directly to
the selected folder. Changing an existing edition's date moves its page folder
as well. Commit and push the changes to publish them.

On browsers without folder access, use **Download manifest** and copy the
downloaded file to `data/issues.json`; page images still need to be copied into
the matching `pages/YYYY-MM-DD/` folder manually.

If you want to check it locally before pushing, run:
```
node scripts/build-manifest.js
```
then open `index.html` with a local server (not `file://`, since the
manifest is loaded via `fetch`):
```
python3 -m http.server 8000
```

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).
   The included workflow (`.github/workflows/deploy.yml`) rebuilds the
   manifest and publishes the site automatically on every push.

No build tools, npm install, or bundler are required — it's plain
HTML/CSS/JS. The only external dependency is the
[page-flip](https://github.com/Nodlik/PageFlip) library, loaded from a CDN
in `index.html`. If that CDN is ever unreachable, the site automatically
falls back to a simple prev/next single-page viewer so it never breaks.

## Customizing

- **Paper name**: edit `SITE_TITLE` at the top of `assets/js/app.js`.
- **Colors/fonts**: all design tokens are CSS custom properties at the top
  of `assets/css/style.css`.
- **Page size**: the flipbook auto-sizes to fit the viewport (`size:
  "stretch"` in `app.js`); adjust `minWidth`/`maxWidth`/`minHeight`/
  `maxHeight` there if your page scans have a different aspect ratio.
