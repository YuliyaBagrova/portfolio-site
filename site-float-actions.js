(function initSiteFloatActions() {
  if (document.body?.dataset?.adminPanel === 'true') return;

  const CART_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h2l2.4 12.4a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.76L21 7H6"/></svg>`;
  const ORDERS_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>`;
  function shouldShowFloatActions() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel && !adminPanel.hidden) return false;
    if (document.body.classList.contains('site-gate-open')) return false;
    return typeof window.isSiteGateUnlocked !== 'function' || window.isSiteGateUnlocked();
  }

  function updateBadge() {
    const badge = document.getElementById('siteFloatCartBadge');
    if (!badge || typeof window.SiteCart?.getCount !== 'function') return;

    const count = window.SiteCart.getCount();
    badge.textContent = String(count);
    badge.hidden = count <= 0;
  }

  function mount() {
    if (!shouldShowFloatActions()) {
      document.getElementById('siteFloatActions')?.remove();
      return;
    }

    if (document.getElementById('siteFloatActions')) return;

    const root = document.createElement('nav');
    root.className = 'site-float-actions';
    root.id = 'siteFloatActions';
    root.setAttribute('aria-label', 'Быстрые действия');
    root.innerHTML = `
      <a href="/cart.html" class="site-float-btn site-float-btn--cart" id="siteFloatCartBtn">
        <span class="site-float-btn-icon">${CART_ICON}</span>
        <span class="site-float-btn-label">Корзина</span>
        <span class="site-float-badge" id="siteFloatCartBadge" hidden>0</span>
      </a>
      <a href="/orders.html" class="site-float-btn site-float-btn--orders" id="siteFloatOrdersBtn">
        <span class="site-float-btn-icon">${ORDERS_ICON}</span>
        <span class="site-float-btn-label">Заказы</span>
      </a>
    `;

    document.body.appendChild(root);

    updateBadge();
  }

  window.addEventListener('site-cart-changed', updateBadge);
  window.addEventListener('site-user-session-changed', () => {
    mount();
    updateBadge();
  });

  document.addEventListener('DOMContentLoaded', mount);

  const adminPanel = document.getElementById('adminPanel');
  if (adminPanel) {
    new MutationObserver(mount).observe(adminPanel, {
      attributes: true,
      attributeFilter: ['hidden']
    });
  }

  if (document.readyState !== 'loading') {
    mount();
    updateBadge();
  }
})();
