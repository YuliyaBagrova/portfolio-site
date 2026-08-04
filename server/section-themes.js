const { logAppearanceActivity } = require('./appearance-activity');
const {
  ALLOWED_SECTIONS,
  SECTION_LABELS,
  DEFAULT_INPUTS,
  normalizeInputs,
  serializeTheme
} = require('./theme-defaults');

function createSectionThemesStorage() {
  function registerRoutes(app, getPool) {
    app.get('/api/section-themes', async (_req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          'SELECT section_id, palette_json, updated_at FROM section_themes'
        );

        const bySection = Object.fromEntries(rows.map((row) => [row.section_id, row]));
        const themes = {};

        ALLOWED_SECTIONS.forEach((sectionId) => {
          themes[sectionId] = serializeTheme(sectionId, bySection[sectionId]);
        });

        res.json({ themes });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/section-themes/:sectionId', async (req, res) => {
      const sectionId = req.params.sectionId;
      const {
        background,
        accent,
        navText,
        gradientMode,
        gradientColor
      } = req.body || {};

      if (!ALLOWED_SECTIONS.has(sectionId)) {
        return res.status(400).json({ error: 'Неизвестный раздел' });
      }

      try {
        const inputs = normalizeInputs(sectionId, {
          background,
          accent,
          navText,
          gradientMode,
          gradientColor
        });
        const pool = getPool();

        await pool.query(
          `INSERT INTO section_themes (section_id, palette_json)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE palette_json = VALUES(palette_json)`,
          [sectionId, JSON.stringify(inputs)]
        );

        const [rows] = await pool.query(
          'SELECT section_id, palette_json, updated_at FROM section_themes WHERE section_id = ?',
          [sectionId]
        );

        const theme = serializeTheme(sectionId, rows[0]);

        await logAppearanceActivity(pool, {
          action_type: 'theme_update',
          target_id: sectionId,
          title: `Палитра «${SECTION_LABELS[sectionId]}» обновлена`,
          badge: 'Палитра',
          badge_class: sectionId
        });

        res.json(theme);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    app.delete('/api/section-themes/:sectionId', async (req, res) => {
      const sectionId = req.params.sectionId;

      if (!ALLOWED_SECTIONS.has(sectionId)) {
        return res.status(400).json({ error: 'Неизвестный раздел' });
      }

      try {
        const pool = getPool();
        await pool.query('DELETE FROM section_themes WHERE section_id = ?', [sectionId]);

        const theme = serializeTheme(sectionId, null);

        await logAppearanceActivity(pool, {
          action_type: 'theme_reset',
          target_id: sectionId,
          title: `Палитра «${SECTION_LABELS[sectionId]}» сброшена`,
          badge: 'Палитра',
          badge_class: sectionId
        });

        res.json(theme);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  return { registerRoutes };
}

module.exports = {
  createSectionThemesStorage,
  DEFAULT_INPUTS
};
