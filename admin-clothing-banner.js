(function initAdminClothingBannerPage() {
  const section = document.getElementById('adminSectionClothingBanner');
  const layout = document.getElementById('adminClothingBannerLayout');
  const pageBackBtn = document.getElementById('adminClothingBannerPageBack');
  const countEl = document.getElementById('adminClothingBannerCount');
  const listEl = document.getElementById('adminClothingBannerList');
  const formEl = document.getElementById('adminClothingBannerForm');
  const formTitle = document.getElementById('adminClothingBannerFormTitle');
  const addBtn = document.getElementById('adminClothingBannerAdd');
  const saveBtn = document.getElementById('adminClothingBannerSaveBtn');
  const cancelBtn = document.getElementById('adminClothingBannerCancelBtn');
  const deleteBtn = document.getElementById('adminClothingBannerDeleteBtn');
  const pickImageBtn = document.getElementById('adminClothingBannerPickImage');
  const removeImageBtn = document.getElementById('adminClothingBannerRemoveImage');
  const imageInput = document.getElementById('adminClothingBannerImageInput');
  const editPreview = document.getElementById('adminClothingBannerEditPreview');
  const editPreviewImg = document.getElementById('adminClothingBannerEditPreviewImg');
  const dragHint = document.getElementById('adminClothingBannerDragHint');
  const fitControls = document.getElementById('adminClothingBannerFitControls');
  const scaleInput = document.getElementById('adminClothingBannerScale');
  const scaleValue = document.getElementById('adminClothingBannerScaleVal');
  const saveFitBtn = document.getElementById('adminClothingBannerSaveFit');
  const successEl = document.getElementById('adminClothingBannerSuccess');
  const warningEl = document.getElementById('adminClothingBannerWarning');

  if (!section || !layout || !listEl || !formEl || !window.ClothingBanners) return;

  const {
    CLOTHING_MAX_SLIDES,
    CLOTHING_RECOMMENDED,
    SLIDE_GRADIENTS,
    DEFAULT_FIT,
    MAX_FILE_SIZE,
    load: loadSlideData,
    remove: removeSlide,
    commitSlide,
    createSlide,
    saveFit: saveSlideFit,
    getFilledSlideEntries,
    getNextFreeIndex,
    normalizeFit,
    applyFitToImg,
    isRatioOk
  } = window.ClothingBanners;

  let slideData = [];
  let editingIndex = null;
  let pendingImageData = null;
  let removeImage = false;
  let isSaving = false;
  let currentFit = { ...DEFAULT_FIT };
  let isDragging = false;
  let dragStart = { x: 0, y: 0, fitX: 50, fitY: 50 };

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

  function escapeCssUrl(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, '%27');
  }

  function formatCount(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} баннер`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} баннера`;
    return `${count} баннеров`;
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

  function setSavingState(saving) {
    isSaving = saving;
    formEl.classList.toggle('is-saving', saving);
    if (saveBtn) {
      saveBtn.disabled = saving;
      saveBtn.textContent = saving ? 'Сохранение…' : 'Сохранить баннер';
    }
    if (saveFitBtn) saveFitBtn.disabled = saving;
    if (addBtn) addBtn.disabled = saving;
    if (deleteBtn) deleteBtn.disabled = saving;
  }

  function openPreviewLightbox(src, alt = '') {
    if (!src || typeof window.openImageLightbox !== 'function') return;
    window.openImageLightbox(src.split('?')[0], alt, { full: true });
  }

  function previewSrc(url) {
    if (!url) return '';
    return url.startsWith('data:') ? url : `${url.split('?')[0]}?t=${Date.now()}`;
  }

  function syncScaleUi() {
    if (!scaleInput || !scaleValue) return;
    const percent = Math.round(currentFit.scale * 100);
    scaleInput.value = String(percent);
    scaleValue.textContent = `${percent}%`;
  }

  function applyCurrentFit() {
    if (!editPreviewImg || editPreviewImg.hidden) return;
    applyFitToImg(editPreviewImg, currentFit);
  }

  function setFitControlsVisible(visible) {
    if (fitControls) fitControls.hidden = !visible;
    if (dragHint) dragHint.hidden = !visible;
    editPreview?.classList.toggle('is-editable', visible);
  }

  function loadFitFromSlide() {
    const existing = editingIndex !== null ? slideData[editingIndex] : null;
    currentFit = normalizeFit(existing?.fit || DEFAULT_FIT);
    syncScaleUi();
    applyCurrentFit();
  }

  function getPreviewUrl() {
    const existing = editingIndex !== null ? slideData[editingIndex] : null;
    if (pendingImageData) return pendingImageData;
    if (existing?.image && !removeImage) return existing.image.split('?')[0];
    return '';
  }

  function getPreviewGradient() {
    const index = editingIndex !== null ? editingIndex : getNextFreeIndex(slideData);
    const gradientIndex = index >= 0 ? index : 0;
    return SLIDE_GRADIENTS[gradientIndex % SLIDE_GRADIENTS.length];
  }

  function thumbBackgroundStyle(slide) {
    const imageUrl = slide.image ? slide.image.split('?')[0] : '';
    if (!imageUrl) return '';

    const fit = normalizeFit(slide.fit || DEFAULT_FIT);
    const bgSize = fit.scale === 1 ? 'cover' : `${fit.scale * 100}%`;
    const src = escapeCssUrl(previewSrc(imageUrl));
    return `background-image:url('${src}');background-size:${bgSize};background-position:${fit.x}% ${fit.y}%;`;
  }

  function updateImageUi() {
    const previewUrl = getPreviewUrl();
    const hasImage = Boolean(previewUrl);

    if (editPreview) {
      editPreview.style.background = hasImage ? '' : getPreviewGradient();
      editPreview.classList.toggle('has-image', hasImage);
    }

    if (editPreviewImg) {
      if (hasImage) {
        editPreviewImg.src = previewSrc(previewUrl);
        editPreviewImg.hidden = false;
        editPreviewImg.removeAttribute('hidden');
        if (pendingImageData) {
          currentFit = { ...DEFAULT_FIT };
          syncScaleUi();
        } else {
          loadFitFromSlide();
        }
        applyCurrentFit();
        setFitControlsVisible(true);
      } else {
        editPreviewImg.removeAttribute('src');
        editPreviewImg.hidden = true;
        setFitControlsVisible(false);
      }
    }

    if (removeImageBtn) {
      removeImageBtn.hidden = !hasImage;
    }
  }

  function stopDragging() {
    if (!isDragging) return;
    isDragging = false;
    editPreview?.classList.remove('is-dragging');
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
    window.removeEventListener('touchmove', onWindowTouchMove);
    window.removeEventListener('touchend', onWindowTouchEnd);
  }

  function onDragMove(clientX, clientY) {
    if (!editPreview) return;
    const rect = editPreview.getBoundingClientRect();
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    const factor = 0.35 * (2 / currentFit.scale);

    currentFit.x = Math.min(100, Math.max(0, dragStart.fitX - (dx / rect.width) * 100 * factor));
    currentFit.y = Math.min(100, Math.max(0, dragStart.fitY - (dy / rect.height) * 100 * factor));
    applyCurrentFit();
  }

  function onWindowMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    onDragMove(e.clientX, e.clientY);
  }

  function onWindowMouseUp() {
    stopDragging();
  }

  function onWindowTouchMove(e) {
    if (!isDragging || !e.touches[0]) return;
    e.preventDefault();
    onDragMove(e.touches[0].clientX, e.touches[0].clientY);
  }

  function onWindowTouchEnd() {
    stopDragging();
  }

  function startDragging(clientX, clientY) {
    if (!editPreviewImg || editPreviewImg.hidden || fitControls?.hidden) return;
    isDragging = true;
    dragStart = { x: clientX, y: clientY, fitX: currentFit.x, fitY: currentFit.y };
    editPreview.classList.add('is-dragging');
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowTouchEnd);
  }

  function resetForm() {
    editingIndex = null;
    pendingImageData = null;
    removeImage = false;
    currentFit = { ...DEFAULT_FIT };
    stopDragging();
    if (imageInput) imageInput.value = '';
    formEl.hidden = true;
    layout.classList.remove('is-editing');
    formTitle.textContent = 'Новый баннер';
    deleteBtn.hidden = true;
    showMessage(successEl, '');
    showMessage(warningEl, '');
    updateImageUi();
    setSavingState(false);
    renderList();
  }

  function renderList() {
    const entries = getFilledSlideEntries(slideData);
    if (countEl) countEl.textContent = formatCount(entries.length);
    if (addBtn) addBtn.disabled = getNextFreeIndex(slideData) < 0;

    if (!entries.length) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-clothing-banner-empty">
          <span class="admin-fitness-empty-icon" aria-hidden="true">🖼️</span>
          <strong>Баннеров пока нет</strong>
          <p>Добавьте первый hero-баннер — он появится в разделе «Одежда» на сайте</p>
        </li>`;
      return;
    }

    listEl.innerHTML = entries.map(({ index, slide }) => {
      const imageUrl = slide.image ? slide.image.split('?')[0] : '';
      const sizeLabel = slide.width && slide.height ? `${slide.width}×${slide.height}` : 'Hero-слайд';
      const thumbStyle = thumbBackgroundStyle(slide);

      return `
        <li class="admin-fitness-product-item admin-clothing-banner-item${editingIndex === index ? ' is-active' : ''}" data-select-index="${index}" role="button" tabindex="0" aria-label="Редактировать баннер ${index + 1}">
          ${imageUrl
            ? `<button type="button" class="admin-clothing-banner-thumb-btn" data-zoom-src="${escapeHtml(imageUrl)}" data-zoom-label="Баннер ${index + 1}" aria-label="Увеличить баннер ${index + 1}">
                <span class="admin-fitness-product-thumb admin-clothing-banner-thumb admin-clothing-banner-thumb-bg" style="${thumbStyle}" role="img" aria-hidden="true"></span>
              </button>`
            : '<div class="admin-fitness-product-thumb admin-fitness-product-thumb--placeholder admin-clothing-banner-thumb--placeholder"><span>?</span></div>'}
          <div class="admin-fitness-product-info">
            <strong>Баннер ${index + 1}</strong>
            <p>${escapeHtml(sizeLabel)}</p>
            <span class="admin-clothing-banner-pick-meta">Hero · 400×360</span>
          </div>
          <div class="admin-fitness-product-actions">
            <button type="button" class="btn btn-ghost btn-ghost-danger" data-delete-index="${index}">Удалить</button>
          </div>
        </li>`;
    }).join('');
  }

  async function fetchSlides() {
    listEl.classList.add('is-loading');
    try {
      slideData = await loadSlideData();
      renderList();
      if (editingIndex !== null && !formEl.hidden) {
        updateImageUi();
      }
    } finally {
      listEl.classList.remove('is-loading');
    }
  }

  function openCreateForm() {
    if (getNextFreeIndex(slideData) < 0) {
      showToast(`Максимум ${CLOTHING_MAX_SLIDES} баннеров`, 'error');
      return;
    }

    editingIndex = null;
    pendingImageData = null;
    removeImage = false;
    currentFit = { ...DEFAULT_FIT };
    stopDragging();
    if (imageInput) imageInput.value = '';
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = 'Новый баннер';
    deleteBtn.hidden = true;
    showMessage(successEl, '');
    showMessage(warningEl, '');
    updateImageUi();
    renderList();
    pickImageBtn?.focus();
  }

  function openEditForm(index) {
    const slide = slideData[index];
    if (!slide) return;

    editingIndex = index;
    pendingImageData = null;
    removeImage = false;
    stopDragging();
    if (imageInput) imageInput.value = '';
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = `Баннер ${index + 1}`;
    deleteBtn.hidden = false;
    showMessage(successEl, '');
    showMessage(warningEl, '');
    updateImageUi();
    renderList();
    pickImageBtn?.focus();
  }

  async function saveBanner() {
    if (isSaving) return;

    const hasPending = Boolean(pendingImageData);
    if (editingIndex === null && !hasPending) {
      showToast('Загрузите изображение баннера', 'error');
      return;
    }

    if (editingIndex !== null && !hasPending && !removeImage) {
      showToast('Нет изменений для сохранения', 'error');
      return;
    }

    setSavingState(true);
    showMessage(successEl, '');
    showMessage(warningEl, '');

    try {
      if (editingIndex === null) {
        const { width, height } = await getImageDimensions(pendingImageData);
        await createSlide({
          image: pendingImageData,
          width,
          height,
          fit: normalizeFit(currentFit)
        });

        if (!isRatioOk(width, height)) {
          showMessage(
            warningEl,
            `Загружено ${width}×${height} px — рекомендуется ${CLOTHING_RECOMMENDED.width}×${CLOTHING_RECOMMENDED.height} px`
          );
        }

        showToast('Баннер добавлен');
      } else if (removeImage && !hasPending) {
        await removeSlide(slideData, editingIndex);
        showToast(`Баннер ${editingIndex + 1} удалён`);
        resetForm();
      } else if (hasPending) {
        const { width, height } = await getImageDimensions(pendingImageData);
        const slide = {
          image: pendingImageData,
          width,
          height,
          fit: normalizeFit(currentFit)
        };
        await commitSlide(slideData, editingIndex, slide);

        if (!isRatioOk(width, height)) {
          showMessage(
            warningEl,
            `Загружено ${width}×${height} px — рекомендуется ${CLOTHING_RECOMMENDED.width}×${CLOTHING_RECOMMENDED.height} px`
          );
        }

        showToast(`Баннер ${editingIndex + 1} сохранён`);
        showMessage(successEl, `Баннер ${editingIndex + 1} сохранён`);
      }

      pendingImageData = null;
      removeImage = false;
      if (imageInput) imageInput.value = '';
      await fetchSlides();

      if (editingIndex === null) {
        resetForm();
      } else {
        updateImageUi();
      }
    } catch (error) {
      if (error.message.includes('fetch') || error.message.includes('Сервер')) {
        showToast('Сервер недоступен. Запустите Docker: docker compose up -d', 'error');
      } else {
        showToast(error.message || 'Не удалось сохранить баннер', 'error');
      }
    } finally {
      setSavingState(false);
    }
  }

  async function saveFit() {
    if (isSaving || editingIndex === null) return;

    const previewUrl = getPreviewUrl();
    if (!previewUrl) {
      showToast('Сначала загрузите изображение', 'error');
      return;
    }

    setSavingState(true);
    showMessage(successEl, '');
    showMessage(warningEl, '');

    try {
      if (pendingImageData) {
        showToast('Сначала сохраните баннер, затем размещение', 'error');
        return;
      }

      await saveSlideFit(slideData, editingIndex, currentFit);
      showToast('Размещение баннера сохранено');
      showMessage(successEl, 'Размещение баннера сохранено');
      await fetchSlides();
    } catch (error) {
      showToast(error.message || 'Не удалось сохранить размещение', 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function deleteBanner(index) {
    if (isSaving) return;
    if (!window.confirm(`Удалить баннер ${index + 1}?`)) return;

    setSavingState(true);
    try {
      await removeSlide(slideData, index);
      showToast(`Баннер ${index + 1} удалён`);
      resetForm();
      await fetchSlides();
    } catch (error) {
      showToast(error.message || 'Не удалось удалить баннер', 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function openPage() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothingBanner');
    }
    resetForm();
    await fetchSlides();
  }

  function closePage() {
    resetForm();
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
  }

  addBtn?.addEventListener('click', openCreateForm);
  cancelBtn?.addEventListener('click', resetForm);
  saveBtn?.addEventListener('click', saveBanner);
  saveFitBtn?.addEventListener('click', saveFit);
  pickImageBtn?.addEventListener('click', () => imageInput?.click());
  pageBackBtn?.addEventListener('click', closePage);

  editPreview?.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    startDragging(e.clientX, e.clientY);
  });

  editPreview?.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    startDragging(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  editPreview?.addEventListener('wheel', (e) => {
    if (fitControls?.hidden) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    currentFit.scale = Math.min(3, Math.max(1, currentFit.scale + delta));
    syncScaleUi();
    applyCurrentFit();
  }, { passive: false });

  editPreview?.addEventListener('dblclick', () => {
    const src = getPreviewUrl();
    if (!src) return;
    openPreviewLightbox(src, formTitle.textContent || 'Баннер');
  });

  scaleInput?.addEventListener('input', () => {
    currentFit.scale = Math.min(3, Math.max(1, Number(scaleInput.value) / 100));
    scaleValue.textContent = `${Math.round(currentFit.scale * 100)}%`;
    applyCurrentFit();
  });

  deleteBtn?.addEventListener('click', () => {
    if (editingIndex === null) return;
    deleteBanner(editingIndex);
  });

  removeImageBtn?.addEventListener('click', () => {
    pendingImageData = null;
    removeImage = true;
    currentFit = { ...DEFAULT_FIT };
    if (imageInput) imageInput.value = '';
    updateImageUi();
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
      showToast('Файл слишком большой. Максимум — 25 МБ', 'error');
      imageInput.value = '';
      return;
    }

    try {
      pendingImageData = await readFileAsDataUrl(file);
      removeImage = false;
      currentFit = { ...DEFAULT_FIT };
      updateImageUi();
    } catch (error) {
      showToast(error.message || 'Не удалось прочитать файл', 'error');
    }
  });

  listEl.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-index]');
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      deleteBanner(Number(deleteButton.dataset.deleteIndex));
      return;
    }

    const zoomBtn = event.target.closest('[data-zoom-src]');
    if (zoomBtn) {
      event.preventDefault();
      event.stopPropagation();
      openPreviewLightbox(zoomBtn.dataset.zoomSrc, zoomBtn.dataset.zoomLabel || 'Баннер');
      return;
    }

    const row = event.target.closest('[data-select-index]');
    if (row) {
      openEditForm(Number(row.dataset.selectIndex));
    }
  });

  listEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-select-index]');
    if (!row) return;
    event.preventDefault();
    openEditForm(Number(row.dataset.selectIndex));
  });

  window.addEventListener('clothing-banners-updated', fetchSlides);

  window.openAdminClothingBannerPage = openPage;
  window.openClothingBannerEditor = openPage;
  window.adminClothingBannerGoBack = () => {
    if (!formEl.hidden) {
      resetForm();
      return;
    }
    closePage();
  };
})();
