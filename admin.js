const adminBtn = document.getElementById('adminBtn');
const adminGate = document.getElementById('adminGate');
const adminRegister = document.getElementById('adminRegister');
const adminLogin = document.getElementById('adminLogin');
const adminPanel = document.getElementById('adminPanel');
const adminGateClose = document.getElementById('adminGateClose');
const adminRegisterClose = document.getElementById('adminRegisterClose');
const adminLoginClose = document.getElementById('adminLoginClose');
const adminShowLogin = document.getElementById('adminShowLogin');
const adminPanelClose = document.getElementById('adminPanelClose');
const adminChooseRegister = document.getElementById('adminChooseRegister');
const adminChoosePreview = document.getElementById('adminChoosePreview');
const adminEntryBadge = document.getElementById('adminEntryBadge');
const adminNavLinks = document.querySelectorAll('[data-admin-section]');
const adminSections = {
  dashboard: document.getElementById('adminSectionDashboard'),
  appearance: document.getElementById('adminSectionAppearance'),
  homeBanner: document.getElementById('adminSectionHomeBanner'),
  sectionIcons: document.getElementById('adminSectionIcons'),
  palette: document.getElementById('adminSectionPalette'),
  fitness: document.getElementById('adminSectionFitness'),
  fitnessBanner: document.getElementById('adminSectionFitnessBanner'),
  fitnessCatalog: document.getElementById('adminSectionFitnessCatalog'),
  banners: document.getElementById('adminSectionBanners'),
  bannersWorks: document.getElementById('adminSectionBannersWorks'),
  clothing: document.getElementById('adminSectionClothing'),
  clothingBanner: document.getElementById('adminSectionClothingBanner'),
  clothingCatalogIcons: document.getElementById('adminSectionClothingCatalogIcons'),
  clothingAlerts: document.getElementById('adminSectionClothingAlerts'),
  clothingCatalogPromo: document.getElementById('adminSectionClothingCatalogPromo'),
  clothingCatalog: document.getElementById('adminSectionClothingCatalog'),
  reviews: document.getElementById('adminSectionReviews'),
  orders: document.getElementById('adminSectionOrders'),
  siteAbout: document.getElementById('adminSectionSiteAbout'),
  profile: document.getElementById('adminSectionProfile'),
  about: document.getElementById('adminSectionAbout')
};

const modalOverlays = [adminGate, adminRegister, adminLogin];
const ADMIN_PANEL_OPEN_KEY = 'admin_panel_open';
const ADMIN_SECTION_KEY = 'admin_section';

function markAdminPanelOpen() {
  sessionStorage.setItem(ADMIN_PANEL_OPEN_KEY, '1');
}

function markAdminPanelClosed() {
  sessionStorage.removeItem(ADMIN_PANEL_OPEN_KEY);
  sessionStorage.removeItem(ADMIN_SECTION_KEY);
  sessionStorage.removeItem('admin_entry');
  document.documentElement.classList.remove('admin-panel-restore');
}

function saveAdminSection(sectionId) {
  if (adminSections[sectionId] && !adminPanel.hidden) {
    sessionStorage.setItem(ADMIN_SECTION_KEY, sectionId);
  }
}

function showAdminSection(sectionId) {
  if (!adminSections[sectionId]) return;

  Object.values(adminSections).forEach(section => section.classList.remove('active'));
  adminSections[sectionId].classList.add('active');

  adminNavLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.adminSection === sectionId);
  });

  saveAdminSection(sectionId);

  if (sectionId === 'reviews' && typeof window.loadAdminReviews === 'function') {
    window.loadAdminReviews();
  }

  if (sectionId === 'orders' && typeof window.loadAdminOrders === 'function') {
    window.loadAdminOrders();
  }

  if (sectionId === 'dashboard') {
    if (typeof window.loadRecentWorks === 'function') {
      window.loadRecentWorks();
    }
    if (typeof window.loadPortfolioStats === 'function') {
      window.loadPortfolioStats();
    }
  }

  if (sectionId === 'appearance') {
    if (typeof window.loadRecentAppearanceActivity === 'function') {
      window.loadRecentAppearanceActivity();
    }
  }

  if (sectionId === 'fitness') {
    if (typeof window.loadRecentFitnessWorks === 'function') {
      window.loadRecentFitnessWorks();
    }
  }

  if (sectionId === 'banners') {
    if (typeof window.loadRecentBannerWorks === 'function') {
      window.loadRecentBannerWorks();
    }
  }

  if (sectionId === 'clothing') {
    if (typeof window.loadRecentClothingActivity === 'function') {
      window.loadRecentClothingActivity();
    }
  }

  if (sectionId === 'siteAbout') {
    if (typeof window.loadAdminSiteAbout === 'function') {
      window.loadAdminSiteAbout();
    }
  }

  if (sectionId === 'profile' && typeof window.refreshAdminProfileUi === 'function') {
    window.refreshAdminProfileUi();
  }

  adminPanel.querySelector('.admin-page-main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

window.showAdminSection = showAdminSection;

function hideAllAdmin() {
  modalOverlays.forEach(el => { el.hidden = true; });
  adminPanel.hidden = true;
  if (typeof window.showAdminSection === 'function') {
    window.showAdminSection('dashboard');
  }
  if (typeof window.clearAdminSessionUser === 'function') {
    window.clearAdminSessionUser();
  }
  markAdminPanelClosed();
  document.body.classList.remove('admin-panel-open');
  document.body.style.overflow = '';
}

function showOverlay(overlay) {
  adminPanel.hidden = true;
  document.body.classList.remove('admin-panel-open');
  modalOverlays.forEach(el => { el.hidden = true; });
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  if (overlay === adminRegister && typeof window.resetAdminRegistration === 'function') {
    window.resetAdminRegistration();
  }
  if (overlay === adminLogin && typeof window.resetAdminLogin === 'function') {
    window.resetAdminLogin();
  }
}

function showAdminAuthOverlay(mode) {
  if (mode === 'login') {
    showOverlay(adminLogin);
    return;
  }
  showOverlay(adminRegister);
}

window.showAdminAuthOverlay = showAdminAuthOverlay;

function openAdminPanel(entryType, user) {
  const labels = {
    register: 'Вход: регистрация',
    preview: 'Вход: предварительный просмотр',
    auth: 'Вход: демо-код',
    login: 'Вход: аккаунт'
  };
  const isDemoEntry = entryType === 'preview' || entryType === 'auth';
  const isAccountEntry = entryType === 'login' || entryType === 'register';
  const hasRealUser = typeof window.isRealAdminUser === 'function' && window.isRealAdminUser(user);

  if (isAccountEntry && !hasRealUser) {
    return false;
  }

  adminEntryBadge.textContent = labels[entryType] || labels.preview;
  sessionStorage.setItem('admin_entry', entryType);

  if (typeof window.clearAdminSessionUser === 'function') {
    window.clearAdminSessionUser();
  }

  if (hasRealUser) {
    const saved = typeof window.setAdminSessionUser === 'function'
      ? window.setAdminSessionUser(user, entryType)
      : null;
    if (!saved) {
      return false;
    }
  } else if (isDemoEntry) {
    if (typeof window.setAdminDemoSession === 'function') {
      window.setAdminDemoSession(entryType);
    }
  }

  modalOverlays.forEach(el => { el.hidden = true; });
  adminPanel.hidden = false;
  document.body.classList.add('admin-panel-open');
  document.body.style.overflow = 'hidden';
  markAdminPanelOpen();
  showAdminSection('dashboard');
  if (typeof window.refreshAdminProfileUi === 'function') {
    window.refreshAdminProfileUi();
  }
  if (typeof window.loadRecentWorks === 'function') {
    window.loadRecentWorks();
  }
  if (typeof window.loadPortfolioStats === 'function') {
    window.loadPortfolioStats();
  }
  adminPanel.scrollTop = 0;
  adminPanel.querySelector('.admin-page-main')?.scrollTo(0, 0);
  return true;
}

window.openAdminPanel = openAdminPanel;

function restoreAdminPanelIfNeeded() {
  const shouldRestore = sessionStorage.getItem(ADMIN_PANEL_OPEN_KEY) === '1'
    || document.documentElement.classList.contains('admin-panel-restore');
  if (!shouldRestore) return;

  const profile = typeof window.getAdminSessionUser === 'function'
    ? window.getAdminSessionUser()
    : null;
  if (!profile) {
    markAdminPanelClosed();
    return;
  }

  if (profile.isDemo) {
    sessionStorage.setItem('admin_entry', profile.entryType || 'preview');
  }

  const entryType = sessionStorage.getItem('admin_entry') || profile.entryType || 'login';
  const labels = {
    register: 'Вход: регистрация',
    preview: 'Вход: предварительный просмотр',
    auth: 'Вход: демо-код',
    login: 'Вход: аккаунт'
  };
  adminEntryBadge.textContent = labels[entryType] || labels.preview;

  modalOverlays.forEach(el => { el.hidden = true; });
  adminPanel.hidden = false;
  document.documentElement.classList.remove('admin-panel-restore');
  document.body.classList.add('admin-panel-open');
  document.body.style.overflow = 'hidden';

  const savedSection = sessionStorage.getItem(ADMIN_SECTION_KEY) || 'dashboard';
  showAdminSection(adminSections[savedSection] ? savedSection : 'dashboard');

  if (typeof window.refreshAdminProfileUi === 'function') {
    window.refreshAdminProfileUi();
  }
}

restoreAdminPanelIfNeeded();

adminNavLinks.forEach(link => {
  link.addEventListener('click', () => showAdminSection(link.dataset.adminSection));
});

adminBtn.addEventListener('click', () => showOverlay(adminGate));

adminGateClose.addEventListener('click', hideAllAdmin);
adminRegisterClose.addEventListener('click', () => showOverlay(adminGate));
adminLoginClose.addEventListener('click', () => showAdminAuthOverlay('register'));
adminShowLogin?.addEventListener('click', () => showAdminAuthOverlay('login'));
adminPanelClose.addEventListener('click', hideAllAdmin);

adminChooseRegister.addEventListener('click', () => showOverlay(adminRegister));
adminChoosePreview.addEventListener('click', () => openAdminPanel('preview'));

modalOverlays.forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideAllAdmin();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  const appearanceSection = document.getElementById('adminSectionAppearance');
  const homeBannerSection = document.getElementById('adminSectionHomeBanner');
  const sectionIconsSection = document.getElementById('adminSectionIcons');
  const paletteSection = document.getElementById('adminSectionPalette');
  const fitnessBannerSection = document.getElementById('adminSectionFitnessBanner');
  const fitnessCatalogSection = document.getElementById('adminSectionFitnessCatalog');
  const fitnessSection = document.getElementById('adminSectionFitness');
  const clothingSection = document.getElementById('adminSectionClothing');

  if (homeBannerSection?.classList.contains('active')) {
    if (typeof window.adminHomeBannerGoBack === 'function') {
      window.adminHomeBannerGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('appearance');
    }
    return;
  }

  if (sectionIconsSection?.classList.contains('active')) {
    if (typeof window.adminSectionIconsGoBack === 'function') {
      window.adminSectionIconsGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('appearance');
    }
    return;
  }

  if (paletteSection?.classList.contains('active')) {
    if (typeof window.adminPaletteGoBack === 'function') {
      window.adminPaletteGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('appearance');
    }
    return;
  }

  if (appearanceSection?.classList.contains('active')) {
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
    return;
  }

  if (fitnessBannerSection?.classList.contains('active')) {
    if (typeof window.adminFitnessBannerGoBack === 'function') {
      window.adminFitnessBannerGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('fitness');
    }
    return;
  }

  if (fitnessCatalogSection?.classList.contains('active')) {
    if (typeof window.adminFitnessCatalogGoBack === 'function') {
      window.adminFitnessCatalogGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('fitness');
    }
    return;
  }

  if (fitnessSection?.classList.contains('active')) {
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
    return;
  }

  const bannersWorksSection = document.getElementById('adminSectionBannersWorks');
  const bannersSection = document.getElementById('adminSectionBanners');

  if (bannersWorksSection?.classList.contains('active')) {
    if (typeof window.adminBannersWorksGoBack === 'function') {
      window.adminBannersWorksGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('banners');
    }
    return;
  }

  if (bannersSection?.classList.contains('active')) {
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
    return;
  }

  const clothingBannerSection = document.getElementById('adminSectionClothingBanner');
  const clothingCatalogIconsSection = document.getElementById('adminSectionClothingCatalogIcons');
  const clothingAlertsSection = document.getElementById('adminSectionClothingAlerts');
  const clothingCatalogPromoSection = document.getElementById('adminSectionClothingCatalogPromo');
  const clothingCatalogSection = document.getElementById('adminSectionClothingCatalog');

  if (clothingBannerSection?.classList.contains('active')) {
    if (typeof window.adminClothingBannerGoBack === 'function') {
      window.adminClothingBannerGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
    return;
  }

  if (clothingCatalogIconsSection?.classList.contains('active')) {
    if (typeof window.adminClothingCatalogIconsGoBack === 'function') {
      window.adminClothingCatalogIconsGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
    return;
  }

  if (clothingAlertsSection?.classList.contains('active')) {
    if (typeof window.adminClothingAlertsGoBack === 'function') {
      window.adminClothingAlertsGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
    return;
  }

  if (clothingCatalogPromoSection?.classList.contains('active')) {
    if (typeof window.adminClothingCatalogPromoGoBack === 'function') {
      window.adminClothingCatalogPromoGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
    return;
  }

  if (clothingCatalogSection?.classList.contains('active')) {
    if (typeof window.adminClothingCatalogGoBack === 'function') {
      window.adminClothingCatalogGoBack();
    } else if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
    return;
  }

  if (clothingSection?.classList.contains('active')) {
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
    return;
  }

  const siteAboutSection = document.getElementById('adminSectionSiteAbout');
  const profileSection = document.getElementById('adminSectionProfile');
  if (profileSection?.classList.contains('active')) {
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
    return;
  }

  if (siteAboutSection?.classList.contains('active')) {
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
    return;
  }

  if (!adminPanel.hidden || modalOverlays.some(o => !o.hidden)) {
    hideAllAdmin();
  }
});

document.querySelectorAll('.admin-about-page-nav .about-page-nav-link').forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    if (!href?.startsWith('#')) return;

    const target = document.querySelector(href);
    if (!target || !adminSections.about?.contains(target)) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
