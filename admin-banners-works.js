(function initAdminBannersWorksPage() {
  const section = document.getElementById('adminSectionBannersWorks');
  const layout = document.getElementById('adminBannersWorksLayout');
  const pageBackBtn = document.getElementById('adminBannersWorksPageBack');
  const countEl = document.getElementById('adminBannersWorksCount');
  const listEl = document.getElementById('adminBannersWorkList');
  const formEl = document.getElementById('adminBannersWorkForm');
  const formTitle = document.getElementById('adminBannersFormTitle');
  const addBtn = document.getElementById('adminBannersAddWork');
  const cancelBtn = document.getElementById('adminBannersCancelWork');
  const saveBtn = document.getElementById('adminBannersSaveWork');
  const deleteBtn = document.getElementById('adminBannersDeleteWork');
  const pickImageBtn = document.getElementById('adminBannersPickImage');
  const removeImageBtn = document.getElementById('adminBannersRemoveImage');
  const imageInput = document.getElementById('adminBannersWorkImage');
  const imagePreview = document.getElementById('adminBannersImagePreview');
  const imageSizeEl = document.getElementById('adminBannersImageSize');

  if (!section || !layout || !listEl || !formEl) return;

  const CATEGORIES = {
    preview: 'Превью',
    illustrations: 'Иллюстрации',
    logos: 'Логотипы',
    pictures: 'Картинки'
  };

  let works = [];
  let editingId = null;
  let pendingImageData = null;
  let pendingImageWidth = null;
  let pendingImageHeight = null;
  let removeImage = false;
  let isSaving = false;

  function field(name) {
    return formEl.elements.namedItem(name);
  }

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

  function formatCount(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} работа`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} работы`;
    return `${count} работ`;
  }

  function setSavingState(saving) {
    isSaving = saving;
    formEl.classList.toggle('is-saving', saving);
    if (saveBtn) {
      saveBtn.disabled = saving;
      saveBtn.textContent = saving ? 'Сохранение…' : 'Сохранить работу';
    }
    if (addBtn) addBtn.disabled = saving;
    if (deleteBtn) deleteBtn.disabled = saving;
    if (cancelBtn) cancelBtn.disabled = saving;
  }

  function openPreviewLightbox(src, alt = '') {
    if (!src || typeof window.openImageLightbox !== 'function') return;
    window.openImageLightbox(src.split('?')[0], alt);
  }

  function getFormPreviewUrl() {
    if (pendingImageData) return pendingImageData;
    if (editingId && !removeImage) {
      const item = works.find((work) => work.id === editingId);
      if (item?.image) return item.image.split('?')[0];
    }
    return '';
  }

  function updateImageUi(hasImage, previewUrl = '', sizeLabel = '') {
    const url = hasImage ? (previewUrl || getFormPreviewUrl()) : '';

    if (removeImageBtn) removeImageBtn.hidden = !hasImage;
    if (imageSizeEl) {
      imageSizeEl.hidden = !hasImage || !sizeLabel;
      imageSizeEl.textContent = sizeLabel;
    }
    if (imagePreview) {
      if (hasImage && url) {
        imagePreview.src = url;
        imagePreview.hidden = false;
        imagePreview.removeAttribute('hidden');
        imagePreview.classList.add('is-zoomable');
        imagePreview.dataset.zoomSrc = url.startsWith('data:') ? '' : url.split('?')[0];
        imagePreview.alt = formTitle.textContent || 'Предпросмотр работы';
        imagePreview.title = 'Нажмите, чтобы увеличить';
      } else {
        imagePreview.removeAttribute('src');
        imagePreview.hidden = true;
        imagePreview.classList.remove('is-zoomable');
        delete imagePreview.dataset.zoomSrc;
        imagePreview.removeAttribute('title');
      }
    }
  }

  function resetForm() {
    editingId = null;
    pendingImageData = null;
    pendingImageWidth = null;
    pendingImageHeight = null;
    removeImage = false;
    formEl.reset();
    formEl.hidden = true;
    layout.classList.remove('is-editing');
    formTitle.textContent = 'Новая работа';
    deleteBtn.hidden = true;
    updateImageUi(false);
    if (imageInput) imageInput.value = '';
    setSavingState(false);
    renderList();
  }

  function renderWorkThumb(item) {
    if (item.image) {
      const imageUrl = item.image.split('?')[0];
      const title = escapeHtml(item.title || 'Работа');
      return `<button type="button" class="admin-banners-works-thumb-btn" data-zoom-src="${escapeHtml(imageUrl)}" data-zoom-label="${title}" aria-label="Увеличить «${title}»">
        <img class="admin-fitness-product-thumb admin-banners-work-thumb admin-banners-works-thumb" src="${escapeHtml(imageUrl)}" alt="">
      </button>`;
    }

    return `<div class="admin-fitness-product-thumb admin-fitness-product-thumb--placeholder admin-banners-work-thumb admin-banners-works-thumb--placeholder"><span>${escapeHtml(item.title || '?')}</span></div>`;
  }

  function renderList() {
    if (countEl) countEl.textContent = formatCount(works.length);

    if (!works.length) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-banners-works-empty">
          <span class="admin-fitness-empty-icon" aria-hidden="true">🖼️</span>
          <strong>Коллекция пуста</strong>
          <p>Добавьте первую работу — она появится в разделе «Мои Баннеры» на сайте</p>
        </li>`;
      return;
    }

    listEl.innerHTML = works.map((item) => `
      <li class="admin-fitness-product-item admin-banners-work-item admin-banners-works-item${editingId === item.id ? ' is-active' : ''}" data-select-id="${item.id}" role="button" tabindex="0" aria-label="Редактировать «${escapeHtml(item.title)}»">
        ${renderWorkThumb(item)}
        <div class="admin-fitness-product-info">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(CATEGORIES[item.category] || 'Без категории')}${item.image_width && item.image_height ? ` · ${item.image_width}×${item.image_height}` : ''}</p>
          ${item.description ? `<p class="admin-banners-work-desc">${escapeHtml(item.description.length > 90 ? `${item.description.slice(0, 90)}…` : item.description)}</p>` : ''}
          <span class="admin-banners-category-badge admin-banners-category-badge--${escapeHtml(item.category || 'preview')}">${escapeHtml(CATEGORIES[item.category] || 'Без категории')}</span>
        </div>
        <div class="admin-fitness-product-actions">
          <button type="button" class="btn btn-ghost btn-ghost-danger" data-delete-id="${item.id}">Удалить</button>
        </div>
      </li>
    `).join('');
  }

  async function fetchWorks() {
    listEl.classList.add('is-loading');
    try {
      const response = await fetch('/api/works?section=banners');
      if (!response.ok) throw new Error('Не удалось загрузить коллекцию');
      works = await response.json();
      renderList();
    } catch (error) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-banners-works-empty">
          <strong>Не удалось загрузить коллекцию</strong>
          <p>${escapeHtml(error.message)}</p>
        </li>`;
    } finally {
      listEl.classList.remove('is-loading');
    }
  }

  function openCreateForm() {
    editingId = null;
    pendingImageData = null;
    pendingImageWidth = null;
    pendingImageHeight = null;
    removeImage = false;
    formEl.reset();
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = 'Новая работа';
    deleteBtn.hidden = true;
    updateImageUi(false);
    if (imageInput) imageInput.value = '';
    field('category').value = 'preview';
    renderList();
    field('title')?.focus();
  }

  function openEditForm(id) {
    const item = works.find((work) => work.id === id);
    if (!item) return;

    editingId = id;
    pendingImageData = null;
    pendingImageWidth = null;
    pendingImageHeight = null;
    removeImage = false;
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = item.title || 'Редактирование работы';
    deleteBtn.hidden = false;

    field('title').value = item.title || '';
    field('category').value = item.category || 'preview';
    field('description').value = item.description || '';

    if (item.image) {
      const sizeLabel = item.image_width && item.image_height
        ? `${item.image_width} × ${item.image_height} px`
        : '';
      updateImageUi(true, item.image, sizeLabel);
    } else {
      updateImageUi(false);
    }

    renderList();
    field('title')?.focus();
  }

  async function saveWork() {
    if (isSaving) return;

    const title = field('title')?.value.trim() || '';
    const category = field('category')?.value || '';

    if (!title) {
      showToast('Укажите название работы', 'error');
      field('title')?.focus();
      return;
    }

    if (!editingId && !pendingImageData) {
      showToast('Загрузите изображение работы', 'error');
      return;
    }

    const payload = {
      section_id: 'banners',
      title,
      category,
      description: field('description')?.value.trim() || '',
      tags: '',
      placeholder_text: '',
      gradient: null
    };

    if (pendingImageData) {
      payload.image = pendingImageData;
      payload.image_width = pendingImageWidth;
      payload.image_height = pendingImageHeight;
    }
    if (removeImage) payload.remove_image = true;

    const url = editingId ? `/api/works/${editingId}` : '/api/works';
    const method = editingId ? 'PUT' : 'POST';

    setSavingState(true);

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить работу');

      showToast(editingId ? 'Работа обновлена' : 'Работа добавлена');
      resetForm();
      await fetchWorks();
      window.dispatchEvent(new CustomEvent('banners-catalog-changed'));
      if (typeof window.loadRecentBannerWorks === 'function') window.loadRecentBannerWorks();
      if (typeof refreshHomeData === 'function') refreshHomeData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function deleteWork(id) {
    if (isSaving) return;

    setSavingState(true);

    try {
      const response = await fetch(`/api/works/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось удалить работу');

      showToast('Работа удалена');
      if (editingId === id) resetForm();
      await fetchWorks();
      window.dispatchEvent(new CustomEvent('banners-catalog-changed'));
      if (typeof window.loadRecentBannerWorks === 'function') window.loadRecentBannerWorks();
      if (typeof refreshHomeData === 'function') refreshHomeData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: reader.result,
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        };
        img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  async function openPage() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('bannersWorks');
    }
    resetForm();
    await fetchWorks();
  }

  function closePage() {
    resetForm();
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('banners');
    }
  }

  addBtn?.addEventListener('click', openCreateForm);
  cancelBtn?.addEventListener('click', resetForm);
  pageBackBtn?.addEventListener('click', closePage);
  pickImageBtn?.addEventListener('click', () => imageInput?.click());

  imagePreview?.addEventListener('click', () => {
    const src = imagePreview.dataset.zoomSrc || imagePreview.src;
    if (imagePreview.hidden || !src) return;
    openPreviewLightbox(src, imagePreview.alt || 'Работа');
  });

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveWork();
  });

  deleteBtn?.addEventListener('click', async () => {
    if (!editingId || isSaving) return;
    const item = works.find((work) => work.id === editingId);
    const name = item?.title || 'эту работу';
    if (!window.confirm(`Удалить «${name}»?`)) return;
    await deleteWork(editingId);
  });

  removeImageBtn?.addEventListener('click', () => {
    pendingImageData = null;
    pendingImageWidth = null;
    pendingImageHeight = null;
    removeImage = true;
    updateImageUi(false);
    if (imageInput) imageInput.value = '';
  });

  imageInput?.addEventListener('change', async () => {
    const file = imageInput.files?.[0];
    if (!file) return;

    try {
      const result = await readImageFile(file);
      pendingImageData = result.dataUrl;
      pendingImageWidth = result.width;
      pendingImageHeight = result.height;
      removeImage = false;
      updateImageUi(true, result.dataUrl, `${result.width} × ${result.height} px`);
    } catch (error) {
      showToast(error.message, 'error');
      imageInput.value = '';
    }
  });

  listEl.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-delete-id]');
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      const id = Number(deleteButton.dataset.deleteId);
      const item = works.find((work) => work.id === id);
      const name = item?.title || 'эту работу';
      if (!window.confirm(`Удалить «${name}»?`)) return;
      await deleteWork(id);
      return;
    }

    const zoomBtn = event.target.closest('[data-zoom-src]');
    if (zoomBtn) {
      event.preventDefault();
      event.stopPropagation();
      openPreviewLightbox(zoomBtn.dataset.zoomSrc, zoomBtn.dataset.zoomLabel || 'Работа');
      return;
    }

    const row = event.target.closest('[data-select-id]');
    if (row) {
      openEditForm(Number(row.dataset.selectId));
    }
  });

  listEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-select-id]');
    if (!row) return;
    event.preventDefault();
    openEditForm(Number(row.dataset.selectId));
  });

  window.addEventListener('banners-catalog-changed', fetchWorks);

  window.openAdminBannersWorksPage = openPage;
  window.adminBannersWorksGoBack = () => {
    if (!formEl.hidden) {
      resetForm();
      return;
    }
    closePage();
  };
})();
