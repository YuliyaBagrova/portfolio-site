const ALLOWED_TYPES = new Set(['sale', 'new', 'drop']);
const { logClothingActivity } = require('./clothing-activity');

const DEFAULT_ALERTS = [
  {
    alert_type: 'sale',
    badge: '−30%',
    title: 'Sport Line SS26',
    description: 'Скидка на lookbook-коллекцию до конца месяца',
    sort_order: 0
  },
  {
    alert_type: 'new',
    badge: 'New',
    title: 'Urban Casual',
    description: 'Новые позиции в городской линейке',
    sort_order: 1
  },
  {
    alert_type: 'drop',
    badge: 'Drop',
    title: 'Eco Wear',
    description: 'Лимитированный drop экологичной серии',
    sort_order: 2
  }
];

const TYPE_LABELS = {
  sale: 'Скидка',
  new: 'Новинка',
  drop: 'Drop'
};

function serializeAlert(row) {
  return {
    id: row.id,
    alert_type: row.alert_type,
    badge: row.badge,
    title: row.title,
    description: row.description || '',
    sort_order: row.sort_order,
    updated_at: row.updated_at
  };
}

function normalizeText(value, maxLength) {
  if (value == null) return '';
  return String(value).trim().slice(0, maxLength);
}

function validatePayload(body, { requireAll = true } = {}) {
  const errors = [];
  const payload = {};

  if (requireAll || body.alert_type != null) {
    const alertType = normalizeText(body.alert_type, 16).toLowerCase();
    if (!ALLOWED_TYPES.has(alertType)) {
      errors.push('Укажите тип: sale, new или drop');
    } else {
      payload.alert_type = alertType;
    }
  }

  if (requireAll || body.badge != null) {
    payload.badge = normalizeText(body.badge, 32);
    if (!payload.badge) errors.push('Бейдж обязателен');
  }

  if (requireAll || body.title != null) {
    payload.title = normalizeText(body.title, 128);
    if (!payload.title) errors.push('Заголовок обязателен');
  }

  if (requireAll || body.description != null) {
    payload.description = normalizeText(body.description, 500);
  }

  if (body.sort_order != null) {
    const sortOrder = Number(body.sort_order);
    if (!Number.isFinite(sortOrder) || sortOrder < 0 || sortOrder > 999) {
      errors.push('Неверный порядок сортировки');
    } else {
      payload.sort_order = Math.floor(sortOrder);
    }
  }

  return { errors, payload };
}

async function seedClothingAlertsIfEmpty(pool) {
  const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM clothing_alerts');
  if (Number(rows[0]?.cnt || 0) > 0) return;

  for (const alert of DEFAULT_ALERTS) {
    await pool.query(
      `INSERT INTO clothing_alerts (alert_type, badge, title, description, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [alert.alert_type, alert.badge, alert.title, alert.description, alert.sort_order]
    );
  }
}

function createClothingAlertsStorage() {
  function registerRoutes(app, getPool) {
    app.get('/api/clothing-alerts', async (_req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          `SELECT id, alert_type, badge, title, description, sort_order, updated_at
           FROM clothing_alerts
           ORDER BY sort_order ASC, id ASC`
        );
        res.json({ alerts: rows.map(serializeAlert) });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/clothing-alerts', async (req, res) => {
      const { errors, payload } = validatePayload(req.body || {}, { requireAll: true });
      if (errors.length) {
        return res.status(400).json({ error: errors.join('. ') });
      }

      try {
        const pool = getPool();
        let sortOrder = payload.sort_order;

        if (sortOrder == null) {
          const [rows] = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM clothing_alerts');
          sortOrder = Number(rows[0]?.next_order || 0);
        }

        const [result] = await pool.query(
          `INSERT INTO clothing_alerts (alert_type, badge, title, description, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [payload.alert_type, payload.badge, payload.title, payload.description || '', sortOrder]
        );

        const [rows] = await pool.query(
          `SELECT id, alert_type, badge, title, description, sort_order, updated_at
           FROM clothing_alerts WHERE id = ?`,
          [result.insertId]
        );

        await logClothingActivity(pool, {
          action_type: 'alert_create',
          target_id: String(result.insertId),
          title: `Предложение «${rows[0].title}» добавлено`,
          badge: 'Акция',
          badge_class: 'alert'
        });

        res.status(201).json(serializeAlert(rows[0]));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/clothing-alerts/:id', async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Неверный идентификатор' });
      }

      const { errors, payload } = validatePayload(req.body || {}, { requireAll: false });
      if (errors.length) {
        return res.status(400).json({ error: errors.join('. ') });
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'Нет данных для обновления' });
      }

      try {
        const pool = getPool();
        const fields = [];
        const values = [];

        if (payload.alert_type != null) {
          fields.push('alert_type = ?');
          values.push(payload.alert_type);
        }
        if (payload.badge != null) {
          fields.push('badge = ?');
          values.push(payload.badge);
        }
        if (payload.title != null) {
          fields.push('title = ?');
          values.push(payload.title);
        }
        if (payload.description != null) {
          fields.push('description = ?');
          values.push(payload.description);
        }
        if (payload.sort_order != null) {
          fields.push('sort_order = ?');
          values.push(payload.sort_order);
        }

        values.push(id);
        const [result] = await pool.query(
          `UPDATE clothing_alerts SET ${fields.join(', ')} WHERE id = ?`,
          values
        );

        if (!result.affectedRows) {
          return res.status(404).json({ error: 'Предложение не найдено' });
        }

        const [rows] = await pool.query(
          `SELECT id, alert_type, badge, title, description, sort_order, updated_at
           FROM clothing_alerts WHERE id = ?`,
          [id]
        );

        await logClothingActivity(pool, {
          action_type: 'alert_update',
          target_id: String(id),
          title: `Предложение «${rows[0].title}» обновлено`,
          badge: 'Акция',
          badge_class: 'alert'
        });

        res.json(serializeAlert(rows[0]));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/api/clothing-alerts/:id', async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Неверный идентификатор' });
      }

      try {
        const pool = getPool();
        const [existingRows] = await pool.query(
          'SELECT id, title FROM clothing_alerts WHERE id = ?',
          [id]
        );

        if (!existingRows.length) {
          return res.status(404).json({ error: 'Предложение не найдено' });
        }

        await pool.query('DELETE FROM clothing_alerts WHERE id = ?', [id]);

        await logClothingActivity(pool, {
          action_type: 'alert_delete',
          target_id: String(id),
          title: `Предложение «${existingRows[0].title}» удалено`,
          badge: 'Акция',
          badge_class: 'alert'
        });

        res.json({ ok: true, id });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  return {
    registerRoutes,
    seedClothingAlertsIfEmpty,
    TYPE_LABELS,
    DEFAULT_ALERTS
  };
}

module.exports = { createClothingAlertsStorage, seedClothingAlertsIfEmpty, DEFAULT_ALERTS };
