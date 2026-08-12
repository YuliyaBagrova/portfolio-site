(function initSiteUserMenu() {
  const NOTICE_KEY = 'site_register_notice_dismissed';
  const headerBtn = document.getElementById('siteUserHeaderBtn');
  const menu = document.getElementById('siteUserMenu');
  const menuNotice = document.getElementById('siteUserMenuNotice');
  const menuNoticeClose = document.getElementById('siteUserMenuNoticeClose');
  const menuNoticeRegister = document.getElementById('siteUserMenuNoticeRegister');
  const menuProfile = document.getElementById('siteUserMenuProfile');
  const menuRegisterBtn = document.getElementById('siteUserMenuRegister');
  const menuLoginBtn = document.getElementById('siteUserMenuLogin');
  const menuLogoutBtn = document.getElementById('siteUserMenuLogout');
  const menuLogoutDivider = document.getElementById('siteUserMenuLogoutDivider');
  const menuCartBadge = document.getElementById('siteUserMenuCartBadge');
  const floatingNotice = document.getElementById('siteUserRegisterNotice');
  const floatingNoticeClose = document.getElementById('siteUserRegisterNoticeClose');
  const floatingNoticeAction = document.getElementById('siteUserRegisterNoticeAction');

  if (!headerBtn || !menu) return;

  const menuEls = {
    avatar: document.getElementById('siteUserMenuAvatar'),
    avatarImg: document.getElementById('siteUserMenuAvatarImg'),
    avatarInitials: document.getElementById('siteUserMenuAvatarInitials'),
    name: document.getElementById('siteUserMenuName'),
    email: document.getElementById('siteUserMenuEmail'),
    badge: document.getElementById('siteUserMenuBadge'),
    register: document.getElementById('siteUserMenuRegister'),
    login: menuLoginBtn,
    logout: menuLogoutBtn,
    logoutDivider: menuLogoutDivider,
    cartBadge: menuCartBadge
  };

  function updateCartBadge() {
    const count = typeof window.SiteCart?.getCount === 'function' ? window.SiteCart.getCount() : 0;
    if (!menuEls.cartBadge) return;
    menuEls.cartBadge.textContent = String(count);
    menuEls.cartBadge.hidden = count <= 0;
  }

  function isNoticeDismissed() {
    return localStorage.getItem(NOTICE_KEY) === '1';
  }

  function dismissNotice() {
    localStorage.setItem(NOTICE_KEY, '1');
    if (menuNotice) menuNotice.hidden = true;
    if (floatingNotice) floatingNotice.hidden = true;
  }

  function getProfile() {
    return typeof window.getSiteSessionUser === 'function'
      ? window.getSiteSessionUser()
      : null;
  }

  function isDemoUser(profile) {
    if (!profile) return true;
    if (profile.isDemo) return true;
    return typeof window.isRealSiteUser === 'function' && !window.isRealSiteUser(profile);
  }

  function renderMenuAvatar(profile) {
    const initials = profile?.avatarInitials || 'CL';
    const avatarUrl = profile?.avatarUrl || null;
    const hasImage = Boolean(avatarUrl);

    if (menuEls.avatarImg) {
      if (hasImage) {
        menuEls.avatarImg.src = avatarUrl;
        menuEls.avatarImg.hidden = false;
      } else {
        menuEls.avatarImg.removeAttribute('src');
        menuEls.avatarImg.hidden = true;
      }
    }
    if (menuEls.avatarInitials) {
      menuEls.avatarInitials.textContent = initials;
      menuEls.avatarInitials.hidden = hasImage;
    }
    if (menuEls.avatar) {
      menuEls.avatar.dataset.hasImage = hasImage ? 'true' : 'false';
    }
  }

  function renderMenu(profileArg) {
    const profile = profileArg === undefined ? getProfile() : profileArg;
    const demo = isDemoUser(profile);
    const showLogout = isGateUnlocked();

    renderMenuAvatar(profile || { avatarInitials: 'CL' });

    if (menuEls.name) {
      menuEls.name.textContent = profile?.name || (demo ? 'Гость' : 'Клиент');
    }
    if (menuEls.email) {
      menuEls.email.textContent = profile?.email || (demo ? 'Без регистрации' : '—');
    }
    if (menuEls.badge) {
      menuEls.badge.textContent = demo ? 'Demo' : 'Клиент';
      menuEls.badge.dataset.variant = demo ? 'demo' : 'verified';
    }
    if (menuEls.register) {
      menuEls.register.hidden = !demo;
    }
    if (menuEls.login) {
      menuEls.login.hidden = !demo;
    }
    if (menuEls.logoutDivider) {
      menuEls.logoutDivider.hidden = !showLogout;
    }
    if (menuEls.logout) {
      menuEls.logout.hidden = !showLogout;
    }

    updateCartBadge();

    const showNotice = demo && !isNoticeDismissed();
    if (menuNotice) menuNotice.hidden = !showNotice;
    updateFloatingNotice();
  }

  function updateFloatingNotice() {
    if (!floatingNotice) return;

    const gateUnlocked = typeof window.isSiteGateUnlocked !== 'function' || window.isSiteGateUnlocked();
    const demo = isDemoUser(getProfile());
    const shouldShow = gateUnlocked && demo && !isNoticeDismissed() && !isMenuOpen();

    floatingNotice.hidden = !shouldShow;
    floatingNotice.classList.toggle('is-visible', shouldShow);
  }

  function isMenuOpen() {
    return menu && !menu.hidden;
  }

  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.classList.remove('is-visible');
    menu.hidden = true;
    headerBtn.setAttribute('aria-expanded', 'false');
    headerBtn.classList.remove('is-menu-open');
    document.body.classList.remove('site-user-menu-open');
    updateFloatingNotice();
  }

  function openMenu() {
    if (typeof window.isSiteGateUnlocked === 'function' && !window.isSiteGateUnlocked()) {
      window.showSiteUserGateIfNeeded?.();
      return;
    }

    renderMenu(getProfile());
    menu.hidden = false;
    headerBtn.setAttribute('aria-expanded', 'true');
    headerBtn.classList.add('is-menu-open');
    document.body.classList.add('site-user-menu-open');
    updateFloatingNotice();
    requestAnimationFrame(() => menu.classList.add('is-visible'));
  }

  function toggleMenu() {
    if (isMenuOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  function openLoginFlow() {
    closeMenu();
    if (isGateUnlocked()) {
      window.showSiteUserLoginOverlay?.();
      return;
    }
    window.showSiteUserGateIfNeeded?.();
    setTimeout(() => {
      window.showSiteUserLoginOverlay?.();
    }, 0);
  }

  function isGateUnlocked() {
    return typeof window.isSiteGateUnlocked === 'function' && window.isSiteGateUnlocked();
  }

  function openRegisterFlow() {
    closeMenu();
    if (isGateUnlocked()) {
      window.showSiteUserRegisterOverlay?.();
      return;
    }
    window.showSiteUserGateIfNeeded?.();
    setTimeout(() => {
      document.getElementById('siteUserChooseRegister')?.click();
    }, 0);
  }

  function openProfileFlow() {
    closeMenu();
    window.openSiteUserProfile?.();
  }

  function logoutFlow() {
    closeMenu();
    if (typeof window.logoutSiteUser === 'function') {
      window.logoutSiteUser();
    } else {
      window.clearSiteSessionUser?.();
      window.lockSiteGate?.();
      window.returnToSiteWelcomeGate?.() || window.showSiteUserGateIfNeeded?.();
    }
    window.showAdminToast?.('Вы вышли из аккаунта');
  }

  headerBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMenu();
  });

  menuProfile?.addEventListener('click', (event) => {
    event.preventDefault();
    openProfileFlow();
  });

  menuRegisterBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    openRegisterFlow();
  });

  menuLoginBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    openLoginFlow();
  });

  menuLogoutBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    logoutFlow();
  });

  document.getElementById('siteUserMenuCart')?.addEventListener('click', () => {
    closeMenu();
  });

  document.getElementById('siteUserMenuOrders')?.addEventListener('click', () => {
    closeMenu();
  });

  menuNoticeClose?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissNotice();
  });

  menuNoticeRegister?.addEventListener('click', (event) => {
    event.preventDefault();
    openRegisterFlow();
  });

  floatingNoticeClose?.addEventListener('click', (event) => {
    event.preventDefault();
    dismissNotice();
  });

  floatingNoticeAction?.addEventListener('click', (event) => {
    event.preventDefault();
    openRegisterFlow();
  });

  document.addEventListener('click', (event) => {
    if (!isMenuOpen()) return;
    if (event.target.closest('.site-user-header-wrap')) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('site-user-session-changed', () => {
    renderMenu(getProfile());
    updateFloatingNotice();
  });

  window.addEventListener('site-cart-changed', updateCartBadge);

  window.refreshSiteUserMenu = function refreshSiteUserMenu(profileArg) {
    renderMenu(profileArg === undefined ? getProfile() : profileArg);
  };
  window.closeSiteUserMenu = closeMenu;

  if (typeof window.isSiteGateUnlocked === 'function' && window.isSiteGateUnlocked()) {
    renderMenu(getProfile());
    updateFloatingNotice();
  }
})();
