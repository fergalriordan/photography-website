// Per-folder max width and WebP quality — single source of truth shared by
// optimize-images.mjs and the admin tool (scripts/admin/). Keep the galleries
// and destinations-hero-photos values in sync with what the pages expect.
export const folderConfigs = [
  { folder: 'galleries',                maxWidth: 1400, quality: 80 },
  { folder: 'hero-photos/wide',         maxWidth: 1920, quality: 85 },
  { folder: 'hero-photos/narrow',       maxWidth:  900, quality: 85 },
  { folder: 'destinations-hero-photos', maxWidth:  800, quality: 80 },
  { folder: 'home-page-collage',        maxWidth: 1400, quality: 80 },
];

export function configFor(folder) {
  const config = folderConfigs.find((c) => c.folder === folder);
  if (!config) throw new Error(`No image config for folder "${folder}"`);
  return config;
}
