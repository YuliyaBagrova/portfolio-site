(function initOrdersPage() {
  const listEl = document.getElementById('ordersList');
  const emptyEl = document.getElementById('ordersEmpty');
  const loadingEl = document.getElementById('ordersLoading');
  const errorEl = document.getElementById('ordersError');
  const statsEl = document.getElementById('ordersStats');
  const countEl = document.getElementById('ordersCount');
  const pageDescEl = document.getElementById('ordersPageDesc');

  if (!listEl || !emptyEl || !window.SiteOrders) return;

  const SECTION_ICON_DEFAULTS = {
    supplements: 'assets/icons/fitness-industry.png',
    banners: 'assets/icons/banners.png',
    clothing: 'assets/icons/clothing.png'
  };

  const DEFAULT_GRADIENTS = {
    supplements: 'linear-gradient(145deg, #ea580c 0%, #9a3412 55%, #1c1410 100%)',
    clothing: 'linear-gradient(160deg, #6b5b73 0%, #a8929f 100%)'
  };

  function updateOrdersPageCopy() {
    const ctx = typeof window.getSiteOrderContext === 'function'
      ? window.getSiteOrderContext()
      : null;

    if (!pageDescEl) return;

    if (ctx?.isDemo) {
      pageDescEl.textContent = 'Ваши демо-заявки: они видны только в этом demo-сеансе и в панели администратора. Зарегистрированные клиенты их не видят.';
      return;
    }

    if (ctx?.email || ctx?.site_user_id) {
      pageDescEl.textContent = 'Ваши заявки как зарегистрированного клиента. Демо-заявки других посетителей здесь не отображаются.';
      return;
    }

    pageDescEl.textContent = 'Войдите или пройдите demo-доступ на главной, чтобы увидеть свои заявки.';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function formatDate(value) {
    return new Date(value).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getSectionId(order) {
    if (order.order_type === 'banner') return 'banners';
    return order.section_id || order.sectionId || 'supplements';
  }

  function getOrderTitle(order) {
    if (order.work_title) return order.work_title;
    if (order.title) return order.title;
    if (order.order_type === 'banner') {
      return order.category_label
        ? `Заявка: ${order.category_label}`
        : 'Заявка на работу';
    }
    return 'Заказ';
  }

  function getOrderSubtitle(order) {
    if (order.order_type === 'banner') {
      const parts = [window.SiteOrders.getBannerCategoryLabel(order.category)];
      if (order.message) parts.push(order.message);
      return parts.filter(Boolean).join(' · ');
    }

    const parts = [];
    if (order.quantity != null) parts.push(`Кол-во: ${order.quantity}`);
    if (order.message) parts.push(order.message);
    return parts.join(' · ') || 'Заявка на товар';
  }

  function isProductOrder(order) {
    if (order.order_type === 'banner' || order.type === 'banner') return false;
    if (order.order_type === 'product') return true;
    if (order.work_id != null || order.workId != null) return true;
    const sectionId = order.section_id || order.sectionId;
    return sectionId === 'supplements' || sectionId === 'clothing';
  }

  function getOrderIdentity(order) {
    if (order.serverOrderId != null) {
      return `${order.type === 'banner' || order.order_type === 'banner' ? 'banner' : 'product'}:${order.serverOrderId}`;
    }
    if (order.id != null && (order.order_type || order.created_at)) {
      return `${order.order_type || 'product'}:${order.id}`;
    }
    return `local:${order.id || order.createdAt || ''}`;
  }

  function normalizeLocalOrder(order) {
    if (!order) return null;
    if (order.order_type) return order;

    const isBanner = order.type === 'banner' || order.sectionId === 'banners';
    return {
      order_type: isBanner ? 'banner' : 'product',
      id: order.serverOrderId || order.id,
      work_id: order.workId != null ? order.workId : order.work_id,
      work_title: order.title || order.work_title,
      section_id: order.sectionId || order.section_id || (isBanner ? 'banners' : 'supplements'),
      category: order.category || null,
      category_label: order.category_label || null,
      customer_name: order.customer_name,
      email: order.email,
      phone: order.phone || '',
      quantity: order.quantity != null ? Number(order.quantity) : null,
      message: order.message || '',
      created_at: order.created_at || order.createdAt,
      is_demo: order.is_demo != null ? order.is_demo : 1,
      site_user_id: order.site_user_id ?? null,
      client_scope: order.client_scope || 'demo:shared',
      image: order.image || null
    };
  }

  function mergeOrderLists(serverOrders, localOrders) {
    const merged = [];
    const seen = new Set();

    [...(Array.isArray(serverOrders) ? serverOrders : []), ...(Array.isArray(localOrders) ? localOrders : [])]
      .map((order) => normalizeLocalOrder(order))
      .filter(Boolean)
      .forEach((order) => {
        const key = getOrderIdentity(order);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(order);
      });

    return merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function getProductImageUrl(order) {
    if (!order.image) return '';
    return String(order.image).split('?')[0];
  }

  async function enrichOrdersWithImages(orders) {
    const productOrders = orders.filter((order) => isProductOrder(order) && !getProductImageUrl(order) && order.work_id);
    if (!productOrders.length) return orders;

    const workIds = [...new Set(productOrders.map((order) => order.work_id))];
    const workMap = new Map();

    await Promise.all(workIds.map(async (workId) => {
      try {
        const response = await fetch(`/api/works/${workId}`);
        if (!response.ok) return;
        const work = await response.json();
        workMap.set(workId, work);
      } catch {
        // ignore single work fetch errors
      }
    }));

    if (!workMap.size) return orders;

    return orders.map((order) => {
      if (!isProductOrder(order) || getProductImageUrl(order) || !order.work_id) {
        return order;
      }

      const work = workMap.get(order.work_id);
      if (!work) return order;

      return {
        ...order,
        image: work.image ? String(work.image).split('?')[0] : order.image,
        gradient: work.gradient || order.gradient,
        placeholder_text: work.placeholder_text || order.placeholder_text || order.work_title
      };
    });
  }

  function renderSectionIcon(sectionId, { className = 'orders-section-icon', size = 48 } = {}) {
    const label = window.SiteOrders.getSectionLabel(sectionId);
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

  function renderProductMedia(order, sectionId) {
    const image = getProductImageUrl(order);
    const title = escapeHtml(getOrderTitle(order));

    if (image) {
      return `<img class="orders-item-thumb" src="${escapeHtml(image)}?t=${Date.now()}" alt="${title}">`;
    }

    const gradient = escapeHtml(order.gradient || DEFAULT_GRADIENTS[sectionId] || DEFAULT_GRADIENTS.supplements);
    const placeholder = escapeHtml(order.placeholder_text || order.work_title || getOrderTitle(order));

    return `
      <div class="orders-item-thumb orders-item-thumb--placeholder" style="background:${gradient}">
        <span>${placeholder}</span>
      </div>
    `;
  }

  function renderOrderMedia(order, sectionId) {
    if (isProductOrder(order)) {
      return renderProductMedia(order, sectionId);
    }

    return renderSectionIcon(sectionId, {
      className: 'orders-item-icon stat-icon',
      size: 64
    });
  }

  function setLoading(isLoading) {
    if (loadingEl) loadingEl.hidden = !isLoading;
  }

  function setError(message) {
    if (!errorEl) return;
    errorEl.hidden = !message;
    errorEl.textContent = message || '';
  }

  function applySectionIcons() {
    if (typeof window.loadSectionIcons === 'function') {
      window.loadSectionIcons(false);
    }
  }

  function renderStats(orders) {
    if (!statsEl) return;

    const counts = {
      supplements: 0,
      banners: 0,
      clothing: 0
    };

    orders.forEach((order) => {
      const sectionId = getSectionId(order);
      if (Object.prototype.hasOwnProperty.call(counts, sectionId)) {
        counts[sectionId] += 1;
      }
    });

    statsEl.innerHTML = `
      <article class="orders-stat">
        ${renderSectionIcon('supplements', { className: 'orders-stat-icon stat-icon', size: 48 })}
        <div>
          <span class="orders-stat-value">${counts.supplements}</span>
          <span class="orders-stat-label">Фитнес-индустрия</span>
        </div>
      </article>
      <article class="orders-stat">
        ${renderSectionIcon('banners', { className: 'orders-stat-icon stat-icon', size: 48 })}
        <div>
          <span class="orders-stat-value">${counts.banners}</span>
          <span class="orders-stat-label">Мои баннеры</span>
        </div>
      </article>
      <article class="orders-stat">
        ${renderSectionIcon('clothing', { className: 'orders-stat-icon stat-icon', size: 48 })}
        <div>
          <span class="orders-stat-value">${counts.clothing}</span>
          <span class="orders-stat-label">Одежда</span>
        </div>
      </article>
    `;

    statsEl.hidden = !orders.length;
    applySectionIcons();
  }

  function renderCount(total) {
    if (!countEl) return;

    if (!total) {
      countEl.hidden = true;
      countEl.textContent = '';
      return;
    }

    const label = total === 1 ? '1 заявка' : total < 5 ? `${total} заявки` : `${total} заявок`;
    countEl.textContent = label;
    countEl.hidden = false;
  }

  function renderOrders(orders) {
    renderStats(orders);
    renderCount(orders.length);

    if (!orders.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    listEl.innerHTML = orders.map((order) => {
      const sectionId = getSectionId(order);
      const createdAt = order.created_at || order.createdAt;

      return `
        <li class="orders-item orders-item--${escapeHtml(sectionId)}">
          <div class="orders-item-media">
            ${renderOrderMedia(order, sectionId)}
          </div>
          <div class="orders-item-body">
            <div class="orders-item-head">
              <span class="orders-item-section">${escapeHtml(window.SiteOrders.getSectionLabel(sectionId))}</span>
              <time datetime="${escapeHtml(createdAt)}">${formatDate(createdAt)}</time>
            </div>
            <strong class="orders-item-title">${escapeHtml(getOrderTitle(order))}</strong>
            <p class="orders-item-subtitle">${escapeHtml(getOrderSubtitle(order))}</p>
            <div class="orders-item-meta">
              <span class="orders-item-chip"><strong>Имя:</strong> ${escapeHtml(order.customer_name || '—')}</span>
              ${order.phone ? `<span class="orders-item-chip"><strong>Телефон:</strong> ${escapeHtml(order.phone)}</span>` : ''}
            </div>
          </div>
        </li>
      `;
    }).join('');

    applySectionIcons();
  }

  function filterOrdersForSession(orders) {
    const list = Array.isArray(orders) ? orders : [];
    const profile = typeof window.getSiteSessionUser === 'function'
      ? window.getSiteSessionUser()
      : null;
    const isRegistered = Boolean(
      profile
      && !profile.isDemo
      && (typeof window.isRealSiteUser !== 'function' || window.isRealSiteUser(profile))
    );

    if (!isRegistered) {
      return list;
    }

    const belongsToUser = typeof window.belongsToRegisteredSiteOrder === 'function'
      ? window.belongsToRegisteredSiteOrder
      : () => false;

    return list.filter((order) => belongsToUser(order));
  }

  async function loadOrders() {
    setError('');
    setLoading(true);
    emptyEl.hidden = true;
    listEl.innerHTML = '';
    updateOrdersPageCopy();

    try {
      const serverOrders = await window.SiteOrders.fetchServerOrders();
      const localOrders = typeof window.SiteOrders.getOrders === 'function'
        ? window.SiteOrders.getOrders()
        : [];
      const merged = mergeOrderLists(serverOrders, localOrders);
      const orders = filterOrdersForSession(merged);
      const enrichedOrders = await enrichOrdersWithImages(orders);
      renderOrders(enrichedOrders);
    } catch (error) {
      try {
        const localOrders = typeof window.SiteOrders.getOrders === 'function'
          ? window.SiteOrders.getOrders()
          : [];
        const fallback = filterOrdersForSession(localOrders);
        if (fallback.length) {
          setError('');
          renderOrders(await enrichOrdersWithImages(fallback));
          return;
        }
      } catch {
        // keep original error
      }
      listEl.innerHTML = '';
      emptyEl.hidden = true;
      if (statsEl) statsEl.hidden = true;
      renderCount(0);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  loadOrders();
})();
