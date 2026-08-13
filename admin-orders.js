(function initAdminOrdersPanel() {
  const listEl = document.getElementById('adminOrdersList');
  const emptyEl = document.getElementById('adminOrdersEmpty');
  const loadingEl = document.getElementById('adminOrdersLoading');
  const refreshBtn = document.getElementById('adminOrdersRefresh');
  const showAllBtn = document.getElementById('adminOrdersShowAll');
  const detailPlaceholder = document.getElementById('adminOrdersDetailPlaceholder');
  const detailContent = document.getElementById('adminOrdersDetailContent');

  if (!listEl || !detailContent) return;

  const VISIBLE_LIMIT = 4;
  const NEW_PRIORITY_LIMIT = 3;
  const NEW_ORDER_MAX_DAYS = 3;
  const NEW_ORDER_MAX_MS = NEW_ORDER_MAX_DAYS * 24 * 60 * 60 * 1000;
  const COMPLETE_COUNTDOWN_SEC = 5;

  let orders = [];
  let selectedKey = null;
  let isLoading = false;
  let showAllOrders = false;
  let pendingComplete = null;

  const SECTION_BADGES = {
    supplements: 'Добавки',
    banners: 'Баннеры',
    clothing: 'Одежда'
  };

  function getOrderSectionId(order) {
    if (order.order_type === 'banner') return 'banners';
    return order.section_id || 'supplements';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatShortDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function getOrderKey(order) {
    return `${order.order_type || 'product'}:${order.id}`;
  }

  function getSelectedOrder() {
    return orders.find((order) => getOrderKey(order) === selectedKey) || null;
  }

  function isOrderNew(order) {
    if (!order?.created_at) return false;

    const ageMs = Date.now() - new Date(order.created_at).getTime();
    return ageMs >= 0 && ageMs <= NEW_ORDER_MAX_MS;
  }

  function renderOrderListStatus(order) {
    const demoBadge = order.is_demo
      ? '<span class="admin-orders-item-status is-demo">Demo</span> · '
      : '';

    if (isOrderNew(order)) {
      return `${demoBadge}<span class="admin-orders-item-status is-new">Новый</span> · `;
    }

    return demoBadge;
  }

  function setLoading(state) {
    isLoading = state;
    if (loadingEl) loadingEl.hidden = !state;
    if (refreshBtn) refreshBtn.disabled = state;
  }

  function pickDefaultOrder() {
    if (!orders.length) {
      selectedKey = null;
      return;
    }

    const newestOrder = orders.find((order) => isOrderNew(order));
    selectedKey = getOrderKey(newestOrder || orders[0]);
  }

  function getVisibleOrders() {
    if (showAllOrders || orders.length <= VISIBLE_LIMIT) {
      return orders;
    }

    const visible = [];
    const visibleKeys = new Set();

    const addOrder = (order) => {
      if (!order) return;
      const key = getOrderKey(order);
      if (visibleKeys.has(key)) return;
      visible.push(order);
      visibleKeys.add(key);
    };

    orders
      .filter((order) => isOrderNew(order))
      .slice(0, NEW_PRIORITY_LIMIT)
      .forEach(addOrder);

    for (const order of orders) {
      if (visible.length >= VISIBLE_LIMIT) break;
      addOrder(order);
    }

    if (selectedKey && !visibleKeys.has(selectedKey)) {
      const selected = orders.find((order) => getOrderKey(order) === selectedKey);
      if (selected) {
        if (visible.length >= VISIBLE_LIMIT) {
          const removed = visible.pop();
          visibleKeys.delete(getOrderKey(removed));
        }
        addOrder(selected);
      }
    }

    return visible;
  }

  function updateShowAllButton() {
    if (!showAllBtn) return;

    const hasMore = orders.length > VISIBLE_LIMIT;
    showAllBtn.hidden = !hasMore;

    if (!hasMore) {
      showAllOrders = false;
      return;
    }

    showAllBtn.textContent = showAllOrders ? 'Свернуть' : 'Все заказы';
  }

  function cancelPendingComplete() {
    if (!pendingComplete) return;

    clearInterval(pendingComplete.intervalId);
    clearTimeout(pendingComplete.timeoutId);
    pendingComplete = null;
  }

  function isOrderPendingComplete(order) {
    return pendingComplete?.orderKey === getOrderKey(order);
  }

  function updateCompleteCountdownUI() {
    if (!pendingComplete || !detailContent) return;

    const countdownEl = detailContent.querySelector('[data-complete-countdown]');
    if (countdownEl) {
      countdownEl.textContent = String(Math.max(pendingComplete.secondsLeft, 0));
    }
  }

  function startPendingComplete(order) {
    cancelPendingComplete();

    const orderKey = getOrderKey(order);
    pendingComplete = {
      orderKey,
      secondsLeft: COMPLETE_COUNTDOWN_SEC,
      intervalId: null,
      timeoutId: null
    };

    pendingComplete.intervalId = setInterval(() => {
      if (!pendingComplete) return;
      pendingComplete.secondsLeft -= 1;
      updateCompleteCountdownUI();
    }, 1000);

    pendingComplete.timeoutId = setTimeout(() => {
      void finalizeCompleteOrder(order);
    }, COMPLETE_COUNTDOWN_SEC * 1000);

    renderDetailPanel();
  }

  async function finalizeCompleteOrder(order) {
    const orderKey = getOrderKey(order);
    cancelPendingComplete();

    const url = order.order_type === 'banner'
      ? `/api/admin/banner-orders/${order.id}`
      : `/api/admin/orders/${order.id}`;

    try {
      const response = await fetch(url, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось удалить заказ');
      }

      orders = orders.filter((item) => getOrderKey(item) !== orderKey);

      if (selectedKey === orderKey) {
        pickDefaultOrder();
      }

      renderOrdersList();
    } catch (error) {
      renderDetailPanel(error.message);
    }
  }

  function renderCompleteActions(order, errorMessage = '') {
    const isPending = isOrderPendingComplete(order);

    if (isPending) {
      return `
        <div class="admin-orders-complete-panel is-pending">
          <p class="admin-orders-complete-message">
            Заказ будет удалён через <span class="admin-orders-complete-countdown" data-complete-countdown>${pendingComplete.secondsLeft}</span> сек…
          </p>
          <div class="admin-orders-complete-actions">
            <button type="button" class="btn btn-ghost" data-complete-cancel>Отмена</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-orders-complete-panel">
        ${errorMessage ? `<p class="admin-orders-complete-error">${escapeHtml(errorMessage)}</p>` : ''}
        <div class="admin-orders-complete-actions">
          <button type="button" class="btn btn-primary" data-complete-start>Отметить как выполненный</button>
        </div>
      </div>
    `;
  }

  function bindDetailPanelEvents(order) {
    detailContent.querySelector('[data-complete-start]')?.addEventListener('click', () => {
      startPendingComplete(order);
    });

    detailContent.querySelector('[data-complete-cancel]')?.addEventListener('click', () => {
      cancelPendingComplete();
      renderDetailPanel();
    });
  }

  function renderDetailPanel(errorMessage = '') {
    const order = getSelectedOrder();

    if (!order) {
      detailPlaceholder.hidden = false;
      detailContent.hidden = true;
      detailContent.innerHTML = '';
      return;
    }

    const isBannerOrder = order.order_type === 'banner';
    const productRow = isBannerOrder
      ? `
        <div class="admin-orders-detail-row">
          <dt>Раздел</dt>
          <dd>Мои баннеры</dd>
        </div>
        <div class="admin-orders-detail-row">
          <dt>Категория</dt>
          <dd>${order.category_label ? escapeHtml(order.category_label) : 'Не указана'}</dd>
        </div>
      `
      : `
        <div class="admin-orders-detail-row">
          <dt>Товар</dt>
          <dd>
            <a href="/product.html?id=${order.work_id}" target="_blank" rel="noopener noreferrer" class="admin-orders-product">
              ${escapeHtml(order.work_title || `Товар #${order.work_id}`)}
            </a>
          </dd>
        </div>
        <div class="admin-orders-detail-row">
          <dt>Количество</dt>
          <dd>${order.quantity} шт.</dd>
        </div>
      `;

    detailPlaceholder.hidden = true;
    detailContent.hidden = false;
    detailContent.innerHTML = `
      <div class="admin-orders-detail-meta">
        <span class="admin-orders-detail-id">${isBannerOrder ? 'Заявка' : 'Заказ'} #${order.id}${order.is_demo ? ' · Demo' : ''}</span>
        <time datetime="${order.created_at}">${formatDate(order.created_at)}</time>
      </div>

      <dl class="admin-orders-detail-list">
        ${productRow}
        <div class="admin-orders-detail-row">
          <dt>${isBannerOrder ? 'Заказчик' : 'Покупатель'}</dt>
          <dd>${escapeHtml(order.customer_name)}</dd>
        </div>
        <div class="admin-orders-detail-row">
          <dt>Email</dt>
          <dd><a href="mailto:${escapeHtml(order.email)}">${escapeHtml(order.email)}</a></dd>
        </div>
        <div class="admin-orders-detail-row">
          <dt>Телефон</dt>
          <dd>${order.phone ? `<a href="tel:${escapeHtml(order.phone)}">${escapeHtml(order.phone)}</a>` : '—'}</dd>
        </div>
        <div class="admin-orders-detail-row">
          <dt>${isBannerOrder ? 'Описание работы' : 'Комментарий'}</dt>
          <dd>${order.message ? escapeHtml(order.message) : '—'}</dd>
        </div>
      </dl>

      ${renderCompleteActions(order, errorMessage)}
    `;

    bindDetailPanelEvents(order);
  }

  function renderOrdersList() {
    listEl.innerHTML = '';

    if (!orders.length) {
      emptyEl.hidden = false;
      renderDetailPanel();
      return;
    }

    emptyEl.hidden = true;
    updateShowAllButton();

    const visibleOrders = getVisibleOrders();

    listEl.innerHTML = visibleOrders.map((order) => {
      const orderKey = getOrderKey(order);
      const isActive = orderKey === selectedKey;
      const isBannerOrder = order.order_type === 'banner';
      const sectionId = getOrderSectionId(order);
      const preview = order.message
        ? escapeHtml(order.message.slice(0, 56) + (order.message.length > 56 ? '…' : ''))
        : (isBannerOrder ? 'Заявка на работу' : `${order.quantity} шт.`);
      const badgeLabel = SECTION_BADGES[sectionId] || 'Заказ';
      const titleSuffix = isBannerOrder
        ? (order.category_label || 'Мои баннеры')
        : (order.work_title || 'Товар');
      const statusPrefix = renderOrderListStatus(order);

      return `
        <li>
          <button type="button" class="admin-orders-item${isActive ? ' is-active' : ''}" data-order-key="${orderKey}">
            <span class="recent-badge ${sectionId}">${badgeLabel}</span>
            <span class="admin-orders-item-body">
              <span class="recent-title">${statusPrefix}${escapeHtml(order.customer_name)} · ${escapeHtml(titleSuffix)}</span>
              <span class="admin-orders-item-preview">${preview}</span>
            </span>
            <span class="recent-date">${formatShortDate(order.created_at)}</span>
          </button>
        </li>
      `;
    }).join('');

    listEl.querySelectorAll('.admin-orders-item').forEach((button) => {
      button.addEventListener('click', () => {
        const nextKey = button.dataset.orderKey;
        if (selectedKey !== nextKey) {
          cancelPendingComplete();
        }
        selectedKey = nextKey;
        renderOrdersList();
        renderDetailPanel();
      });
    });

    renderDetailPanel();
  }

  async function loadOrders() {
    if (isLoading) return;

    setLoading(true);
    emptyEl.hidden = true;

    try {
      const [productRes, bannerRes] = await Promise.all([
        fetch('/api/admin/orders'),
        fetch('/api/admin/banner-orders')
      ]);

      if (!productRes.ok) throw new Error('Не удалось загрузить заказы');
      if (!bannerRes.ok) throw new Error('Не удалось загрузить заявки на баннеры');

      const productOrders = await productRes.json();
      const bannerOrders = await bannerRes.json();

      orders = [...productOrders, ...bannerOrders].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      showAllOrders = false;
      cancelPendingComplete();

      if (!orders.some((order) => getOrderKey(order) === selectedKey)) {
        pickDefaultOrder();
      }

      renderOrdersList();
    } catch (error) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.textContent = error.message;
      selectedKey = null;
      renderDetailPanel();
    } finally {
      setLoading(false);
    }
  }

  refreshBtn?.addEventListener('click', loadOrders);

  showAllBtn?.addEventListener('click', () => {
    showAllOrders = !showAllOrders;
    renderOrdersList();
  });

  window.loadAdminOrders = loadOrders;
})();
