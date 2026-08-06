(function initAdminClothingCatalogIconsPage() {
  const section = document.getElementById('adminSectionClothingCatalogIcons');
  const layout = document.getElementById('adminClothingCatalogIconsLayout');
  const pageBackBtn = document.getElementById('adminClothingCatalogIconsPageBack');
  const countEl = document.getElementById('adminClothingCatalogIconsCount');
  const listEl = document.getElementById('adminClothingCatalogIconsList');
  const formEl = document.getElementById('adminClothingCatalogIconsForm');
  const formTitle = document.getElementById('adminClothingCatalogIconsFormTitle');
  const saveBtn = document.getElementById('adminClothingCatalogIconsSaveBtn');
  const cancelBtn = document.getElementById('adminClothingCatalogIconsCancelBtn');
  const resetBtn = document.getElementById('adminClothingCatalogIconsResetBtn');
  const pickImageBtn = document.getElementById('adminClothingCatalogIconsPickImage');
  const removeImageBtn = document.getElementById('adminClothingCatalogIconsRemoveImage');
  const imageInput = document.getElementById('adminClothingCatalogIconsImageInput');
  const imagePreview = document.getElementById('adminClothingCatalogIconsImagePreview');
  const successEl = document.getElementById('adminClothingCatalogIconsSuccess');
  const warningEl = document.getElementById('adminClothingCatalogIconsWarning');

  if (!section || !layout || !listEl || !formEl) return;

  const CATEGORIES = [
    { id: 'men', label: 'Мужчинам', glyph: 'M' },
    { id: 'women', label: 'Женщинам', glyph: 'W' },
    { id: 'shirts', label: 'Рубашки', glyph: 'S' },
    { id: 'pants', label: 'Брюки', glyph: 'P' },
    { id: 'jeans', label: 'Джинсы', glyph: 'J' },
    { id: 'accessories', label: 'Аксессуары', glyph: 'A' }
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

  function getCategoryMeta(categoryId) {
    return CATEGORIES.find((item) => item.id === categoryId) || { id: categoryId, label: categoryId, glyph: '?' };
  }

  function getIconData(categoryId) {
    return icons[categoryId] || {};
  }

  function hasCustomIcon(categoryId) {
    return Boolean(getIconData(categoryId).image);
  }

  function getDisplayUrl(categoryId) {
    const data = getIconData(categoryId);
    return data.image ? data.image.split('?')[0] : '';
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
        imagePreview.alt = editingId ? getCategoryMeta(editingId).label : 'Предпросмотр иконки';
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
    formTitle.textContent = 'Иконка категории';
    showMessage(successEl, '');
    showMessage(warningEl, '');
    updatePreviewUi();
    setSavingState(false);
    renderList();
  }

  function renderList() {
    const customCount = CATEGORIES.filter((item) => hasCustomIcon(item.id)).length;
    if (countEl) countEl.textContent = formatCustomCount(customCount);

    listEl.innerHTML = CATEGORIES.map((category) => {
      const displayUrl = getDisplayUrl(category.id);
      const isCustom = hasCustomIcon(category.id);
      const statusLabel = isCustom ? 'Загружена своя иконка' : 'Буквенная иконка по умолчанию';
      const isActive = editingId === category.id;

      return `
        <li class="admin-fitness-product-item admin-clothing-catalog-icons-item${isActive ? ' is-active' : ''}" data-select-id="${category.id}" role="button" tabindex="0" aria-label="Редактировать иконку «${escapeHtml(category.label)}»">
          ${displayUrl
            ? `<button type="button" class="admin-clothing-catalog-icons-thumb-btn" data-zoom-src="${escapeHtml(displayUrl)}" data-zoom-label="${escapeHtml(category.label)}" aria-label="Увеличить иконку «${escapeHtml(category.label)}»">
                <span class="admin-section-icon-preview quick-link-icon admin-clothing-catalog-icons-thumb">
                  <img src="${escapeHtml(previewSrc(displayUrl))}" alt="" width="44" height="44">
                </span>
              </button>`
            : `<span class="admin-section-icon-preview quick-link-icon admin-clothing-catalog-icons-thumb is-empty">
                <span class="admin-clothing-catalog-icons-glyph">${escapeHtml(category.glyph)}</span>
              </span>`}
          <div class="admin-fitness-product-info">
            <strong>${escapeHtml(category.label)}</strong>
            <p>${escapeHtml(statusLabel)}</p>
            <span class="admin-clothing-catalog-icons-pick-meta">${isCustom ? 'Своя иконка' : 'По умолчанию'}</span>
          </div>
          <div class="admin-fitness-product-actions">
            ${isCustom
              ? `<button type="button" class="btn btn-ghost btn-ghost-danger" data-reset-id="${category.id}">Сбросить</button>`
              : ''}
          </div>
        </li>`;
    }).join('');
  }

  async function fetchIcons() {
    listEl.classList.add('is-loading');
    try {
      const response = await fetch('/api/clothing-catalog-icons');
      if (!response.ok) throw new Error('Не удалось загрузить иконки');
      const payload = await response.json();
      icons = payload.icons || {};
      renderList();
      if (editingId && !formEl.hidden) {
        updatePreviewUi();
      }
    } catch (error) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-clothing-catalog-icons-empty">
          <strong>Не удалось загрузить иконки</strong>
          <p>${escapeHtml(error.message)}</p>
        </li>`;
    } finally {
      listEl.classList.remove('is-loading');
    }
  }

  function openEditForm(categoryId) {
    if (!getCategoryMeta(categoryId)) return;

    editingId = categoryId;
    pendingImageData = null;
    removePending = false;
    if (imageInput) imageInput.value = '';
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = getCategoryMeta(categoryId).label;
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
      const response = await fetch(`/api/clothing-catalog-icons/${editingId}`, {
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

      showToast(`Иконка «${getCategoryMeta(editingId).label}» сохранена`);
      showMessage(successEl, 'Иконка сохранена');
      window.dispatchEvent(new CustomEvent('clothing-catalog-icons-changed'));
      await fetchIcons();
      updatePreviewUi();
    } catch (error) {
      showToast(error.message || 'Не удалось сохранить иконку', 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function resetIcon(categoryId) {
    if (isSaving) return;
    const label = getCategoryMeta(categoryId).label;
    if (!window.confirm(`Сбросить иконку «${label}» к стандартной?`)) return;

    setSavingState(true);
    try {
      const response = await fetch(`/api/clothing-catalog-icons/${categoryId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось сбросить иконку');

      icons[categoryId] = payload;
      showToast(`Иконка «${label}» сброшена`);
      window.dispatchEvent(new CustomEvent('clothing-catalog-icons-changed'));

      if (editingId === categoryId) {
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
      window.showAdminSection('clothingCatalogIcons');
    }
    resetForm();
    await fetchIcons();
  }

  function closePage() {
    resetForm();
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
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

  window.addEventListener('clothing-catalog-icons-changed', fetchIcons);

  window.openAdminClothingCatalogIconsPage = openPage;
  window.adminClothingCatalogIconsGoBack = () => {
    if (!formEl.hidden) {
      resetForm();
      return;
    }
    closePage();
  };
})();
