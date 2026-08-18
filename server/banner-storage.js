const fs = require('fs').promises;
const path = require('path');

const ALLOWED_EXT = new Set(['jpg', 'png', 'webp']);
const { logAppearanceActivity } = require('./appearance-activity');
const { logClothingActivity } = require('./clothing-activity');
const { resolvePublicImage } = require('./ensure-default-uploads');

function createBannerStorage(rootDir, config) {
  const {
    tableName,
    uploadsSubdir,
    apiPrefix,
    slideCount = 4,
    dynamicSlides = false,
    maxSlides: configMaxSlides,
    filePrefix = 'slide'
  } = config;

  const maxSlides = configMaxSlides || slideCount;

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
    if (!row || !row.image_data) return null;

    try {
      const slide = JSON.parse(row.image_data);
      if (slide && slide.image) {
        slide.image = resolvePublicImage(rootDir, slide.image.split('?')[0]);
      }
      return slide;
    } catch (error) {
      const image = String(row.image_data).split('?')[0];
      const normalized = row.image_data.startsWith('/') ? image : row.image_data;
      return { image: resolvePublicImage(rootDir, normalized) };
    }
  }

  function isValidStoredImage(image) {
    return image.startsWith(`/uploads/${uploadsSubdir}/`);
  }

  function registerRoutes(app, getPool) {
    async function saveSlideAtIndex(index, body) {
      const { image, width, height, fit } = body || {};
      const pool = getPool();
      const [existingRows] = await pool.query(
        `SELECT image_data FROM ${tableName} WHERE slide_index = ?`,
        [index]
      );
      const existing = parseSlideRow(existingRows[0]);

      if (!image && !existing?.image) {
        const error = new Error('Изображение обязательно');
        error.status = 400;
        throw error;
      }

      let imageUrl = existing?.image || null;

      if (image && typeof image === 'string') {
        if (image.startsWith('data:')) {
          const { ext, buffer } = parseDataUrl(image);
          imageUrl = await saveSlideFile(index, buffer, ext);
        } else if (isValidStoredImage(image.split('?')[0])) {
          imageUrl = image.split('?')[0];
        } else {
          const error = new Error('Неверный формат изображения');
          error.status = 400;
          throw error;
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

      return {
        ...slide,
        image: `${slide.image}?v=${Date.now()}`
      };
    }

    app.get(apiPrefix, async (_req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          `SELECT slide_index, image_data FROM ${tableName} ORDER BY slide_index`
        );

        if (dynamicSlides) {
          const slides = [];
          rows.forEach((row) => {
            slides[row.slide_index] = parseSlideRow(row);
          });
          while (slides.length > 0 && !slides[slides.length - 1]) {
            slides.pop();
          }
          res.json({ slides });
        } else {
          const slides = Array(slideCount).fill(null);
          rows.forEach((row) => {
            slides[row.slide_index] = parseSlideRow(row);
          });
          res.json({ slides });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put(`${apiPrefix}/:index`, async (req, res) => {
      const index = Number(req.params.index);

      const indexLimit = dynamicSlides ? maxSlides : slideCount;
      if (!Number.isInteger(index) || index < 0 || index >= indexLimit) {
        return res.status(400).json({ error: `Неверный номер баннера (0–${indexLimit - 1})` });
      }

      try {
        const slide = await saveSlideAtIndex(index, req.body);
        res.json({ ok: true, slide, index });
      } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
      }
    });

    if (dynamicSlides) {
      app.post(apiPrefix, async (req, res) => {
        const { image } = req.body || {};

        if (!image || typeof image !== 'string') {
          return res.status(400).json({ error: 'Изображение обязательно' });
        }

        try {
          const pool = getPool();
          const [rows] = await pool.query(
            `SELECT slide_index FROM ${tableName} ORDER BY slide_index`
          );
          const used = new Set(rows.map((row) => row.slide_index));
          let index = 0;
          while (used.has(index) && index < maxSlides) index += 1;

          if (index >= maxSlides) {
            return res.status(400).json({ error: `Максимум ${maxSlides} баннеров` });
          }

          const slide = await saveSlideAtIndex(index, req.body);
          res.json({ ok: true, slide, index });
        } catch (error) {
          res.status(error.status || 500).json({ error: error.message });
        }
      });
    }

    app.delete(`${apiPrefix}/:index`, async (req, res) => {
      const index = Number(req.params.index);
      const indexLimit = dynamicSlides ? maxSlides : slideCount;

      if (!Number.isInteger(index) || index < 0 || index >= indexLimit) {
        return res.status(400).json({ error: `Неверный номер баннера (0–${indexLimit - 1})` });
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
