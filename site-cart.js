(function initSiteCart() {
  const STORAGE_KEY = 'portfolio_cart_v1';
  const ALLOWED_SECTIONS = new Set(['supplements', 'clothing']);

  function readCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('site-cart-changed', { detail: { count: getCount() } }));
      return true;
    } catch (error) {
      console.error('Не удалось сохранить корзину:', error);
      return false;
    }
  }

  function itemKey(sectionId, workId) {
    return `${sectionId}:${workId}`;
  }

  function parseWorkId(raw) {
    const value = raw?.workId ?? raw?.id ?? raw?.work_id;
    const workId = Number.parseInt(String(value ?? ''), 10);
    return Number.isInteger(workId) && workId > 0 ? workId : null;
  }

  function parseSectionId(raw) {
    const sectionId = String(raw?.sectionId || raw?.section_id || '').trim();
    return ALLOWED_SECTIONS.has(sectionId) ? sectionId : null;
  }

  function normalizeItem(raw) {
    const workId = parseWorkId(raw);
    const sectionId = parseSectionId(raw);
    if (!workId || !sectionId) return null;

    const quantity = Math.max(1, Math.min(99, Number(raw.quantity) || 1));

    return {
      key: itemKey(sectionId, workId),
      workId,
      sectionId,
      title: String(raw.title || 'Товар').trim() || 'Товар',
      price_usd: raw.price_usd != null ? Number(raw.price_usd) : null,
      compare_price_usd: raw.compare_price_usd != null ? Number(raw.compare_price_usd) : null,
      image: raw.image ? String(raw.image).split('?')[0] : '',
      gradient: raw.gradient || '',
      placeholder_text: raw.placeholder_text || '',
      category: raw.category || '',
      quantity,
      addedAt: raw.addedAt || new Date().toISOString()
    };
  }

  function getItems() {
    return readCart()
      .map(normalizeItem)
      .filter(Boolean);
  }

  function getCount() {
    return getItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  function addItem(rawItem, quantity = 1) {
    const base = normalizeItem({ ...rawItem, quantity });
    if (!base) return false;

    const items = getItems();
    const index = items.findIndex((item) => item.key === base.key);

    if (index >= 0) {
      items[index].quantity = Math.min(99, items[index].quantity + base.quantity);
      items[index].title = base.title;
      items[index].price_usd = base.price_usd;
      items[index].compare_price_usd = base.compare_price_usd;
      items[index].image = base.image;
      items[index].gradient = base.gradient;
      items[index].placeholder_text = base.placeholder_text;
      items[index].category = base.category;
    } else {
      items.push(base);
    }

    return writeCart(items);
  }

  function updateQuantity(key, quantity) {
    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty < 1) return removeItem(key);

    const items = getItems();
    const index = items.findIndex((item) => item.key === key);
    if (index < 0) return false;

    items[index].quantity = Math.min(99, parsedQty);
    writeCart(items);
    return true;
  }

  function removeItem(key) {
    const items = getItems().filter((item) => item.key !== key);
    writeCart(items);
    return true;
  }

  function clearCart() {
    writeCart([]);
  }

  function getProductUrl(item) {
    const page = item.sectionId === 'clothing' ? '/clothing-product.html' : '/product.html';
    return `${page}?id=${item.workId}`;
  }

  window.SiteCart = {
    getItems,
    getCount,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getProductUrl
  };
})();
