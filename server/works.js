const fs = require('fs').promises;
const path = require('path');

const ALLOWED_EXT = new Set(['jpg', 'png', 'webp']);
const ALLOWED_SECTIONS = new Set(['supplements', 'banners', 'clothing']);
const FITNESS_CATEGORIES = new Set(['protein', 'creatine', 'vitamins', 'equipment']);
const CLOTHING_CATEGORIES = new Set(['sport', 'casual']);
const BANNER_CATEGORIES = new Set(['preview', 'illustrations', 'logos', 'pictures']);
const CLOTHING_PROMO_TYPES = new Set(['sale', 'new', 'limited', 'hot']);
const { logClothingActivity } = require('./clothing-activity');
const { enrichBannerWorksWithLikes } = require('./banner-likes');
const { parseOrderScopeBody } = require('./order-scope');
const { resolvePublicImage } = require('./ensure-default-uploads');

function createWorksStorage(rootDir) {
  const uploadsDir = path.join(rootDir, 'uploads', 'works');

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

  async function deleteWorkFiles(id) {
    await Promise.all(
      [...ALLOWED_EXT].map(async (ext) => {
        try {
          await fs.unlink(path.join(uploadsDir, `work-${id}.${ext}`));
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      })
    );
  }

  async function saveWorkFile(id, buffer, ext) {
    await ensureUploadsDir();
    await deleteWorkFiles(id);
    const filename = `work-${id}.${ext}`;
    await fs.writeFile(path.join(uploadsDir, filename), buffer);
    return `/uploads/works/${filename}`;
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

  function normalizeTags(tags) {
    if (Array.isArray(tags)) {
      return tags.map((tag) => String(tag).trim()).filter(Boolean);
    }
    if (typeof tags === 'string') {
      return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    }
    return [];
  }

  function parsePriceUsd(value) {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(String(value).trim().replace(',', '.'));
    if (!Number.isFinite(num) || num < 0 || num > 999999.99) {
      throw new Error('Цена должна быть от 0 до 999999.99 USD');
    }
    return Math.round(num * 100) / 100;
  }

  function parsePromoType(value) {
    if (value === undefined || value === null || value === '') return null;
    const type = String(value).trim().toLowerCase();
    if (!CLOTHING_PROMO_TYPES.has(type)) {
      throw new Error('Тип акции: sale, new, limited или hot');
    }
    return type;
  }

  function parsePromoLabel(value) {
    if (value === undefined || value === null) return null;
    const label = String(value).trim();
    if (!label) return null;
    if (label.length > 32) {
      throw new Error('Текст бейджа не длиннее 32 символов');
    }
    return label;
  }

  function parseComparePriceUsd(value) {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0 || num > 999999.99) {
      throw new Error('Старая цена должна быть от 0 до 999999.99 USD');
    }
    return Math.round(num * 100) / 100;
  }

  function parseDiscountPercent(value) {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0 || num >= 100) {
      throw new Error('Скидка должна быть от 1 до 99%');
    }
    return Math.round(num);
  }

  function normalizeTagKey(tag) {
    return String(tag).trim().replace(/^#/, '').toLowerCase();
  }

  function hasPopularTag(tags) {
    return normalizeTags(tags).some((tag) => normalizeTagKey(tag) === 'popular');
  }

  async function syncClothingPopularTag(pool, workId) {
    const [rows] = await pool.query(
      'SELECT id, section_id, tags FROM works WHERE id = ?',
      [workId]
    );
    if (!rows.length || rows[0].section_id !== 'clothing') return;

    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM work_reviews WHERE work_id = ?',
      [workId]
    );
    const reviewCount = Number(countRows[0]?.cnt || 0);
    if (reviewCount < 3 || hasPopularTag(rows[0].tags)) return;

    const tags = normalizeTags(rows[0].tags);
    tags.push('popular');
    await pool.query('UPDATE works SET tags = ? WHERE id = ?', [tags.join(', '), workId]);
  }

  function resolveClothingDiscountPrices(priceUsd, comparePriceUsd, discountPercent) {
    let price = priceUsd;
    let compare = comparePriceUsd;

    if (discountPercent != null) {
      if (price != null && compare == null) {
        compare = Math.round((price / (1 - discountPercent / 100)) * 100) / 100;
      } else if (compare != null && price == null) {
        price = Math.round(compare * (1 - discountPercent / 100) * 100) / 100;
      }
    } else if (price == null && compare != null) {
      price = compare;
      compare = null;
    }

    if (compare != null && price != null && compare <= price) {
      compare = null;
    }

    return { priceUsd: price, comparePriceUsd: compare };
  }

  function serializeRow(row) {
    const imageData = parseImageData(row.image_data);
    const tags = normalizeTags(row.tags);
    const reviewCount = row.review_count != null ? Number(row.review_count) : 0;
    if (reviewCount >= 3 && !tags.some((tag) => normalizeTagKey(tag) === 'popular')) {
      tags.push('popular');
    }
    const storedPrice = row.price_usd != null && row.price_usd !== '' ? Number(row.price_usd) : null;
    const storedCompare = row.compare_price_usd != null && row.compare_price_usd !== ''
      ? Number(row.compare_price_usd)
      : null;
    const prices = resolveClothingDiscountPrices(storedPrice, storedCompare, null);
    return {
      id: row.id,
      section_id: row.section_id,
      title: row.title,
      description: row.description || '',
      category: row.category || null,
      placeholder_text: row.placeholder_text || '',
      gradient: row.gradient || '',
      tags,
      image: imageData && imageData.image
        ? `${resolvePublicImage(rootDir, imageData.image)}?v=${Date.now()}`
        : null,
      image_width: imageData?.width || null,
      image_height: imageData?.height || null,
      created_at: row.created_at,
      price_usd: prices.priceUsd,
      compare_price_usd: prices.comparePriceUsd,
      promo_type: row.promo_type || null,
      promo_label: row.promo_label || null,
      avg_rating: row.avg_rating != null ? Number(Number(row.avg_rating).toFixed(1)) : 0,
      review_count: reviewCount,
      like_count: row.like_count != null ? Number(row.like_count) : 0,
      liked: Boolean(row.liked)
    };
  }

  function deriveReviewInitials(authorName) {
    const trimmed = String(authorName || '').trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  function normalizeReviewAvatarFields(body, authorName) {
    let avatarUrl = body?.author_avatar_url;
    if (avatarUrl != null && typeof avatarUrl === 'string') {
      avatarUrl = avatarUrl.trim() || null;
      if (avatarUrl && avatarUrl.length > 500000) avatarUrl = null;
    } else {
      avatarUrl = null;
    }

    let avatarInitials = body?.author_avatar_initials;
    if (avatarInitials != null && typeof avatarInitials === 'string') {
      avatarInitials = avatarInitials.trim().slice(0, 8).toUpperCase() || null;
    } else {
      avatarInitials = null;
    }

    if (!avatarInitials) {
      avatarInitials = deriveReviewInitials(authorName);
    }

    return { avatarUrl, avatarInitials };
  }

  function serializeReview(row) {
    return {
      id: row.id,
      work_id: row.work_id,
      work_title: row.work_title || null,
      section_id: row.section_id || null,
      author_name: row.author_name,
      author_avatar_url: row.author_avatar_url || null,
      author_avatar_initials: row.author_avatar_initials || null,
      rating: row.rating != null && row.rating !== '' ? Number(row.rating) : null,
      review_text: row.review_text || '',
      admin_reply: row.admin_reply || '',
      admin_reply_at: row.admin_reply_at || null,
      created_at: row.created_at
    };
  }

  function serializeOrder(row) {
    return {
      order_type: 'product',
      id: row.id,
      work_id: row.work_id,
      work_title: row.work_title || null,
      section_id: row.section_id || null,
      category: null,
      category_label: null,
      customer_name: row.customer_name,
      email: row.email,
      phone: row.phone || '',
      quantity: Number(row.quantity),
      message: row.message || '',
      created_at: row.created_at,
      is_demo: Boolean(row.is_demo),
      site_user_id: row.site_user_id ?? null,
      client_scope: row.client_scope || null
    };
  }

  const REVIEW_SELECT = `
    id, work_id, author_name, author_avatar_url, author_avatar_initials,
    rating, review_text, admin_reply, admin_reply_at, created_at
  `;

  const WORKS_SELECT = `
    SELECT w.id, w.section_id, w.title, w.description, w.category, w.tags,
           w.placeholder_text, w.gradient, w.image_data, w.price_usd,
           w.compare_price_usd, w.promo_type, w.promo_label, w.created_at,
           COALESCE(AVG(r.rating), 0) AS avg_rating,
           COUNT(r.id) AS review_count
    FROM works w
    LEFT JOIN work_reviews r ON r.work_id = w.id
  `;

  async function fetchWorkById(pool, workId) {
    const [rows] = await pool.query(
      `${WORKS_SELECT} WHERE w.id = ? GROUP BY w.id`,
      [workId]
    );
    return rows[0] || null;
  }

  function parseImageDimensions(width, height) {
    const parsedWidth = Number(width);
    const parsedHeight = Number(height);
    if (!Number.isFinite(parsedWidth) || !Number.isFinite(parsedHeight)) return null;
    if (parsedWidth <= 0 || parsedHeight <= 0) return null;
    return {
      width: Math.round(parsedWidth),
      height: Math.round(parsedHeight)
    };
  }

  function buildImagePayload(imageUrl, dimensions, existingImageData) {
    const payload = { image: imageUrl.split('?')[0] };
    const existing = parseImageData(existingImageData);
    const dims = dimensions || (existing?.width && existing?.height
      ? { width: existing.width, height: existing.height }
      : null);
    if (dims?.width && dims?.height) {
      payload.width = dims.width;
      payload.height = dims.height;
    }
    return JSON.stringify(payload);
  }

  async function resolveImagePayload(pool, id, image, existingImageData, dimensions = null) {
    if (!image) return existingImageData;

    if (typeof image !== 'string') {
      throw new Error('Неверный формат изображения');
    }

    if (image.startsWith('data:')) {
      const { ext, buffer } = parseDataUrl(image);
      const imageUrl = await saveWorkFile(id, buffer, ext);
      return buildImagePayload(imageUrl, dimensions, existingImageData);
    }

    if (image.startsWith('/uploads/works/')) {
      return buildImagePayload(image, dimensions, existingImageData);
    }

    throw new Error('Неверный формат изображения');
  }

  function registerRoutes(app, getPool) {
    app.get('/api/works', async (req, res) => {
      const sectionId = req.query.section;
      const visitorKey = req.query.visitor_key ? String(req.query.visitor_key).trim() : '';

      if (sectionId && !ALLOWED_SECTIONS.has(sectionId)) {
        return res.status(400).json({ error: 'Неизвестный раздел' });
      }

      try {
        const pool = getPool();
        const params = [];
        let query = WORKS_SELECT;

        if (sectionId) {
          query += ' WHERE w.section_id = ?';
          params.push(sectionId);
        }

        query += ' GROUP BY w.id ORDER BY w.created_at DESC, w.id DESC';

        let [rows] = await pool.query(query, params);

        if (sectionId === 'banners') {
          rows = await enrichBannerWorksWithLikes(pool, rows, visitorKey);
        }

        res.json(rows.map(serializeRow));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/works/search', async (req, res) => {
      const rawQuery = String(req.query.q || '').trim();
      const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);
      const searchSections = ['supplements', 'banners', 'clothing'];

      if (!rawQuery) {
        return res.json({ query: '', results: [], random_id: null, random_section_id: null });
      }

      function escapeLike(value) {
        return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      }

      const pattern = `%${escapeLike(rawQuery)}%`;
      const sectionPlaceholders = searchSections.map(() => '?').join(', ');

      try {
        const pool = getPool();
        const [rows] = await pool.query(
          `${WORKS_SELECT}
           WHERE w.section_id IN (${sectionPlaceholders})
             AND (
               w.title LIKE ? ESCAPE '\\\\'
               OR w.description LIKE ? ESCAPE '\\\\'
               OR w.tags LIKE ? ESCAPE '\\\\'
               OR w.placeholder_text LIKE ? ESCAPE '\\\\'
               OR w.category LIKE ? ESCAPE '\\\\'
             )
           GROUP BY w.id
           ORDER BY
             CASE
               WHEN w.title LIKE ? ESCAPE '\\\\' THEN 0
               WHEN w.placeholder_text LIKE ? ESCAPE '\\\\' THEN 1
               ELSE 2
             END,
             w.created_at DESC,
             w.id DESC
           LIMIT ?`,
          [
            ...searchSections,
            pattern, pattern, pattern, pattern, pattern,
            pattern, pattern,
            limit
          ]
        );

        const [randomRows] = await pool.query(
          `SELECT id, section_id FROM works WHERE section_id IN (${sectionPlaceholders}) ORDER BY RAND() LIMIT 1`,
          searchSections
        );

        res.json({
          query: rawQuery,
          results: rows.map(serializeRow),
          random_id: randomRows[0]?.id ?? null,
          random_section_id: randomRows[0]?.section_id ?? null
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/works/:id/reviews', async (req, res) => {
      const workId = Number(req.params.id);

      if (!Number.isInteger(workId) || workId <= 0) {
        return res.status(400).json({ error: 'Неверный ID товара' });
      }

      try {
        const pool = getPool();
        const work = await fetchWorkById(pool, workId);

        if (!work) {
          return res.status(404).json({ error: 'Товар не найден' });
        }

        const [rows] = await pool.query(
          `SELECT ${REVIEW_SELECT}
           FROM work_reviews
           WHERE work_id = ?
           ORDER BY created_at DESC, id DESC`,
          [workId]
        );

        res.json(rows.map(serializeReview));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/works/:id/reviews', async (req, res) => {
      const workId = Number(req.params.id);
      const { author_name: authorName, rating, review_text: reviewText } = req.body || {};
      const trimmedAuthorName = authorName ? String(authorName).trim() : '';
      const { avatarUrl, avatarInitials } = normalizeReviewAvatarFields(req.body || {}, trimmedAuthorName);

      if (!Number.isInteger(workId) || workId <= 0) {
        return res.status(400).json({ error: 'Неверный ID товара' });
      }

      if (!trimmedAuthorName) {
        return res.status(400).json({ error: 'Укажите имя' });
      }

      try {
        const pool = getPool();
        const work = await fetchWorkById(pool, workId);

        if (!work) {
          return res.status(404).json({ error: 'Товар не найден' });
        }

        const isBannerComment = work.section_id === 'banners';
        let parsedRating = null;

        if (isBannerComment) {
          if (!reviewText || !String(reviewText).trim()) {
            return res.status(400).json({ error: 'Напишите отзыв' });
          }
        } else {
          parsedRating = Number(rating);
          if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
          }
        }

        const [result] = await pool.query(
          `INSERT INTO work_reviews (work_id, author_name, author_avatar_url, author_avatar_initials, rating, review_text)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            workId,
            trimmedAuthorName,
            avatarUrl,
            avatarInitials,
            parsedRating,
            reviewText ? String(reviewText).trim() : null
          ]
        );

        const [rows] = await pool.query(
          `SELECT ${REVIEW_SELECT}
           FROM work_reviews WHERE id = ?`,
          [result.insertId]
        );

        await syncClothingPopularTag(pool, workId);

        res.status(201).json(serializeReview(rows[0]));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/works/:id/orders', async (req, res) => {
      const workId = Number(req.params.id);
      const {
        customer_name: customerName,
        email,
        phone,
        quantity,
        message
      } = req.body || {};

      if (!Number.isInteger(workId) || workId <= 0) {
        return res.status(400).json({ error: 'Неверный ID товара' });
      }

      if (!customerName || !String(customerName).trim()) {
        return res.status(400).json({ error: 'Укажите имя' });
      }

      if (!email || !String(email).trim()) {
        return res.status(400).json({ error: 'Укажите email' });
      }

      const parsedQuantity = Number(quantity);
      if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 99) {
        return res.status(400).json({ error: 'Количество должно быть от 1 до 99' });
      }

      try {
        const pool = getPool();
        const work = await fetchWorkById(pool, workId);

        if (!work) {
          return res.status(404).json({ error: 'Товар не найден' });
        }

        const scope = parseOrderScopeBody(req.body);
        const [result] = await pool.query(
          `INSERT INTO work_orders (work_id, customer_name, email, phone, quantity, message, is_demo, site_user_id, client_scope)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workId,
            String(customerName).trim(),
            String(email).trim(),
            phone ? String(phone).trim() : null,
            parsedQuantity,
            message ? String(message).trim() : null,
            scope.isDemo ? 1 : 0,
            scope.siteUserId,
            scope.clientScope || null
          ]
        );

        res.status(201).json({
          ok: true,
          id: result.insertId,
          message: 'Заявка на покупку принята. Мы свяжемся с вами в ближайшее время.'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/admin/reviews', async (_req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          `SELECT r.id, r.work_id, r.author_name, r.rating, r.review_text,
                  r.admin_reply, r.admin_reply_at, r.created_at,
                  w.title AS work_title, w.section_id
           FROM work_reviews r
           JOIN works w ON w.id = r.work_id
           ORDER BY r.created_at DESC, r.id DESC`
        );

        res.json(rows.map(serializeReview));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/admin/orders', async (_req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          `SELECT o.id, o.work_id, o.customer_name, o.email, o.phone,
                  o.quantity, o.message, o.created_at, o.is_demo, o.site_user_id,
                  o.client_scope,
                  w.title AS work_title, w.section_id
           FROM work_orders o
           JOIN works w ON w.id = o.work_id
           ORDER BY o.created_at DESC, o.id DESC`
        );

        res.json(rows.map(serializeOrder));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/api/admin/orders/:id', async (req, res) => {
      const orderId = Number(req.params.id);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({ error: 'Неверный ID заказа' });
      }

      try {
        const pool = getPool();
        const [result] = await pool.query('DELETE FROM work_orders WHERE id = ?', [orderId]);

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Заказ не найден' });
        }

        res.json({ ok: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/admin/reviews/:id/reply', async (req, res) => {
      const reviewId = Number(req.params.id);
      const { admin_reply: adminReply } = req.body || {};

      if (!Number.isInteger(reviewId) || reviewId <= 0) {
        return res.status(400).json({ error: 'Неверный ID отзыва' });
      }

      const replyText = adminReply != null ? String(adminReply).trim() : '';

      try {
        const pool = getPool();
        const [existingRows] = await pool.query(
          'SELECT id FROM work_reviews WHERE id = ?',
          [reviewId]
        );

        if (!existingRows.length) {
          return res.status(404).json({ error: 'Отзыв не найден' });
        }

        await pool.query(
          `UPDATE work_reviews
           SET admin_reply = ?, admin_reply_at = ?
           WHERE id = ?`,
          [replyText || null, replyText ? new Date() : null, reviewId]
        );

        const [rows] = await pool.query(
          `SELECT r.id, r.work_id, r.author_name, r.rating, r.review_text,
                  r.admin_reply, r.admin_reply_at, r.created_at,
                  w.title AS work_title, w.section_id
           FROM work_reviews r
           JOIN works w ON w.id = r.work_id
           WHERE r.id = ?`,
          [reviewId]
        );

        res.json(serializeReview(rows[0]));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/works/:id', async (req, res) => {
      const workId = Number(req.params.id);

      if (!Number.isInteger(workId) || workId <= 0) {
        return res.status(400).json({ error: 'Неверный ID товара' });
      }

      try {
        const pool = getPool();
        const work = await fetchWorkById(pool, workId);

        if (!work) {
          return res.status(404).json({ error: 'Товар не найден' });
        }

        res.json(serializeRow(work));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/works', async (req, res) => {
      const {
        section_id: sectionId,
        title,
        description,
        category,
        tags,
        placeholder_text: placeholderText,
        gradient,
        image,
        image_width: imageWidth,
        image_height: imageHeight,
        price_usd: priceUsd,
        compare_price_usd: comparePriceUsd,
        discount_percent: discountPercent,
        promo_type: promoType,
        promo_label: promoLabel
      } = req.body || {};

      if (!sectionId || !ALLOWED_SECTIONS.has(sectionId)) {
        return res.status(400).json({ error: 'Укажите корректный раздел' });
      }

      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Название обязательно' });
      }

      if (sectionId === 'supplements' && category && !FITNESS_CATEGORIES.has(category)) {
        return res.status(400).json({ error: 'Неизвестная категория' });
      }

      if (sectionId === 'clothing' && category && !CLOTHING_CATEGORIES.has(category)) {
        return res.status(400).json({ error: 'Неизвестная категория' });
      }

      if (sectionId === 'banners') {
        if (!category || !BANNER_CATEGORIES.has(category)) {
          return res.status(400).json({ error: 'Выберите категорию работы' });
        }
      }

      let parsedPriceUsd = null;
      if (priceUsd !== undefined) {
        parsedPriceUsd = parsePriceUsd(priceUsd);
      }

      let parsedComparePriceUsd = null;
      if (comparePriceUsd !== undefined) {
        parsedComparePriceUsd = parseComparePriceUsd(comparePriceUsd);
      }

      let parsedPromoType = null;
      if (promoType !== undefined) {
        parsedPromoType = parsePromoType(promoType);
      }

      let parsedPromoLabel = null;
      if (promoLabel !== undefined) {
        parsedPromoLabel = parsePromoLabel(promoLabel);
      }

      let parsedDiscountPercent = null;
      if (discountPercent !== undefined && discountPercent !== null && discountPercent !== '') {
        parsedDiscountPercent = parseDiscountPercent(discountPercent);
      }

      if (sectionId === 'clothing') {
        const resolved = resolveClothingDiscountPrices(
          parsedPriceUsd,
          parsedComparePriceUsd,
          parsedDiscountPercent
        );
        parsedPriceUsd = resolved.priceUsd;
        parsedComparePriceUsd = resolved.comparePriceUsd;

        if (
          parsedComparePriceUsd != null
          && parsedPriceUsd != null
          && parsedComparePriceUsd > parsedPriceUsd
          && !parsedPromoType
        ) {
          parsedPromoType = 'sale';
        }
      }

      if (parsedComparePriceUsd != null && parsedPriceUsd != null && parsedComparePriceUsd <= parsedPriceUsd) {
        return res.status(400).json({ error: 'Старая цена должна быть выше текущей' });
      }

      try {
        const pool = getPool();
        const [result] = await pool.query(
          `INSERT INTO works (section_id, title, description, category, tags, placeholder_text, gradient, price_usd, compare_price_usd, promo_type, promo_label, image_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          [
            sectionId,
            String(title).trim(),
            description ? String(description).trim() : null,
            category || null,
            normalizeTags(tags).join(', '),
            placeholderText ? String(placeholderText).trim() : null,
            gradient ? String(gradient).trim() : null,
            parsedPriceUsd,
            parsedComparePriceUsd,
            parsedPromoType,
            parsedPromoLabel
          ]
        );

        const workId = result.insertId;
        let imageData = null;
        const imageDimensions = parseImageDimensions(imageWidth, imageHeight);

        if (image) {
          imageData = await resolveImagePayload(pool, workId, image, null, imageDimensions);
          await pool.query('UPDATE works SET image_data = ? WHERE id = ?', [imageData, workId]);
        }

        const work = await fetchWorkById(pool, workId);

        if (sectionId === 'clothing') {
          await logClothingActivity(pool, {
            action_type: 'product_create',
            target_id: String(workId),
            title: `Товар «${work.title}» добавлен`,
            badge: 'Товар',
            badge_class: 'clothing'
          });
        }

        res.status(201).json(serializeRow(work));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/works/:id', async (req, res) => {
      const workId = Number(req.params.id);
      const {
        title,
        description,
        category,
        tags,
        placeholder_text: placeholderText,
        gradient,
        image,
        remove_image: removeImage,
        image_width: imageWidth,
        image_height: imageHeight,
        price_usd: priceUsd,
        compare_price_usd: comparePriceUsd,
        discount_percent: discountPercent,
        promo_type: promoType,
        promo_label: promoLabel
      } = req.body || {};

      if (!Number.isInteger(workId) || workId <= 0) {
        return res.status(400).json({ error: 'Неверный ID товара' });
      }

      try {
        const pool = getPool();
        const [existingRows] = await pool.query(
          `SELECT id, section_id, title, description, category, tags, placeholder_text, gradient,
                  image_data, price_usd, compare_price_usd, promo_type, promo_label
           FROM works WHERE id = ?`,
          [workId]
        );

        if (!existingRows.length) {
          return res.status(404).json({ error: 'Товар не найден' });
        }

        const existing = existingRows[0];
        let imageData = existing.image_data;
        let nextPriceUsd = existing.price_usd;
        let nextComparePriceUsd = existing.compare_price_usd;
        let nextPromoType = existing.promo_type;
        let nextPromoLabel = existing.promo_label;

        if (priceUsd !== undefined) {
          nextPriceUsd = parsePriceUsd(priceUsd);
        }

        if (comparePriceUsd !== undefined) {
          nextComparePriceUsd = parseComparePriceUsd(comparePriceUsd);
        }

        if (promoType !== undefined) {
          nextPromoType = parsePromoType(promoType);
        }

        if (promoLabel !== undefined) {
          nextPromoLabel = parsePromoLabel(promoLabel);
        }

        let parsedDiscountPercent = null;
        if (discountPercent !== undefined && discountPercent !== null && discountPercent !== '') {
          parsedDiscountPercent = parseDiscountPercent(discountPercent);
        }

        if (existing.section_id === 'clothing') {
          const resolved = resolveClothingDiscountPrices(
            priceUsd !== undefined
              ? nextPriceUsd
              : (existing.price_usd != null && existing.price_usd !== '' ? Number(existing.price_usd) : null),
            comparePriceUsd !== undefined
              ? nextComparePriceUsd
              : (existing.compare_price_usd != null && existing.compare_price_usd !== ''
                ? Number(existing.compare_price_usd)
                : null),
            parsedDiscountPercent
          );
          if (priceUsd !== undefined || comparePriceUsd !== undefined || parsedDiscountPercent != null) {
            nextPriceUsd = resolved.priceUsd;
            nextComparePriceUsd = resolved.comparePriceUsd;
          }

          if (
            nextComparePriceUsd != null
            && nextPriceUsd != null
            && nextComparePriceUsd > nextPriceUsd
            && !nextPromoType
          ) {
            nextPromoType = 'sale';
          }
        }

        if (nextComparePriceUsd != null && nextPriceUsd != null && nextComparePriceUsd <= nextPriceUsd) {
          return res.status(400).json({ error: 'Старая цена должна быть выше текущей' });
        }

        if (removeImage) {
          await deleteWorkFiles(workId);
          imageData = null;
        } else if (image) {
          const imageDimensions = parseImageDimensions(imageWidth, imageHeight);
          imageData = await resolveImagePayload(pool, workId, image, existing.image_data, imageDimensions);
        }

        if (category && existing.section_id === 'supplements' && !FITNESS_CATEGORIES.has(category)) {
          return res.status(400).json({ error: 'Неизвестная категория' });
        }

        if (category && existing.section_id === 'clothing' && !CLOTHING_CATEGORIES.has(category)) {
          return res.status(400).json({ error: 'Неизвестная категория' });
        }

        if (category && existing.section_id === 'banners' && !BANNER_CATEGORIES.has(category)) {
          return res.status(400).json({ error: 'Неизвестная категория' });
        }

        await pool.query(
          `UPDATE works
           SET title = COALESCE(?, title),
               description = ?,
               category = ?,
               tags = ?,
               placeholder_text = ?,
               gradient = ?,
               price_usd = ?,
               compare_price_usd = ?,
               promo_type = ?,
               promo_label = ?,
               image_data = ?
           WHERE id = ?`,
          [
            title ? String(title).trim() : existing.title,
            description !== undefined ? (description ? String(description).trim() : null) : existing.description,
            category !== undefined ? category || null : existing.category,
            tags !== undefined ? normalizeTags(tags).join(', ') : existing.tags,
            placeholderText !== undefined ? (placeholderText ? String(placeholderText).trim() : null) : existing.placeholder_text,
            gradient !== undefined ? (gradient ? String(gradient).trim() : null) : existing.gradient,
            nextPriceUsd,
            nextComparePriceUsd,
            nextPromoType,
            nextPromoLabel,
            imageData,
            workId
          ]
        );

        const work = await fetchWorkById(pool, workId);

        if (existing.section_id === 'clothing') {
          await logClothingActivity(pool, {
            action_type: 'product_update',
            target_id: String(workId),
            title: `Товар «${work.title}» обновлён`,
            badge: 'Товар',
            badge_class: 'clothing'
          });
        }

        res.json(serializeRow(work));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/api/works/:id', async (req, res) => {
      const workId = Number(req.params.id);

      if (!Number.isInteger(workId) || workId <= 0) {
        return res.status(400).json({ error: 'Неверный ID товара' });
      }

      try {
        const pool = getPool();
        const [existingRows] = await pool.query(
          'SELECT id, section_id, title FROM works WHERE id = ?',
          [workId]
        );

        if (!existingRows.length) {
          return res.status(404).json({ error: 'Товар не найден' });
        }

        const existing = existingRows[0];
        await deleteWorkFiles(workId);
        await pool.query('DELETE FROM works WHERE id = ?', [workId]);

        if (existing.section_id === 'clothing') {
          await logClothingActivity(pool, {
            action_type: 'product_delete',
            target_id: String(workId),
            title: `Товар «${existing.title}» удалён`,
            badge: 'Товар',
            badge_class: 'clothing'
          });
        }

        res.json({ ok: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  return { registerRoutes, ensureUploadsDir };
}

module.exports = { createWorksStorage };
