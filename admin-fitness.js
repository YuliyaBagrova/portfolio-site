(function initAdminFitnessPanel() {
  const openBtn = document.getElementById('adminFitnessManage');
  const backBtn = document.getElementById('adminFitnessBackToDashboard');
  const chooseBannerBtn = document.getElementById('adminFitnessChooseBanner');
  const chooseCatalogBtn = document.getElementById('adminFitnessChooseCatalog');

  if (!openBtn || !chooseCatalogBtn) return;

  function openFitnessSection() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('fitness');
    }
  }

  window.openAdminFitnessGate = openFitnessSection;
  window.closeAllFitnessAdmin = openFitnessSection;

  openBtn.addEventListener('click', openFitnessSection);

  backBtn?.addEventListener('click', () => {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('dashboard');
    }
  });

  chooseCatalogBtn.addEventListener('click', () => {
    if (typeof window.openAdminFitnessCatalogPage === 'function') {
      window.openAdminFitnessCatalogPage();
    }
  });

  chooseBannerBtn?.addEventListener('click', () => {
    if (typeof window.openAdminFitnessBannerPage === 'function') {
      window.openAdminFitnessBannerPage();
    }
  });
})();
