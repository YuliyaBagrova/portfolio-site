require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { waitForDatabase, getPool } = require('./db');
const { runMigrations } = require('./migrate');
const { createHeroBannerStorage, createFitnessBannerStorage, createClothingBannerStorage } = require('./hero-banners');
const { createWorksStorage } = require('./works');
const { createSectionIconsStorage } = require('./section-icons');
const { createClothingCatalogIconsStorage } = require('./clothing-catalog-icons');
const { createClothingAlertsStorage } = require('./clothing-alerts');
const { createClothingCatalogPromoStorage } = require('./clothing-catalog-promo');
const { createSectionThemesStorage } = require('./section-themes');
const { registerAppearanceActivityRoutes } = require('./appearance-activity');
const { registerClothingActivityRoutes } = require('./clothing-activity');
const { registerBannerOrderRoutes } = require('./banner-orders');
const { registerSiteOrderRoutes } = require('./site-orders');
const { registerBannerLikeRoutes } = require('./banner-likes');
const { registerAboutPageRoutes } = require('./about-page');
const { registerAdminRegisterRoutes, isRegisterDemoMode, getDeveloperRegisterEmail } = require('./admin-register');
const { registerSiteRegisterRoutes } = require('./site-register');
const { verifyMailTransport } = require('./mail');
const { ensureDefaultUploads } = require('./ensure-default-uploads');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const rootDir = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(rootDir));

app.get('/api/health', async (_req, res) => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'disconnected', error: error.message });
  }
});

app.get('/api/stats', async (_req, res) => {
  try {
    const pool = getPool();

    const [workRows] = await pool.query(
      'SELECT section_id, COUNT(*) AS cnt FROM works GROUP BY section_id'
    );

    const [heroRows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM hero_banners WHERE image_data IS NOT NULL AND image_data != \'\''
    );

    const stats = {
      supplements: 0,
      banners: 0,
      clothing: 0,
      heroBanners: Number(heroRows[0]?.cnt || 0),
      total: 0
    };

    workRows.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(stats, row.section_id)) {
        stats[row.section_id] = Number(row.cnt);
      }
    });

    stats.total = stats.supplements + stats.banners + stats.clothing;

    await pool.query(
      `UPDATE sections s
       SET work_count = (SELECT COUNT(*) FROM works w WHERE w.section_id = s.id)`
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/works/recent', async (_req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT w.id, w.title, w.section_id, w.created_at, s.title AS section_title
       FROM works w
       JOIN sections s ON s.id = w.section_id
       ORDER BY w.created_at DESC
       LIMIT 5`
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const heroBannerStorage = createHeroBannerStorage(rootDir);
const fitnessBannerStorage = createFitnessBannerStorage(rootDir);
const clothingBannerStorage = createClothingBannerStorage(rootDir);
const worksStorage = createWorksStorage(rootDir);
const sectionIconsStorage = createSectionIconsStorage(rootDir);
const clothingCatalogIconsStorage = createClothingCatalogIconsStorage(rootDir);
const clothingAlertsStorage = createClothingAlertsStorage();
const clothingCatalogPromoStorage = createClothingCatalogPromoStorage(rootDir);
const sectionThemesStorage = createSectionThemesStorage();

heroBannerStorage.registerRoutes(app, getPool);
fitnessBannerStorage.registerRoutes(app, getPool);
clothingBannerStorage.registerRoutes(app, getPool);
worksStorage.registerRoutes(app, getPool);
sectionIconsStorage.registerRoutes(app, getPool);
clothingCatalogIconsStorage.registerRoutes(app, getPool);
clothingAlertsStorage.registerRoutes(app, getPool);
clothingCatalogPromoStorage.registerRoutes(app, getPool);
sectionThemesStorage.registerRoutes(app, getPool);
registerAppearanceActivityRoutes(app, getPool);
registerClothingActivityRoutes(app, getPool);
registerBannerOrderRoutes(app, getPool);
registerSiteOrderRoutes(app, getPool);
registerBannerLikeRoutes(app, getPool);
registerAboutPageRoutes(app, getPool);
registerAdminRegisterRoutes(app, getPool);
registerSiteRegisterRoutes(app, getPool);

app.get('*', (req, res) => {
  if (req.path.endsWith('.html') || req.path.includes('.')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

async function start() {
  try {
    await waitForDatabase();
    await runMigrations(getPool());
    if (isRegisterDemoMode()) {
      const developerEmail = getDeveloperRegisterEmail();
      if (developerEmail) {
        console.log(`Регистрация: демо — код на экране; письмо разработчику: ${developerEmail}`);
        await verifyMailTransport();
      } else {
        console.log('Регистрация: демо-режим — код подтверждения показывается на экране');
      }
    } else {
      await verifyMailTransport();
    }
    await heroBannerStorage.ensureUploadsDir();
    await fitnessBannerStorage.ensureUploadsDir();
    await clothingBannerStorage.ensureUploadsDir();
    await worksStorage.ensureUploadsDir();
    await sectionIconsStorage.ensureUploadsDir();
    await clothingCatalogIconsStorage.ensureUploadsDir();
    await clothingCatalogPromoStorage.ensureUploadsDir();
    await ensureDefaultUploads(rootDir);
    app.listen(PORT, () => {
      console.log(`Сайт и API: http://localhost:${PORT}`);
      console.log('MySQL подключена');
    });
  } catch (error) {
    console.error('Не удалось запустить сервер:', error.message);
    process.exit(1);
  }
}

start();
