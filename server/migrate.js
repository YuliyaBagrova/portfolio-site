const fs = require('fs');
const path = require('path');

async function tableExists(pool, tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows[0].cnt > 0;
}

async function columnExists(pool, tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].cnt > 0;
}

function readSqlStatements(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  return sql
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement && !statement.startsWith('--'));
}

async function runSqlFile(pool, filePath) {
  const statements = readSqlStatements(filePath);
  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id VARCHAR(64) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function hasMigration(pool, id) {
  const [rows] = await pool.query('SELECT id FROM app_migrations WHERE id = ?', [id]);
  return rows.length > 0;
}

async function markMigration(pool, id) {
  await pool.query('INSERT INTO app_migrations (id) VALUES (?)', [id]);
}

async function migrateWorksSchema(pool) {
  if (!(await columnExists(pool, 'works', 'category'))) {
    await pool.query('ALTER TABLE works ADD COLUMN category VARCHAR(32) NULL');
  }
  if (!(await columnExists(pool, 'works', 'tags'))) {
    await pool.query('ALTER TABLE works ADD COLUMN tags VARCHAR(255) NULL');
  }
  if (!(await columnExists(pool, 'works', 'placeholder_text'))) {
    await pool.query('ALTER TABLE works ADD COLUMN placeholder_text VARCHAR(128) NULL');
  }
  if (!(await columnExists(pool, 'works', 'gradient'))) {
    await pool.query('ALTER TABLE works ADD COLUMN gradient VARCHAR(255) NULL');
  }
  if (!(await columnExists(pool, 'works', 'image_data'))) {
    await pool.query('ALTER TABLE works ADD COLUMN image_data LONGTEXT NULL');
  }
  if (!(await columnExists(pool, 'works', 'price_usd'))) {
    await pool.query('ALTER TABLE works ADD COLUMN price_usd DECIMAL(10, 2) NULL');
  }
  if (!(await columnExists(pool, 'works', 'compare_price_usd'))) {
    await pool.query('ALTER TABLE works ADD COLUMN compare_price_usd DECIMAL(10, 2) NULL');
  }
  if (!(await columnExists(pool, 'works', 'promo_type'))) {
    await pool.query('ALTER TABLE works ADD COLUMN promo_type VARCHAR(16) NULL');
  }
  if (!(await columnExists(pool, 'works', 'promo_label'))) {
    await pool.query('ALTER TABLE works ADD COLUMN promo_label VARCHAR(32) NULL');
  }
}

async function ensureProductTables(pool) {
  if (!(await tableExists(pool, 'work_reviews'))) {
    await pool.query(`
      CREATE TABLE work_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        work_id INT NOT NULL,
        author_name VARCHAR(128) NOT NULL,
        rating TINYINT NULL,
        review_text TEXT,
        admin_reply TEXT,
        admin_reply_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_reviews_work
          FOREIGN KEY (work_id) REFERENCES works(id)
          ON DELETE CASCADE
      )
    `);
    await pool.query('CREATE INDEX idx_work_reviews_work_id ON work_reviews(work_id)');
    console.log('Таблица work_reviews создана');
  } else {
    if (!(await columnExists(pool, 'work_reviews', 'admin_reply'))) {
      await pool.query('ALTER TABLE work_reviews ADD COLUMN admin_reply TEXT NULL');
    }
    if (!(await columnExists(pool, 'work_reviews', 'admin_reply_at'))) {
      await pool.query('ALTER TABLE work_reviews ADD COLUMN admin_reply_at TIMESTAMP NULL');
    }
    const [ratingColumn] = await pool.query(
      "SHOW COLUMNS FROM work_reviews LIKE 'rating'"
    );
    if (ratingColumn[0]?.Null === 'NO') {
      await pool.query('ALTER TABLE work_reviews MODIFY rating TINYINT NULL');
    }
  }

  if (!(await tableExists(pool, 'work_orders'))) {
    await pool.query(`
      CREATE TABLE work_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        work_id INT NOT NULL,
        customer_name VARCHAR(128) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(32),
        quantity INT NOT NULL DEFAULT 1,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_orders_work
          FOREIGN KEY (work_id) REFERENCES works(id)
          ON DELETE CASCADE
      )
    `);
    await pool.query('CREATE INDEX idx_work_orders_work_id ON work_orders(work_id)');
    console.log('Таблица work_orders создана');
  }
}

async function ensureSectionIconsTable(pool) {
  if (!(await tableExists(pool, 'section_icons'))) {
    await pool.query(`
      CREATE TABLE section_icons (
        section_id VARCHAR(32) PRIMARY KEY,
        image_data LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица section_icons создана');
  }
}

async function ensureSectionThemesTable(pool) {
  if (!(await tableExists(pool, 'section_themes'))) {
    await pool.query(`
      CREATE TABLE section_themes (
        section_id VARCHAR(32) PRIMARY KEY,
        palette_json JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица section_themes создана');
  }
}

async function ensureAppearanceActivityTable(pool) {
  if (!(await tableExists(pool, 'appearance_activity'))) {
    await pool.query(`
      CREATE TABLE appearance_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action_type VARCHAR(32) NOT NULL,
        target_id VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        badge VARCHAR(64) NOT NULL,
        badge_class VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('CREATE INDEX idx_appearance_activity_created_at ON appearance_activity(created_at)');
    console.log('Таблица appearance_activity создана');
  }
}

async function ensureClothingActivityTable(pool) {
  if (!(await tableExists(pool, 'clothing_activity'))) {
    await pool.query(`
      CREATE TABLE clothing_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action_type VARCHAR(32) NOT NULL,
        target_id VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        badge VARCHAR(64) NOT NULL,
        badge_class VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('CREATE INDEX idx_clothing_activity_created_at ON clothing_activity(created_at)');
    console.log('Таблица clothing_activity создана');
  }
}

async function ensureClothingHeroBannersTable(pool) {
  if (!(await tableExists(pool, 'clothing_hero_banners'))) {
    await pool.query(`
      CREATE TABLE clothing_hero_banners (
        slide_index TINYINT PRIMARY KEY,
        image_data LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица clothing_hero_banners создана');
  }
}

async function ensureClothingCatalogIconsTable(pool) {
  if (!(await tableExists(pool, 'clothing_catalog_icons'))) {
    await pool.query(`
      CREATE TABLE clothing_catalog_icons (
        category_id VARCHAR(32) PRIMARY KEY,
        image_data LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица clothing_catalog_icons создана');
  }
}

async function ensureClothingAlertsTable(pool) {
  if (!(await tableExists(pool, 'clothing_alerts'))) {
    await pool.query(`
      CREATE TABLE clothing_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        alert_type VARCHAR(16) NOT NULL,
        badge VARCHAR(32) NOT NULL,
        title VARCHAR(128) NOT NULL,
        description TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query('CREATE INDEX idx_clothing_alerts_sort_order ON clothing_alerts(sort_order)');
    console.log('Таблица clothing_alerts создана');
  }

  const { seedClothingAlertsIfEmpty } = require('./clothing-alerts');
  await seedClothingAlertsIfEmpty(pool);
}

async function ensureClothingCatalogPromoTable(pool) {
  if (!(await tableExists(pool, 'clothing_catalog_promo'))) {
    await pool.query(`
      CREATE TABLE clothing_catalog_promo (
        id VARCHAR(32) PRIMARY KEY,
        image_data LONGTEXT,
        promo_label VARCHAR(64) NOT NULL DEFAULT 'Горячие предложения',
        promo_title VARCHAR(128) NOT NULL DEFAULT '',
        promo_subtitle VARCHAR(255) NOT NULL DEFAULT '',
        promo_link VARCHAR(512) NOT NULL DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица clothing_catalog_promo создана');
  }

  const { createClothingCatalogPromoStorage } = require('./clothing-catalog-promo');
  const promoStorage = createClothingCatalogPromoStorage(require('path').join(__dirname, '..'));
  await promoStorage.seedPromoIfEmpty(pool);
}

async function runMigrations(pool) {
  const initDir = path.join(__dirname, '..', 'db', 'init');
  const schemaPath = path.join(initDir, '01-schema.sql');
  const seedPath = path.join(initDir, '02-seed.sql');

  if (!(await tableExists(pool, 'sections'))) {
    await runSqlFile(pool, schemaPath);
    console.log('Схема БД создана');
  } else {
    if (!(await tableExists(pool, 'hero_banners'))) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS hero_banners (
          slide_index TINYINT PRIMARY KEY,
          image_data LONGTEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('Таблица hero_banners создана');
    }

    if (!(await tableExists(pool, 'fitness_hero_banners'))) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS fitness_hero_banners (
          slide_index TINYINT PRIMARY KEY,
          image_data LONGTEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('Таблица fitness_hero_banners создана');
    }

    if (!(await tableExists(pool, 'clothing_hero_banners'))) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clothing_hero_banners (
          slide_index TINYINT PRIMARY KEY,
          image_data LONGTEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('Таблица clothing_hero_banners создана');
    }
  }

  await ensureMigrationTable(pool);
  await migrateWorksSchema(pool);
  await ensureProductTables(pool);
  await ensureSectionIconsTable(pool);
  await ensureSectionThemesTable(pool);
  await ensureAppearanceActivityTable(pool);
  await ensureClothingActivityTable(pool);
  await ensureClothingHeroBannersTable(pool);
  await ensureClothingCatalogIconsTable(pool);
  await ensureClothingAlertsTable(pool);
  await ensureClothingCatalogPromoTable(pool);
  const { ensureBannerOrdersTable } = require('./banner-orders');
  await ensureBannerOrdersTable(pool);
  const { ensureBannerWorkLikesTable } = require('./banner-likes');
  await ensureBannerWorkLikesTable(pool);

  const { ensureAboutPageTable } = require('./about-page');
  await ensureAboutPageTable(pool);

  const { backfillAppearanceActivity } = require('./appearance-activity');
  await backfillAppearanceActivity(pool);

  const { backfillClothingActivity } = require('./clothing-activity');
  await backfillClothingActivity(pool);

  const [seedCheck] = await pool.query('SELECT COUNT(*) AS cnt FROM sections');
  if (seedCheck[0].cnt === 0 && fs.existsSync(seedPath)) {
    await runSqlFile(pool, seedPath);
    console.log('Начальные данные добавлены');
  }

  if (!(await hasMigration(pool, '2026-clear-all-works'))) {
    await pool.query('DELETE FROM works');
    await pool.query(
      `UPDATE sections s
       SET work_count = (SELECT COUNT(*) FROM works w WHERE w.section_id = s.id)`
    );
    await markMigration(pool, '2026-clear-all-works');
    console.log('Каталог товаров очищен');
  }

  const { seedClothingWorksIfEmpty } = require('./clothing-works-seed');
  if (await seedClothingWorksIfEmpty(pool)) {
    console.log('Демо-товары раздела «Одежда» добавлены');
  }

  const { seedFitnessWorksIfEmpty, syncFitnessPublicCatalog } = require('./fitness-works-seed');
  if (await seedFitnessWorksIfEmpty(pool)) {
    console.log('Демо-товары раздела «Фитнес-индустрия» добавлены');
  }

  if (!(await hasMigration(pool, '2026-fitness-public-catalog-v1'))) {
    await syncFitnessPublicCatalog(pool);
    await markMigration(pool, '2026-fitness-public-catalog-v1');
    console.log('Каталог «Фитнес-индустрия» синхронизирован с публичной страницей');
  }

  if (!(await hasMigration(pool, '2026-clothing-popular-tags-v1'))) {
    const [rows] = await pool.query(
      `SELECT w.id, w.tags, COUNT(r.id) AS review_count
       FROM works w
       LEFT JOIN work_reviews r ON r.work_id = w.id
       WHERE w.section_id = 'clothing'
       GROUP BY w.id
       HAVING review_count >= 3`
    );

    for (const row of rows) {
      const tags = String(row.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const hasPopular = tags.some((tag) => tag.replace(/^#/, '').toLowerCase() === 'popular');
      if (!hasPopular) {
        tags.push('popular');
        await pool.query('UPDATE works SET tags = ? WHERE id = ?', [tags.join(', '), row.id]);
      }
    }

    await markMigration(pool, '2026-clothing-popular-tags-v1');
    console.log('Тег «popular» синхронизирован для товаров одежды с 3+ отзывами');
  }

  if (!(await hasMigration(pool, '2026-clothing-nav-text-default-v1'))) {
    await pool.query('DELETE FROM section_themes WHERE section_id = ?', ['clothing']);
    await markMigration(pool, '2026-clothing-nav-text-default-v1');
    console.log('Палитра «Одежда» сброшена на значения по умолчанию');
  }

  if (!(await hasMigration(pool, '2026-clothing-nav-white-v1'))) {
    await pool.query('DELETE FROM section_themes WHERE section_id = ?', ['clothing']);
    await markMigration(pool, '2026-clothing-nav-white-v1');
    console.log('Палитра «Одежда»: цвет навигации обновлён на белый');
  }
}

module.exports = { runMigrations };
