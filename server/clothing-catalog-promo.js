const fs = require('fs').promises;
const path = require('path');

const PROMO_ID = 'default';
const ALLOWED_EXT = new Set(['jpg', 'png', 'webp']);

const DEFAULT_PROMO = {
  promo_label: 'Горячие предложения',
  promo_title: 'Sale до −40%',
  promo_subtitle: 'Лимитированная подборка сезона',
  promo_link: ''
};
const { logClothingActivity } = require('./clothing-activity');

function createClothingCatalogPromoStorage(rootDir) {
  const uploadsDir = path.join(rootDir, 'uploads', 'clothing-catalog-promo');

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

  async function deletePromoFiles() {
    await Promise.all(
      [...ALLOWED_EXT].map(async (ext) => {
        try {
          await fs.unlink(path.join(uploadsDir, `${PROMO_ID}.${ext}`));
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      })
    );
  }

  async function savePromoFile(buffer, ext) {
    await ensureUploadsDir();
    await deletePromoFiles();
    const filename = `${PROMO_ID}.${ext}`;
    await fs.writeFile(path.join(uploadsDir, filename), buffer);
    return `/uploads/clothing-catalog-promo/${filename}`;
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

  function serializePromo(row) {
    const imageData = parseImageData(row?.image_data);
    return {
      promo_label: row?.promo_label || DEFAULT_PROMO.promo_label,
      promo_title: row?.promo_title || DEFAULT_PROMO.promo_title,
      promo_subtitle: row?.promo_subtitle || DEFAULT_PROMO.promo_subtitle,
      promo_link: row?.promo_link || '',
      image: imageData?.image ? `${imageData.image}?v=${Date.now()}` : null
    };
  }

  function normalizeText(value, maxLength) {
    if (value == null) return '';
    return String(value).trim().slice(0, maxLength);
  }

  async function resolveImagePayload(image, removeImage) {
    if (removeImage) {
      await deletePromoFiles();
      return null;
    }

    if (image == null || image === '') return undefined;

    if (typeof image !== 'string') {
      throw new Error('Неверный формат изображения');
    }

    if (image.startsWith('data:')) {
      const { ext, buffer } = parseDataUrl(image);
      const imageUrl = await savePromoFile(buffer, ext);
      return JSON.stringify({ image: imageUrl });
    }

    if (image.startsWith('/uploads/clothing-catalog-promo/')) {
      return JSON.stringify({ image: image.split('?')[0] });
    }

    throw new Error('Неверный формат изображения');
  }

  async function seedPromoIfEmpty(pool) {
    const [rows] = await pool.query('SELECT id FROM clothing_catalog_promo WHERE id = ?', [PROMO_ID]);
    if (rows.length) return;

    await pool.query(
      `INSERT INTO clothing_catalog_promo (id, promo_label, promo_title, promo_subtitle, promo_link)
       VALUES (?, ?, ?, ?, ?)`,
      [
        PROMO_ID,
        DEFAULT_PROMO.promo_label,
        DEFAULT_PROMO.promo_title,
        DEFAULT_PROMO.promo_subtitle,
        DEFAULT_PROMO.promo_link
      ]
    );
  }

  function registerRoutes(app, getPool) {
    app.get('/api/clothing-catalog-promo', async (_req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          `SELECT id, image_data, promo_label, promo_title, promo_subtitle, promo_link, updated_at
           FROM clothing_catalog_promo WHERE id = ?`,
          [PROMO_ID]
        );

        if (!rows.length) {
          return res.json({ promo: { ...DEFAULT_PROMO, image: null } });
        }

        res.json({ promo: serializePromo(rows[0]) });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/clothing-catalog-promo', async (req, res) => {
      const body = req.body || {};
      const promoLabel = normalizeText(body.promo_label, 64);
      const promoTitle = normalizeText(body.promo_title, 128);
      const promoSubtitle = normalizeText(body.promo_subtitle, 255);
      const promoLink = normalizeText(body.promo_link, 512);
      const removeImage = Boolean(body.remove_image);

      if (!promoLabel) {
        return res.status(400).json({ error: 'Надпись на стикере обязательна' });
      }

      try {
        const pool = getPool();
        await seedPromoIfEmpty(pool);

        const imagePayload = await resolveImagePayload(body.image, removeImage);

        if (imagePayload === undefined) {
          await pool.query(
            `UPDATE clothing_catalog_promo
             SET promo_label = ?, promo_title = ?, promo_subtitle = ?, promo_link = ?
             WHERE id = ?`,
            [promoLabel, promoTitle, promoSubtitle, promoLink, PROMO_ID]
          );
        } else {
          await pool.query(
            `UPDATE clothing_catalog_promo
             SET image_data = ?, promo_label = ?, promo_title = ?, promo_subtitle = ?, promo_link = ?
             WHERE id = ?`,
            [imagePayload, promoLabel, promoTitle, promoSubtitle, promoLink, PROMO_ID]
          );
        }

        const [rows] = await pool.query(
          `SELECT id, image_data, promo_label, promo_title, promo_subtitle, promo_link, updated_at
           FROM clothing_catalog_promo WHERE id = ?`,
          [PROMO_ID]
        );

        await logClothingActivity(pool, {
          action_type: removeImage ? 'promo_image_remove' : 'promo_update',
          target_id: PROMO_ID,
          title: removeImage
            ? 'Изображение рекламы каталога удалено'
            : `Реклама каталога «${promoTitle || promoLabel}» обновлена`,
          badge: 'Реклама',
          badge_class: 'promo'
        });

        res.json({ promo: serializePromo(rows[0]) });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/api/clothing-catalog-promo/image', async (_req, res) => {
      try {
        await deletePromoFiles();
        const pool = getPool();
        await pool.query('UPDATE clothing_catalog_promo SET image_data = NULL WHERE id = ?', [PROMO_ID]);

        const [rows] = await pool.query(
          `SELECT id, image_data, promo_label, promo_title, promo_subtitle, promo_link, updated_at
           FROM clothing_catalog_promo WHERE id = ?`,
          [PROMO_ID]
        );

        await logClothingActivity(pool, {
          action_type: 'promo_image_remove',
          target_id: PROMO_ID,
          title: 'Изображение рекламы каталога удалено',
          badge: 'Реклама',
          badge_class: 'promo'
        });

        res.json({ promo: serializePromo(rows[0] || null) });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  return {
    registerRoutes,
    ensureUploadsDir,
    seedPromoIfEmpty,
    DEFAULT_PROMO
  };
}

module.exports = { createClothingCatalogPromoStorage };
