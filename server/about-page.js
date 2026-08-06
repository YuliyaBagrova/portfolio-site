const { getDefaultAboutPageContent } = require('./about-page-defaults');

const ITEM_TYPES = new Set(['text', 'subtitle', 'list', 'faq']);
const BLOCK_VARIANTS = new Set(['default', 'author']);

function sanitizeRichText(value) {
  if (!value) return '';
  return String(value)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

function normalizeText(value, maxLen = 500) {
  return String(value || '')
    .trim()
    .slice(0, maxLen);
}

function normalizeItem(raw) {
  const type = ITEM_TYPES.has(raw?.type) ? raw.type : 'text';

  if (type === 'subtitle') {
    return { type, text: normalizeText(raw.text, 200) };
  }

  if (type === 'list') {
    const entries = Array.isArray(raw.entries)
      ? raw.entries.map((entry) => sanitizeRichText(entry)).filter(Boolean).slice(0, 30)
      : [];
    return { type, entries };
  }

  if (type === 'faq') {
    const entries = Array.isArray(raw.entries)
      ? raw.entries
          .map((entry) => ({
            question: normalizeText(entry?.question, 300),
            answer: sanitizeRichText(entry?.answer || '')
          }))
          .filter((entry) => entry.question && entry.answer)
          .slice(0, 20)
      : [];
    return { type, entries };
  }

  return { type: 'text', html: sanitizeRichText(raw?.html || raw?.text || '') };
}

function normalizeBlock(raw, index) {
  const id = normalizeText(raw?.id || `block-${index + 1}`, 80) || `block-${index + 1}`;
  const anchorRaw = raw?.anchor;
  const anchor =
    anchorRaw === null || anchorRaw === undefined || anchorRaw === ''
      ? null
      : normalizeText(anchorRaw, 80).replace(/[^a-z0-9-_]/gi, '-');

  const variant = BLOCK_VARIANTS.has(raw?.variant) ? raw.variant : 'default';
  const items = Array.isArray(raw?.items) ? raw.items.map(normalizeItem).filter(Boolean) : [];

  return {
    id,
    anchor,
    title: normalizeText(raw?.title, 200) || `Блок ${index + 1}`,
    variant,
    items
  };
}

function normalizeNav(rawNav, blocks) {
  const anchors = new Set(blocks.map((block) => block.anchor).filter(Boolean));
  const defaults = getDefaultAboutPageContent().nav.filter((item) => anchors.has(item.anchor));

  if (!Array.isArray(rawNav) || !rawNav.length) {
    return defaults;
  }

  const seen = new Set();
  const normalized = [];

  rawNav.forEach((item) => {
    const anchor = normalizeText(item?.anchor, 80).replace(/[^a-z0-9-_]/gi, '-');
    const label = normalizeText(item?.label, 120);
    if (!anchor || !label || !anchors.has(anchor) || seen.has(anchor)) return;
    seen.add(anchor);
    normalized.push({ anchor, label });
  });

  return normalized.length ? normalized.slice(0, 12) : defaults;
}

function normalizeContent(raw) {
  const defaults = getDefaultAboutPageContent();
  const page = {
    title: normalizeText(raw?.page?.title, 120) || defaults.page.title,
    description: normalizeText(raw?.page?.description, 400) || defaults.page.description
  };

  const blocks = Array.isArray(raw?.blocks)
    ? raw.blocks.map(normalizeBlock).filter((block) => block.title)
    : defaults.blocks;

  const nav = normalizeNav(raw?.nav, blocks);

  return {
    version: 1,
    page,
    nav: nav.length ? nav : defaults.nav.filter((item) => blocks.some((b) => b.anchor === item.anchor)),
    blocks: blocks.length ? blocks : defaults.blocks
  };
}

async function tableExists(pool, tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

async function ensureAboutPageTable(pool) {
  if (!(await tableExists(pool, 'about_page_content'))) {
    await pool.query(`
      CREATE TABLE about_page_content (
        id TINYINT PRIMARY KEY DEFAULT 1,
        content_json LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица about_page_content создана');
  }
}

async function getAboutPageContent(pool) {
  await ensureAboutPageTable(pool);

  const [rows] = await pool.query(
    'SELECT content_json FROM about_page_content WHERE id = 1 LIMIT 1'
  );

  if (!rows.length) {
    const defaults = getDefaultAboutPageContent();
    await pool.query('INSERT INTO about_page_content (id, content_json) VALUES (1, ?)', [
      JSON.stringify(defaults)
    ]);
    return defaults;
  }

  try {
    return normalizeContent(JSON.parse(rows[0].content_json));
  } catch {
    const defaults = getDefaultAboutPageContent();
    await pool.query('UPDATE about_page_content SET content_json = ? WHERE id = 1', [
      JSON.stringify(defaults)
    ]);
    return defaults;
  }
}

function registerAboutPageRoutes(app, getPool) {
  app.get('/api/about-page', async (_req, res) => {
    try {
      const pool = getPool();
      const content = await getAboutPageContent(pool);
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/about-page', async (req, res) => {
    try {
      const pool = getPool();
      const content = normalizeContent(req.body || {});

      await pool.query(
        `INSERT INTO about_page_content (id, content_json)
         VALUES (1, ?)
         ON DUPLICATE KEY UPDATE content_json = VALUES(content_json)`,
        [JSON.stringify(content)]
      );

      const [rows] = await pool.query(
        'SELECT updated_at FROM about_page_content WHERE id = 1 LIMIT 1'
      );

      res.json({ ok: true, content, updated_at: rows[0]?.updated_at || null });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/admin/about-page/reset', async (_req, res) => {
    try {
      const pool = getPool();
      const content = getDefaultAboutPageContent();

      await pool.query(
        `INSERT INTO about_page_content (id, content_json)
         VALUES (1, ?)
         ON DUPLICATE KEY UPDATE content_json = VALUES(content_json)`,
        [JSON.stringify(content)]
      );

      res.json({ ok: true, content });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  registerAboutPageRoutes,
  ensureAboutPageTable,
  normalizeContent,
  getAboutPageContent
};
