const FITNESS_CATEGORIES = {
  protein: 'Протеин',
  creatine: 'Креатин',
  vitamins: 'Витамины',
  equipment: 'Спорт-инвентарь'
};

const FITNESS_DEFAULT_GRADIENTS = {
  protein: 'linear-gradient(145deg, #ea580c 0%, #9a3412 55%, #1c1410 100%)',
  creatine: 'linear-gradient(145deg, #f97316 0%, #c2410c 50%, #0f1117 100%)',
  vitamins: 'linear-gradient(145deg, #fdba74 0%, #f97316 40%, #7c2d12 100%)',
  equipment: 'linear-gradient(145deg, #fb923c 0%, #ea580c 45%, #1a120b 100%)'
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderStarsCompact(rating, reviewCount) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const fullStars = Math.floor(value);
  const hasHalf = value - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const stars = [];

  for (let i = 0; i < fullStars; i += 1) {
    stars.push('<span class="star star-full" aria-hidden="true">★</span>');
  }
  if (hasHalf) {
    stars.push('<span class="star star-half" aria-hidden="true">★</span>');
  }
  for (let i = 0; i < emptyStars; i += 1) {
    stars.push('<span class="star star-empty" aria-hidden="true">★</span>');
  }

  const countLabel = reviewCount
    ? `${reviewCount} ${reviewCount === 1 ? 'отзыв' : reviewCount < 5 ? 'отзыва' : 'отзывов'}`
    : 'Без отзывов';

  return `
    <div class="star-rating star-rating-sm" aria-label="Рейтинг ${value.toFixed(1)} из 5">${stars.join('')}</div>
    <span class="fitness-card-rating-count">${countLabel}</span>
  `;
}

const FITNESS_CART_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h2l2.4 12.4a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.76L21 7H6"/></svg>';

let fitnessCatalogItems = [];

function createSeededRandom(seed) {
  let t = (Number(seed) || 1) + 0x6D2B79F5;
  return function random() {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray(items, random) {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function spreadFitnessItems(items) {
  if (!Array.isArray(items) || items.length < 2) return Array.isArray(items) ? items.slice() : [];

  const groups = new Map();
  items.forEach((item) => {
    const key = item.category || 'all';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  if (groups.size < 2) return items.slice();

  const seed = items.reduce((acc, item) => acc + (Number(item.id) || 0), 0);
  const random = createSeededRandom(seed);
  const queues = shuffleArray([...groups.keys()], random).map((key) => ({
    key,
    items: shuffleArray(groups.get(key), random)
  }));

  const result = [];
  let lastKey = null;

  while (result.length < items.length) {
    const available = queues.filter((queue) => queue.items.length > 0);
    if (!available.length) break;

    let candidates = available.filter((queue) => queue.key !== lastKey);
    if (!candidates.length) candidates = available;

    candidates.sort((a, b) => {
      const byCount = b.items.length - a.items.length;
      if (byCount !== 0) return byCount;
      return a.key.localeCompare(b.key);
    });

    const picked = candidates[0];
    result.push(picked.items.shift());
    lastKey = picked.key;
  }

  return result;
}

function buildFitnessCartItem(item, quantity = 1) {
  const gradient = item.gradient || FITNESS_DEFAULT_GRADIENTS[item.category] || FITNESS_DEFAULT_GRADIENTS.protein;

  return {
    workId: item.id,
    sectionId: 'supplements',
    title: item.title,
    price_usd: item.price_usd,
    compare_price_usd: item.compare_price_usd,
    image: item.image,
    gradient,
    placeholder_text: item.placeholder_text || item.title,
    category: item.category,
    quantity
  };
}

function bindFitnessCartActions(grid) {
  if (!grid || grid.dataset.cartBound === 'true') return;

  grid.dataset.cartBound = 'true';
  grid.addEventListener('click', (event) => {
    const btn = event.target.closest('.fitness-card-cart-btn');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();

    const workId = Number.parseInt(String(btn.dataset.workId ?? ''), 10);
    const item = fitnessCatalogItems.find((entry) => Number(entry.id) === workId);
    if (!item || typeof window.SiteCart?.addItem !== 'function') return;

    const added = window.SiteCart.addItem(buildFitnessCartItem(item, 1), 1);
    if (!added) return;

    btn.classList.add('is-added');
    window.setTimeout(() => btn.classList.remove('is-added'), 700);
  });
}

function renderFitnessCard(item) {
  const gradient = item.gradient || FITNESS_DEFAULT_GRADIENTS[item.category] || FITNESS_DEFAULT_GRADIENTS.protein;
  const placeholder = item.placeholder_text || item.title;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const imageStyle = item.image
    ? `background-image: url('${item.image.split('?')[0]}?t=${Date.now()}'); background-size: cover; background-position: center;`
    : `--gradient: ${gradient}`;

  return `
    <article class="portfolio-card fitness-card" data-category="${escapeHtml(item.category || 'all')}">
      <a href="/product.html?id=${item.id}" target="_blank" rel="noopener noreferrer" class="fitness-card-link">
        <div class="portfolio-image" style="${imageStyle}">
          ${item.image ? '' : `<span class="portfolio-placeholder">${escapeHtml(placeholder)}</span>`}
        </div>
        <div class="portfolio-body">
          <h3>${escapeHtml(item.title)}</h3>
          ${item.price_usd != null ? `<p class="fitness-card-price">$${Number(item.price_usd).toFixed(2)}</p>` : ''}
          <p>${escapeHtml(item.description || '')}</p>
          <div class="portfolio-tags">
            ${item.category ? `<span class="tag">${escapeHtml(FITNESS_CATEGORIES[item.category] || item.category)}</span>` : ''}
            ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="fitness-card-rating">
            ${renderStarsCompact(item.avg_rating, item.review_count)}
          </div>
        </div>
      </a>
      <div class="fitness-card-actions">
        <button
          type="button"
          class="fitness-card-cart-btn"
          data-work-id="${item.id}"
          aria-label="Добавить «${escapeHtml(item.title)}» в корзину"
          title="Добавить в корзину"
        >
          ${FITNESS_CART_ICON}
          <span>В корзину</span>
        </button>
      </div>
    </article>
  `;
}

async function loadFitnessCatalog() {
  const grid = document.getElementById('fitnessCatalogGrid')
    || document.querySelector('#section-supplements .fitness-portfolio-grid');
  const emptyState = document.getElementById('fitnessEmpty');
  if (!grid) return [];

  try {
    const response = await fetch('/api/works?section=supplements');
    if (!response.ok) throw new Error('Не удалось загрузить каталог');

    const items = spreadFitnessItems(await response.json());
    fitnessCatalogItems = items;
    grid.querySelectorAll('.fitness-card').forEach((card) => card.remove());

    if (!items.length) {
      fitnessCatalogItems = [];
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = 'Ждите поступления новых товаров';
      }
      window.dispatchEvent(new CustomEvent('fitness-catalog-updated', { detail: { items: [] } }));
      return [];
    }

    if (emptyState) emptyState.hidden = true;
    grid.insertAdjacentHTML('beforeend', items.map(renderFitnessCard).join(''));
    bindFitnessCartActions(grid);
    window.dispatchEvent(new CustomEvent('fitness-catalog-updated', { detail: { items } }));
    return items;
  } catch (error) {
    console.error('Fitness catalog load failed:', error);
    fitnessCatalogItems = [];
    if (emptyState) {
      emptyState.hidden = false;
      emptyState.textContent = 'Не удалось загрузить каталог. Проверьте, что сервер запущен.';
    }
    window.dispatchEvent(new CustomEvent('fitness-catalog-updated', { detail: { items: [] } }));
    return [];
  }
}

document.addEventListener('DOMContentLoaded', loadFitnessCatalog);
window.addEventListener('fitness-catalog-changed', loadFitnessCatalog);

window.FitnessCatalog = {
  CATEGORIES: FITNESS_CATEGORIES,
  DEFAULT_GRADIENTS: FITNESS_DEFAULT_GRADIENTS,
  load: loadFitnessCatalog
};
