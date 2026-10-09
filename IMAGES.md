# Image Management

## Scripts

| Command | Action |
|---|---|
| `npm run optimize` | Convert new source images (JPG/PNG) to WebP |
| `npm run optimize -- --force` | Re-convert already-converted images (use after cropping/editing) |
| `npm run scaffold -- <folder>` | Print a ready-to-paste TypeScript array with dimensions for all WebP files in a folder |

---

## Adding new photos to a gallery

**1. Drop the source JPG/PNG** into the gallery folder. Folder names are **kebab-case, matching the gallery `slug`** (e.g. `santo-antao`):

```
public/images/galleries/{gallery-slug}/
```

Name each file `{gallery-slug}-NN` (e.g. `santo-antao-37.jpg`), continuing from the highest number already in the folder. The number is just a stable id — it is **not** the display position, which comes from the array order in `src/data/galleries.ts`. Reordering a gallery means moving lines in that file; never rename a file to reorder it.

**2. Convert to WebP:**

```
npm run optimize
```

**3. Scaffold the TypeScript entries.** This reads the dimensions from the WebP files and prints a ready-to-paste array:

```
npm run scaffold -- public/images/galleries/{gallery-slug}
```

Copy the output, paste it into `src/data/galleries.ts` under the correct gallery's `photos` array, then fill in the `alt` text for each entry. Note that `scaffold` sorts lexicographically, so `-10` comes before `-2`; reorder as you want them displayed.

**4. Commit the WebP only.** `.gitignore` excludes JPG/JPEG/PNG under `public/images/`, so the source exports stay on your machine. Keep them — `npm run optimize -- --force` needs them to re-encode.

---

## Cropping or replacing an existing photo

**1. Edit the source file** (JPG/PNG) in your image editor and save.

**2. Re-convert with `--force`**, which deletes the old WebP and regenerates it:

```
npm run optimize -- --force
```

Without `--force`, the script skips any image that already has a `.webp` alongside it.

**3. Check dimensions.** If the crop changed the aspect ratio, re-scaffold the folder and update `width`/`height` in the relevant data file.

---

## Adding to the homepage

### Hero carousel

Place images in:
- `public/images/hero-photos/wide/` (desktop, 1920px max)
- `public/images/hero-photos/narrow/` (mobile, 900px max)

A carousel, collage or destination-hero image is a second derivative of a photo that also lives in a gallery, so **give it the same filename as its gallery copy**. That keeps the source gallery readable from the path.

Run `npm run optimize`, then add entries to `src/data/homepage.ts` — only `src` and `alt` needed, no dimensions:

```ts
{ src: '/images/hero-photos/wide/santo-antao-12.webp', alt: '...' }
```

### Homepage collage

Place images in:
- `public/images/home-page-collage/eager/` — first visible images (load immediately)
- `public/images/home-page-collage/lazy/` — remaining images (load on scroll)

Run `npm run scaffold -- public/images/home-page-collage/eager` (or `…/lazy`) to get the array with dimensions, then paste into `src/data/homepage.ts`. Add a `gallery: '{gallery-slug}'` field to each entry so the lightbox can link the tile back to its gallery.

Collage tiles are cropped to 3:2 (landscape) or 2:3 (portrait) with `object-cover`, so pick photos already close to those ratios.

---

## Adding new destinations

Place hero images in a **kebab-case folder matching the gallery `slug`** (same name as the gallery folder):
```
public/images/destinations-hero-photos/{gallery-slug}/
```

Run `npm run optimize`, then add `src` + `alt` entries (no dimensions needed) to `src/data/destinations.ts`.

---

## Image folder reference

| Folder | Used by | Max width | Quality |
|---|---|---|---|
| `public/images/galleries/{gallery-slug}/` | Gallery pages | 1400px | 80 |
| `public/images/hero-photos/wide/` | Homepage carousel (desktop) | 1920px | 85 |
| `public/images/hero-photos/narrow/` | Homepage carousel (mobile) | 900px | 85 |
| `public/images/home-page-collage/` | Homepage collage grid | 1400px | 80 |
| `public/images/destinations-hero-photos/{gallery-slug}/` | Destination carousels | 800px | 80 |

---

## Data files

| File | Controls |
|---|---|
| `src/data/galleries.ts` | Gallery pages — photo arrays with `src`, `alt`, `width`, `height` |
| `src/data/homepage.ts` | Hero carousel and collage arrays |
| `src/data/destinations.ts` | Destination hero photo arrays |
