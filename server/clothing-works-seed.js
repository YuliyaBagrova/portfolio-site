const DEFAULT_CLOTHING_WORKS = [
  {
    title: 'Sport Line SS26',
    description: 'Коллекция спортивной одежды с акцентом на технологичные ткани, посадку и контрастные акценты для urban training.',
    category: 'sport',
    tags: 'popular',
    placeholder_text: 'Sport Line',
    gradient: 'linear-gradient(160deg, #2c3e50 0%, #5d7a96 100%)',
    price_usd: 89
  },
  {
    title: 'Urban Casual',
    description: 'Каталог городской одежды: многослойность, нейтральная палитра и акцент на комфорт в повседневном гардеробе.',
    category: 'casual',
    tags: 'catalog, men, shirts',
    placeholder_text: 'Urban',
    gradient: 'linear-gradient(160deg, #6b5b73 0%, #a8929f 100%)',
    price_usd: 64
  },
  {
    title: 'Eco Wear Collection',
    description: 'Экологичная линейка одежды из переработанных материалов — мягкие оттенки и минималистичный силуэт.',
    category: 'casual',
    tags: 'popular, women',
    placeholder_text: 'Eco Wear',
    gradient: 'linear-gradient(160deg, #5a7a6e 0%, #9bb5a8 100%)',
    price_usd: 72
  },
  {
    title: 'Active Pro Series',
    description: 'Профессиональная спортивная экипировка для интенсивных тренировок и performance-кампаний.',
    category: 'sport',
    tags: 'catalog, men, pants, jeans',
    placeholder_text: 'Active',
    gradient: 'linear-gradient(160deg, #8b4049 0%, #c97b6d 100%)',
    price_usd: 98
  }
];

async function seedClothingWorksIfEmpty(pool) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM works WHERE section_id = 'clothing'"
  );

  if (rows[0].cnt > 0) return false;

  for (const item of DEFAULT_CLOTHING_WORKS) {
    await pool.query(
      `INSERT INTO works (section_id, title, description, category, tags, placeholder_text, gradient, price_usd, image_data)
       VALUES ('clothing', ?, ?, ?, ?, ?, ?, ?, NULL)`,
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
     SET work_count = (SELECT COUNT(*) FROM works WHERE section_id = 'clothing')
     WHERE id = 'clothing'`
  );

  return true;
}

module.exports = { seedClothingWorksIfEmpty, DEFAULT_CLOTHING_WORKS };
