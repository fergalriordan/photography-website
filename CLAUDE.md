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

**To add a gallery:** optimize images → `npm run scaffold` for the entries → add an object to `galleries` (usually also a hero set in `destinations.ts` + a `DestinationSection`). Route + page generate from the slug. Keep the portrait and landscape counts each divisible by 4, or the grid won't end flush — see the counting rule under Client-side interaction.

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

- `columnPacker.ts` — the shared flush-column packer used by both the galleries and the homepage collage. Every image is snapped to one of **two** fixed aspect ratios (`.landscape` 3:2 / `.portrait` 2:3, via `object-fit: cover`), so `packGroup` only juggles two tile heights and can give every column the same number of portraits *and* the same number of landscapes — which is the only way to make columns end level. Styles are global in `global.css` (`.photo-columns`, `.photo-col`); the column count lives in JS (2 mobile / 4 desktop at the 768px breakpoint) and must match in both callers.
- `galleryColumns.ts` — gallery grid: one `packGroup` pass + lightbox. Reads `data-gallery` off the grid to name the gallery in its dev-only dropped-photo warning.
- `lightbox.ts` — thin wrapper over **PhotoSwipe v5**. `initLightbox(imgs)` builds a `dataSource` from the img array it's given, so both callers pass the array they captured **before** packing — prev/next then follows data order rather than the packed DOM's column order. Slide sizes come from each img's `width`/`height` attributes, so every lightbox img must carry them. `loop: false`; swipe up/down closes. Images with `data-gallery-slug`/`data-gallery-label` (homepage collage) get the custom `gallery-link` UI element plus `paddingFn` space below the photo; others go edge to edge. While open it sets `overflow: hidden` on `<html>` (padding out the lost scrollbar). Don't switch that to pinning `body` with `position: fixed`: iOS Safari then expands its toolbar mid-open and the photo is left laid out too low, over the gallery link. Overrides (backdrop colour, mobile-hidden arrows, link styling) are global in `global.css` under `html .pswp`.
- `photoCollage.ts` — homepage collage: two `packGroup` passes (eager set, then the lazy set appended below on "Show More", so revealing doesn't reflow what's already on screen) + lightbox.

**Flush grids need counts divisible by the column count.** `packGroup` can't level columns unless each orientation divides evenly, so with 2/4 columns every collection needs its portrait count and its landscape count both **divisible by 4**. This is an authoring constraint on the data arrays, not something to fix in code: prune `galleries.ts` / `homepage.ts` to hit it (or add one more photo).

**`packGroup` never hides a photo.** Surplus tiles are appended below the levelled block, each into the shortest column, so the grid ends ragged. **The ragged bottom is the intended failure mode** — it's the signal that a collection needs attention, and it's deliberately preferred over a tidy grid that quietly drops photos off the site. Don't "fix" raggedness by hiding tiles; fix the counts. The dev console also names the surplus per collection (the collage's eager and lazy sets each have to divide evenly on their own).

### Styling
Tailwind, custom palette in `tailwind.config.js` (semantic: `background`, `text`, `accent`, `gray.{light,DEFAULT,dark}`, `shadow-soft`). Global styles + self-hosted Inter in `src/styles/global.css`. Prefer semantic color tokens over raw hex.