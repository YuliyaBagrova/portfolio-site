(function initSiteOrders() {
  const STORAGE_KEY = 'portfolio_orders_v1';
  const EMAIL_STORAGE_KEY = 'portfolio_customer_email';

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

  function readOrders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeOrders(orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('site-orders-changed'));
  }

  function rememberCustomerEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return;
    localStorage.setItem(EMAIL_STORAGE_KEY, normalized);
  }

  function getCustomerEmail() {
    const stored = localStorage.getItem(EMAIL_STORAGE_KEY);
    if (stored) return stored;

    const fromOrders = readOrders().find((order) => order.email)?.email;
    if (fromOrders) {
      rememberCustomerEmail(fromOrders);
      return String(fromOrders).trim().toLowerCase();
    }

    return '';
  }

  function addOrder(entry) {
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
      serverOrderId: entry.serverOrderId != null ? Number(entry.serverOrderId) : null
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
    const response = await fetch('/api/site/orders');
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
