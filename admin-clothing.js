(function initAdminClothingPanel() {
  const openBtn = document.getElementById('adminClothingManage');
  const backBtn = document.getElementById('adminClothingBackToDashboard');
  const chooseBannerBtn = document.getElementById('adminClothingChooseBanner');
  const chooseIconsBtn = document.getElementById('adminClothingChooseCatalogIcons');
  const chooseAlertsBtn = document.getElementById('adminClothingChooseAlerts');
  const choosePromoBtn = document.getElementById('adminClothingChooseCatalogPromo');
  const chooseCatalogBtn = document.getElementById('adminClothingChooseCatalog');
  if (!openBtn || !chooseBannerBtn) return;

  function openClothingSection() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
  }

  openBtn.addEventListener('click', openClothingSection);
  backBtn?.addEventListener('click', () => {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('dashboard');
    }
  });

  chooseBannerBtn.addEventListener('click', () => {
    if (typeof window.openAdminClothingBannerPage === 'function') {
      window.openAdminClothingBannerPage();
    }
  });

  chooseIconsBtn?.addEventListener('click', () => {
    if (typeof window.openAdminClothingCatalogIconsPage === 'function') {
      window.openAdminClothingCatalogIconsPage();
    }
  });

  chooseAlertsBtn?.addEventListener('click', () => {
    if (typeof window.openAdminClothingAlertsPage === 'function') {
      window.openAdminClothingAlertsPage();
    }
  });

  choosePromoBtn?.addEventListener('click', () => {
    if (typeof window.openAdminClothingCatalogPromoPage === 'function') {
      window.openAdminClothingCatalogPromoPage();
    }
  });

  chooseCatalogBtn?.addEventListener('click', () => {
    if (typeof window.openAdminClothingCatalogPage === 'function') {
      window.openAdminClothingCatalogPage();
    }
  });

  window.openAdminClothingGate = openClothingSection;
})();
