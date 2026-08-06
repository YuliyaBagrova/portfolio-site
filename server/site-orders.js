const { serializeBannerOrder } = require('./banner-orders');

const SECTION_LABELS = {
  supplements: 'Фитнес-индустрия',
  clothing: 'Одежда',
  banners: 'Мои баннеры'
};

function parseImageData(raw) {
  if (raw == null || raw === '') return null;

  let value = raw;

  if (Buffer.isBuffer(value)) {
    value = value.toString('utf8');
  } else if (typeof value === 'object') {
    if (value.image) {
      return {
        ...value,
        image: String(value.image).split('?')[0]
      };
    }
    try {
      value = JSON.stringify(value);
    } catch {
      return null;
    }
  }

  const text = String(value).trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (parsed?.image) {
      parsed.image = String(parsed.image).split('?')[0];
    }
    return parsed;
  } catch {
    const image = text.split('?')[0];
    return image.startsWith('/uploads/') ? { image } : null;
  }
}

function serializeWorkOrder(row) {
  const imageData = parseImageData(row.image_data);

  return {
    order_type: 'product',
    id: row.id,
    work_id: row.work_id,
    work_title: row.work_title || null,
    section_id: row.section_id || null,
    section_label: SECTION_LABELS[row.section_id] || row.section_id || 'Заказ',
    category: null,
    category_label: null,
    customer_name: row.customer_name,
    email: row.email,
    phone: row.phone || '',
    quantity: Number(row.quantity),
    message: row.message || '',
    image: imageData?.image || null,
    gradient: row.gradient || '',
    placeholder_text: row.placeholder_text || row.work_title || '',
    created_at: row.created_at
  };
}

function registerSiteOrderRoutes(app, getPool) {
  app.get('/api/site/orders', async (_req, res) => {
    try {
      const pool = getPool();

      const [workRows] = await pool.query(
        `SELECT o.id, o.work_id, o.customer_name, o.email, o.phone,
                o.quantity, o.message, o.created_at,
                w.title AS work_title, w.section_id, w.image_data,
                w.gradient, w.placeholder_text
         FROM work_orders o
         JOIN works w ON w.id = o.work_id
         ORDER BY o.created_at DESC, o.id DESC`
      );

      const [bannerRows] = await pool.query(
        `SELECT id, customer_name, email, phone, category, message, created_at
         FROM banner_orders
         ORDER BY created_at DESC, id DESC`
      );

      const orders = [
        ...workRows.map(serializeWorkOrder),
        ...bannerRows.map(serializeBannerOrder)
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  registerSiteOrderRoutes,
  parseImageData
};
