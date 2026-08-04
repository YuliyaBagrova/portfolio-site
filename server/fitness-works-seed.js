const DEFAULT_FITNESS_WORKS = [
  {
    title: 'Gold Standard Whey',
    description: 'Рекламный баннер для линейки протеина',
    category: 'protein',
    tags: 'Протеин',
    placeholder_text: 'Whey Protein',
    gradient: 'linear-gradient(145deg, #ea580c 0%, #9a3412 55%, #1c1410 100%)',
    price_usd: 49.99
  },
  {
    title: 'Креатин Monohydrate',
    description: 'Промо-карточка для креатина моногидрата',
    category: 'creatine',
    tags: 'Креатин',
    placeholder_text: 'Creatine',
    gradient: 'linear-gradient(145deg, #f97316 0%, #c2410c 50%, #0f1117 100%)',
    price_usd: 24.99
  },
  {
    title: 'Мультивитамин Complex',
    description: 'Витаминный комплекс для активного образа жизни',
    category: 'vitamins',
    tags: 'Витамины',
    placeholder_text: 'Multi-V',
    gradient: 'linear-gradient(145deg, #fdba74 0%, #f97316 40%, #7c2d12 100%)',
    price_usd: 19.99
  },
  {
    title: 'Pro Gym Kit',
    description: 'Набор спортивного инвентаря для домашних тренировок',
    category: 'equipment',
    tags: 'Спорт-инвентарь',
    placeholder_text: 'Gym Kit',
    gradient: 'linear-gradient(145deg, #fb923c 0%, #ea580c 45%, #1a120b 100%)',
    price_usd: 89.99
  }
];

async function insertFitnessWorks(pool, items = DEFAULT_FITNESS_WORKS) {
  for (const item of items) {
    await pool.query(
      `INSERT INTO works (section_id, title, description, category, tags, placeholder_text, gradient, price_usd, image_data)
       VALUES ('supplements', ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        item.title,
        item.description,
        item.category,
        item.tags,
        item.placeholder_text,
        item.gradient,
        item.price_usd
      ]
    );
  }

  await pool.query(
    `UPDATE sections
     SET work_count = (SELECT COUNT(*) FROM works WHERE section_id = 'supplements')
     WHERE id = 'supplements'`
  );
}

async function seedFitnessWorksIfEmpty(pool) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM works WHERE section_id = 'supplements'"
  );

  if (rows[0].cnt > 0) return false;

  await insertFitnessWorks(pool);
  return true;
}

async function syncFitnessPublicCatalog(pool) {
  await pool.query(
    `DELETE r FROM work_reviews r
     INNER JOIN works w ON w.id = r.work_id
     WHERE w.section_id = 'supplements'`
  );
  await pool.query(
    `DELETE o FROM work_orders o
     INNER JOIN works w ON w.id = o.work_id
     WHERE w.section_id = 'supplements'`
  );
  await pool.query("DELETE FROM works WHERE section_id = 'supplements'");
  await insertFitnessWorks(pool);
}

module.exports = {
  DEFAULT_FITNESS_WORKS,
  insertFitnessWorks,
  seedFitnessWorksIfEmpty,
  syncFitnessPublicCatalog
};
