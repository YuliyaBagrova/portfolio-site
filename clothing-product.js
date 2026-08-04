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

function formatPriceUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function renderStars(rating, { size = 'md', label = true } = {}) {
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

  const aria = label ? ` aria-label="Рейтинг ${value.toFixed(1)} из 5"` : '';
  return `<div class="star-rating star-rating-${size}"${aria}>${stars.join('')}</div>`;
}

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function showError(message) {
  const loading = document.getElementById('clothingProductLoading');
  const error = document.getElementById('clothingProductError');
  if (loading) loading.hidden = true;
  if (error) {
    error.hidden = false;
    error.textContent = message;
  }
}

function getCategoryLabel(product) {
  const tags = Array.isArray(product.tags) ? product.tags : [];
  const isPopular = (Number(product.review_count) || 0) >= 3
    || tags.some((tag) => String(tag).trim().replace(/^#/, '').toLowerCase() === 'popular');
  if (isPopular) return CLOTHING_TAG_LABELS.popular;
  if (tags.some((tag) => String(tag).trim().replace(/^#/, '').toLowerCase() === 'catalog')) {
    return CLOTHING_TAG_LABELS.catalog;
  }
  return CLOTHING_LINE_LABELS[product.category] || product.category || 'Коллекция';
}

function getDiscountPercent(price, comparePrice) {
  if (price == null || comparePrice == null || comparePrice <= price) return null;
  return Math.round((1 - price / comparePrice) * 100);
}

function parseUsd(value) {
  if (value == null || value === '') return null;
  const num = Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function getPromoBadge(product) {
  const price = parseUsd(product.price_usd);
  const compare = parseUsd(product.compare_price_usd);
  const discount = getDiscountPercent(price, compare);

  if (product.promo_label) {
    return { text: product.promo_label, type: product.promo_type || 'sale' };
  }
  if (product.promo_type === 'sale') {
    return discount ? { text: `−${discount}%`, type: 'sale' } : null;
  }
  if (product.promo_type) {
    const labels = { sale: 'Sale', new: 'New', limited: 'Limited', hot: 'Hot' };
    return { text: labels[product.promo_type] || product.promo_type, type: product.promo_type };
  }
  if (discount) {
    return { text: `−${discount}%`, type: 'sale' };
  }
  return null;
}

function renderProductPrice(product) {
  const priceEl = document.getElementById('clothingProductPrice');
  const compareEl = document.getElementById('clothingProductComparePrice');
  const discountEl = document.getElementById('clothingProductDiscount');
  const promoEl = document.getElementById('clothingProductPromoBadge');
  const price = parseUsd(product.price_usd);
  const compare = parseUsd(product.compare_price_usd);
  const promo = getPromoBadge(product);
  const discount = getDiscountPercent(price, compare);

  if (promoEl) {
    if (promo) {
      promoEl.textContent = promo.text;
      promoEl.className = 'clothing-catalog-promo-sticker clothing-product-promo-sticker';
      promoEl.hidden = false;
    } else {
      promoEl.textContent = '';
      promoEl.hidden = true;
    }
  }

  if (price != null) {
    priceEl.textContent = formatPriceUsd(price);
    priceEl.classList.toggle('clothing-product-price--sale', compare != null && compare > price);
  } else {
    priceEl.textContent = 'Цена по запросу';
    priceEl.classList.remove('clothing-product-price--sale');
  }

  if (compareEl) {
    if (compare != null && price != null && compare > price) {
      compareEl.textContent = formatPriceUsd(compare);
      compareEl.hidden = false;
    } else {
      compareEl.hidden = true;
    }
  }

  if (discountEl) {
    if (discount) {
      discountEl.textContent = `−${discount}%`;
      discountEl.hidden = false;
    } else {
      discountEl.textContent = '';
      discountEl.hidden = true;
    }
  }
}

function renderProduct(product) {
  if (product.section_id && product.section_id !== 'clothing') {
    showError('Этот товар относится к другому разделу.');
    return;
  }

  const gradient = product.gradient || DEFAULT_GRADIENTS[product.category] || DEFAULT_GRADIENTS.casual;
  const placeholder = product.placeholder_text || product.title;

  document.title = `${product.title} — Одежда`;

  const imageEl = document.getElementById('clothingProductImage');
  if (product.image) {
    imageEl.style.backgroundImage = `url('${product.image.split('?')[0]}?t=${Date.now()}')`;
    imageEl.style.backgroundSize = 'cover';
    imageEl.style.backgroundPosition = 'center';
    imageEl.innerHTML = '';
  } else {
    imageEl.style.background = gradient;
    imageEl.innerHTML = `<span class="clothing-product-image-placeholder">${escapeHtml(placeholder)}</span>`;
  }

  document.getElementById('clothingProductCategory').textContent = getCategoryLabel(product);

  const ratingSummary = document.getElementById('clothingProductRatingSummary');
  const countLabel = product.review_count
    ? `${product.review_count} ${product.review_count === 1 ? 'отзыв' : product.review_count < 5 ? 'отзыва' : 'отзывов'}`
    : 'Нет отзывов';
  ratingSummary.innerHTML = `
    ${renderStars(product.avg_rating)}
    <span class="clothing-product-rating-value">${product.avg_rating ? product.avg_rating.toFixed(1) : '—'}</span>
    <span class="clothing-product-rating-count">(${countLabel})</span>
  `;

  document.getElementById('clothingProductTitle').textContent = product.title;
  document.getElementById('clothingProductDescription').textContent = product.description || 'Описание скоро появится.';
  renderProductPrice(product);

  const tagsEl = document.getElementById('clothingProductTags');
  const tags = Array.isArray(product.tags) ? product.tags : [];
  tagsEl.innerHTML = tags
    .map((tag) => `<span class="clothing-product-tag">${escapeHtml(CLOTHING_TAG_LABELS[tag] || tag)}</span>`)
    .join('');

  document.getElementById('clothingProductLayout').hidden = false;
  document.getElementById('clothingProductReviews').hidden = false;
}

function renderReviews(reviews, product) {
  const list = document.getElementById('clothingReviewsList');
  const empty = document.getElementById('clothingReviewsEmpty');
  const countEl = document.getElementById('clothingReviewsCount');

  countEl.textContent = product.review_count
    ? `Средняя оценка ${product.avg_rating.toFixed(1)} · ${product.review_count} отзывов`
    : 'Пока без оценок';

  if (!reviews.length) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  list.innerHTML = reviews.map((review) => `
    <article class="clothing-product-review-item">
      <div class="clothing-product-review-head">
        <strong>${escapeHtml(review.author_name)}</strong>
        ${renderStars(review.rating, { size: 'sm', label: false })}
        <time datetime="${review.created_at}">${formatDate(review.created_at)}</time>
      </div>
      ${review.review_text ? `<p>${escapeHtml(review.review_text)}</p>` : ''}
      ${review.admin_reply ? `
        <div class="clothing-product-review-admin-reply">
          <span class="clothing-product-review-admin-label">Ответ магазина</span>
          <p>${escapeHtml(review.admin_reply)}</p>
          ${review.admin_reply_at ? `<time datetime="${review.admin_reply_at}">${formatDate(review.admin_reply_at)}</time>` : ''}
        </div>
      ` : ''}
    </article>
  `).join('');
}

function initStarPicker() {
  const picker = document.getElementById('clothingStarPicker');
  const input = document.getElementById('clothingReviewRating');
  if (!picker || !input) return;

  let selected = 5;

  function paint(value) {
    picker.querySelectorAll('.clothing-star-picker-btn').forEach((btn) => {
      const btnValue = Number(btn.dataset.value);
      btn.classList.toggle('is-active', btnValue <= value);
    });
  }

  paint(selected);

  picker.querySelectorAll('.clothing-star-picker-btn').forEach((btn) => {
    btn.addEventListener('mouseenter', () => paint(Number(btn.dataset.value)));
    btn.addEventListener('focus', () => paint(Number(btn.dataset.value)));
    btn.addEventListener('click', () => {
      selected = Number(btn.dataset.value);
      input.value = String(selected);
      paint(selected);
    });
  });

  picker.addEventListener('mouseleave', () => paint(selected));
  picker.addEventListener('focusout', (event) => {
    if (!picker.contains(event.relatedTarget)) {
      paint(selected);
    }
  });
}

function setFormStatus(el, message, isError) {
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || '';
  el.classList.toggle('is-error', Boolean(isError));
  el.classList.toggle('is-success', Boolean(message && !isError));
}

async function loadClothingProductPage() {
  const productId = getProductId();
  if (!productId) {
    showError('Товар не указан. Вернитесь в коллекцию и выберите товар.');
    return;
  }

  try {
    const [productRes, reviewsRes] = await Promise.all([
      fetch(`/api/works/${productId}`),
      fetch(`/api/works/${productId}/reviews`)
    ]);

    if (!productRes.ok) {
      throw new Error(productRes.status === 404 ? 'Товар не найден' : 'Не удалось загрузить товар');
    }

    const product = await productRes.json();
    const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

    document.getElementById('clothingProductLoading').hidden = true;
    renderProduct(product);
    renderReviews(reviews, product);
    initStarPicker();

    const orderForm = document.getElementById('clothingOrderForm');
    const reviewForm = document.getElementById('clothingReviewForm');

    orderForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!orderForm.reportValidity()) return;

      const status = document.getElementById('clothingOrderStatus');
      const submitBtn = orderForm.querySelector('[type="submit"]');
      const formData = new FormData(orderForm);

      const confirmed = await confirmOrderSubmission({
        theme: 'clothing',
        title: 'Проверьте данные заказа',
        description: 'Убедитесь, что контакты и детали заказа указаны верно, прежде чем отправить заявку.',
        fields: buildProductOrderFields(formData)
      });

      if (!confirmed) return;

      submitBtn.disabled = true;
      setFormStatus(status, 'Отправка заявки…', false);

      try {
        const response = await fetch(`/api/works/${productId}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: formData.get('customer_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            quantity: formData.get('quantity'),
            message: formData.get('message')
          })
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Не удалось оформить заказ');

        setFormStatus(status, payload.message, false);
        orderForm.reset();
        orderForm.querySelector('[name="quantity"]').value = '1';
      } catch (error) {
        setFormStatus(status, error.message, true);
      } finally {
        submitBtn.disabled = false;
      }
    });

    reviewForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = document.getElementById('clothingReviewStatus');
      const submitBtn = reviewForm.querySelector('[type="submit"]');
      const formData = new FormData(reviewForm);

      submitBtn.disabled = true;
      setFormStatus(status, 'Отправка отзыва…', false);

      try {
        const response = await fetch(`/api/works/${productId}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author_name: formData.get('author_name'),
            rating: formData.get('rating'),
            review_text: formData.get('review_text')
          })
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Не удалось отправить отзыв');

        const [freshProductRes, freshReviewsRes] = await Promise.all([
          fetch(`/api/works/${productId}`),
          fetch(`/api/works/${productId}/reviews`)
        ]);

        const freshProduct = await freshProductRes.json();
        const freshReviews = await freshReviewsRes.json();

        renderProduct(freshProduct);
        renderReviews(freshReviews, freshProduct);
        window.dispatchEvent(new CustomEvent('clothing-catalog-changed'));
        reviewForm.reset();
        document.getElementById('clothingReviewRating').value = '5';
        initStarPicker();
        setFormStatus(status, 'Спасибо! Отзыв опубликован.', false);
      } catch (error) {
        setFormStatus(status, error.message, true);
      } finally {
        submitBtn.disabled = false;
      }
    });
  } catch (error) {
    showError(error.message);
  }
}

document.addEventListener('DOMContentLoaded', loadClothingProductPage);
