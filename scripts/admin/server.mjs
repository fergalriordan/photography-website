// Local, dev-only admin server for adding a new gallery. NOT part of the Astro
// app and never imported by it, so it can never end up in the static build.
// Run with `npm run admin`, open the printed URL, build the gallery visually,
// and click Save. It optimizes images with Sharp and rewrites the three data
// files; you then review `git diff` and commit.
import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { configFor } from '../image-config.mjs';
import {
  deriveNames,
  gallerySlugExists,
  renderGalleryObject,
  renderHeroConst,
  renderDestinationSection,
  insertGallery,
  appendHeroConst,
  insertImport,
  insertDestinationSection,
} from './generate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const publicImages = path.join(projectRoot, 'public', 'images');
const stagingDir = path.join(__dirname, '.staging');

const GALLERIES_TS = path.join(projectRoot, 'src', 'data', 'galleries.ts');
const DESTINATIONS_TS = path.join(projectRoot, 'src', 'data', 'destinations.ts');
const DEST_INDEX = path.join(projectRoot, 'src', 'pages', 'destinations', 'index.astro');

const HOST = '127.0.0.1';
const PORT = 4343;

const GALLERY_CFG = configFor('Galleries');
const HERO_CFG = configFor('DestinationsHeroPhotos');

// --- small helpers -----------------------------------------------------------

function sanitizeFilename(name) {
  return path.basename(String(name)).replace(/[^\w.\- ]+/g, '_');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

async function resetStaging() {
  await fs.rm(stagingDir, { recursive: true, force: true });
  await fs.mkdir(stagingDir, { recursive: true });
}

// Optimize one staged file -> a .webp in destDir. Returns { src, width, height }.
async function optimizeTo(stagedName, destDir, outBase, publicPrefix, cfg) {
  const inputPath = path.join(stagingDir, stagedName);
  const outPath = path.join(destDir, `${outBase}.webp`);
  const info = await sharp(inputPath)
    .rotate() // bake EXIF orientation before metadata is stripped
    .resize({ width: cfg.maxWidth, withoutEnlargement: true })
    .webp({ quality: cfg.quality })
    .toFile(outPath);
  return {
    src: `${publicPrefix}/${outBase}.webp`,
    width: info.width,
    height: info.height,
  };
}

// --- request handling --------------------------------------------------------

async function handleSave(req, res) {
  const raw = await readBody(req);
  let data;
  try {
    data = JSON.parse(raw.toString('utf8'));
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }

  const name = (data.name || '').trim();
  if (!name) return sendJson(res, 400, { error: 'Gallery name is required' });
  const photos = Array.isArray(data.photos) ? data.photos : [];
  if (photos.length === 0) return sendJson(res, 400, { error: 'Add at least one photo' });

  const { slug, galleryFolder, destFolder, destConst } = deriveNames(name, data.slug);
  if (!slug) return sendJson(res, 400, { error: 'Could not derive a slug from the name' });

  // Read all three targets up front so we fail before writing anything.
  const [galleriesSrc, destinationsSrc, indexSrc] = await Promise.all([
    fs.readFile(GALLERIES_TS, 'utf8'),
    fs.readFile(DESTINATIONS_TS, 'utf8'),
    fs.readFile(DEST_INDEX, 'utf8'),
  ]);

  if (gallerySlugExists(galleriesSrc, slug)) {
    return sendJson(res, 409, { error: `A gallery with slug "${slug}" already exists` });
  }

  const galleryDir = path.join(publicImages, 'Galleries', galleryFolder);
  const heroDir = path.join(publicImages, 'DestinationsHeroPhotos', destFolder);
  await fs.mkdir(galleryDir, { recursive: true });
  await fs.mkdir(heroDir, { recursive: true });

  // Optimize gallery photos in the user's chosen order -> img1..N.webp
  const galleryPhotos = [];
  const heroPhotos = [];
  let heroCount = 0;
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const staged = sanitizeFilename(p.file);
    const outBase = `img${i + 1}`;
    const meta = await optimizeTo(
      staged,
      galleryDir,
      outBase,
      `/images/Galleries/${galleryFolder}`,
      GALLERY_CFG
    );
    galleryPhotos.push({ src: meta.src, alt: p.alt || '', width: meta.width, height: meta.height });

    if (p.isHero) {
      heroCount++;
      const heroBase = path.parse(staged).name.replace(/^\d+__/, ''); // strip staging prefix; keep original base name
      const hmeta = await optimizeTo(
        staged,
        heroDir,
        heroBase,
        `/images/DestinationsHeroPhotos/${destFolder}`,
        HERO_CFG
      );
      heroPhotos.push({ src: hmeta.src, alt: p.alt || name, width: hmeta.width, height: hmeta.height });
    }
  }

  // Fallback: if nothing was flagged hero, use the first up-to-3 photos.
  if (heroPhotos.length === 0) {
    for (let i = 0; i < Math.min(3, photos.length); i++) {
      const staged = sanitizeFilename(photos[i].file);
      const heroBase = path.parse(staged).name;
      const hmeta = await optimizeTo(
        staged,
        heroDir,
        heroBase,
        `/images/DestinationsHeroPhotos/${destFolder}`,
        HERO_CFG
      );
      heroPhotos.push({
        src: hmeta.src,
        alt: photos[i].alt || name,
        width: hmeta.width,
        height: hmeta.height,
      });
      heroCount++;
    }
  }

  // Build the source snippets.
  const description = splitParagraphs(data.description);
  const blurb = splitParagraphs(data.destBlurb);
  const galleryObj = renderGalleryObject({
    slug,
    name,
    shortName: (data.shortName || '').trim() || undefined,
    title: (data.title || '').trim() || `${name} Gallery - Fergal's Photography`,
    description: description.length ? description : ['Photos from this gallery.'],
    photos: galleryPhotos,
  });
  const heroConst = renderHeroConst({ constName: destConst, photos: heroPhotos });
  const section = renderDestinationSection({
    destTitle: (data.destTitle || '').trim() || name.toUpperCase(),
    destConst,
    slug,
    blurb: blurb.length ? blurb : [`Photos from ${name}.`],
  });

  // Apply insertions and write all three files.
  const newGalleries = insertGallery(galleriesSrc, galleryObj);
  const newDestinations = appendHeroConst(destinationsSrc, heroConst);
  const newIndex = insertDestinationSection(insertImport(indexSrc, destConst), section);

  await Promise.all([
    fs.writeFile(GALLERIES_TS, newGalleries),
    fs.writeFile(DESTINATIONS_TS, newDestinations),
    fs.writeFile(DEST_INDEX, newIndex),
  ]);

  await resetStaging();

  return sendJson(res, 200, {
    ok: true,
    slug,
    galleryCount: galleryPhotos.length,
    heroCount,
    galleryDir: path.relative(projectRoot, galleryDir),
    heroDir: path.relative(projectRoot, heroDir),
  });
}

// Split a textarea value into paragraphs on blank lines; trim each.
function splitParagraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const html = await fs.readFile(path.join(__dirname, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    if (req.method === 'PUT' && url.pathname.startsWith('/upload/')) {
      const name = sanitizeFilename(decodeURIComponent(url.pathname.slice('/upload/'.length)));
      const body = await readBody(req);
      await fs.writeFile(path.join(stagingDir, name), body);
      return sendJson(res, 200, { ok: true, name });
    }

    if (req.method === 'POST' && url.pathname === '/validate-slug') {
      const raw = await readBody(req);
      const { slug } = JSON.parse(raw.toString('utf8') || '{}');
      const src = await fs.readFile(GALLERIES_TS, 'utf8');
      return sendJson(res, 200, { exists: gallerySlugExists(src, deriveNames(slug || '').slug) });
    }

    if (req.method === 'POST' && url.pathname === '/save') {
      return await handleSave(req, res);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  }
});

await resetStaging();
server.listen(PORT, HOST, () => {
  console.log(`\n  Gallery admin running at  http://${HOST}:${PORT}\n`);
  console.log('  Add a gallery in the browser, then review `git diff` and commit.\n');
});
