(function initCartPage() {
  const listEl = document.getElementById('cartList');
  const emptyEl = document.getElementById('cartEmpty');
  const statsEl = document.getElementById('cartStats');
  const countEl = document.getElementById('cartCount');

  if (!listEl || !emptyEl || !window.SiteCart) return;

  const SECTION_LABELS = {
    supplements: 'Фитнес-индустрия',
    clothing: 'Одежда'
  };

  const SECTION_ICON_DEFAULTS = {
    supplements: 'assets/icons/fitness-industry.png',
    clothing: 'assets/icons/clothing.png'
  };

  const DEFAULT_GRADIENTS = {
    supplements: 'linear-gradient(145deg, #ea580c 0%, #9a3412 55%, #1c1410 100%)',
    clothing: 'linear-gradient(160deg, #6b5b73 0%, #a8929f 100%)'
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function formatPrice(amount) {
    if (amount == null || !Number.isFinite(Number(amount))) return 'Цена по запросу';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  }

  function getSectionLabel(sectionId) {
    if (window.SiteOrders?.getSectionLabel) {
      return window.SiteOrders.getSectionLabel(sectionId);
    }
    return SECTION_LABELS[sectionId] || sectionId;
  }

  function renderSectionIcon(sectionId, { className = 'cart-stat-icon', size = 48 } = {}) {
    const label = getSectionLabel(sectionId);
    const src = SECTION_ICON_DEFAULTS[sectionId] || SECTION_ICON_DEFAULTS.supplements;

    return `
      <span class="${className} stat-icon ${escapeHtml(sectionId)}" data-section-icon-trigger="${escapeHtml(sectionId)}">
        <img
          src="${escapeHtml(src)}"
          alt="${escapeHtml(label)}"
          width="${size}"
          height="${size}"
          decoding="async"
          data-section-icon-img="${escapeHtml(sectionId)}"
        >
      </span>
    `;
  }

  function applySectionIcons() {
    if (typeof window.loadSectionIcons === 'function') {
      window.loadSectionIcons(false);
    }
  }

  function renderThumb(item) {
    const image = item.image ? String(item.image).split('?')[0] : '';
    const title = escapeHtml(item.title);

    if (image) {
      return `<img class="cart-item-thumb" src="${escapeHtml(image)}?t=${Date.now()}" alt="${title}">`;
    }

    const sectionId = item.sectionId || 'supplements';
    const gradient = escapeHtml(item.gradient || DEFAULT_GRADIENTS[sectionId] || DEFAULT_GRADIENTS.supplements);
    const label = escapeHtml(item.placeholder_text || item.title || '?');

    return `<div class="cart-item-thumb cart-item-thumb--placeholder" style="background:${gradient}"><span>${label}</span></div>`;
  }

  function renderPrice(item) {
    const price = formatPrice(item.price_usd);
    if (item.compare_price_usd != null && item.compare_price_usd > item.price_usd) {
      return `<span class="cart-item-price"><s>${formatPrice(item.compare_price_usd)}</s> ${price}</span>`;
    }
    return `<span class="cart-item-price">${price}</span>`;
  }

  function renderStats(items) {
    if (!statsEl) return;

    const counts = {
      supplements: 0,
      clothing: 0
    };

    items.forEach((item) => {
      const qty = Number(item.quantity) || 1;
      if (Object.prototype.hasOwnProperty.call(counts, item.sectionId)) {
        counts[item.sectionId] += qty;
      }
    });

    statsEl.innerHTML = `
      <article class="cart-stat">
        ${renderSectionIcon('supplements', { className: 'cart-stat-icon stat-icon', size: 48 })}
        <div>
          <span class="cart-stat-value">${counts.supplements}</span>
          <span class="cart-stat-label">Фитнес-индустрия</span>
        </div>
      </article>
      <article class="cart-stat">
        ${renderSectionIcon('clothing', { className: 'cart-stat-icon stat-icon', size: 48 })}
        <div>
          <span class="cart-stat-value">${counts.clothing}</span>
          <span class="cart-stat-label">Одежда</span>
        </div>
      </article>
    `;

    statsEl.hidden = !items.length;
    applySectionIcons();
  }

  function renderCount(items) {
    if (!countEl) return;

    const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

    if (!total) {
      countEl.hidden = true;
      countEl.textContent = '';
      return;
    }

    const label = total === 1 ? '1 товар' : total < 5 ? `${total} товара` : `${total} товаров`;
    countEl.textContent = label;
    countEl.hidden = false;
  }

  function render() {
    const items = window.SiteCart.getItems();

    renderStats(items);
    renderCount(items);

    if (!items.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    listEl.innerHTML = items.map((item) => {
      const sectionId = item.sectionId || 'supplements';
      const productUrl = window.SiteCart.getProductUrl(item);

      return `
        <li class="cart-item cart-item--${escapeHtml(sectionId)}" data-cart-key="${escapeHtml(item.key)}">
          <a href="${escapeHtml(productUrl)}" class="cart-item-media">${renderThumb(item)}</a>
          <div class="cart-item-body">
            <div class="cart-item-head">
              <span class="cart-item-section">${escapeHtml(getSectionLabel(sectionId))}</span>
            </div>
            <a href="${escapeHtml(productUrl)}" class="cart-item-title">${escapeHtml(item.title)}</a>
            ${renderPrice(item)}
            <div class="cart-item-controls">
              <label class="cart-item-chip">
                <span>Кол-во</span>
                <input type="number" min="1" max="99" value="${item.quantity}" data-qty-input="${escapeHtml(item.key)}">
              </label>
              <a href="${escapeHtml(productUrl)}" class="cart-item-action">Оформить</a>
              <button type="button" class="cart-item-action cart-item-action--danger" data-remove-key="${escapeHtml(item.key)}">Убрать</button>
            </div>
          </div>
        </li>
      `;
    }).join('');
  }

  listEl.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('[data-remove-key]');
    if (removeBtn) {
      window.SiteCart.removeItem(removeBtn.dataset.removeKey);
      render();
    }
  });

  listEl.addEventListener('change', (event) => {
    const input = event.target.closest('[data-qty-input]');
    if (!input) return;
    window.SiteCart.updateQuantity(input.dataset.qtyInput, input.value);
    render();
  });

  window.addEventListener('site-cart-changed', render);
  render();
})();
