# Altify Assets Host

A live drag-and-drop file uploader that serves public URLs for email signatures. Nothing to install on your computer — upload through the deployed website itself.

## What you get

- Drag files onto the page → they upload to Netlify Blobs storage
- Each file gets a stable public URL like `https://assets.altify.app/f/logo.png`
- CORS and cache headers already set for Gmail, Outlook and Apple Mail
- Password-protected upload, public file access (so recipients can see images)
- Delete, copy URL, and generate ready-made `<img>` snippets

## Deploy to Netlify (one-time setup)

**Step 1 — Deploy the project**

Fastest path: drag the project folder onto [app.netlify.com/drop](https://app.netlify.com/drop). Netlify installs dependencies and goes live in about 60 seconds.

Better path (recommended for updates): push this folder to GitHub, then in Netlify click **Add new site → Import an existing project** and select the repo. Every push auto-deploys.

**Step 2 — Set the upload password** (required, nothing works without this)

1. In the Netlify dashboard, open your site
2. **Site configuration → Environment variables → Add a variable**
3. Key: `UPLOAD_PASSWORD`
4. Value: any strong passphrase you'll remember (this is your upload password)
5. Click **Create variable**
6. Go to **Deploys → Trigger deploy → Clear cache and deploy site**

The redeploy is necessary — functions only pick up new env vars at deploy time.

**Step 3 — Use it**

Visit your site (e.g. `https://altify-assets.netlify.app`), enter the password, drag images on. Done.

## Using a URL in an email signature

Click **Embed** on any uploaded file to get a ready-to-paste `<img>` tag:

```html
<img src="https://altify-assets.netlify.app/f/sean-headshot.jpg"
     alt="Sean Sanders"
     style="display:block;border:0;max-width:100%;height:auto" />
```

## Custom domain (recommended)

Default URLs look like `altify-assets.netlify.app/f/logo.png`. For something cleaner like `assets.altify.app/f/logo.png`:

1. Netlify → **Domain management → Add custom domain**
2. Point a CNAME at Netlify as instructed
3. Netlify provisions an SSL cert automatically

Shorter URLs mean less signature bloat and no lock-in to `.netlify.app`.

## File rules

- Max size **6 MB** per file (Netlify Function payload limit)
- Image formats only: PNG, JPG, GIF, WebP, SVG, AVIF, ICO
- Filenames are sanitised on upload: lowercased, spaces become hyphens, special characters stripped
- Uploading the same filename overwrites — useful for updating a logo without changing the URL

## How it works

```
Browser                    Netlify Edge              Netlify Blobs
   │                           │                          │
   │ drop files + password     │                          │
   ├──────────── POST /api/upload ────────────────────────▶│
   │                           │                store.set(filename, data)
   │                           │                          │
   │◀──── { results: [...] } ──┤                          │
   │                           │                          │
   │ embed in signature:       │                          │
   │ <img src=".../f/logo.png">│                          │
   │                           │                          │
   Email recipient ──── GET /f/logo.png ─────────────────▶│
                               │                          │
                       (cached at edge for 1 year)        │
```

- `/api/upload`, `/api/list`, `/api/delete` → password-protected functions
- `/f/<filename>` → public, cached serving function
- Uploads live in Netlify Blobs (a site-scoped key-value store)

## Project structure

```
altify-assets-host/
├── index.html                    # Upload UI + gallery
├── package.json                  # @netlify/blobs dependency
├── netlify.toml                  # Build config
└── netlify/functions/
    ├── upload.js                 # POST /api/upload  (auth)
    ├── list.js                   # GET  /api/list    (auth)
    ├── delete.js                 # DELETE /api/delete (auth)
    └── serve.js                  # GET  /f/*         (public)
```

## Local development (optional)

If you want to tinker locally:

```bash
npm install
npx netlify dev
# opens at http://localhost:8888
```

You'll need `UPLOAD_PASSWORD` set locally too — add to `.env` or export in your shell before running `netlify dev`.

## Troubleshooting

**"UPLOAD_PASSWORD env var not configured"** — you skipped Step 2 or forgot to redeploy after setting it.

**Upload fails with 401** — wrong password, or you rotated it without refreshing your browser session. Click **Sign out** and re-enter.

**Image not loading in Gmail** — Gmail's image proxy needs CORS headers. The serve function sends these by default. If you still see issues, double-check the URL is HTTPS (Gmail won't load HTTP images in signatures).

**File too big (>6 MB)** — Netlify Functions have a 6 MB payload ceiling for synchronous requests. For email signatures you almost never need more — compress the image (TinyPNG is good) or resize to the actual display dimensions.

## Security notes

- Upload password is checked server-side every time, never sent to the browser
- Password stored in browser `sessionStorage` only (cleared when you close the tab)
- Served files are fully public — anyone with the URL can view them, which is the point
- No third-party services involved. All storage stays in your Netlify site.
