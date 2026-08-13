(function initSiteOrders() {
  const STORAGE_PREFIX = 'portfolio_orders_v1__';
  const EMAIL_PREFIX = 'portfolio_customer_email__';

  const SECTION_LABELS = {
    supplements: 'Фитнес-индустрия',
    clothing: 'Одежда',
    banners: 'Мои баннеры'
  };

  const BANNER_CATEGORY_LABELS = {
    preview: 'Превью',
    illustrations: 'Иллюстрации',
    logos: 'Логотипы',
    pictures: 'Картинки'
  };

  function getScopeKey() {
    if (typeof window.getSiteOrderScopeKey === 'function') {
      return window.getSiteOrderScopeKey();
    }
    if (typeof window.isSiteDemoClientMode === 'function' && window.isSiteDemoClientMode()) {
      return 'demo:shared';
    }
    return typeof window.getSiteDataScopeKey === 'function'
      ? window.getSiteDataScopeKey()
      : 'guest';
  }

  function getStorageKey() {
    return `${STORAGE_PREFIX}${getScopeKey()}`;
  }

  function getEmailStorageKey() {
    return `${EMAIL_PREFIX}${getScopeKey()}`;
  }

  function readOrders() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeOrders(orders) {
    localStorage.setItem(getStorageKey(), JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('site-orders-changed'));
  }

  function rememberCustomerEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return;
    localStorage.setItem(getEmailStorageKey(), normalized);
  }

  function getCustomerEmail() {
    const ctx = typeof window.getSiteOrderContext === 'function'
      ? window.getSiteOrderContext()
      : null;

    if (ctx?.email) return ctx.email;

    const stored = localStorage.getItem(getEmailStorageKey());
    if (stored) return stored;

    const fromOrders = readOrders().find((order) => order.email)?.email;
    if (fromOrders) {
      rememberCustomerEmail(fromOrders);
      return String(fromOrders).trim().toLowerCase();
    }

    return '';
  }

  function addOrder(entry) {
    const ctx = typeof window.getSiteOrderContext === 'function'
      ? window.getSiteOrderContext()
      : { is_demo: 0, site_user_id: null };

    const order = {
      id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: entry.type || 'work',
      sectionId: entry.sectionId || 'supplements',
      workId: entry.workId != null ? Number(entry.workId) : null,
      title: String(entry.title || 'Заказ').trim() || 'Заказ',
      customer_name: String(entry.customer_name || '').trim(),
      email: String(entry.email || '').trim(),
      phone: entry.phone ? String(entry.phone).trim() : '',
      quantity: entry.quantity != null ? Number(entry.quantity) : null,
      message: entry.message ? String(entry.message).trim() : '',
      category: entry.category ? String(entry.category).trim() : '',
      createdAt: entry.createdAt || new Date().toISOString(),
      serverOrderId: entry.serverOrderId != null ? Number(entry.serverOrderId) : null,
      is_demo: entry.is_demo != null ? Number(entry.is_demo) : ctx.is_demo,
      site_user_id: entry.site_user_id != null ? entry.site_user_id : ctx.site_user_id,
      client_scope: entry.client_scope || (typeof window.getSiteOrderScopeKey === 'function'
        ? window.getSiteOrderScopeKey()
        : (typeof window.getSiteDataScopeKey === 'function' ? window.getSiteDataScopeKey() : 'guest'))
    };

    rememberCustomerEmail(order.email);

    const orders = readOrders();
    orders.unshift(order);
    writeOrders(orders.slice(0, 100));
    return order;
  }

  function getOrders() {
    return readOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getSectionLabel(sectionId) {
    return SECTION_LABELS[sectionId] || sectionId || 'Заказ';
  }

  function getBannerCategoryLabel(category) {
    if (!category) return 'Без категории';
    return BANNER_CATEGORY_LABELS[category] || category;
  }

  async function fetchServerOrders() {
    const params = typeof window.getSiteOrderQueryParams === 'function'
      ? window.getSiteOrderQueryParams()
      : { is_demo: '0' };
    const query = new URLSearchParams(params);
    const response = await fetch(`/api/site/orders?${query}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Не удалось загрузить заказы');
    }

    return Array.isArray(payload) ? payload : [];
  }

  window.SiteOrders = {
    addOrder,
    getOrders,
    getSectionLabel,
    getBannerCategoryLabel,
    getCustomerEmail,
    rememberCustomerEmail,
    fetchServerOrders
  };
})();
