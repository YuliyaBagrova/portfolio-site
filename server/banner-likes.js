async function ensureBannerWorkLikesTable(pool) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banner_work_likes'`
  );

  if (rows[0].cnt > 0) return;

  await pool.query(`
    CREATE TABLE banner_work_likes (
      work_id INT NOT NULL,
      visitor_key VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (work_id, visitor_key),
      CONSTRAINT fk_banner_work_likes_work
        FOREIGN KEY (work_id) REFERENCES works(id)
        ON DELETE CASCADE
    )
  `);
  await pool.query('CREATE INDEX idx_banner_work_likes_work_id ON banner_work_likes(work_id)');
  console.log('Таблица banner_work_likes создана');
}

async function getLikeCounts(pool, workIds) {
  if (!workIds.length) return new Map();

  const placeholders = workIds.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT work_id, COUNT(*) AS like_count
     FROM banner_work_likes
     WHERE work_id IN (${placeholders})
     GROUP BY work_id`,
    workIds
  );

  return new Map(rows.map((row) => [row.work_id, Number(row.like_count)]));
}

async function getLikedWorkIds(pool, workIds, visitorKey) {
  if (!workIds.length || !visitorKey) return new Set();

  const placeholders = workIds.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT work_id
     FROM banner_work_likes
     WHERE work_id IN (${placeholders}) AND visitor_key = ?`,
    [...workIds, visitorKey]
  );

  return new Set(rows.map((row) => row.work_id));
}

async function enrichBannerWorksWithLikes(pool, works, visitorKey) {
  const workIds = works.map((work) => work.id);
  const likeCounts = await getLikeCounts(pool, workIds);
  const likedIds = await getLikedWorkIds(pool, workIds, visitorKey);

  return works.map((work) => ({
    ...work,
    like_count: likeCounts.get(work.id) || 0,
    liked: likedIds.has(work.id)
  }));
}

function registerBannerLikeRoutes(app, getPool) {
  app.post('/api/banner-works/:id/like', async (req, res) => {
    const workId = Number(req.params.id);
    const visitorKey = req.body?.visitor_key ? String(req.body.visitor_key).trim() : '';

    if (!Number.isInteger(workId) || workId <= 0) {
      return res.status(400).json({ error: 'Неверный ID работы' });
    }

    if (!visitorKey || visitorKey.length > 64) {
      return res.status(400).json({ error: 'Неверный идентификатор посетителя' });
    }

    try {
      const pool = getPool();
      const [workRows] = await pool.query(
        'SELECT id, section_id FROM works WHERE id = ?',
        [workId]
      );

      if (!workRows.length || workRows[0].section_id !== 'banners') {
        return res.status(404).json({ error: 'Работа не найдена' });
      }

      const [existingRows] = await pool.query(
        'SELECT work_id FROM banner_work_likes WHERE work_id = ? AND visitor_key = ?',
        [workId, visitorKey]
      );

      let liked = false;
      if (existingRows.length) {
        await pool.query(
          'DELETE FROM banner_work_likes WHERE work_id = ? AND visitor_key = ?',
          [workId, visitorKey]
        );
      } else {
        await pool.query(
          'INSERT INTO banner_work_likes (work_id, visitor_key) VALUES (?, ?)',
          [workId, visitorKey]
        );
        liked = true;
      }

      const [countRows] = await pool.query(
        'SELECT COUNT(*) AS like_count FROM banner_work_likes WHERE work_id = ?',
        [workId]
      );

      res.json({
        ok: true,
        liked,
        like_count: Number(countRows[0]?.like_count || 0)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  ensureBannerWorkLikesTable,
  enrichBannerWorksWithLikes,
  registerBannerLikeRoutes
};
