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

function renderFitnessCard(item) {
  const gradient = item.gradient || FITNESS_DEFAULT_GRADIENTS[item.category] || FITNESS_DEFAULT_GRADIENTS.protein;
  const placeholder = item.placeholder_text || item.title;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const imageStyle = item.image
    ? `background-image: url('${item.image.split('?')[0]}?t=${Date.now()}'); background-size: cover; background-position: center;`
    : `--gradient: ${gradient}`;

  return `
    <a href="/product.html?id=${item.id}" target="_blank" rel="noopener noreferrer" class="fitness-card-link">
      <article class="portfolio-card fitness-card" data-category="${escapeHtml(item.category || 'all')}">
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
      </article>
    </a>
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

    const items = await response.json();
    grid.querySelectorAll('.fitness-card-link').forEach((link) => link.remove());

    if (!items.length) {
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = 'Ждите поступления новых товаров';
      }
      window.dispatchEvent(new CustomEvent('fitness-catalog-updated', { detail: { items: [] } }));
      return [];
    }

    if (emptyState) emptyState.hidden = true;
    grid.insertAdjacentHTML('beforeend', items.map(renderFitnessCard).join(''));
    window.dispatchEvent(new CustomEvent('fitness-catalog-updated', { detail: { items } }));
    return items;
  } catch (error) {
    console.error('Fitness catalog load failed:', error);
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
