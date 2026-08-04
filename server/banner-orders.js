const BANNER_CATEGORIES = {
  preview: 'Превью',
  illustrations: 'Иллюстрации',
  logos: 'Логотипы',
  pictures: 'Картинки'
};

async function ensureBannerOrdersTable(pool) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banner_orders'`
  );

  if (rows[0].cnt > 0) return;

  await pool.query(`
    CREATE TABLE banner_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(128) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(32) NULL,
      category VARCHAR(32) NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query('CREATE INDEX idx_banner_orders_created_at ON banner_orders(created_at)');
  console.log('Таблица banner_orders создана');
}

function serializeBannerOrder(row) {
  const category = row.category || null;
  return {
    order_type: 'banner',
    id: row.id,
    work_id: null,
    work_title: category ? BANNER_CATEGORIES[category] || category : 'Мои баннеры',
    section_id: 'banners',
    category,
    category_label: category ? (BANNER_CATEGORIES[category] || category) : null,
    customer_name: row.customer_name,
    email: row.email,
    phone: row.phone || '',
    quantity: null,
    message: row.message || '',
    created_at: row.created_at
  };
}

function registerBannerOrderRoutes(app, getPool) {
  app.post('/api/banner-orders', async (req, res) => {
    const {
      customer_name: customerName,
      email,
      phone,
      category,
      message
    } = req.body || {};

    if (!customerName || !String(customerName).trim()) {
      return res.status(400).json({ error: 'Укажите имя' });
    }

    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Укажите email' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Опишите, что вы хотите видеть в работе' });
    }

    const normalizedCategory = category ? String(category).trim() : null;
    if (normalizedCategory && !BANNER_CATEGORIES[normalizedCategory]) {
      return res.status(400).json({ error: 'Неверная категория работы' });
    }

    try {
      const pool = getPool();
      const [result] = await pool.query(
        `INSERT INTO banner_orders (customer_name, email, phone, category, message)
         VALUES (?, ?, ?, ?, ?)`,
        [
          String(customerName).trim(),
          String(email).trim(),
          phone ? String(phone).trim() : null,
          normalizedCategory,
          String(message).trim()
        ]
      );

      res.status(201).json({
        ok: true,
        id: result.insertId,
        message: 'Заявка принята. Мы свяжемся с вами для обсуждения деталей.'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/banner-orders', async (_req, res) => {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT id, customer_name, email, phone, category, message, created_at
         FROM banner_orders
         ORDER BY created_at DESC, id DESC`
      );

      res.json(rows.map(serializeBannerOrder));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/banner-orders/:id', async (req, res) => {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Неверный ID заявки' });
    }

    try {
      const pool = getPool();
      const [result] = await pool.query('DELETE FROM banner_orders WHERE id = ?', [orderId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Заявка не найдена' });
      }

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  BANNER_CATEGORIES,
  ensureBannerOrdersTable,
  registerBannerOrderRoutes,
  serializeBannerOrder
};
