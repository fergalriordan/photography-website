# Image Management

## Scripts

| Command | Action |
|---|---|
| `npm run optimize` | Convert new source images (JPG/PNG) to WebP |
| `npm run optimize -- --force` | Re-convert already-converted images (use after cropping/editing) |
| `npm run scaffold -- <folder>` | Print a ready-to-paste TypeScript array with dimensions for all WebP files in a folder |

---

## Adding new photos to a gallery

**1. Drop the source JPG/PNG** into the gallery folder:

```
public/images/Galleries/{GalleryName}/
```

**2. Convert to WebP:**

```
npm run optimize
```

**3. Scaffold the TypeScript entries.** This reads the dimensions from the WebP files and prints a ready-to-paste array:

```
npm run scaffold -- public/images/Galleries/{GalleryName}
```

Copy the output, paste it into `src/data/galleries.ts` under the correct gallery's `photos` array, then fill in the `alt` text for each entry.

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
- `public/images/HeroPhotos/hero_photos_wide/` (desktop, 1920px max)
- `public/images/HeroPhotos/hero_photos_narrow/` (mobile, 900px max)

Run `npm run optimize`, then add entries to `src/data/homepage.ts` — only `src` and `alt` needed, no dimensions:

```ts
{ src: '/images/HeroPhotos/hero_photos_wide/my_photo.webp', alt: '...' }
```

### Homepage collage

Place images in:
- `public/images/HomePageCollage/home_page_collage_eager/` — first visible images (load immediately)
- `public/images/HomePageCollage/home_page_collage_lazy/` — remaining images (load on scroll)

Run `npm run scaffold -- public/images/HomePageCollage/home_page_collage_eager` (or `…_lazy`) to get the array with dimensions, then paste into `src/data/homepage.ts`.

---

## Adding new destinations

Place hero images in:
```
public/images/DestinationsHeroPhotos/{destination}/
```

Run `npm run optimize`, then add `src` + `alt` entries (no dimensions needed) to `src/data/destinations.ts`.

---

## Image folder reference

| Folder | Used by | Max width | Quality |
|---|---|---|---|
| `public/images/Galleries/{Name}/` | Gallery pages | 1400px | 80 |
| `public/images/HeroPhotos/hero_photos_wide/` | Homepage carousel (desktop) | 1920px | 85 |
| `public/images/HeroPhotos/hero_photos_narrow/` | Homepage carousel (mobile) | 900px | 85 |
| `public/images/HomePageCollage/` | Homepage collage grid | 1400px | 80 |
| `public/images/DestinationsHeroPhotos/{Name}/` | Destination carousels | 1600px | 85 |

---

## Data files

| File | Controls |
|---|---|
| `src/data/galleries.ts` | Gallery pages — photo arrays with `src`, `alt`, `width`, `height` |
| `src/data/homepage.ts` | Hero carousel and collage arrays |
| `src/data/destinations.ts` | Destination hero photo arrays |
