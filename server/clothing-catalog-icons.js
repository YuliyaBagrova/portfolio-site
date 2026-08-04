const fs = require('fs').promises;
const path = require('path');

const ALLOWED_EXT = new Set(['jpg', 'png', 'webp']);
const ALLOWED_CATEGORIES = new Set(['men', 'women', 'shirts', 'pants', 'jeans', 'accessories']);
const { logClothingActivity } = require('./clothing-activity');

const CATEGORY_LABELS = {
  men: 'Мужчинам',
  women: 'Женщинам',
  shirts: 'Рубашки',
  pants: 'Брюки',
  jeans: 'Джинсы',
  accessories: 'Аксессуары'
};

const CATEGORY_GLYPHS = {
  men: 'M',
  women: 'W',
  shirts: 'S',
  pants: 'P',
  jeans: 'J',
  accessories: 'A'
};

function createClothingCatalogIconsStorage(rootDir) {
  const uploadsDir = path.join(rootDir, 'uploads', 'clothing-catalog-icons');

  async function ensureUploadsDir() {
    await fs.mkdir(uploadsDir, { recursive: true });
  }

  function parseDataUrl(dataUrl) {
    const match = /^data:image\/([\w+.-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      throw new Error('Неверный формат изображения');
    }

    let ext = match[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (!ALLOWED_EXT.has(ext)) {
      throw new Error('Поддерживаются только JPG, PNG и WebP');
    }

    return {
      ext,
      buffer: Buffer.from(match[2], 'base64')
    };
  }

  async function deleteCategoryFiles(categoryId) {
    await Promise.all(
      [...ALLOWED_EXT].map(async (ext) => {
        try {
          await fs.unlink(path.join(uploadsDir, `${categoryId}.${ext}`));
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      })
    );
  }

  async function saveCategoryFile(categoryId, buffer, ext) {
    await ensureUploadsDir();
    await deleteCategoryFiles(categoryId);
    const filename = `${categoryId}.${ext}`;
    await fs.writeFile(path.join(uploadsDir, filename), buffer);
    return `/uploads/clothing-catalog-icons/${filename}`;
  }

  function parseImageData(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.image) {
        parsed.image = parsed.image.split('?')[0];
      }
      return parsed;
    } catch {
      const image = String(raw).split('?')[0];
      return raw.startsWith('/') ? { image } : null;
    }
  }

  function serializeIcon(categoryId, row) {
    const imageData = parseImageData(row?.image_data);
    return {
      category_id: categoryId,
      label: CATEGORY_LABELS[categoryId],
      glyph: CATEGORY_GLYPHS[categoryId],
      image: imageData?.image ? `${imageData.image}?v=${Date.now()}` : null
    };
  }

  async function resolveImagePayload(categoryId, image) {
    if (!image) return null;

    if (typeof image !== 'string') {
      throw new Error('Неверный формат изображения');
    }

    if (image.startsWith('data:')) {
      const { ext, buffer } = parseDataUrl(image);
      const imageUrl = await saveCategoryFile(categoryId, buffer, ext);
      return JSON.stringify({ image: imageUrl });
    }

    if (image.startsWith('/uploads/clothing-catalog-icons/')) {
      return JSON.stringify({ image: image.split('?')[0] });
    }

    throw new Error('Неверный формат изображения');
  }

  function registerRoutes(app, getPool) {
    app.get('/api/clothing-catalog-icons', async (_req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          'SELECT category_id, image_data FROM clothing_catalog_icons'
        );

        const byCategory = Object.fromEntries(rows.map((row) => [row.category_id, row]));
        const icons = {};

        ALLOWED_CATEGORIES.forEach((categoryId) => {
          icons[categoryId] = serializeIcon(categoryId, byCategory[categoryId]);
        });

        res.json({ icons });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/clothing-catalog-icons/:categoryId', async (req, res) => {
      const categoryId = req.params.categoryId;
      const { image } = req.body || {};

      if (!ALLOWED_CATEGORIES.has(categoryId)) {
        return res.status(400).json({ error: 'Неизвестная категория' });
      }

      if (!image) {
        return res.status(400).json({ error: 'Изображение обязательно' });
      }

      try {
        const pool = getPool();
        const imageData = await resolveImagePayload(categoryId, image);

        await pool.query(
          `INSERT INTO clothing_catalog_icons (category_id, image_data)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)`,
          [categoryId, imageData]
        );

        const [rows] = await pool.query(
          'SELECT category_id, image_data FROM clothing_catalog_icons WHERE category_id = ?',
          [categoryId]
        );

        await logClothingActivity(pool, {
          action_type: 'catalog_icon_upload',
          target_id: categoryId,
          title: `Иконка «${CATEGORY_LABELS[categoryId]}» обновлена`,
          badge: 'Каталог',
          badge_class: 'catalog'
        });

        res.json(serializeIcon(categoryId, rows[0]));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/api/clothing-catalog-icons/:categoryId', async (req, res) => {
      const categoryId = req.params.categoryId;

      if (!ALLOWED_CATEGORIES.has(categoryId)) {
        return res.status(400).json({ error: 'Неизвестная категория' });
      }

      try {
        await deleteCategoryFiles(categoryId);
        const pool = getPool();
        await pool.query('DELETE FROM clothing_catalog_icons WHERE category_id = ?', [categoryId]);

        await logClothingActivity(pool, {
          action_type: 'catalog_icon_remove',
          target_id: categoryId,
          title: `Иконка «${CATEGORY_LABELS[categoryId]}» удалена`,
          badge: 'Каталог',
          badge_class: 'catalog'
        });

        res.json(serializeIcon(categoryId, null));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  return {
    registerRoutes,
    ensureUploadsDir,
    CATEGORY_LABELS,
    CATEGORY_GLYPHS
  };
}

module.exports = { createClothingCatalogIconsStorage };
