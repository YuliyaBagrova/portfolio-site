const SECTION_BADGES = {
  supplements: 'Добавки',
  banners: 'Баннер',
  clothing: 'Одежда'
};

function countPortfolioCards(sectionId) {
  return document.querySelectorAll(`#${sectionId} .portfolio-card`).length;
}

function countStatsFromDom() {
  const supplements = countPortfolioCards('section-supplements');
  const clothing = countPortfolioCards('section-clothing');
  const banners = countPortfolioCards('section-banners');

  return {
    supplements,
    banners,
    clothing,
    total: supplements + banners + clothing
  };
}

function applyStats(stats) {
  document.querySelectorAll('[data-stat]').forEach((element) => {
    const key = element.dataset.stat;
    if (stats[key] !== undefined) {
      element.textContent = String(stats[key]);
    }
  });
}

function formatRecentDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function renderRecentList(container, items) {
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<li class="recent-empty">Пока нет работ</li>';
    return;
  }

  container.innerHTML = items.map((item) => {
    const sectionId = item.section_id || 'banners';
    const badge = SECTION_BADGES[sectionId] || item.section_title || 'Работа';
    const title = item.title || 'Без названия';
    const date = formatRecentDate(item.created_at);

    return `
      <li>
        <span class="recent-badge ${sectionId}">${badge}</span>
        <span class="recent-title">${title}</span>
        <span class="recent-date">${date}</span>
      </li>
    `;
  }).join('');
}

function buildRecentFromDom(limit = 5) {
  const sections = [
    { id: 'section-supplements', section_id: 'supplements' },
    { id: 'section-banners', section_id: 'banners' },
    { id: 'section-clothing', section_id: 'clothing' }
  ];

  const items = [];

  sections.forEach(({ id, section_id }) => {
    document.querySelectorAll(`#${id} .portfolio-card h3`).forEach((heading) => {
      items.push({
        section_id,
        title: heading.textContent.trim(),
        created_at: null
      });
    });
  });

  return items.slice(0, limit);
}

async function loadPortfolioStats() {
  try {
    const response = await fetch('/api/stats');
    if (response.ok) {
      const stats = await response.json();
      applyStats({
        supplements: Number(stats.supplements) || 0,
        clothing: Number(stats.clothing) || 0,
        banners: Number(stats.banners) || 0,
        total: Number(stats.total) || 0
      });
      return;
    }
  } catch {
    /* fallback ниже */
  }

  applyStats(countStatsFromDom());
}

function renderAppearanceActivityList(container, items) {
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<li class="recent-empty">Пока нет изменений картинок</li>';
    return;
  }

  container.innerHTML = items.map((item) => {
    const badgeClass = item.badge_class || 'banners';
    const badge = item.badge || 'Изменение';
    const title = item.title || 'Изменение изображения';
    const date = formatRecentDate(item.created_at);

    return `
      <li>
        <span class="recent-badge ${badgeClass}">${badge}</span>
        <span class="recent-title">${title}</span>
        <span class="recent-date">${date}</span>
      </li>
    `;
  }).join('');
}

async function loadRecentAppearanceActivity() {
  const lists = document.querySelectorAll('[data-recent-list="appearance"]');
  if (!lists.length) return;

  try {
    const response = await fetch('/api/appearance/recent');
    if (response.ok) {
      const items = await response.json();
      lists.forEach((list) => renderAppearanceActivityList(list, items));
      return;
    }
  } catch {
    /* fallback ниже */
  }

  lists.forEach((list) => renderAppearanceActivityList(list, []));
}

async function loadRecentFitnessWorks() {
  const lists = document.querySelectorAll('[data-recent-list="fitness"]');
  if (!lists.length) return;

  try {
    const response = await fetch('/api/works?section=supplements');
    if (response.ok) {
      const items = await response.json();
      const recent = [...items]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map((item) => ({
          section_id: 'supplements',
          title: item.title,
          created_at: item.created_at
        }));
      lists.forEach((list) => renderRecentList(list, recent));
      return;
    }
  } catch {
    /* fallback ниже */
  }

  lists.forEach((list) => renderRecentList(list, []));
}

async function loadRecentBannerWorks() {
  const lists = document.querySelectorAll('[data-recent-list="banners"]');
  if (!lists.length) return;

  try {
    const response = await fetch('/api/works?section=banners');
    if (response.ok) {
      const items = await response.json();
      const recent = [...items]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map((item) => ({
          section_id: 'banners',
          title: item.title,
          created_at: item.created_at
        }));
      lists.forEach((list) => renderRecentList(list, recent));
      return;
    }
  } catch {
    /* fallback ниже */
  }

  lists.forEach((list) => renderRecentList(list, []));
}

window.loadRecentBannerWorks = loadRecentBannerWorks;

async function loadRecentClothingActivity() {
  const lists = document.querySelectorAll('[data-recent-list="clothing"]');
  if (!lists.length) return;

  try {
    const response = await fetch('/api/clothing/recent-activity');
    if (response.ok) {
      const items = await response.json();
      lists.forEach((list) => renderClothingActivityList(list, items));
      return;
    }
  } catch {
    /* fallback ниже */
  }

  lists.forEach((list) => renderClothingActivityList(list, []));
}

function renderClothingActivityList(container, items) {
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<li class="recent-empty">Пока нет изменений в разделе «Одежда»</li>';
    return;
  }

  container.innerHTML = items.map((item) => {
    const badgeClass = item.badge_class || 'clothing';
    const badge = item.badge || 'Одежда';
    const title = item.title || 'Изменение';
    const date = formatRecentDate(item.created_at);

    return `
      <li>
        <span class="recent-badge ${badgeClass}">${badge}</span>
        <span class="recent-title">${title}</span>
        <span class="recent-date">${date}</span>
      </li>
    `;
  }).join('');
}

async function loadRecentWorks() {
  const lists = document.querySelectorAll('[data-recent-list="works"]');

  try {
    const response = await fetch('/api/works/recent');
    if (response.ok) {
      const items = await response.json();
      lists.forEach((list) => renderRecentList(list, items));
      return;
    }
  } catch {
    /* fallback ниже */
  }

  const fallbackItems = buildRecentFromDom();
  lists.forEach((list) => renderRecentList(list, fallbackItems));
}

window.loadRecentWorks = loadRecentWorks;
window.loadRecentAppearanceActivity = loadRecentAppearanceActivity;
window.loadRecentFitnessWorks = loadRecentFitnessWorks;
window.loadRecentClothingActivity = loadRecentClothingActivity;
window.loadPortfolioStats = loadPortfolioStats;

async function refreshHomeData() {
  await Promise.all([loadPortfolioStats(), loadRecentWorks()]);
}

document.addEventListener('DOMContentLoaded', refreshHomeData);
window.addEventListener('hero-banners-updated', () => {
  loadPortfolioStats();
  loadRecentAppearanceActivity();
});
window.addEventListener('hero-ready', loadPortfolioStats);
window.addEventListener('fitness-catalog-updated', loadPortfolioStats);
window.addEventListener('fitness-catalog-changed', () => {
  refreshHomeData();
  loadRecentFitnessWorks();
});
window.addEventListener('banners-catalog-changed', () => {
  refreshHomeData();
  loadRecentBannerWorks();
});
window.addEventListener('banners-catalog-updated', loadPortfolioStats);
window.addEventListener('clothing-catalog-changed', () => {
  refreshHomeData();
  loadRecentClothingActivity();
});
window.addEventListener('section-icons-changed', loadRecentAppearanceActivity);
