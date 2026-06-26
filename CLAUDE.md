# CLAUDE.md

Static photography portfolio: **Astro 5** + **Tailwind** (`@astrojs/tailwind`). Fully static-generated, no server runtime or CMS.

## Commands

- `npm run dev` — Astro dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build
- `npm run optimize` — convert source JPG/PNG under `public/images/` to resized WebP (see Image pipeline). `-- --force` re-converts images that already have a `.webp`.
- `npm run scaffold -- <folder>` — print a paste-ready array of `{ src, alt, width, height }` for every WebP in a folder, e.g. `npm run scaffold -- public/images/Galleries/Iceland`

No test/lint/format tooling configured.

## Architecture

### Data-driven content
Photo collections are **plain TypeScript arrays in `src/data/`, not a content collection** — this is intentional and the core pattern of the site; don't refactor toward content collections. Pages import these arrays and map to `<img>` tags. Each entry carries explicit `width`/`height` (layout math + CLS prevention).

- `galleries.ts` — `galleries` array drives `pages/galleries/[slug].astro` via `getStaticPaths()`. Fields: `slug`, `name`, `title`, `description` (paragraph array), `photos`.
- `destinations.ts` — per-destination hero arrays for `pages/destinations/index.astro`; each links to its gallery slug.
- `homepage.ts` — carousel photos (widescreen/narrow sets) and collage photos (eager hero set + lazy "show more" set) for `pages/index.astro`.
- `site.ts` — title/tagline/description constants.

**To add a gallery:** optimize images → `npm run scaffold` for the entries → add an object to `galleries` (usually also a hero set in `destinations.ts` + a `DestinationSection`). Route + page generate from the slug.

The MDX blog (`src/content/`, `pages/blog/`) is unmodified Astro starter scaffolding, not linked in nav — don't use it as a convention reference.

### Image pipeline
Source images in `public/images/` by feature folder (`Galleries/`, `HeroPhotos/`, `DestinationsHeroPhotos/`, `HomePageCollage/`). `scripts/optimize-images.mjs` walks them with Sharp, applies EXIF rotation, resizes to a per-folder max width, writes sibling `.webp` at per-folder quality (config: `folderConfigs` at top of script). Data arrays reference the `.webp` paths. Existing WebP skipped unless `--force`.

### Client-side interaction (`src/scripts/`)
Interactivity lives in these TS modules, imported via `<script>`:

- `masonry.ts` — JS masonry. Grid uses `grid-auto-rows: 4px` + 8px gap; `recalcGrid` sets each image's `grid-row-end: span N` from `data-w`/`data-h`. **`ROW_HEIGHT`/`GAP` here must stay in sync with `grid-auto-rows`/`gap` in `global.css`** (`.masonry-columns`, `.masonry-galleries`). Recalcs on resize.
- `lightbox.ts` — fullscreen viewer (3-slide prev/current/next track). Styles are global in `global.css` (`#lightbox`, `.lightbox-*`).
- `photoCollage.ts` — homepage collage: masonry + lightbox + "Show More" revealing lazy (`data-lazy`, `display:none`) photos.

Gallery/collage masonry depends on `data-w`/`data-h` being the real pixel dimensions (scaffold fills these from WebP metadata).

### Styling
Tailwind, custom palette in `tailwind.config.js` (semantic: `background`, `text`, `accent`, `gray.{light,DEFAULT,dark}`, `shadow-soft`). Global styles + self-hosted Inter in `src/styles/global.css`. Prefer semantic color tokens over raw hex.