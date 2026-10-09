# CLAUDE.md

Static photography portfolio: **Astro 5** + **Tailwind** (`@astrojs/tailwind`). Fully static-generated, no server runtime or CMS.

## Commands

- `npm run dev` — Astro dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build
- `npm run optimize` — convert source JPG/PNG under `public/images/` to resized WebP (see Image pipeline). `-- --force` re-converts images that already have a `.webp`.
- `npm run scaffold -- <folder>` — print a paste-ready array of `{ src, alt, width, height }` for every WebP in a folder, e.g. `npm run scaffold -- public/images/galleries/iceland`

No test/lint/format tooling configured.

## Architecture

### Data-driven content
Photo collections are **plain TypeScript arrays in `src/data/`, not a content collection** — this is intentional and the core pattern of the site; don't refactor toward content collections. Pages import these arrays and map to `<img>` tags. Each entry carries explicit `width`/`height` (layout math + CLS prevention).

- `galleries.ts` — `galleries` array drives `pages/galleries/[slug].astro` via `getStaticPaths()`. Fields: `slug`, `name`, `title`, `description` (paragraph array), `photos`. Eight galleries: `lisbon`, `santo-antao`, `sao-vicente`, `three-castle-head`, `amazon`, `peru`, `iceland`, `mesoamerica`.
- `destinations.ts` — per-destination hero arrays for `pages/destinations/index.astro`; each links to its gallery slug.
- `homepage.ts` — carousel photos (widescreen/narrow sets) and collage photos (eager hero set + lazy "show more" set) for `pages/index.astro`. Each collage entry's `gallery` field is the slug its lightbox links to.
- `site.ts` — title/tagline/description constants.

**To add a gallery:** optimize images → `npm run scaffold` for the entries → add an object to `galleries` (usually also a hero set in `destinations.ts` + a `DestinationSection`). Route + page generate from the slug.

The MDX blog (`src/content/`, `pages/blog/`) is unmodified Astro starter scaffolding, not linked in nav — don't use it as a convention reference.

### Image pipeline
Images live in `public/images/` under lowercase kebab-case feature folders, since these paths are public URLs:

```
public/images/galleries/<slug>/<slug>-NN.webp
public/images/destinations-hero-photos/<slug>/<name>.webp
public/images/hero-photos/{wide,narrow}/<name>.webp
public/images/home-page-collage/{eager,lazy}/<name>.webp
```

Per-gallery subfolders under `galleries/` and `destinations-hero-photos/` are **named for the gallery `slug`** — folder name == slug in both places.

**Naming.** A gallery image is `<slug>-NN.webp`. The number is a stable per-gallery id, **not** a display position — display order comes from the array order in `galleries.ts`, so reordering a gallery means moving lines in the TS file and never renaming a file. Carousel, collage and destination-hero images are second derivatives of a gallery photo at a different size, so each **reuses its source gallery image's name**; that makes the gallery a front-page tile came from readable from its path.

**Only WebP is committed.** `.gitignore` excludes JPG/JPEG/PNG under `public/images/`; keep the full-size exports locally (`npm run optimize -- --force` needs the sources present). The admin tool already writes WebP only.

`scripts/optimize-images.mjs` walks the tree with Sharp, applies EXIF rotation, resizes to a per-folder max width and writes a sibling `.webp` at per-folder quality. Widths and qualities live in `scripts/image-config.mjs` (`folderConfigs`), shared with the admin tool — its `folder` keys must match the directory names above. Data arrays reference the `.webp` paths. Existing WebP is skipped unless `--force`.

### Client-side interaction (`src/scripts/`)
Interactivity lives in these TS modules, imported via `<script>`:

- `masonry.ts` — JS masonry. Grid uses `grid-auto-rows: 4px` + 8px gap; `recalcGrid` sets each image's `grid-row-end: span N` from `data-w`/`data-h`. **`ROW_HEIGHT`/`GAP` here must stay in sync with `grid-auto-rows`/`gap` in `global.css`** (`.masonry-columns`, `.masonry-galleries`). Recalcs on resize.
- `lightbox.ts` — fullscreen viewer (3-slide prev/current/next track). Styles are global in `global.css` (`#lightbox`, `.lightbox-*`).
- `photoCollage.ts` — homepage collage: masonry + lightbox + "Show More" revealing lazy (`data-lazy`, `display:none`) photos.

Gallery/collage masonry depends on `data-w`/`data-h` being the real pixel dimensions (scaffold fills these from WebP metadata).

### Styling
Tailwind, custom palette in `tailwind.config.js` (semantic: `background`, `text`, `accent`, `gray.{light,DEFAULT,dark}`, `shadow-soft`). Global styles + self-hosted Inter in `src/styles/global.css`. Prefer semantic color tokens over raw hex.