(function initAdminSectionIconsPage() {
  const section = document.getElementById('adminSectionIcons');
  const layout = document.getElementById('adminSectionIconsLayout');
  const pageBackBtn = document.getElementById('adminSectionIconsPageBack');
  const countEl = document.getElementById('adminSectionIconsCount');
  const listEl = document.getElementById('adminSectionIconsList');
  const formEl = document.getElementById('adminSectionIconsForm');
  const formTitle = document.getElementById('adminSectionIconsFormTitle');
  const saveBtn = document.getElementById('adminSectionIconsSaveBtn');
  const cancelBtn = document.getElementById('adminSectionIconsCancelBtn');
  const resetBtn = document.getElementById('adminSectionIconsResetBtn');
  const pickImageBtn = document.getElementById('adminSectionIconsPickImage');
  const removeImageBtn = document.getElementById('adminSectionIconsRemoveImage');
  const imageInput = document.getElementById('adminSectionIconsImageInput');
  const imagePreview = document.getElementById('adminSectionIconsImagePreview');
  const successEl = document.getElementById('adminSectionIconsSuccess');
  const warningEl = document.getElementById('adminSectionIconsWarning');

  if (!section || !layout || !listEl || !formEl) return;

  const SECTIONS = [
    { id: 'supplements', label: 'Фитнес-индустрия', iconClass: '' },
    { id: 'banners', label: 'Мои Баннеры', iconClass: ' quick-link-icon--banners' },
    { id: 'clothing', label: 'Одежда', iconClass: ' quick-link-icon--clothing' }
  ];

  const ICON_RECOMMENDED = { width: 88, height: 88 };
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  let icons = {};
  let editingId = null;
  let pendingImageData = null;
  let removePending = false;
  let isSaving = false;

  function showToast(message, type = 'success') {
    window.showAdminToast(message, type);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function getSectionMeta(sectionId) {
    return SECTIONS.find((item) => item.id === sectionId) || { id: sectionId, label: sectionId, iconClass: '' };
  }

  function getIconData(sectionId) {
    return icons[sectionId] || {};
  }

  function hasCustomIcon(sectionId) {
    return Boolean(getIconData(sectionId).image);
  }

  function getDisplayUrl(sectionId) {
    const data = getIconData(sectionId);
    if (data.image) return data.image.split('?')[0];
    if (data.default) return data.default.split('?')[0];
    return '';
  }

  function formatCustomCount(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} своя иконка`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} свои иконки`;
    return `${count} своих иконок`;
  }

  function showMessage(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  function getImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
      img.src = dataUrl;
    });
  }

  function isValidImageFile(file) {
    if (/^image\/(jpeg|png|webp)$/i.test(file.type || '')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  }

  function previewSrc(url) {
    if (!url) return '';
    return url.startsWith('data:') ? url : `${url.split('?')[0]}?t=${Date.now()}`;
  }

  function setSavingState(saving) {
    isSaving = saving;
    formEl.classList.toggle('is-saving', saving);
    if (saveBtn) {
      saveBtn.disabled = saving;
      saveBtn.textContent = saving ? 'Сохранение…' : 'Сохранить иконку';
    }
    if (resetBtn) resetBtn.disabled = saving;
  }

  function openPreviewLightbox(src, alt = '') {
    if (!src || typeof window.openImageLightbox !== 'function') return;
    window.openImageLightbox(src.split('?')[0], alt);
  }

  function getPreviewUrl() {
    if (pendingImageData) return pendingImageData;
    if (editingId && !removePending) {
      const data = getIconData(editingId);
      if (data.image) return data.image.split('?')[0];
      if (data.default) return data.default.split('?')[0];
    }
    return '';
  }

  function updatePreviewUi() {
    const previewUrl = getPreviewUrl();
    const hasImage = Boolean(previewUrl);

    if (imagePreview) {
      if (hasImage) {
        imagePreview.src = previewSrc(previewUrl);
        imagePreview.hidden = false;
        imagePreview.removeAttribute('hidden');
        imagePreview.classList.add('is-zoomable');
        imagePreview.dataset.zoomSrc = previewUrl.startsWith('data:') ? '' : previewUrl.split('?')[0];
        imagePreview.alt = editingId ? getSectionMeta(editingId).label : 'Предпросмотр иконки';
        imagePreview.title = 'Нажмите, чтобы увеличить';
      } else {
        imagePreview.removeAttribute('src');
        imagePreview.hidden = true;
        imagePreview.classList.remove('is-zoomable');
        delete imagePreview.dataset.zoomSrc;
        imagePreview.removeAttribute('title');
      }
    }

    if (removeImageBtn) {
      removeImageBtn.hidden = !hasImage || !pendingImageData;
    }

    if (resetBtn && editingId) {
      resetBtn.hidden = !hasCustomIcon(editingId) || Boolean(pendingImageData);
    }
  }

  function resetForm() {
    editingId = null;
    pendingImageData = null;
    removePending = false;
    if (imageInput) imageInput.value = '';
    formEl.hidden = true;
    layout.classList.remove('is-editing');
    formTitle.textContent = 'Иконка раздела';
    showMessage(successEl, '');
    showMessage(warningEl, '');
    updatePreviewUi();
    setSavingState(false);
    renderList();
  }

  function renderList() {
    const customCount = SECTIONS.filter((item) => hasCustomIcon(item.id)).length;
    if (countEl) countEl.textContent = formatCustomCount(customCount);

    listEl.innerHTML = SECTIONS.map((sectionItem) => {
      const data = getIconData(sectionItem.id);
      const displayUrl = getDisplayUrl(sectionItem.id);
      const isCustom = hasCustomIcon(sectionItem.id);
      const statusLabel = isCustom ? 'Загружена своя иконка' : 'Используется стандартная иконка';
      const isActive = editingId === sectionItem.id;

      return `
        <li class="admin-fitness-product-item admin-section-icons-item${isActive ? ' is-active' : ''}" data-select-id="${sectionItem.id}" role="button" tabindex="0" aria-label="Редактировать иконку «${escapeHtml(sectionItem.label)}»">
          ${displayUrl
            ? `<button type="button" class="admin-section-icons-thumb-btn" data-zoom-src="${escapeHtml(displayUrl)}" data-zoom-label="${escapeHtml(sectionItem.label)}" aria-label="Увеличить иконку «${escapeHtml(sectionItem.label)}»">
                <span class="admin-section-icon-preview quick-link-icon${sectionItem.iconClass} admin-section-icons-thumb">
                  <img src="${escapeHtml(previewSrc(displayUrl))}" alt="" width="44" height="44">
                </span>
              </button>`
            : `<span class="admin-section-icon-preview quick-link-icon${sectionItem.iconClass} admin-section-icons-thumb is-empty"><span class="admin-section-icon-empty">—</span></span>`}
          <div class="admin-fitness-product-info">
            <strong>${escapeHtml(sectionItem.label)}</strong>
            <p>${escapeHtml(statusLabel)}</p>
            <span class="admin-section-icons-pick-meta">${isCustom ? 'Своя иконка' : 'По умолчанию'}</span>
          </div>
          <div class="admin-fitness-product-actions">
            ${isCustom
              ? `<button type="button" class="btn btn-ghost btn-ghost-danger" data-reset-id="${sectionItem.id}">Сбросить</button>`
              : ''}
          </div>
        </li>`;
    }).join('');
  }

  async function fetchIcons() {
    listEl.classList.add('is-loading');
    try {
      const response = await fetch('/api/section-icons');
      if (!response.ok) throw new Error('Не удалось загрузить иконки');
      const payload = await response.json();
      icons = payload.icons || {};
      renderList();
      if (editingId && !formEl.hidden) {
        updatePreviewUi();
      }
    } catch (error) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-section-icons-empty">
          <strong>Не удалось загрузить иконки</strong>
          <p>${escapeHtml(error.message)}</p>
        </li>`;
    } finally {
      listEl.classList.remove('is-loading');
    }
  }

  function openEditForm(sectionId) {
    if (!getSectionMeta(sectionId)) return;

    editingId = sectionId;
    pendingImageData = null;
    removePending = false;
    if (imageInput) imageInput.value = '';
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = getSectionMeta(sectionId).label;
    showMessage(successEl, '');
    showMessage(warningEl, '');
    updatePreviewUi();
    renderList();
    pickImageBtn?.focus();
  }

  async function saveIcon() {
    if (isSaving || !editingId) return;

    if (!pendingImageData) {
      showToast('Выберите изображение иконки', 'error');
      return;
    }

    setSavingState(true);
    showMessage(successEl, '');
    showMessage(warningEl, '');

    try {
      const { width, height } = await getImageDimensions(pendingImageData);
      const response = await fetch(`/api/section-icons/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: pendingImageData })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось сохранить иконку');

      icons[editingId] = payload;
      pendingImageData = null;
      removePending = false;
      if (imageInput) imageInput.value = '';

      if (width !== ICON_RECOMMENDED.width || height !== ICON_RECOMMENDED.height) {
        showMessage(
          warningEl,
          `Загружено ${width}×${height} px — рекомендуется ${ICON_RECOMMENDED.width}×${ICON_RECOMMENDED.height} px`
        );
      }

      showToast(`Иконка «${getSectionMeta(editingId).label}» сохранена`);
      showMessage(successEl, 'Иконка сохранена');
      window.dispatchEvent(new CustomEvent('section-icons-changed'));
      await fetchIcons();
      updatePreviewUi();
    } catch (error) {
      showToast(error.message || 'Не удалось сохранить иконку', 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function resetIcon(sectionId) {
    if (isSaving) return;
    const label = getSectionMeta(sectionId).label;
    if (!window.confirm(`Сбросить иконку «${label}» к стандартной?`)) return;

    setSavingState(true);
    try {
      const response = await fetch(`/api/section-icons/${sectionId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось сбросить иконку');

      icons[sectionId] = payload;
      showToast(`Иконка «${label}» сброшена`);
      window.dispatchEvent(new CustomEvent('section-icons-changed'));

      if (editingId === sectionId) {
        pendingImageData = null;
        removePending = false;
        if (imageInput) imageInput.value = '';
        showMessage(successEl, '');
        showMessage(warningEl, '');
        updatePreviewUi();
      } else {
        resetForm();
      }

      await fetchIcons();
    } catch (error) {
      showToast(error.message || 'Не удалось сбросить иконку', 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function openPage() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('sectionIcons');
    }
    resetForm();
    await fetchIcons();
  }

  function closePage() {
    resetForm();
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('appearance');
    }
  }

  cancelBtn?.addEventListener('click', resetForm);
  saveBtn?.addEventListener('click', saveIcon);
  pickImageBtn?.addEventListener('click', () => imageInput?.click());
  pageBackBtn?.addEventListener('click', closePage);

  resetBtn?.addEventListener('click', () => {
    if (editingId) resetIcon(editingId);
  });

  removeImageBtn?.addEventListener('click', () => {
    pendingImageData = null;
    removePending = false;
    if (imageInput) imageInput.value = '';
    updatePreviewUi();
  });

  imagePreview?.addEventListener('click', () => {
    const src = imagePreview.dataset.zoomSrc || imagePreview.src;
    if (imagePreview.hidden || !src) return;
    openPreviewLightbox(src, imagePreview.alt || 'Иконка');
  });

  imageInput?.addEventListener('change', async () => {
    const file = imageInput.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      showToast('Поддерживаются только JPG, PNG и WebP', 'error');
      imageInput.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast('Файл слишком большой. Максимум — 5 МБ', 'error');
      imageInput.value = '';
      return;
    }

    try {
      pendingImageData = await readFileAsDataUrl(file);
      removePending = false;
      updatePreviewUi();
    } catch (error) {
      showToast(error.message || 'Не удалось прочитать файл', 'error');
    }
  });

  listEl.addEventListener('click', (event) => {
    const resetButton = event.target.closest('[data-reset-id]');
    if (resetButton) {
      event.preventDefault();
      event.stopPropagation();
      resetIcon(resetButton.dataset.resetId);
      return;
    }

    const zoomBtn = event.target.closest('[data-zoom-src]');
    if (zoomBtn) {
      event.preventDefault();
      event.stopPropagation();
      openPreviewLightbox(zoomBtn.dataset.zoomSrc, zoomBtn.dataset.zoomLabel || 'Иконка');
      return;
    }

    const row = event.target.closest('[data-select-id]');
    if (row) {
      openEditForm(row.dataset.selectId);
    }
  });

  listEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-select-id]');
    if (!row) return;
    event.preventDefault();
    openEditForm(row.dataset.selectId);
  });

  window.addEventListener('section-icons-changed', fetchIcons);

  window.openAdminSectionIconsPage = openPage;
  window.adminSectionIconsGoBack = () => {
    if (!formEl.hidden) {
      resetForm();
      return;
    }
    closePage();
  };
})();
