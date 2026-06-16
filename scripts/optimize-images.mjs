import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public', 'images');
const force = process.argv.includes('--force');

// Max width and quality per image category
const folderConfigs = [
  { folder: 'Galleries',                     maxWidth: 1400, quality: 80 },
  { folder: 'HeroPhotos/hero_photos_wide',   maxWidth: 1920, quality: 85 },
  { folder: 'HeroPhotos/hero_photos_narrow', maxWidth:  900, quality: 85 },
  { folder: 'DestinationsHeroPhotos',        maxWidth:  800, quality: 80 },
  { folder: 'HomePageCollage',               maxWidth: 1400, quality: 80 },
];

async function findImages(dir) {
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findImages(fullPath));
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function processImage(inputPath, maxWidth, quality) {
  const webpPath = inputPath.replace(/\.(jpe?g|png)$/i, '.webp');

  try {
    await fs.access(webpPath);
    if (!force) return { skipped: true };
    await fs.unlink(webpPath);
  } catch {}

  const origSize = (await fs.stat(inputPath)).size;
  const result = await sharp(inputPath)
    .rotate()  // apply EXIF orientation to pixels before stripping metadata
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality })
    .toFile(webpPath);

  return {
    skipped: false,
    origSize,
    newSize: result.size,
  };
}

async function main() {
  let totalOrig = 0, totalNew = 0, processed = 0, skipped = 0, errors = 0;

  for (const { folder, maxWidth, quality } of folderConfigs) {
    const dir = path.join(publicDir, folder);
    const files = await findImages(dir);
    if (files.length === 0) {
      console.log(`\n${folder}/: no images found`);
      continue;
    }

    console.log(`\n${folder}/ — ${files.length} images (max ${maxWidth}px, q${quality})`);

    for (const file of files) {
      try {
        const r = await processImage(file, maxWidth, quality);
        if (r.skipped) {
          skipped++;
          process.stdout.write('.');
        } else {
          processed++;
          totalOrig += r.origSize;
          totalNew += r.newSize;
          const pct = ((1 - r.newSize / r.origSize) * 100).toFixed(0);
          console.log(
            `  ✓ ${path.basename(file)}: ${(r.origSize / 1024).toFixed(0)}KB → ${(r.newSize / 1024).toFixed(0)}KB (-${pct}%)`
          );
        }
      } catch (e) {
        errors++;
        console.error(`  ✗ ${path.basename(file)}: ${e.message}`);
      }
    }
    if (skipped > 0) process.stdout.write('\n');
  }

  console.log(`\n=== Complete: ${processed} converted, ${skipped} already done, ${errors} errors ===`);
  if (processed > 0) {
    const pct = ((1 - totalNew / totalOrig) * 100).toFixed(1);
    console.log(
      `Size: ${(totalOrig / 1024 / 1024).toFixed(1)} MB → ${(totalNew / 1024 / 1024).toFixed(1)} MB (-${pct}%)`
    );
  }
}

main().catch(console.error);
