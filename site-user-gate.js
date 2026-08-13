(function initSiteUserGate() {

  const gate = document.getElementById('siteUserGate');

  const registerOverlay = document.getElementById('siteUserRegister');

  const loginOverlay = document.getElementById('siteUserLogin');

  const chooseRegisterBtn = document.getElementById('siteUserChooseRegister');

  const choosePreviewBtn = document.getElementById('siteUserChoosePreview');



  if (!gate) return;



  const overlays = [gate, registerOverlay, loginOverlay].filter(Boolean);



  function isAdminPanelOpen() {

    const adminPanel = document.getElementById('adminPanel');

    return adminPanel && !adminPanel.hidden;

  }



  function isGateUnlocked() {

    return typeof window.isSiteGateUnlocked === 'function' && window.isSiteGateUnlocked();

  }



  function setBodyLock(locked) {

    document.body.classList.toggle('site-gate-open', locked);

    document.body.style.overflow = locked ? 'hidden' : '';

  }



  function clearGatePendingClass() {

    document.documentElement.classList.remove('site-gate-pending');

  }



  function hideAllSiteUserOverlays() {

    overlays.forEach((overlay) => {

      overlay.hidden = true;

    });

    setBodyLock(false);

    clearGatePendingClass();

  }



  function closeAuthOverlay() {

    if (isGateUnlocked()) {

      hideAllSiteUserOverlays();

      return;

    }

    showOverlay(gate);

  }



  function showOverlay(overlay) {

    overlays.forEach((item) => {

      item.hidden = item !== overlay;

    });

    setBodyLock(true);

    clearGatePendingClass();

    if (overlay === registerOverlay && typeof window.resetSiteUserRegistration === 'function') {

      window.resetSiteUserRegistration();

    }

    if (overlay === loginOverlay && typeof window.resetSiteUserLogin === 'function') {

      window.resetSiteUserLogin();

    }

  }



  function showSiteUserAuthOverlay(mode) {

    if (mode === 'login') {

      showOverlay(loginOverlay);

      return;

    }

    showOverlay(registerOverlay);

  }



  function completeSiteAccess(entryType, user) {

    if (typeof window.unlockSiteGate === 'function') {

      window.unlockSiteGate(entryType === 'preview' ? 'demo' : 'user');

    } else if (typeof window.setSiteGateMode === 'function') {

      window.setSiteGateMode(entryType === 'preview' ? 'demo' : 'user');

    }



    if (entryType === 'preview') {

      if (typeof window.clearSiteSessionUser === 'function') {

        window.clearSiteSessionUser();

      }

      if (typeof window.setSiteDemoSession === 'function') {

        window.setSiteDemoSession('preview');

      }

    } else if (typeof window.isRealSiteUser === 'function' && window.isRealSiteUser(user)) {

      if (typeof window.clearSiteSessionUser === 'function') {

        window.clearSiteSessionUser();

      }

      if (typeof window.setSiteSessionUser === 'function') {

        window.setSiteSessionUser(user, entryType || 'register');

      }

    }



    hideAllSiteUserOverlays();

    window.dispatchEvent(new CustomEvent('site-user-session-changed'));

    window.applySiteCustomerToForms?.();

    window.refreshSiteUserProfileUi?.();

    window.refreshSiteUserMenu?.();



    if (entryType === 'preview') {

      window.showAdminToast?.('Предварительный просмотр сайта активирован');

      return;

    }



    if (user?.name || user?.email) {

      window.showAdminToast?.(`Добро пожаловать, ${user.name || user.email}!`);

    }

  }



  function showSiteUserGateIfNeeded() {

    if (isGateUnlocked()) {

      window.ensureSiteClientSession?.();

      hideAllSiteUserOverlays();

      window.applySiteCustomerToForms?.();

      window.refreshSiteUserProfileUi?.();

      window.refreshSiteUserMenu?.();

      return;

    }

    if (isAdminPanelOpen()) return;

    showOverlay(gate);

  }



  function returnToSiteWelcomeGate() {

    window.closeSiteUserProfile?.();

    window.closeSiteUserMenu?.();

    document.body.classList.remove('site-user-menu-open', 'site-profile-open');

    document.body.style.overflow = 'hidden';

    showOverlay(gate);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    window.dispatchEvent(new CustomEvent('site-user-session-changed'));

    window.refreshSiteUserProfileUi?.();

    window.refreshSiteUserMenu?.();

  }



  chooseRegisterBtn?.addEventListener('click', (event) => {

    event.preventDefault();

    event.stopPropagation();

    if (registerOverlay) {

      showOverlay(registerOverlay);

    }

  });



  choosePreviewBtn?.addEventListener('click', (event) => {

    event.preventDefault();

    event.stopPropagation();

    completeSiteAccess('preview');

  });



  gate.addEventListener('click', (event) => {

    if (event.target.closest('#siteUserChooseRegister')) {

      event.preventDefault();

      if (registerOverlay) showOverlay(registerOverlay);

      return;

    }

    if (event.target.closest('#siteUserChoosePreview')) {

      event.preventDefault();

      completeSiteAccess('preview');

    }

  });



  window.completeSiteUserAccess = completeSiteAccess;

  window.showSiteUserGateIfNeeded = showSiteUserGateIfNeeded;

  window.returnToSiteWelcomeGate = returnToSiteWelcomeGate;

  window.hideSiteUserOverlays = hideAllSiteUserOverlays;

  window.showSiteUserRegisterOverlay = () => showOverlay(registerOverlay);

  window.showSiteUserLoginOverlay = () => showOverlay(loginOverlay);

  window.showSiteUserAuthOverlay = showSiteUserAuthOverlay;



  document.getElementById('siteUserRegisterClose')?.addEventListener('click', closeAuthOverlay);

  document.getElementById('siteUserLoginClose')?.addEventListener('click', closeAuthOverlay);



  document.getElementById('siteUserShowLogin')?.addEventListener('click', (event) => {

    event.preventDefault();

    showSiteUserAuthOverlay('login');

  });



  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', showSiteUserGateIfNeeded);

  } else {

    showSiteUserGateIfNeeded();

  }



  const adminPanel = document.getElementById('adminPanel');

  if (adminPanel) {

    new MutationObserver(() => {

      if (isAdminPanelOpen()) {

        hideAllSiteUserOverlays();

      } else {

        showSiteUserGateIfNeeded();

      }

    }).observe(adminPanel, { attributes: true, attributeFilter: ['hidden'] });

  }

})();

