// Pure helpers for the admin tool: name derivation, TS-source generation, and
// anchor-based insertion into the hand-written data files. No I/O here so these
// stay easy to reason about and test.

// Double-quoted string literal with correct escaping. The data files already
// use double quotes in galleries.ts; using JSON.stringify everywhere guarantees
// apostrophes/quotes/newlines are escaped safely.
const q = (s) => JSON.stringify(String(s ?? ''));

/** "Santo Antão" -> "santo-antao" (diacritics stripped, kebab-case). */
export function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Derive every name the pipeline needs from the display name (or an explicit
 * slug override). Folder name == slug in both Galleries/ and
 * DestinationsHeroPhotos/, matching the kebab-case convention.
 */
export function deriveNames(name, slugOverride) {
  const slug = slugify(slugOverride || name);
  const destConst =
    'DESTINATIONS_' + slug.toUpperCase().replace(/-/g, '_') + '_HERO_PHOTOS';
  return {
    slug,
    galleryFolder: slug, // public/images/Galleries/<slug>/
    destFolder: slug, //     public/images/DestinationsHeroPhotos/<slug>/
    destConst,
  };
}

/** True if a gallery with this slug already exists in galleries.ts source. */
export function gallerySlugExists(galleriesSrc, slug) {
  const re = new RegExp(`\\bslug:\\s*["']${slug}["']`);
  return re.test(galleriesSrc);
}

/** Render one gallery object literal matching the existing 2/4-space style. */
export function renderGalleryObject({ slug, name, shortName, title, description, photos }) {
  const lines = ['  {'];
  lines.push(`    slug: ${q(slug)},`);
  lines.push(`    name: ${q(name)},`);
  if (shortName) lines.push(`    shortName: ${q(shortName)},`);
  lines.push(`    title: ${q(title)},`);
  lines.push('    description: [');
  description.forEach((p, i) => {
    lines.push(`    ${q(p)}${i < description.length - 1 ? ',' : ''}`);
  });
  lines.push('    ],');
  lines.push('    photos: [');
  photos.forEach((ph) => {
    lines.push(`    { src: ${q(ph.src)}, alt: ${q(ph.alt)}, width: ${ph.width}, height: ${ph.height} },`);
  });
  lines.push('    ],');
  lines.push('  },');
  return lines.join('\n');
}

/** Render an exported hero-photos const for destinations.ts. */
export function renderHeroConst({ constName, photos }) {
  const lines = [`export const ${constName} = [`];
  photos.forEach((ph) => {
    lines.push(`  { src: ${q(ph.src)}, alt: ${q(ph.alt)}, width: ${ph.width}, height: ${ph.height} },`);
  });
  lines.push('];');
  return lines.join('\n');
}

/** Render a <DestinationSection> for destinations/index.astro. */
export function renderDestinationSection({ destTitle, destConst, slug, blurb }) {
  const blurbArr = '[' + blurb.map((b) => q(b)).join(', ') + ']';
  return [
    '      <DestinationSection',
    `        title=${q(destTitle)}`,
    `        images={${destConst}}`,
    `        galleryUrl="/galleries/${slug}"`,
    `        description={${blurbArr}}`,
    '        class="snap-start"',
    '      />',
  ].join('\n');
}

// --- Anchor-based insertion into existing file source ------------------------

const GALLERIES_ANCHOR = 'export const galleries = [\n';
const IMPORT_ANCHOR = '} from "../../data/destinations";';
const SECTION_ANCHOR = '      <!-- Placeholder to allow snap onto footer -->';

/** Insert a new gallery object immediately after `export const galleries = [`. */
export function insertGallery(galleriesSrc, objText) {
  const idx = galleriesSrc.indexOf(GALLERIES_ANCHOR);
  if (idx === -1) throw new Error('Could not find `export const galleries = [` anchor');
  const at = idx + GALLERIES_ANCHOR.length;
  return galleriesSrc.slice(0, at) + objText + '\n' + galleriesSrc.slice(at);
}

/** Append a hero-photos const to the end of destinations.ts. */
export function appendHeroConst(destinationsSrc, constText) {
  return destinationsSrc.replace(/\s*$/, '') + '\n\n' + constText + '\n';
}

/** Add the new const name to the destinations import block in index.astro. */
export function insertImport(indexSrc, constName) {
  if (indexSrc.includes(IMPORT_ANCHOR) === false) {
    throw new Error('Could not find destinations import anchor in index.astro');
  }
  return indexSrc.replace(IMPORT_ANCHOR, `  ${constName},\n${IMPORT_ANCHOR}`);
}

/** Insert a <DestinationSection> just before the footer-snap placeholder. */
export function insertDestinationSection(indexSrc, sectionText) {
  if (indexSrc.includes(SECTION_ANCHOR) === false) {
    throw new Error('Could not find placeholder-comment anchor in index.astro');
  }
  return indexSrc.replace(SECTION_ANCHOR, `${sectionText}\n${SECTION_ANCHOR}`);
}
