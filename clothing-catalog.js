const CLOTHING_LINE_LABELS = {
  sport: 'Спорт',
  casual: 'Casual'
};

const CLOTHING_TAG_LABELS = {
  popular: 'Популярные',
  catalog: 'Каталог',
  men: 'Мужчинам',
  women: 'Женщинам',
  shirts: 'Рубашки',
  pants: 'Брюки',
  jeans: 'Джинсы',
  accessories: 'Аксессуары'
};

const DEFAULT_GRADIENTS = {
  sport: 'linear-gradient(160deg, #2c3e50 0%, #5d7a96 100%)',
  casual: 'linear-gradient(160deg, #6b5b73 0%, #a8929f 100%)'
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeTagKey(tag) {
  return String(tag).trim().replace(/^#/, '').toLowerCase();
}

function getFilterTags(item) {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const keys = tags.map((tag) => normalizeTagKey(tag)).filter(Boolean);
  if ((Number(item.review_count) || 0) >= 3 && !keys.includes('popular')) {
    keys.push('popular');
  }
  return keys;
}

function buildDataCategory(item) {
  return [item.category, ...getFilterTags(item)].filter(Boolean).join(' ');
}

function isPopularItem(item) {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  return (Number(item.review_count) || 0) >= 3
    || tags.some((tag) => normalizeTagKey(tag) === 'popular');
}

function getCardTagLabel(item) {
  if (isPopularItem(item)) return CLOTHING_TAG_LABELS.popular;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  if (tags.some((tag) => normalizeTagKey(tag) === 'catalog')) return CLOTHING_TAG_LABELS.catalog;
  return CLOTHING_LINE_LABELS[item.category] || 'Коллекция';
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
    <span class="clothing-card-rating-count">${countLabel}</span>
  `;
}

const CLOTHING_PROMO_LABELS = {
  sale: 'Sale',
  new: 'New',
  limited: 'Limited',
  hot: 'Hot'
};

function formatPriceUsd(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function getDiscountPercent(price, comparePrice) {
  if (price == null || comparePrice == null || comparePrice <= price) return null;
  return Math.round((1 - price / comparePrice) * 100);
}

function getPromoBadge(item) {
  const price = parseUsd(item.price_usd);
  const compare = parseUsd(item.compare_price_usd);
  const discount = getDiscountPercent(price, compare);

  if (item.promo_label) {
    return { text: item.promo_label, type: item.promo_type || 'sale' };
  }
  if (item.promo_type === 'sale') {
    return discount ? { text: `−${discount}%`, type: 'sale' } : null;
  }
  if (item.promo_type) {
    return { text: CLOTHING_PROMO_LABELS[item.promo_type] || item.promo_type, type: item.promo_type };
  }
  if (discount) {
    return { text: `−${discount}%`, type: 'sale' };
  }
  return null;
}

function parseUsd(value) {
  if (value == null || value === '') return null;
  const num = Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function renderPriceBlock(item) {
  const price = parseUsd(item.price_usd);
  const compare = parseUsd(item.compare_price_usd);
  const discount = getDiscountPercent(price, compare);

  if (price == null) {
    return '<div class="clothing-card-price-row"><span class="clothing-card-price-current clothing-card-price-current--muted">Цена по запросу</span></div>';
  }

  const currentHtml = price != null
    ? `<span class="clothing-card-price-current${compare != null && compare > price ? ' clothing-card-price-current--sale' : ''}">${formatPriceUsd(price)}</span>`
    : '';
  const compareHtml = compare != null && price != null && compare > price
    ? `<span class="clothing-card-price-compare">${formatPriceUsd(compare)}</span>`
    : '';
  const discountHtml = discount
    ? `<span class="clothing-card-discount">−${discount}%</span>`
    : '';

  return `
    <div class="clothing-card-price-row">
      ${compareHtml}
      ${currentHtml}
      ${discountHtml}
    </div>
  `;
}

function renderClothingCard(item) {
  const gradient = item.gradient || DEFAULT_GRADIENTS[item.category] || DEFAULT_GRADIENTS.casual;
  const placeholder = item.placeholder_text || item.title;
  const dataCategory = buildDataCategory(item);
  const mediaStyle = item.image
    ? `background-image: url('${item.image.split('?')[0]}?t=${Date.now()}');`
    : `--gradient: ${gradient}`;
  const promo = getPromoBadge(item);
  const lineLabel = getCardTagLabel(item);

  return `
    <a href="/clothing-product.html?id=${item.id}" target="_blank" rel="noopener noreferrer" class="clothing-card-link">
      <article class="clothing-card${promo ? ' clothing-card--promo' : ''}" data-category="${escapeHtml(dataCategory)}">
        <div class="clothing-card-media" style="${mediaStyle}">
          ${item.image ? '' : `<span class="clothing-card-placeholder">${escapeHtml(placeholder)}</span>`}
          ${promo ? `<span class="clothing-catalog-promo-sticker clothing-card-promo-sticker">${escapeHtml(promo.text)}</span>` : ''}
          <span class="clothing-card-hover-layer" aria-hidden="true">
            <span class="clothing-card-hover-cta">Смотреть</span>
          </span>
        </div>
        <div class="clothing-card-caption">
          <div class="clothing-card-head">
            <span class="clothing-card-line">${escapeHtml(lineLabel)}</span>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
          ${renderPriceBlock(item)}
          <div class="clothing-card-rating">
            ${renderStarsCompact(item.avg_rating, item.review_count)}
          </div>
        </div>
      </article>
    </a>
  `;
}

async function loadClothingCatalog() {
  const grid = document.getElementById('clothingLookbookGrid');
  const emptyState = document.getElementById('clothingEmpty');
  if (!grid) return [];

  try {
    const response = await fetch('/api/works?section=clothing');
    if (!response.ok) throw new Error('Не удалось загрузить каталог');

    const items = await response.json();
    grid.querySelectorAll('.clothing-card-link').forEach((link) => link.remove());

    if (!items.length) {
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = 'Ждите поступления новых товаров';
      }
      window.dispatchEvent(new CustomEvent('clothing-catalog-updated', { detail: { items: [] } }));
      return [];
    }

    if (emptyState) emptyState.hidden = true;
    grid.insertAdjacentHTML('afterbegin', items.map(renderClothingCard).join(''));
    window.dispatchEvent(new CustomEvent('clothing-catalog-updated', { detail: { items } }));
    return items;
  } catch {
    if (emptyState) {
      emptyState.hidden = false;
      emptyState.textContent = 'Ждите поступления новых товаров';
    }
    window.dispatchEvent(new CustomEvent('clothing-catalog-updated', { detail: { items: [] } }));
    return [];
  }
}

document.addEventListener('DOMContentLoaded', loadClothingCatalog);
window.addEventListener('clothing-catalog-changed', loadClothingCatalog);

window.ClothingCatalog = {
  LINE_LABELS: CLOTHING_LINE_LABELS,
  TAG_LABELS: CLOTHING_TAG_LABELS,
  DEFAULT_GRADIENTS,
  load: loadClothingCatalog
};
