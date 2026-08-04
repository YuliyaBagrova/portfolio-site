const SECTION_LABELS = {
  supplements: 'Фитнес-индустрия',
  banners: 'Мои Баннеры',
  clothing: 'Одежда'
};

async function logAppearanceActivity(pool, entry) {
  const { action_type, target_id, title, badge, badge_class } = entry;

  await pool.query(
    `INSERT INTO appearance_activity (action_type, target_id, title, badge, badge_class)
     VALUES (?, ?, ?, ?, ?)`,
    [action_type, target_id, title, badge, badge_class]
  );
}

async function getRecentAppearanceActivity(pool, limit = 5) {
  const [rows] = await pool.query(
    `SELECT id, action_type, target_id, title, badge, badge_class, created_at
     FROM appearance_activity
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [limit]
  );

  return rows;
}

async function backfillAppearanceActivity(pool) {
  const [countRows] = await pool.query('SELECT COUNT(*) AS cnt FROM appearance_activity');
  if (Number(countRows[0]?.cnt || 0) > 0) return;

  const entries = [];

  const [heroRows] = await pool.query(
    `SELECT slide_index, updated_at
     FROM hero_banners
     WHERE image_data IS NOT NULL AND image_data != ''
     ORDER BY updated_at DESC`
  );

  heroRows.forEach((row) => {
    entries.push({
      action_type: 'banner_upload',
      target_id: String(row.slide_index),
      title: `Баннер «Главная», слайд ${Number(row.slide_index) + 1} обновлён`,
      badge: 'Баннер',
      badge_class: 'home',
      created_at: row.updated_at
    });
  });

  const [iconRows] = await pool.query(
    `SELECT section_id, updated_at
     FROM section_icons
     WHERE image_data IS NOT NULL AND image_data != ''
     ORDER BY updated_at DESC`
  );

  iconRows.forEach((row) => {
    const label = SECTION_LABELS[row.section_id] || row.section_id;
    entries.push({
      action_type: 'icon_upload',
      target_id: row.section_id,
      title: `Иконка «${label}» обновлена`,
      badge: 'Иконка',
      badge_class: row.section_id,
      created_at: row.updated_at
    });
  });

  entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  for (const entry of entries.slice(0, 20)) {
    await pool.query(
      `INSERT INTO appearance_activity (action_type, target_id, title, badge, badge_class, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entry.action_type,
        entry.target_id,
        entry.title,
        entry.badge,
        entry.badge_class,
        entry.created_at
      ]
    );
  }
}

function registerAppearanceActivityRoutes(app, getPool) {
  app.get('/api/appearance/recent', async (_req, res) => {
    try {
      const pool = getPool();
      const items = await getRecentAppearanceActivity(pool, 5);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  logAppearanceActivity,
  getRecentAppearanceActivity,
  backfillAppearanceActivity,
  registerAppearanceActivityRoutes,
  SECTION_LABELS
};
