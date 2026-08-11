// Per-folder max width and WebP quality — single source of truth shared by
// optimize-images.mjs and the admin tool (scripts/admin/). Keep the Galleries
// and DestinationsHeroPhotos values in sync with what the pages expect.
export const folderConfigs = [
  { folder: 'Galleries',                     maxWidth: 1400, quality: 80 },
  { folder: 'HeroPhotos/hero_photos_wide',   maxWidth: 1920, quality: 85 },
  { folder: 'HeroPhotos/hero_photos_narrow', maxWidth:  900, quality: 85 },
  { folder: 'DestinationsHeroPhotos',        maxWidth:  800, quality: 80 },
  { folder: 'HomePageCollage',               maxWidth: 1400, quality: 80 },
];

export function configFor(folder) {
  const config = folderConfigs.find((c) => c.folder === folder);
  if (!config) throw new Error(`No image config for folder "${folder}"`);
  return config;
}
