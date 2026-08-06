const FITNESS_CATEGORIES = {
  protein: 'Протеин',
  creatine: 'Креатин',
  vitamins: 'Витамины',
  equipment: 'Спорт-инвентарь'
};

const DEFAULT_GRADIENTS = {
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
  const loading = document.getElementById('productLoading');
  const error = document.getElementById('productError');
  if (loading) loading.hidden = true;
  if (error) {
    error.hidden = false;
    error.textContent = message;
  }
}

function renderProduct(product) {
  const gradient = product.gradient || DEFAULT_GRADIENTS[product.category] || DEFAULT_GRADIENTS.protein;
  const placeholder = product.placeholder_text || product.title;

  document.title = `${product.title} — Фитнес-индустрия`;

  const imageEl = document.getElementById('productImage');
  if (product.image) {
    imageEl.style.backgroundImage = `url('${product.image.split('?')[0]}?t=${Date.now()}')`;
    imageEl.style.backgroundSize = 'cover';
    imageEl.style.backgroundPosition = 'center';
    imageEl.innerHTML = '';
  } else {
    imageEl.style.background = gradient;
    imageEl.innerHTML = `<span class="product-image-placeholder">${escapeHtml(placeholder)}</span>`;
  }

  const categoryEl = document.getElementById('productCategory');
  categoryEl.textContent = FITNESS_CATEGORIES[product.category] || product.category || 'Товар';

  const ratingSummary = document.getElementById('productRatingSummary');
  const countLabel = product.review_count
    ? `${product.review_count} ${product.review_count === 1 ? 'отзыв' : product.review_count < 5 ? 'отзыва' : 'отзывов'}`
    : 'Нет отзывов';
  ratingSummary.innerHTML = `
    ${renderStars(product.avg_rating)}
    <span class="product-rating-value">${product.avg_rating ? product.avg_rating.toFixed(1) : '—'}</span>
    <span class="product-rating-count">(${countLabel})</span>
  `;

  document.getElementById('productTitle').textContent = product.title;
  document.getElementById('productDescription').textContent = product.description || 'Описание скоро появится.';
  document.getElementById('productPrice').textContent = product.price_usd != null
    ? formatPriceUsd(product.price_usd)
    : 'Цена по запросу';

  const tagsEl = document.getElementById('productTags');
  const tags = Array.isArray(product.tags) ? product.tags : [];
  tagsEl.innerHTML = tags.map((tag) => `<span class="product-tag">${escapeHtml(tag)}</span>`).join('');

  document.getElementById('productLayout').hidden = false;
  document.getElementById('productReviews').hidden = false;
}

function renderReviews(reviews, product) {
  const list = document.getElementById('reviewsList');
  const empty = document.getElementById('reviewsEmpty');
  const countEl = document.getElementById('reviewsCount');

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
    <article class="product-review-item">
      <div class="product-review-head">
        <strong>${escapeHtml(review.author_name)}</strong>
        ${renderStars(review.rating, { size: 'sm', label: false })}
        <time datetime="${review.created_at}">${formatDate(review.created_at)}</time>
      </div>
      ${review.review_text ? `<p>${escapeHtml(review.review_text)}</p>` : ''}
      ${review.admin_reply ? `
        <div class="product-review-admin-reply">
          <span class="product-review-admin-label">Ответ магазина</span>
          <p>${escapeHtml(review.admin_reply)}</p>
          ${review.admin_reply_at ? `<time datetime="${review.admin_reply_at}">${formatDate(review.admin_reply_at)}</time>` : ''}
        </div>
      ` : ''}
    </article>
  `).join('');
}

function initStarPicker() {
  const picker = document.getElementById('starPicker');
  const input = document.getElementById('reviewRating');
  if (!picker || !input) return;

  let selected = 5;

  function paint(value) {
    picker.querySelectorAll('.star-picker-btn').forEach((btn) => {
      const btnValue = Number(btn.dataset.value);
      btn.classList.toggle('is-active', btnValue <= value);
    });
  }

  paint(selected);

  picker.querySelectorAll('.star-picker-btn').forEach((btn) => {
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

function buildCartItemFromProduct(product, quantity) {
  const gradient = product.gradient || DEFAULT_GRADIENTS[product.category] || DEFAULT_GRADIENTS.protein;
  const workId = Number.parseInt(String(product.id ?? product.work_id ?? ''), 10);
  const sectionId = product.section_id === 'clothing' ? 'clothing' : 'supplements';

  return {
    workId,
    sectionId,
    title: product.title,
    price_usd: product.price_usd,
    compare_price_usd: product.compare_price_usd,
    image: product.image,
    gradient,
    placeholder_text: product.placeholder_text || product.title,
    category: product.category,
    quantity
  };
}

function initAddToCart(product) {
  const btn = document.getElementById('productAddToCartBtn');
  const form = document.getElementById('orderForm');
  const status = document.getElementById('orderStatus');
  if (!btn || !form || typeof window.SiteCart?.addItem !== 'function') return;
  if (btn.dataset.cartBound === 'true') return;

  btn.dataset.cartBound = 'true';
  btn.addEventListener('click', () => {
    const qtyInput = form.querySelector('[name="quantity"]');
    const quantity = Math.max(1, Math.min(99, Number(qtyInput?.value) || 1));
    const cartItem = buildCartItemFromProduct(product, quantity);
    const added = window.SiteCart.addItem(cartItem, quantity);

    if (!added) {
      setFormStatus(status, 'Не удалось добавить товар в корзину', true);
      return;
    }

    btn.classList.add('is-added');
    setFormStatus(status, 'Товар добавлен в корзину', false);
    window.setTimeout(() => btn.classList.remove('is-added'), 700);
  });
}

function recordProductOrder(product, formData, payload) {
  if (typeof window.SiteOrders?.addOrder !== 'function') return;

  window.SiteOrders.addOrder({
    type: 'work',
    sectionId: product.section_id || 'supplements',
    workId: product.id,
    title: product.title,
    customer_name: formData.get('customer_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    quantity: Number(formData.get('quantity')),
    message: formData.get('message'),
    serverOrderId: payload.id
  });
}

function showNotFoundNotice() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('notfound') !== '1') return;

  const query = params.get('q') || '';
  const main = document.getElementById('productMain');
  if (!main || main.querySelector('.product-not-found-notice')) return;

  const notice = document.createElement('div');
  notice.className = 'product-not-found-notice';
  notice.setAttribute('role', 'alert');
  notice.innerHTML = `
    <strong>Ничего не найдено по вашему запросу</strong>
    ${query ? `<span>«${escapeHtml(query)}» — показан случайный товар из каталога.</span>` : '<span>Показан случайный товар из каталога.</span>'}
  `;
  main.prepend(notice);
}

async function loadProductPage() {
  const productId = getProductId();
  if (!productId) {
    showError('Товар не указан. Вернитесь в каталог и выберите товар.');
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

    if (product.section_id === 'clothing') {
      window.location.replace(`/clothing-product.html?id=${productId}`);
      return;
    }

    document.getElementById('productLoading').hidden = true;
    renderProduct(product);
    renderReviews(reviews, product);
    showNotFoundNotice();
    initStarPicker();
    initAddToCart(product);

    const orderForm = document.getElementById('orderForm');
    const reviewForm = document.getElementById('reviewForm');

    orderForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!orderForm.reportValidity()) return;

      const status = document.getElementById('orderStatus');
      const submitBtn = orderForm.querySelector('[type="submit"]');
      const formData = new FormData(orderForm);

      const confirmed = await confirmOrderSubmission({
        theme: 'supplements',
        title: 'Проверьте данные заказа',
        description: 'Убедитесь, что контакты и детали покупки указаны верно, прежде чем отправить заявку.',
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
        recordProductOrder(product, formData, payload);
        if (typeof window.SiteCart?.removeItem === 'function') {
          window.SiteCart.removeItem(`supplements:${product.id}`);
        }
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
      const status = document.getElementById('reviewStatus');
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
        reviewForm.reset();
        document.getElementById('reviewRating').value = '5';
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

document.addEventListener('DOMContentLoaded', loadProductPage);
