(function initSiteCart() {
  const STORAGE_PREFIX = 'portfolio_cart_v1__';
  const LEGACY_STORAGE_KEY = 'portfolio_cart_v1';
  const DEMO_SHARED_SCOPE = 'demo:shared';
  const MIGRATION_FLAG = 'portfolio_cart_demo_shared_migrated';

  function getScopeKey() {
    if (typeof window.getSiteCartScopeKey === 'function') {
      return window.getSiteCartScopeKey();
    }
    if (typeof window.isSiteDemoClientMode === 'function' && window.isSiteDemoClientMode()) {
      return DEMO_SHARED_SCOPE;
    }
    return typeof window.getSiteDataScopeKey === 'function'
      ? window.getSiteDataScopeKey()
      : 'guest';
  }

  function getStorageKey(scope = getScopeKey()) {
    return `${STORAGE_PREFIX}${scope}`;
  }

  function readRawCart(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function mergeCartItems(targetItems, sourceItems) {
    const merged = targetItems
      .map((item) => normalizeItem(item))
      .filter(Boolean);

    sourceItems.forEach((rawItem) => {
      const base = normalizeItem(rawItem);
      if (!base) return;

      const index = merged.findIndex((item) => item.key === base.key);
      if (index >= 0) {
        merged[index] = {
          ...merged[index],
          ...base,
          quantity: Math.min(99, Math.max(merged[index].quantity, base.quantity))
        };
      } else {
        merged.push(base);
      }
    });

    return merged;
  }

  function migrateLegacyDemoCart(sharedKey) {
    if (localStorage.getItem(MIGRATION_FLAG) === '1') return;

    let merged = readRawCart(sharedKey);
    const legacyItems = readRawCart(LEGACY_STORAGE_KEY);
    if (legacyItems.length) {
      merged = mergeCartItems([], legacyItems);
    }

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      if (key === sharedKey || key === `${STORAGE_PREFIX}guest`) continue;

      const scope = key.slice(STORAGE_PREFIX.length);
      if (!scope.startsWith('demo:') || scope === DEMO_SHARED_SCOPE) continue;

      merged = mergeCartItems(merged, readRawCart(key));
    }

    if (merged.length) {
      localStorage.setItem(sharedKey, JSON.stringify(merged));
    }

    localStorage.setItem(MIGRATION_FLAG, '1');
  }

  function readCart() {
    const scope = getScopeKey();
    const storageKey = getStorageKey(scope);

    if (scope === DEMO_SHARED_SCOPE) {
      migrateLegacyDemoCart(storageKey);
    }

    return readRawCart(storageKey);
  }

  const ALLOWED_SECTIONS = new Set(['supplements', 'clothing']);

  function writeCart(items) {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(items));
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
