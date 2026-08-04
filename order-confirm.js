(function initOrderConfirm() {
  let overlay = null;
  let activeResolve = null;
  let activeTheme = 'default';

  const BANNER_CATEGORY_LABELS = {
    preview: 'Превью',
    illustrations: 'Иллюстрации',
    logos: 'Логотипы',
    pictures: 'Картинки'
  };

  const THEME_META = {
    supplements: {
      eyebrow: 'Sports Nutrition',
      submitLabel: 'Да, отправить заявку'
    },
    clothing: {
      eyebrow: 'Fashion · Order',
      submitLabel: 'Да, отправить заявку'
    },
    banners: {
      eyebrow: 'Visual Collection',
      submitLabel: 'Да, отправить'
    },
    default: {
      eyebrow: 'Order Review',
      submitLabel: 'Да, отправить'
    }
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function formatOptional(value, fallback = '—') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function detectTheme() {
    if (document.body.classList.contains('banners-order-page')) return 'banners';
    if (document.body.classList.contains('clothing-product-page')) return 'clothing';
    if (document.body.classList.contains('product-page')) return 'supplements';
    return 'default';
  }

  function buildProductOrderFields(formData) {
    return [
      { label: 'Имя', value: formData.get('customer_name') },
      { label: 'Email', value: formData.get('email') },
      { label: 'Телефон', value: formatOptional(formData.get('phone')) },
      { label: 'Количество', value: `${formData.get('quantity')} шт.` },
      { label: 'Комментарий', value: formatOptional(formData.get('message')) }
    ];
  }

  function buildBannerOrderFields(formData) {
    const category = String(formData.get('category') || '').trim();

    return [
      { label: 'Имя', value: formData.get('customer_name') },
      { label: 'Email', value: formData.get('email') },
      { label: 'Телефон', value: formatOptional(formData.get('phone')) },
      {
        label: 'Категория',
        value: category ? (BANNER_CATEGORY_LABELS[category] || category) : 'Без категории'
      },
      { label: 'Описание работы', value: formData.get('message') }
    ];
  }

  function closeModal(result) {
    if (!overlay) return;

    overlay.hidden = true;
    document.body.classList.remove('order-confirm-open');
    document.body.classList.remove(`order-confirm-open--${activeTheme}`);

    if (activeResolve) {
      activeResolve(result);
      activeResolve = null;
    }
  }

  function applyTheme(modal, theme) {
    activeTheme = theme;
    modal.className = `order-confirm-overlay order-confirm-overlay--${theme}`;

    const meta = THEME_META[theme] || THEME_META.default;
    const eyebrowEl = modal.querySelector('#orderConfirmEyebrow');
    const submitBtn = modal.querySelector('[data-order-confirm-submit]');

    if (eyebrowEl) eyebrowEl.textContent = meta.eyebrow;
    if (submitBtn) submitBtn.textContent = meta.submitLabel;
  }

  function ensureModal() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'order-confirm-overlay order-confirm-overlay--default';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="order-confirm-backdrop" aria-hidden="true"></div>
      <div class="order-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="orderConfirmTitle">
        <div class="order-confirm-modal-frame" aria-hidden="true"></div>
        <div class="order-confirm-heading">
          <span class="order-confirm-eyebrow" id="orderConfirmEyebrow"></span>
          <h2 class="order-confirm-title" id="orderConfirmTitle"></h2>
          <p class="order-confirm-desc" id="orderConfirmDesc"></p>
        </div>
        <dl class="order-confirm-summary" id="orderConfirmSummary"></dl>
        <p class="order-confirm-question">Вы указали все данные верно?</p>
        <div class="order-confirm-actions">
          <button type="button" class="order-confirm-btn order-confirm-btn--ghost" data-order-confirm-cancel>Вернуться к форме</button>
          <button type="button" class="order-confirm-btn order-confirm-btn--primary" data-order-confirm-submit>Да, отправить</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.classList.contains('order-confirm-backdrop')) {
        closeModal(false);
      }
    });

    overlay.querySelector('[data-order-confirm-cancel]')?.addEventListener('click', () => {
      closeModal(false);
    });

    overlay.querySelector('[data-order-confirm-submit]')?.addEventListener('click', () => {
      closeModal(true);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && overlay && !overlay.hidden) {
        closeModal(false);
      }
    });

    return overlay;
  }

  function confirmOrderSubmission({ title, description, fields, theme }) {
    return new Promise((resolve) => {
      const modal = ensureModal();
      const resolvedTheme = theme || detectTheme();

      activeResolve = resolve;
      applyTheme(modal, resolvedTheme);

      modal.querySelector('#orderConfirmTitle').textContent = title || 'Проверьте данные';
      modal.querySelector('#orderConfirmDesc').textContent = description
        || 'Убедитесь, что контакты и детали заказа указаны верно.';

      const summaryEl = modal.querySelector('#orderConfirmSummary');
      summaryEl.innerHTML = (fields || []).map((field) => `
        <div class="order-confirm-row">
          <dt>${escapeHtml(field.label)}</dt>
          <dd>${escapeHtml(field.value ?? '—')}</dd>
        </div>
      `).join('');

      modal.hidden = false;
      document.body.classList.add('order-confirm-open');
      document.body.classList.add(`order-confirm-open--${resolvedTheme}`);
      modal.querySelector('[data-order-confirm-submit]')?.focus();
    });
  }

  window.buildProductOrderFields = buildProductOrderFields;
  window.buildBannerOrderFields = buildBannerOrderFields;
  window.confirmOrderSubmission = confirmOrderSubmission;
})();
