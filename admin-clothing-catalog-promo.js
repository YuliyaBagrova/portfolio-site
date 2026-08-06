(function initAdminClothingCatalogPromoPage() {
  const section = document.getElementById('adminSectionClothingCatalogPromo');
  const layout = document.getElementById('adminClothingCatalogPromoLayout');
  const pageBackBtn = document.getElementById('adminClothingCatalogPromoPageBack');
  const statusEl = document.getElementById('adminClothingCatalogPromoStatus');
  const formEl = document.getElementById('adminClothingCatalogPromoForm');
  const saveBtn = document.getElementById('adminClothingCatalogPromoSaveBtn');
  const pickImageBtn = document.getElementById('adminClothingCatalogPromoPickImage');
  const removeImageBtn = document.getElementById('adminClothingCatalogPromoRemoveImage');
  const imageInput = document.getElementById('adminClothingCatalogPromoImageInput');
  const previewImage = document.getElementById('adminClothingCatalogPromoPreviewImage');
  const previewFallback = document.getElementById('adminClothingCatalogPromoPreviewFallback');
  const previewSticker = document.getElementById('adminClothingCatalogPromoPreviewSticker');
  const previewTitle = document.getElementById('adminClothingCatalogPromoPreviewTitle');
  const previewSubtitle = document.getElementById('adminClothingCatalogPromoPreviewSubtitle');
  const previewOverlay = document.getElementById('adminClothingCatalogPromoPreviewOverlay');
  const successEl = document.getElementById('adminClothingCatalogPromoSuccess');
  const warningEl = document.getElementById('adminClothingCatalogPromoWarning');

  if (!section || !layout || !formEl) return;

  let promoData = null;
  let pendingPromoImage = undefined;
  let removePromoImage = false;
  let isSaving = false;

  function showToast(message, type = 'success') {
    window.showAdminToast(message, type);
  }

  function showMessage(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  function setSavingState(saving) {
    isSaving = saving;
    formEl.classList.toggle('is-saving', saving);
    if (saveBtn) {
      saveBtn.disabled = saving;
      saveBtn.textContent = saving ? 'Сохранение…' : 'Сохранить рекламу';
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

  function updateStatus() {
    if (!statusEl) return;

    const existingImage = promoData?.image ? promoData.image.split('?')[0] : '';
    const previewImageUrl = pendingPromoImage !== undefined
      ? (pendingPromoImage || '')
      : (removePromoImage ? '' : existingImage);

    statusEl.textContent = previewImageUrl ? 'Баннер с изображением' : 'Без изображения · градиент-заглушка';
  }

  function renderPromoPreview() {
    const label = formEl.elements.promo_label.value.trim() || 'Горячие предложения';
    const title = formEl.elements.promo_title.value.trim();
    const subtitle = formEl.elements.promo_subtitle.value.trim();

    if (previewSticker) previewSticker.textContent = label;
    if (previewTitle) {
      previewTitle.textContent = title;
      previewTitle.hidden = !title;
    }
    if (previewSubtitle) {
      previewSubtitle.textContent = subtitle;
      previewSubtitle.hidden = !subtitle;
    }
    if (previewOverlay) previewOverlay.hidden = !title && !subtitle;

    const existingImage = promoData?.image ? promoData.image.split('?')[0] : '';
    const previewImageUrl = pendingPromoImage !== undefined
      ? (pendingPromoImage || '')
      : (removePromoImage ? '' : existingImage);

    if (previewImage && previewFallback) {
      if (previewImageUrl) {
        previewImage.removeAttribute('width');
        previewImage.removeAttribute('height');
        previewImage.src = previewImageUrl.startsWith('data:')
          ? previewImageUrl
          : `${previewImageUrl}?t=${Date.now()}`;
        previewImage.hidden = false;
        previewImage.classList.add('is-zoomable');
        previewImage.dataset.zoomSrc = previewImageUrl.startsWith('data:') ? '' : previewImageUrl.split('?')[0];
        previewImage.title = 'Нажмите, чтобы увеличить';
        previewFallback.hidden = true;
      } else {
        previewImage.removeAttribute('src');
        previewImage.hidden = true;
        previewImage.classList.remove('is-zoomable');
        delete previewImage.dataset.zoomSrc;
        previewImage.removeAttribute('title');
        previewFallback.hidden = false;
      }
    }

    if (removeImageBtn) {
      removeImageBtn.hidden = !previewImageUrl;
    }

    updateStatus();
  }

  function fillPromoForm(promo) {
    formEl.elements.promo_label.value = promo?.promo_label || '';
    formEl.elements.promo_title.value = promo?.promo_title || '';
    formEl.elements.promo_subtitle.value = promo?.promo_subtitle || '';
    formEl.elements.promo_link.value = promo?.promo_link || '';
    pendingPromoImage = undefined;
    removePromoImage = false;
    renderPromoPreview();
  }

  async function loadPromo() {
    formEl.classList.add('is-loading');
    try {
      const response = await fetch('/api/clothing-catalog-promo');
      if (!response.ok) throw new Error('Не удалось загрузить рекламу каталога');

      const payload = await response.json();
      promoData = payload.promo || null;
      fillPromoForm(promoData);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      formEl.classList.remove('is-loading');
    }
  }

  async function savePromo(event) {
    event.preventDefault();
    if (isSaving) return;

    const payload = {
      promo_label: formEl.elements.promo_label.value,
      promo_title: formEl.elements.promo_title.value,
      promo_subtitle: formEl.elements.promo_subtitle.value,
      promo_link: formEl.elements.promo_link.value
    };

    if (pendingPromoImage !== undefined) {
      payload.image = pendingPromoImage;
    }
    if (removePromoImage) {
      payload.remove_image = true;
    }

    setSavingState(true);
    showMessage(successEl, '');
    showMessage(warningEl, '');

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
      showMessage(successEl, 'Реклама каталога сохранена');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  function openPreviewLightbox(src) {
    if (!src || typeof window.openImageLightbox !== 'function') return;
    window.openImageLightbox(src.split('?')[0], 'Реклама каталога');
  }

  async function openPage() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothingCatalogPromo');
    }
    layout.classList.add('is-editing');
    showMessage(successEl, '');
    showMessage(warningEl, '');
    await loadPromo();
  }

  function closePage() {
    pendingPromoImage = undefined;
    removePromoImage = false;
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
  }

  saveBtn?.addEventListener('click', savePromo);
  formEl.addEventListener('submit', savePromo);
  formEl.addEventListener('input', renderPromoPreview);
  pageBackBtn?.addEventListener('click', closePage);

  pickImageBtn?.addEventListener('click', () => {
    if (isSaving) return;
    imageInput?.click();
  });

  imageInput?.addEventListener('change', async () => {
    const file = imageInput.files?.[0];
    imageInput.value = '';
    if (!file || isSaving) return;

    try {
      pendingPromoImage = await readFileAsDataUrl(file);
      removePromoImage = false;
      renderPromoPreview();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  removeImageBtn?.addEventListener('click', () => {
    if (isSaving) return;
    pendingPromoImage = '';
    removePromoImage = true;
    renderPromoPreview();
  });

  previewImage?.addEventListener('click', () => {
    const src = previewImage.dataset.zoomSrc || previewImage.src;
    if (previewImage.hidden || !src) return;
    openPreviewLightbox(src);
  });

  window.addEventListener('clothing-catalog-promo-changed', loadPromo);

  window.openAdminClothingCatalogPromoPage = openPage;
  window.adminClothingCatalogPromoGoBack = closePage;
})();
