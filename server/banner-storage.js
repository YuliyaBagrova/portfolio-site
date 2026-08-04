const fs = require('fs').promises;
const path = require('path');

const ALLOWED_EXT = new Set(['jpg', 'png', 'webp']);
const { logAppearanceActivity } = require('./appearance-activity');
const { logClothingActivity } = require('./clothing-activity');

function createBannerStorage(rootDir, config) {
  const {
    tableName,
    uploadsSubdir,
    apiPrefix,
    slideCount = 4,
    filePrefix = 'slide'
  } = config;

  const uploadsDir = path.join(rootDir, 'uploads', uploadsSubdir);

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

  async function deleteSlideFiles(index) {
    await Promise.all(
      [...ALLOWED_EXT].map(async (ext) => {
        try {
          await fs.unlink(path.join(uploadsDir, `${filePrefix}-${index}.${ext}`));
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      })
    );
  }

  async function saveSlideFile(index, buffer, ext) {
    await ensureUploadsDir();
    await deleteSlideFiles(index);
    const filename = `${filePrefix}-${index}.${ext}`;
    await fs.writeFile(path.join(uploadsDir, filename), buffer);
    return `/uploads/${uploadsSubdir}/${filename}`;
  }

  function parseSlideRow(row) {
    if (!row?.image_data) return null;

    try {
      const slide = JSON.parse(row.image_data);
      if (slide?.image) {
        slide.image = slide.image.split('?')[0];
      }
      return slide;
    } catch {
      const image = String(row.image_data).split('?')[0];
      return { image: row.image_data.startsWith('/') ? image : row.image_data };
    }
  }

  function isValidStoredImage(image) {
    return image.startsWith(`/uploads/${uploadsSubdir}/`);
  }

  function registerRoutes(app, getPool) {
    app.get(apiPrefix, async (_req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          `SELECT slide_index, image_data FROM ${tableName} ORDER BY slide_index`
        );

        const slides = Array(slideCount).fill(null);
        rows.forEach((row) => {
          slides[row.slide_index] = parseSlideRow(row);
        });

        res.json({ slides });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put(`${apiPrefix}/:index`, async (req, res) => {
      const index = Number(req.params.index);

      if (!Number.isInteger(index) || index < 0 || index >= slideCount) {
        return res.status(400).json({ error: `Неверный номер баннера (0–${slideCount - 1})` });
      }

      const { image, width, height, fit } = req.body || {};

      try {
        const pool = getPool();
        const [existingRows] = await pool.query(
          `SELECT image_data FROM ${tableName} WHERE slide_index = ?`,
          [index]
        );
        const existing = parseSlideRow(existingRows[0]);

        if (!image && !existing?.image) {
          return res.status(400).json({ error: 'Изображение обязательно' });
        }

        let imageUrl = existing?.image || null;

        if (image && typeof image === 'string') {
          if (image.startsWith('data:')) {
            const { ext, buffer } = parseDataUrl(image);
            imageUrl = await saveSlideFile(index, buffer, ext);
          } else if (isValidStoredImage(image.split('?')[0])) {
            imageUrl = image.split('?')[0];
          } else {
            return res.status(400).json({ error: 'Неверный формат изображения' });
          }
        }

        const normalizedFit = fit
          ? {
              scale: Math.min(3, Math.max(1, Number(fit.scale) || 1)),
              x: Math.min(100, Math.max(0, Number(fit.x ?? 50))),
              y: Math.min(100, Math.max(0, Number(fit.y ?? 50)))
            }
          : existing?.fit || { scale: 1, x: 50, y: 50 };

        const slide = {
          image: imageUrl,
          width: Number(width) || existing?.width || null,
          height: Number(height) || existing?.height || null,
          fit: normalizedFit
        };

        await pool.query(
          `INSERT INTO ${tableName} (slide_index, image_data)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)`,
          [index, JSON.stringify(slide)]
        );

        if (config.activity?.enabled && image) {
          const logActivity = config.activity.useClothingLog ? logClothingActivity : logAppearanceActivity;
          await logActivity(pool, {
            action_type: 'banner_upload',
            target_id: String(index),
            title: config.activity.titleSave?.(index) || `Баннер, слайд ${index + 1} обновлён`,
            badge: config.activity.badge || 'Баннер',
            badge_class: config.activity.badgeClass || 'banners'
          });
        }

        res.json({
          ok: true,
          slide: {
            ...slide,
            image: `${slide.image}?v=${Date.now()}`
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete(`${apiPrefix}/:index`, async (req, res) => {
      const index = Number(req.params.index);

      if (!Number.isInteger(index) || index < 0 || index >= slideCount) {
        return res.status(400).json({ error: `Неверный номер баннера (0–${slideCount - 1})` });
      }

      try {
        await deleteSlideFiles(index);

        const pool = getPool();
        await pool.query(`DELETE FROM ${tableName} WHERE slide_index = ?`, [index]);

        if (config.activity?.enabled) {
          const logActivity = config.activity.useClothingLog ? logClothingActivity : logAppearanceActivity;
          await logActivity(pool, {
            action_type: 'banner_remove',
            target_id: String(index),
            title: config.activity.titleDelete?.(index) || `Баннер, слайд ${index + 1} удалён`,
            badge: config.activity.badge || 'Баннер',
            badge_class: config.activity.badgeClass || 'banners'
          });
        }

        res.json({ ok: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  return { registerRoutes, uploadsDir, ensureUploadsDir };
}

module.exports = { createBannerStorage };
