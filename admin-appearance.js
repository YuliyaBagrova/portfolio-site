(function initAdminAppearancePanel() {
  const openBtn = document.getElementById('adminAppearanceManage');
  const backBtn = document.getElementById('adminAppearanceBackToDashboard');
  const chooseBannerBtn = document.getElementById('adminAppearanceChooseBanner');
  const chooseIconsBtn = document.getElementById('adminAppearanceChooseIcons');

  if (!openBtn || !chooseBannerBtn || !chooseIconsBtn) return;

  function openAppearanceSection() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('appearance');
    }
  }

  openBtn.addEventListener('click', openAppearanceSection);
  backBtn?.addEventListener('click', () => {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('dashboard');
    }
  });

  chooseBannerBtn.addEventListener('click', () => {
    if (typeof window.openAdminHomeBannerModal === 'function') {
      window.openAdminHomeBannerModal();
    }
  });

  chooseIconsBtn.addEventListener('click', () => {
    if (typeof window.openAdminSectionIconsPage === 'function') {
      window.openAdminSectionIconsPage();
    }
  });

  window.openAdminAppearanceGate = openAppearanceSection;
})();
