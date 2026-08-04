const fs = require('fs').promises;
const path = require('path');
const { logAppearanceActivity } = require('./appearance-activity');

const ALLOWED_EXT = new Set(['jpg', 'png', 'webp']);
const ALLOWED_SECTIONS = new Set(['supplements', 'banners', 'clothing']);

const DEFAULT_ICONS = {
  supplements: '/assets/icons/fitness-industry.png',
  banners: '/assets/icons/banners.png',
  clothing: '/assets/icons/clothing.png'
};

const SECTION_LABELS = {
  supplements: 'Фитнес-индустрия',
  banners: 'Мои Баннеры',
  clothing: 'Одежда'
};

function createSectionIconsStorage(rootDir) {
  const uploadsDir = path.join(rootDir, 'uploads', 'section-icons');

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

  async function deleteSectionFiles(sectionId) {
    await Promise.all(
      [...ALLOWED_EXT].map(async (ext) => {
        try {
          await fs.unlink(path.join(uploadsDir, `${sectionId}.${ext}`));
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      })
    );
  }

  async function saveSectionFile(sectionId, buffer, ext) {
    await ensureUploadsDir();
    await deleteSectionFiles(sectionId);
    const filename = `${sectionId}.${ext}`;
    await fs.writeFile(path.join(uploadsDir, filename), buffer);
    return `/uploads/section-icons/${filename}`;
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

  function serializeIcon(sectionId, row) {
    const imageData = parseImageData(row?.image_data);
    return {
      section_id: sectionId,
      label: SECTION_LABELS[sectionId],
      image: imageData?.image ? `${imageData.image}?v=${Date.now()}` : null,
      default: DEFAULT_ICONS[sectionId]
    };
  }

  async function resolveImagePayload(sectionId, image) {
    if (!image) return null;

    if (typeof image !== 'string') {
      throw new Error('Неверный формат изображения');
    }

    if (image.startsWith('data:')) {
      const { ext, buffer } = parseDataUrl(image);
      const imageUrl = await saveSectionFile(sectionId, buffer, ext);
      return JSON.stringify({ image: imageUrl });
    }

    if (image.startsWith('/uploads/section-icons/')) {
      return JSON.stringify({ image: image.split('?')[0] });
    }

    throw new Error('Неверный формат изображения');
  }

  function registerRoutes(app, getPool) {
    app.get('/api/section-icons', async (_req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          'SELECT section_id, image_data FROM section_icons'
        );

        const bySection = Object.fromEntries(rows.map((row) => [row.section_id, row]));
        const icons = {};

        ALLOWED_SECTIONS.forEach((sectionId) => {
          icons[sectionId] = serializeIcon(sectionId, bySection[sectionId]);
        });

        res.json({ icons });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/section-icons/:sectionId', async (req, res) => {
      const sectionId = req.params.sectionId;
      const { image } = req.body || {};

      if (!ALLOWED_SECTIONS.has(sectionId)) {
        return res.status(400).json({ error: 'Неизвестный раздел' });
      }

      if (!image) {
        return res.status(400).json({ error: 'Изображение обязательно' });
      }

      try {
        const pool = getPool();
        const imageData = await resolveImagePayload(sectionId, image);

        await pool.query(
          `INSERT INTO section_icons (section_id, image_data)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)`,
          [sectionId, imageData]
        );

        const [rows] = await pool.query(
          'SELECT section_id, image_data FROM section_icons WHERE section_id = ?',
          [sectionId]
        );

        await logAppearanceActivity(pool, {
          action_type: 'icon_upload',
          target_id: sectionId,
          title: `Иконка «${SECTION_LABELS[sectionId]}» обновлена`,
          badge: 'Иконка',
          badge_class: sectionId
        });

        res.json(serializeIcon(sectionId, rows[0]));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/api/section-icons/:sectionId', async (req, res) => {
      const sectionId = req.params.sectionId;

      if (!ALLOWED_SECTIONS.has(sectionId)) {
        return res.status(400).json({ error: 'Неизвестный раздел' });
      }

      try {
        await deleteSectionFiles(sectionId);
        const pool = getPool();
        await pool.query('DELETE FROM section_icons WHERE section_id = ?', [sectionId]);

        await logAppearanceActivity(pool, {
          action_type: 'icon_reset',
          target_id: sectionId,
          title: `Иконка «${SECTION_LABELS[sectionId]}» сброшена`,
          badge: 'Иконка',
          badge_class: sectionId
        });

        res.json(serializeIcon(sectionId, null));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  return { registerRoutes, ensureUploadsDir, DEFAULT_ICONS, SECTION_LABELS };
}

module.exports = { createSectionIconsStorage };
