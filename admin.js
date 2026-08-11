const adminBtn = document.getElementById('adminBtn');
const adminGate = document.getElementById('adminGate');
const adminRegister = document.getElementById('adminRegister');
const adminPanel = document.getElementById('adminPanel');
const adminGateClose = document.getElementById('adminGateClose');
const adminRegisterClose = document.getElementById('adminRegisterClose');
const adminPanelClose = document.getElementById('adminPanelClose');
const adminChooseRegister = document.getElementById('adminChooseRegister');
const adminChoosePreview = document.getElementById('adminChoosePreview');
const adminRegisterSkip = document.getElementById('adminRegisterSkip');
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
  about: document.getElementById('adminSectionAbout')
};

const modalOverlays = [adminGate, adminRegister];

function showAdminSection(sectionId) {
  if (!adminSections[sectionId]) return;

  Object.values(adminSections).forEach(section => section.classList.remove('active'));
  adminSections[sectionId].classList.add('active');

  adminNavLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.adminSection === sectionId);
  });

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

  adminPanel.querySelector('.admin-page-main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

window.showAdminSection = showAdminSection;

function hideAllAdmin() {
  modalOverlays.forEach(el => { el.hidden = true; });
  adminPanel.hidden = true;
  if (typeof window.showAdminSection === 'function') {
    window.showAdminSection('dashboard');
  }
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
}

function openAdminPanel(entryType) {
  const labels = {
    register: 'Вход: регистрация',
    preview: 'Вход: предварительный просмотр',
    auth: 'Вход: код аутентификации'
  };
  adminEntryBadge.textContent = labels[entryType] || labels.preview;
  sessionStorage.setItem('admin_entry', entryType);
  modalOverlays.forEach(el => { el.hidden = true; });
  adminPanel.hidden = false;
  document.body.classList.add('admin-panel-open');
  document.body.style.overflow = 'hidden';
  showAdminSection('dashboard');
  if (typeof window.loadRecentWorks === 'function') {
    window.loadRecentWorks();
  }
  if (typeof window.loadPortfolioStats === 'function') {
    window.loadPortfolioStats();
  }
  adminPanel.scrollTop = 0;
  adminPanel.querySelector('.admin-page-main')?.scrollTo(0, 0);
}

window.openAdminPanel = openAdminPanel;

adminNavLinks.forEach(link => {
  link.addEventListener('click', () => showAdminSection(link.dataset.adminSection));
});

adminBtn.addEventListener('click', () => showOverlay(adminGate));

adminGateClose.addEventListener('click', hideAllAdmin);
adminRegisterClose.addEventListener('click', () => showOverlay(adminGate));
adminPanelClose.addEventListener('click', hideAllAdmin);

adminChooseRegister.addEventListener('click', () => showOverlay(adminRegister));
adminChoosePreview.addEventListener('click', () => openAdminPanel('preview'));

adminRegisterSkip.addEventListener('click', () => openAdminPanel('register'));

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
