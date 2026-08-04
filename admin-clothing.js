(function initAdminClothingPanel() {
  const openBtn = document.getElementById('adminClothingManage');
  const backBtn = document.getElementById('adminClothingBackToDashboard');
  const chooseBannerBtn = document.getElementById('adminClothingChooseBanner');
  const chooseIconsBtn = document.getElementById('adminClothingChooseCatalogIcons');
  const chooseAlertsBtn = document.getElementById('adminClothingChooseAlerts');
  const iconsModal = document.getElementById('adminClothingCatalogIconsModal');
  const iconsClose = document.getElementById('adminClothingCatalogIconsClose');
  const iconsBack = document.getElementById('adminClothingCatalogIconsBack');
  const iconsList = document.getElementById('adminClothingCatalogIconsList');
  const alertsModal = document.getElementById('adminClothingAlertsModal');
  const alertsClose = document.getElementById('adminClothingAlertsClose');
  const alertsBack = document.getElementById('adminClothingAlertsBack');
  const alertsLayout = document.getElementById('adminClothingAlertsLayout');
  const alertsList = document.getElementById('adminClothingAlertsList');
  const alertsEmpty = document.getElementById('adminClothingAlertsEmpty');
  const alertsCount = document.getElementById('adminClothingAlertsCount');
  const alertsForm = document.getElementById('adminClothingAlertsForm');
  const alertsFormTitle = document.getElementById('adminClothingAlertsFormTitle');
  const addAlertBtn = document.getElementById('adminClothingAddAlert');
  const cancelAlertBtn = document.getElementById('adminClothingCancelAlert');
  const deleteAlertBtn = document.getElementById('adminClothingDeleteAlert');
  const choosePromoBtn = document.getElementById('adminClothingChooseCatalogPromo');
  const promoModal = document.getElementById('adminClothingCatalogPromoModal');
  const promoClose = document.getElementById('adminClothingCatalogPromoClose');
  const promoBack = document.getElementById('adminClothingCatalogPromoBack');
  const promoForm = document.getElementById('adminClothingCatalogPromoForm');
  const promoPickImageBtn = document.getElementById('adminClothingCatalogPromoPickImage');
  const promoRemoveImageBtn = document.getElementById('adminClothingCatalogPromoRemoveImage');
  const promoImageInput = document.getElementById('adminClothingCatalogPromoImageInput');
  const promoPreviewImage = document.getElementById('adminClothingCatalogPromoPreviewImage');
  const promoPreviewFallback = document.getElementById('adminClothingCatalogPromoPreviewFallback');
  const promoPreviewSticker = document.getElementById('adminClothingCatalogPromoPreviewSticker');
  const promoPreviewTitle = document.getElementById('adminClothingCatalogPromoPreviewTitle');
  const promoPreviewSubtitle = document.getElementById('adminClothingCatalogPromoPreviewSubtitle');
  const promoPreviewOverlay = document.getElementById('adminClothingCatalogPromoPreviewOverlay');
  const toast = document.getElementById('adminToast');

  if (!openBtn || !chooseBannerBtn) return;

  const hasIconsAdmin = chooseIconsBtn && iconsModal && iconsList && iconsClose && iconsBack;
  const hasAlertsAdmin = chooseAlertsBtn && alertsModal && alertsList && alertsForm && addAlertBtn;
  const hasPromoAdmin = choosePromoBtn && promoModal && promoForm && promoPickImageBtn && promoClose && promoBack;

  const CATEGORIES = [
    { id: 'men', label: 'Мужчинам', glyph: 'M' },
    { id: 'women', label: 'Женщинам', glyph: 'W' },
    { id: 'shirts', label: 'Рубашки', glyph: 'S' },
    { id: 'pants', label: 'Брюки', glyph: 'P' },
    { id: 'jeans', label: 'Джинсы', glyph: 'J' },
    { id: 'accessories', label: 'Аксессуары', glyph: 'A' }
  ];

  let icons = {};
  let isUploading = false;
  let alerts = [];
  let editingAlertId = null;
  let isSavingAlert = false;
  let promoData = null;
  let pendingPromoImage = undefined;
  let removePromoImage = false;
  let isSavingPromo = false;

  const ALERT_TYPE_LABELS = {
    sale: 'Скидка',
    new: 'Новинка',
    drop: 'Drop'
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function formatAlertsCount(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} предложение`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} предложения`;
    return `${count} предложений`;
  }

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

  function openClothingSection() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
    if (iconsModal) iconsModal.hidden = true;
    if (alertsModal) alertsModal.hidden = true;
    if (promoModal) promoModal.hidden = true;
    const bannerModal = document.getElementById('adminClothingBannerModal');
    const catalogPanel = document.getElementById('adminClothingCatalogPanel');
    if (bannerModal) bannerModal.hidden = true;
    if (catalogPanel) catalogPanel.hidden = true;
  }

  function closeClothingOverlays() {
    if (iconsModal) iconsModal.hidden = true;
    if (alertsModal) alertsModal.hidden = true;
    if (promoModal) promoModal.hidden = true;
    const bannerModal = document.getElementById('adminClothingBannerModal');
    const catalogPanel = document.getElementById('adminClothingCatalogPanel');
    if (bannerModal) bannerModal.hidden = true;
    if (catalogPanel) catalogPanel.hidden = true;
  }

  function openIconsModal() {
    if (!hasIconsAdmin) return;
    if (alertsModal) alertsModal.hidden = true;
    if (promoModal) promoModal.hidden = true;
    iconsModal.hidden = false;
    loadIcons();
  }

  function closeIconsModal() {
    if (!hasIconsAdmin) return;
    iconsModal.hidden = true;
    openClothingSection();
  }

  function openAlertsModal() {
    if (!hasAlertsAdmin) return;
    if (iconsModal) iconsModal.hidden = true;
    if (promoModal) promoModal.hidden = true;
    alertsModal.hidden = false;
    closeAlertForm();
    loadAlerts();
  }

  function closeAlertsModal() {
    if (!hasAlertsAdmin) return;
    closeAlertForm();
    alertsModal.hidden = true;
    openClothingSection();
  }

  function closeAlertForm() {
    if (!hasAlertsAdmin) return;
    editingAlertId = null;
    alertsForm.hidden = true;
    alertsForm.reset();
    deleteAlertBtn.hidden = true;
    alertsLayout?.classList.remove('is-editing');
    alertsList?.querySelectorAll('.admin-clothing-alert-item.is-active').forEach((item) => {
      item.classList.remove('is-active');
    });
  }

  function openAlertForm(alert = null) {
    if (!hasAlertsAdmin) return;

    editingAlertId = alert?.id ?? null;
    alertsForm.hidden = false;
    alertsLayout?.classList.add('is-editing');
    alertsFormTitle.textContent = alert ? 'Редактировать предложение' : 'Новое предложение';
    deleteAlertBtn.hidden = !alert;

    alertsForm.elements.alert_type.value = alert?.alert_type || 'sale';
    alertsForm.elements.badge.value = alert?.badge || '';
    alertsForm.elements.title.value = alert?.title || '';
    alertsForm.elements.description.value = alert?.description || '';

    alertsList?.querySelectorAll('.admin-clothing-alert-item').forEach((item) => {
      item.classList.toggle('is-active', Number(item.dataset.alertId) === alert?.id);
    });
  }

  function renderAlertsList() {
    if (!hasAlertsAdmin) return;

    if (alertsCount) {
      alertsCount.textContent = formatAlertsCount(alerts.length);
    }

    if (!alerts.length) {
      alertsList.innerHTML = '';
      if (alertsEmpty) alertsEmpty.hidden = false;
      return;
    }

    if (alertsEmpty) alertsEmpty.hidden = true;

    alertsList.innerHTML = alerts.map((alert) => {
      const typeLabel = ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type;
      const isActive = alert.id === editingAlertId;

      return `
        <li class="admin-clothing-alert-item${isActive ? ' is-active' : ''}" data-alert-id="${alert.id}">
          <div class="admin-clothing-alert-item-preview clothing-alert clothing-alert--${escapeHtml(alert.alert_type)}">
            <span class="clothing-alert-badge">${escapeHtml(alert.badge)}</span>
            <div class="clothing-alert-body">
              <strong>${escapeHtml(alert.title)}</strong>
              ${alert.description ? `<p>${escapeHtml(alert.description)}</p>` : ''}
            </div>
          </div>
          <div class="admin-clothing-alert-item-meta">
            <span class="admin-clothing-alert-item-type">${escapeHtml(typeLabel)}</span>
            <div class="admin-clothing-alert-item-actions">
              <button type="button" class="btn btn-ghost admin-clothing-alert-edit" data-alert-id="${alert.id}">Изменить</button>
              <button type="button" class="btn btn-ghost btn-ghost-danger admin-clothing-alert-delete" data-alert-id="${alert.id}">Удалить</button>
            </div>
          </div>
        </li>
      `;
    }).join('');

    alertsList.querySelectorAll('.admin-clothing-alert-edit').forEach((button) => {
      button.addEventListener('click', () => {
        const alert = alerts.find((item) => item.id === Number(button.dataset.alertId));
        if (alert) openAlertForm(alert);
      });
    });

    alertsList.querySelectorAll('.admin-clothing-alert-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        if (isSavingAlert) return;
        const alertId = Number(button.dataset.alertId);
        const alert = alerts.find((item) => item.id === alertId);
        if (!alert) return;

        if (!window.confirm(`Удалить предложение «${alert.title}»?`)) return;
        await deleteAlert(alertId);
      });
    });
  }

  async function loadAlerts() {
    if (!hasAlertsAdmin) return;

    try {
      alertsList.classList.add('is-loading');
      const response = await fetch('/api/clothing-alerts');
      if (!response.ok) throw new Error('Не удалось загрузить предложения');

      const payload = await response.json();
      alerts = payload.alerts || [];
      renderAlertsList();
    } catch (error) {
      alertsList.innerHTML = `<li class="admin-clothing-alerts-error">${escapeHtml(error.message)}</li>`;
      if (alertsEmpty) alertsEmpty.hidden = true;
    } finally {
      alertsList.classList.remove('is-loading');
    }
  }

  async function saveAlert(event) {
    event.preventDefault();
    if (!hasAlertsAdmin || isSavingAlert) return;

    const formData = new FormData(alertsForm);
    const payload = {
      alert_type: formData.get('alert_type'),
      badge: formData.get('badge'),
      title: formData.get('title'),
      description: formData.get('description')
    };

    isSavingAlert = true;
    alertsForm.classList.add('is-saving');

    try {
      const isEdit = Boolean(editingAlertId);
      const response = await fetch(
        isEdit ? `/api/clothing-alerts/${editingAlertId}` : '/api/clothing-alerts',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось сохранить предложение');

      await loadAlerts();
      closeAlertForm();
      window.dispatchEvent(new CustomEvent('clothing-alerts-changed'));
      showToast(isEdit ? 'Предложение обновлено' : 'Предложение добавлено');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      isSavingAlert = false;
      alertsForm.classList.remove('is-saving');
    }
  }

  async function deleteAlert(alertId) {
    if (!hasAlertsAdmin || isSavingAlert) return;

    isSavingAlert = true;
    alertsList.classList.add('is-loading');

    try {
      const response = await fetch(`/api/clothing-alerts/${alertId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось удалить предложение');

      if (editingAlertId === alertId) closeAlertForm();
      await loadAlerts();
      window.dispatchEvent(new CustomEvent('clothing-alerts-changed'));
      showToast('Предложение удалено');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      isSavingAlert = false;
      alertsList.classList.remove('is-loading');
    }
  }

  function renderPromoPreview() {
    if (!hasPromoAdmin) return;

    const label = promoForm.elements.promo_label.value.trim() || 'Горячие предложения';
    const title = promoForm.elements.promo_title.value.trim();
    const subtitle = promoForm.elements.promo_subtitle.value.trim();

    if (promoPreviewSticker) promoPreviewSticker.textContent = label;
    if (promoPreviewTitle) {
      promoPreviewTitle.textContent = title;
      promoPreviewTitle.hidden = !title;
    }
    if (promoPreviewSubtitle) {
      promoPreviewSubtitle.textContent = subtitle;
      promoPreviewSubtitle.hidden = !subtitle;
    }
    if (promoPreviewOverlay) promoPreviewOverlay.hidden = !title && !subtitle;

    const existingImage = promoData?.image ? promoData.image.split('?')[0] : '';
    const previewImage = pendingPromoImage !== undefined
      ? (pendingPromoImage || '')
      : (removePromoImage ? '' : existingImage);

    if (promoPreviewImage && promoPreviewFallback) {
      if (previewImage) {
        promoPreviewImage.removeAttribute('width');
        promoPreviewImage.removeAttribute('height');
        promoPreviewImage.src = previewImage.startsWith('data:')
          ? previewImage
          : `${previewImage}?t=${Date.now()}`;
        promoPreviewImage.hidden = false;
        promoPreviewFallback.hidden = true;
      } else {
        promoPreviewImage.removeAttribute('src');
        promoPreviewImage.hidden = true;
        promoPreviewFallback.hidden = false;
      }
    }

    if (promoRemoveImageBtn) {
      promoRemoveImageBtn.hidden = !previewImage;
    }
  }

  function fillPromoForm(promo) {
    if (!hasPromoAdmin || !promo) return;

    promoForm.elements.promo_label.value = promo.promo_label || '';
    promoForm.elements.promo_title.value = promo.promo_title || '';
    promoForm.elements.promo_subtitle.value = promo.promo_subtitle || '';
    promoForm.elements.promo_link.value = promo.promo_link || '';
    pendingPromoImage = undefined;
    removePromoImage = false;
    renderPromoPreview();
  }

  async function loadPromo() {
    if (!hasPromoAdmin) return;

    try {
      promoForm.classList.add('is-loading');
      const response = await fetch('/api/clothing-catalog-promo');
      if (!response.ok) throw new Error('Не удалось загрузить рекламу каталога');

      const payload = await response.json();
      promoData = payload.promo || null;
      fillPromoForm(promoData);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      promoForm.classList.remove('is-loading');
    }
  }

  function openPromoModal() {
    if (!hasPromoAdmin) return;
    if (iconsModal) iconsModal.hidden = true;
    if (alertsModal) alertsModal.hidden = true;
    promoModal.hidden = false;
    loadPromo();
  }

  function closePromoModal() {
    if (!hasPromoAdmin) return;
    promoModal.hidden = true;
    pendingPromoImage = undefined;
    removePromoImage = false;
    openClothingSection();
  }

  async function savePromo(event) {
    event.preventDefault();
    if (!hasPromoAdmin || isSavingPromo) return;

    const payload = {
      promo_label: promoForm.elements.promo_label.value,
      promo_title: promoForm.elements.promo_title.value,
      promo_subtitle: promoForm.elements.promo_subtitle.value,
      promo_link: promoForm.elements.promo_link.value
    };

    if (pendingPromoImage !== undefined) {
      payload.image = pendingPromoImage;
    }
    if (removePromoImage) {
      payload.remove_image = true;
    }

    isSavingPromo = true;
    promoForm.classList.add('is-saving');

    try {
      const response = await fetch('/api/clothing-catalog-promo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось сохранить рекламу каталога');

      promoData = result.promo;
      pendingPromoImage = undefined;
      removePromoImage = false;
      fillPromoForm(promoData);
      window.dispatchEvent(new CustomEvent('clothing-catalog-promo-changed'));
      showToast('Реклама каталога сохранена');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      isSavingPromo = false;
      promoForm.classList.remove('is-saving');
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  function getIconUrl(categoryId) {
    const data = icons[categoryId];
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
    if (!hasIconsAdmin) return;

    iconsList.innerHTML = CATEGORIES.map((category) => {
      const data = icons[category.id] || {};
      const imageUrl = getIconUrl(category.id);
      const isCustom = Boolean(data.image);

      return `
        <article class="admin-section-icon-card" data-category-id="${category.id}">
          <button type="button" class="admin-section-icon-preview clothing-catalog-icon-preview${imageUrl ? ' is-zoomable' : ' is-empty'}"${imageUrl ? ` aria-label="Увеличить иконку «${category.label}»"` : ` disabled aria-label="Иконка «${category.label}» не загружена"`}>
            ${imageUrl
              ? `<img src="${imageUrl}?t=${Date.now()}" alt="${category.label}" width="44" height="44">`
              : `<span class="admin-section-icon-empty clothing-catalog-icon-glyph-preview">${category.glyph}</span>`}
          </button>
          <div class="admin-section-icon-info">
            <strong class="admin-section-icon-title">${category.label}</strong>
            <p class="admin-section-icon-status">${isCustom ? 'Загружена своя иконка' : 'Буквенная иконка по умолчанию'}</p>
            <div class="admin-section-icon-actions">
              <input type="file" id="adminClothingCatalogIconInput-${category.id}" accept="image/jpeg,image/png,image/webp" hidden>
              <button type="button" class="btn btn-primary admin-section-icon-upload" data-category-id="${category.id}">Загрузить</button>
              <button type="button" class="btn btn-ghost btn-ghost-danger admin-section-icon-reset" data-category-id="${category.id}"${isCustom ? '' : ' hidden'}>Сбросить</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    bindPreviewZoom();

    iconsList.querySelectorAll('.admin-section-icon-upload').forEach((button) => {
      button.addEventListener('click', () => {
        if (isUploading) return;
        document.getElementById(`adminClothingCatalogIconInput-${button.dataset.categoryId}`)?.click();
      });
    });

    iconsList.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        const categoryId = input.id.replace('adminClothingCatalogIconInput-', '');
        input.value = '';
        if (!file || isUploading) return;

        isUploading = true;
        iconsList.classList.add('is-loading');

        try {
          const image = await readFileAsDataUrl(file);
          const response = await fetch(`/api/clothing-catalog-icons/${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image })
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Не удалось загрузить иконку');

          icons[categoryId] = payload;
          renderIconsList();
          window.dispatchEvent(new CustomEvent('clothing-catalog-icons-changed'));
          showToast(`Иконка «${CATEGORIES.find((item) => item.id === categoryId)?.label || categoryId}» обновлена`);
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
        const categoryId = button.dataset.categoryId;

        isUploading = true;
        iconsList.classList.add('is-loading');

        try {
          const response = await fetch(`/api/clothing-catalog-icons/${categoryId}`, { method: 'DELETE' });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Не удалось сбросить иконку');

          icons[categoryId] = payload;
          renderIconsList();
          window.dispatchEvent(new CustomEvent('clothing-catalog-icons-changed'));
          showToast(`Иконка «${CATEGORIES.find((item) => item.id === categoryId)?.label || categoryId}» сброшена`);
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
    if (!hasIconsAdmin) return;

    try {
      const response = await fetch('/api/clothing-catalog-icons');
      if (!response.ok) throw new Error('Не удалось загрузить иконки');
      const payload = await response.json();
      icons = payload.icons || {};
      renderIconsList();
    } catch (error) {
      iconsList.innerHTML = `<p class="admin-section-icons-error">${error.message}</p>`;
    }
  }

  openBtn.addEventListener('click', openClothingSection);
  backBtn?.addEventListener('click', () => {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('dashboard');
    }
  });

  chooseBannerBtn.addEventListener('click', () => {
    if (typeof window.openClothingBannerEditor === 'function') {
      window.openClothingBannerEditor();
    }
  });

  if (hasIconsAdmin) {
    chooseIconsBtn.addEventListener('click', openIconsModal);
    iconsClose.addEventListener('click', closeIconsModal);
    iconsBack.addEventListener('click', closeIconsModal);

    iconsModal.addEventListener('click', (event) => {
      if (event.target === iconsModal) closeIconsModal();
    });
  }

  if (hasAlertsAdmin) {
    chooseAlertsBtn.addEventListener('click', openAlertsModal);
    alertsClose.addEventListener('click', closeAlertsModal);
    alertsBack.addEventListener('click', closeAlertsModal);
    addAlertBtn.addEventListener('click', () => openAlertForm());
    cancelAlertBtn?.addEventListener('click', closeAlertForm);
    deleteAlertBtn?.addEventListener('click', async () => {
      if (!editingAlertId) return;
      const alert = alerts.find((item) => item.id === editingAlertId);
      if (!alert) return;
      if (!window.confirm(`Удалить предложение «${alert.title}»?`)) return;
      await deleteAlert(editingAlertId);
    });
    alertsForm.addEventListener('submit', saveAlert);

    alertsModal.addEventListener('click', (event) => {
      if (event.target === alertsModal) closeAlertsModal();
    });
  }

  if (hasPromoAdmin) {
    choosePromoBtn.addEventListener('click', openPromoModal);
    promoClose.addEventListener('click', closePromoModal);
    promoBack.addEventListener('click', closePromoModal);
    promoForm.addEventListener('submit', savePromo);
    promoForm.addEventListener('input', renderPromoPreview);

    promoPickImageBtn.addEventListener('click', () => {
      if (isSavingPromo) return;
      promoImageInput?.click();
    });

    promoImageInput?.addEventListener('change', async () => {
      const file = promoImageInput.files?.[0];
      promoImageInput.value = '';
      if (!file || isSavingPromo) return;

      try {
        pendingPromoImage = await readFileAsDataUrl(file);
        removePromoImage = false;
        renderPromoPreview();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });

    promoRemoveImageBtn?.addEventListener('click', () => {
      if (isSavingPromo) return;
      pendingPromoImage = '';
      removePromoImage = true;
      renderPromoPreview();
    });

    promoModal.addEventListener('click', (event) => {
      if (event.target === promoModal) closePromoModal();
    });
  }

  window.openAdminClothingGate = openClothingSection;
  window.closeAllClothingAdmin = closeClothingOverlays;
})();
