const adminBtn = document.getElementById('adminBtn');
const adminGate = document.getElementById('adminGate');
const adminRegister = document.getElementById('adminRegister');
const adminPanel = document.getElementById('adminPanel');
const adminGateClose = document.getElementById('adminGateClose');
const adminRegisterClose = document.getElementById('adminRegisterClose');
const adminPanelClose = document.getElementById('adminPanelClose');
const adminChooseRegister = document.getElementById('adminChooseRegister');
const adminChoosePreview = document.getElementById('adminChoosePreview');
const adminRegisterForm = document.getElementById('adminRegisterForm');
const adminRegisterSkip = document.getElementById('adminRegisterSkip');
const adminEntryBadge = document.getElementById('adminEntryBadge');
const adminNavLinks = document.querySelectorAll('[data-admin-section]');
const adminSections = {
  dashboard: document.getElementById('adminSectionDashboard'),
  appearance: document.getElementById('adminSectionAppearance'),
  fitness: document.getElementById('adminSectionFitness'),
  banners: document.getElementById('adminSectionBanners'),
  clothing: document.getElementById('adminSectionClothing'),
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
  const bannerModal = document.getElementById('adminBannerModal');
  const fitnessBannerModal = document.getElementById('adminFitnessBannerModal');
  const fitnessCatalogPanel = document.getElementById('adminFitnessCatalogPanel');
  const clothingBannerModal = document.getElementById('adminClothingBannerModal');
  const clothingCatalogIconsModal = document.getElementById('adminClothingCatalogIconsModal');
  const clothingAlertsModal = document.getElementById('adminClothingAlertsModal');
  const clothingCatalogPromoModal = document.getElementById('adminClothingCatalogPromoModal');
  const clothingCatalogPanel = document.getElementById('adminClothingCatalogPanel');
  if (bannerModal) bannerModal.hidden = true;
  if (fitnessBannerModal) fitnessBannerModal.hidden = true;
  if (fitnessCatalogPanel) fitnessCatalogPanel.hidden = true;
  if (clothingBannerModal) clothingBannerModal.hidden = true;
  if (clothingCatalogIconsModal) clothingCatalogIconsModal.hidden = true;
  if (clothingAlertsModal) clothingAlertsModal.hidden = true;
  if (clothingCatalogPromoModal) clothingCatalogPromoModal.hidden = true;
  if (clothingCatalogPanel) clothingCatalogPanel.hidden = true;
  const sectionIconsModal = document.getElementById('adminSectionIconsModal');
  if (sectionIconsModal) sectionIconsModal.hidden = true;
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
}

function openAdminPanel(entryType) {
  const labels = {
    register: 'Вход: регистрация',
    preview: 'Вход: предварительный просмотр'
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

async function saveAdminRegistration(form) {
  const formData = new FormData(form);
  try {
    await fetch('/api/admin/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name') || '',
        email: formData.get('email') || '',
        password: formData.get('password') || ''
      })
    });
  } catch {
    // Панель откроется даже без сохранения в БД
  }
}

adminRegisterForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveAdminRegistration(adminRegisterForm);
  openAdminPanel('register');
});

modalOverlays.forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideAllAdmin();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  const bannerModal = document.getElementById('adminBannerModal');
  const sectionIconsModal = document.getElementById('adminSectionIconsModal');
  const paletteModal = document.getElementById('adminSectionPaletteModal');
  const fitnessBannerModal = document.getElementById('adminFitnessBannerModal');
  const fitnessCatalogPanel = document.getElementById('adminFitnessCatalogPanel');
  const clothingBannerModal = document.getElementById('adminClothingBannerModal');
  const clothingCatalogIconsModal = document.getElementById('adminClothingCatalogIconsModal');
  const clothingAlertsModal = document.getElementById('adminClothingAlertsModal');
  const clothingCatalogPromoModal = document.getElementById('adminClothingCatalogPromoModal');
  const clothingCatalogPanel = document.getElementById('adminClothingCatalogPanel');
  const appearanceSection = document.getElementById('adminSectionAppearance');
  const fitnessSection = document.getElementById('adminSectionFitness');
  const clothingSection = document.getElementById('adminSectionClothing');

  if (paletteModal && !paletteModal.hidden) {
    paletteModal.hidden = true;
    if (typeof window.openAdminAppearanceGate === 'function') window.openAdminAppearanceGate();
    return;
  }

  if (sectionIconsModal && !sectionIconsModal.hidden) {
    sectionIconsModal.hidden = true;
    if (typeof window.openAdminAppearanceGate === 'function') window.openAdminAppearanceGate();
    return;
  }

  if (bannerModal && !bannerModal.hidden) {
    bannerModal.hidden = true;
    if (typeof window.openAdminAppearanceGate === 'function') window.openAdminAppearanceGate();
    return;
  }

  if (appearanceSection?.classList.contains('active')) {
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
    return;
  }

  if (fitnessBannerModal && !fitnessBannerModal.hidden) {
    fitnessBannerModal.hidden = true;
    if (typeof window.openAdminFitnessGate === 'function') window.openAdminFitnessGate();
    return;
  }

  if (fitnessCatalogPanel && !fitnessCatalogPanel.hidden) {
    fitnessCatalogPanel.hidden = true;
    if (typeof window.openAdminFitnessGate === 'function') window.openAdminFitnessGate();
    return;
  }

  const bannersCatalogPanel = document.getElementById('adminBannersCatalogPanel');
  const bannersSection = document.getElementById('adminSectionBanners');

  if (bannersCatalogPanel && !bannersCatalogPanel.hidden) {
    bannersCatalogPanel.hidden = true;
    if (typeof window.openAdminBannersGate === 'function') window.openAdminBannersGate();
    return;
  }

  if (bannersSection?.classList.contains('active')) {
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
    return;
  }

  if (fitnessSection?.classList.contains('active')) {
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
    return;
  }

  if (clothingBannerModal && !clothingBannerModal.hidden) {
    clothingBannerModal.hidden = true;
    if (typeof window.openAdminClothingGate === 'function') window.openAdminClothingGate();
    return;
  }

  if (clothingCatalogIconsModal && !clothingCatalogIconsModal.hidden) {
    clothingCatalogIconsModal.hidden = true;
    if (typeof window.openAdminClothingGate === 'function') window.openAdminClothingGate();
    return;
  }

  if (clothingAlertsModal && !clothingAlertsModal.hidden) {
    clothingAlertsModal.hidden = true;
    if (typeof window.openAdminClothingGate === 'function') window.openAdminClothingGate();
    return;
  }

  if (clothingCatalogPromoModal && !clothingCatalogPromoModal.hidden) {
    clothingCatalogPromoModal.hidden = true;
    if (typeof window.openAdminClothingGate === 'function') window.openAdminClothingGate();
    return;
  }

  if (clothingCatalogPanel && !clothingCatalogPanel.hidden) {
    clothingCatalogPanel.hidden = true;
    if (typeof window.openAdminClothingGate === 'function') window.openAdminClothingGate();
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
