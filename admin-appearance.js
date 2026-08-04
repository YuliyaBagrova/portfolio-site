(function initAdminAppearancePanel() {
  const openBtn = document.getElementById('adminAppearanceManage');
  const backBtn = document.getElementById('adminAppearanceBackToDashboard');
  const chooseBannerBtn = document.getElementById('adminAppearanceChooseBanner');
  const chooseIconsBtn = document.getElementById('adminAppearanceChooseIcons');
  const iconsModal = document.getElementById('adminSectionIconsModal');
  const iconsClose = document.getElementById('adminSectionIconsClose');
  const iconsBack = document.getElementById('adminSectionIconsBack');
  const iconsList = document.getElementById('adminSectionIconsList');
  const toast = document.getElementById('adminToast');

  if (!openBtn || !chooseBannerBtn || !chooseIconsBtn || !iconsModal || !iconsList) return;

  const SECTIONS = [
    { id: 'supplements', label: 'Фитнес-индустрия' },
    { id: 'banners', label: 'Мои Баннеры' },
    { id: 'clothing', label: 'Одежда' }
  ];

  const ICON_CLASSES = {
    supplements: '',
    banners: ' quick-link-icon--banners',
    clothing: ' quick-link-icon--clothing'
  };

  let icons = {};
  let isUploading = false;

  function showToast(message, type = 'success') {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `admin-toast admin-toast--${type}`;
    toast.hidden = false;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.hidden = true;
    }, 4500);
  }

  function openAppearanceSection() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('appearance');
    }
    iconsModal.hidden = true;
    const paletteModal = document.getElementById('adminSectionPaletteModal');
    if (paletteModal) paletteModal.hidden = true;
    const bannerModal = document.getElementById('adminBannerModal');
    if (bannerModal) bannerModal.hidden = true;
  }

  function openIconsModal() {
    iconsModal.hidden = false;
    loadIcons();
  }

  function closeIconsModal() {
    iconsModal.hidden = true;
    openAppearanceSection();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  function getIconUrl(sectionId) {
    const data = icons[sectionId];
    return data?.image ? data.image.split('?')[0] : '';
  }

  function bindPreviewZoom() {
    iconsList.querySelectorAll('.admin-section-icon-preview.is-zoomable').forEach((preview) => {
      preview.addEventListener('click', () => {
        const img = preview.querySelector('img');
        if (!img?.src) return;
        if (typeof window.openImageLightbox === 'function') {
          window.openImageLightbox(img.src.split('?')[0], img.alt);
        }
      });
    });
  }

  function renderIconsList() {
    iconsList.innerHTML = SECTIONS.map((section) => {
      const data = icons[section.id] || {};
      const imageUrl = getIconUrl(section.id);
      const isCustom = Boolean(data.image);
      const iconClass = ICON_CLASSES[section.id] || '';

      return `
        <article class="admin-section-icon-card" data-section-id="${section.id}">
          <button type="button" class="admin-section-icon-preview quick-link-icon${iconClass}${imageUrl ? ' is-zoomable' : ' is-empty'}"${imageUrl ? ' aria-label="Увеличить иконку"' : ' disabled aria-label="Иконка не загружена"'}>
            ${imageUrl
              ? `<img src="${imageUrl}?t=${Date.now()}" alt="${section.label}" width="44" height="44">`
              : '<span class="admin-section-icon-empty">—</span>'}
          </button>
          <div class="admin-section-icon-info">
            <strong class="admin-section-icon-title">${section.label}</strong>
            <p class="admin-section-icon-status">${isCustom ? 'Загружена своя иконка' : 'Иконка не загружена'}</p>
            <div class="admin-section-icon-actions">
              <input type="file" id="adminSectionIconInput-${section.id}" accept="image/jpeg,image/png,image/webp" hidden>
              <button type="button" class="btn btn-primary admin-section-icon-upload" data-section-id="${section.id}">Загрузить</button>
              <button type="button" class="btn btn-ghost btn-ghost-danger admin-section-icon-reset" data-section-id="${section.id}"${isCustom ? '' : ' hidden'}>Сбросить</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    bindPreviewZoom();

    iconsList.querySelectorAll('.admin-section-icon-upload').forEach((button) => {
      button.addEventListener('click', () => {
        if (isUploading) return;
        document.getElementById(`adminSectionIconInput-${button.dataset.sectionId}`)?.click();
      });
    });

    iconsList.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        const sectionId = input.id.replace('adminSectionIconInput-', '');
        input.value = '';
        if (!file || isUploading) return;

        isUploading = true;
        iconsList.classList.add('is-loading');

        try {
          const image = await readFileAsDataUrl(file);
          const response = await fetch(`/api/section-icons/${sectionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image })
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Не удалось загрузить иконку');

          icons[sectionId] = payload;
          renderIconsList();
          window.dispatchEvent(new CustomEvent('section-icons-changed'));
          showToast(`Иконка «${SECTIONS.find((item) => item.id === sectionId)?.label || sectionId}» обновлена`);
        } catch (error) {
          showToast(error.message, 'error');
        } finally {
          isUploading = false;
          iconsList.classList.remove('is-loading');
        }
      });
    });

    iconsList.querySelectorAll('.admin-section-icon-reset').forEach((button) => {
      button.addEventListener('click', async () => {
        if (isUploading) return;
        const sectionId = button.dataset.sectionId;

        isUploading = true;
        iconsList.classList.add('is-loading');

        try {
          const response = await fetch(`/api/section-icons/${sectionId}`, { method: 'DELETE' });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Не удалось сбросить иконку');

          icons[sectionId] = payload;
          renderIconsList();
          window.dispatchEvent(new CustomEvent('section-icons-changed'));
          showToast(`Иконка «${SECTIONS.find((item) => item.id === sectionId)?.label || sectionId}» сброшена`);
        } catch (error) {
          showToast(error.message, 'error');
        } finally {
          isUploading = false;
          iconsList.classList.remove('is-loading');
        }
      });
    });
  }

  async function loadIcons() {
    try {
      const response = await fetch('/api/section-icons');
      if (!response.ok) throw new Error('Не удалось загрузить иконки');
      const payload = await response.json();
      icons = payload.icons || {};
      renderIconsList();
    } catch (error) {
      iconsList.innerHTML = `<p class="admin-section-icons-error">${error.message}</p>`;
    }
  }

  openBtn.addEventListener('click', openAppearanceSection);
  backBtn?.addEventListener('click', () => {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('dashboard');
    }
  });

  chooseBannerBtn.addEventListener('click', () => {
    window._bannerOpenedFromAppearance = true;
    if (typeof window.openAdminHomeBannerModal === 'function') {
      window.openAdminHomeBannerModal();
    }
  });

  chooseIconsBtn.addEventListener('click', openIconsModal);
  iconsClose.addEventListener('click', closeIconsModal);
  iconsBack.addEventListener('click', closeIconsModal);

  iconsModal.addEventListener('click', (event) => {
    if (event.target === iconsModal) closeIconsModal();
  });

  window.openAdminAppearanceGate = openAppearanceSection;
})();
