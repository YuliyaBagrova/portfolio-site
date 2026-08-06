(function initAdminBannersPanel() {
  const openBtn = document.getElementById('adminBannersManage');
  const backBtn = document.getElementById('adminBannersBackToDashboard');
  const chooseWorksBtn = document.getElementById('adminBannersChooseWorks');

  if (!openBtn || !chooseWorksBtn) return;

  function openBannersSection() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('banners');
    }
    if (typeof window.loadRecentBannerWorks === 'function') {
      window.loadRecentBannerWorks();
    }
  }

  window.openAdminBannersGate = openBannersSection;
  window.closeAllBannersAdmin = openBannersSection;

  openBtn.addEventListener('click', openBannersSection);

  backBtn?.addEventListener('click', () => {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('dashboard');
    }
  });

  chooseWorksBtn.addEventListener('click', () => {
    if (typeof window.openAdminBannersWorksPage === 'function') {
      window.openAdminBannersWorksPage();
    }
  });
})();
