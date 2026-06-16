import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const targetDir = process.argv[2];
if (!targetDir) {
  console.error('Usage: npm run scaffold -- <folder-path>');
  console.error('Example: npm run scaffold -- public/images/Galleries/Iceland');
  process.exit(1);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(projectRoot, 'public');

async function findWebP(dir) {
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    console.error(`Cannot read directory: ${dir}`);
    process.exit(1);
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findWebP(fullPath));
    } else if (/\.webp$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

async function main() {
  const absDir = path.resolve(targetDir);
  const files = await findWebP(absDir);

  if (files.length === 0) {
    console.error('No WebP files found in that folder. Run npm run optimize first.');
    process.exit(1);
  }

  const entries = [];
  for (const file of files) {
    const meta = await sharp(file).metadata();
    const srcPath = '/' + path.relative(publicDir, file).replace(/\\/g, '/');
    entries.push(`  { src: "${srcPath}", alt: "", width: ${meta.width}, height: ${meta.height} }`);
  }

  console.log(`\n// ${path.basename(absDir)} — ${files.length} images`);
  console.log('[\n' + entries.join(',\n') + '\n]');
}

main().catch(console.error);
