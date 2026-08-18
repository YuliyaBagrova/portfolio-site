const fs = require('fs').promises;
const path = require('path');

const DEFAULT_UPLOADS = [
  ['assets/hero/slide-0.png', 'uploads/hero/slide-0.png'],
  ['assets/hero/slide-1.png', 'uploads/hero/slide-1.png'],
  ['assets/hero/slide-2.png', 'uploads/hero/slide-2.png'],
  ['assets/hero/slide-3.png', 'uploads/hero/slide-3.png'],
  ['assets/fitness-hero/slide-0.png', 'uploads/fitness-hero/slide-0.png'],
  ['assets/fitness-hero/slide-1.png', 'uploads/fitness-hero/slide-1.png'],
  ['assets/fitness-hero/slide-2.png', 'uploads/fitness-hero/slide-2.png'],
  ['assets/fitness-hero/slide-3.png', 'uploads/fitness-hero/slide-3.png'],
  ['assets/clothing-hero/slide-0.png', 'uploads/clothing-hero/slide-0.png'],
  ['assets/clothing-hero/slide-1.png', 'uploads/clothing-hero/slide-1.png'],
  ['assets/clothing-hero/slide-2.png', 'uploads/clothing-hero/slide-2.png'],
  ['assets/clothing-hero/slide-3.png', 'uploads/clothing-hero/slide-3.png'],
  ['assets/clothing-catalog-promo/default.png', 'uploads/clothing-catalog-promo/default.png'],
  ['assets/icons/banners.png', 'uploads/section-icons/banners.png'],
  ['assets/icons/clothing.png', 'uploads/section-icons/clothing.png'],
  ['assets/icons/fitness-industry.png', 'uploads/section-icons/supplements.png']
];

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

async function copyIfMissing(rootDir, fromRel, toRel) {
  const fromPath = path.join(rootDir, fromRel);
  const toPath = path.join(rootDir, toRel);
  if (!(await pathExists(fromPath))) return;
  if (await pathExists(toPath)) return;
  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.copyFile(fromPath, toPath);
}

async function ensureDefaultUploads(rootDir) {
  for (let i = 0; i < DEFAULT_UPLOADS.length; i += 1) {
    await copyIfMissing(rootDir, DEFAULT_UPLOADS[i][0], DEFAULT_UPLOADS[i][1]);
  }
}

function resolvePublicImage(rootDir, imageUrl) {
  const clean = String(imageUrl || '').split('?')[0];
  if (!clean) return clean;

  const abs = path.join(rootDir, clean.replace(/^\//, ''));
  try {
    require('fs').accessSync(abs);
    return clean;
  } catch (error) {
    const fallback = clean.replace(/^\/uploads\//, '/assets/');
    if (fallback === clean) return clean;
    try {
      require('fs').accessSync(path.join(rootDir, fallback.replace(/^\//, '')));
      return fallback;
    } catch (fallbackError) {
      return clean;
    }
  }
}

module.exports = { ensureDefaultUploads, resolvePublicImage };
