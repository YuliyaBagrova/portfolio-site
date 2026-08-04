async function logClothingActivity(pool, entry) {
  const { action_type, target_id, title, badge, badge_class } = entry;

  await pool.query(
    `INSERT INTO clothing_activity (action_type, target_id, title, badge, badge_class)
     VALUES (?, ?, ?, ?, ?)`,
    [action_type, target_id, title, badge, badge_class]
  );
}

async function getRecentClothingActivity(pool, limit = 8) {
  const [rows] = await pool.query(
    `SELECT id, action_type, target_id, title, badge, badge_class, created_at
     FROM clothing_activity
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [limit]
  );

  return rows;
}

async function backfillClothingActivity(pool) {
  const [countRows] = await pool.query('SELECT COUNT(*) AS cnt FROM clothing_activity');
  if (Number(countRows[0]?.cnt || 0) > 0) return;

  const entries = [];

  const [productRows] = await pool.query(
    `SELECT id, title, created_at
     FROM works
     WHERE section_id = 'clothing'
     ORDER BY created_at DESC
     LIMIT 10`
  );

  productRows.forEach((row) => {
    entries.push({
      action_type: 'product_create',
      target_id: String(row.id),
      title: `Товар «${row.title}» добавлен`,
      badge: 'Товар',
      badge_class: 'clothing',
      created_at: row.created_at
    });
  });

  const [bannerRows] = await pool.query(
    `SELECT slide_index, updated_at
     FROM clothing_hero_banners
     WHERE image_data IS NOT NULL AND image_data != ''
     ORDER BY updated_at DESC`
  );

  bannerRows.forEach((row) => {
    entries.push({
      action_type: 'banner_upload',
      target_id: String(row.slide_index),
      title: `Баннер «Одежда», слайд ${Number(row.slide_index) + 1} обновлён`,
      badge: 'Баннер',
      badge_class: 'banner',
      created_at: row.updated_at
    });
  });

  entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  for (const entry of entries.slice(0, 20)) {
    await pool.query(
      `INSERT INTO clothing_activity (action_type, target_id, title, badge, badge_class, created_at)
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

function registerClothingActivityRoutes(app, getPool) {
  app.get('/api/clothing/recent-activity', async (_req, res) => {
    try {
      const pool = getPool();
      const items = await getRecentClothingActivity(pool, 8);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  logClothingActivity,
  getRecentClothingActivity,
  backfillClothingActivity,
  registerClothingActivityRoutes
};
