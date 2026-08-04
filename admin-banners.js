(function initAdminBannersPanel() {
  const openBtn = document.getElementById('adminBannersManage');
  const backBtn = document.getElementById('adminBannersBackToDashboard');
  const chooseWorksBtn = document.getElementById('adminBannersChooseWorks');
  const catalogPanel = document.getElementById('adminBannersCatalogPanel');
  const catalogLayout = document.getElementById('adminBannersCatalogLayout');
  const catalogClose = document.getElementById('adminBannersCatalogClose');
  const catalogBack = document.getElementById('adminBannersCatalogBack');
  const catalogCount = document.getElementById('adminBannersCatalogCount');
  const workList = document.getElementById('adminBannersWorkList');
  const workForm = document.getElementById('adminBannersWorkForm');
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
  const toast = document.getElementById('adminToast');

  if (!openBtn || !chooseWorksBtn) return;

  const CATEGORIES = {
    preview: 'Превью',
    illustrations: 'Иллюстрации',
    logos: 'Логотипы',
    pictures: 'Картинки'
  };

  const hasCatalog = catalogPanel && workList && workForm;
  let works = [];
  let editingId = null;
  let pendingImageData = null;
  let pendingImageWidth = null;
  let pendingImageHeight = null;
  let removeImage = false;
  let isSaving = false;

  function field(name) {
    return workForm?.elements.namedItem(name);
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

  function updateCatalogCount() {
    if (catalogCount) catalogCount.textContent = formatCount(works.length);
    const metaChip = document.querySelector('#section-banners .banners-meta-chip');
    if (metaChip) metaChip.textContent = '4 категории';
  }

  function setSavingState(saving) {
    isSaving = saving;
    if (!workForm) return;
    workForm.classList.toggle('is-saving', saving);
    if (saveBtn) {
      saveBtn.disabled = saving;
      saveBtn.textContent = saving ? 'Сохранение…' : 'Сохранить';
    }
    if (addBtn) addBtn.disabled = saving;
  }

  function updateImageUi(hasImage) {
    if (removeImageBtn) removeImageBtn.hidden = !hasImage;
    if (imagePreview) imagePreview.hidden = !hasImage;
    if (imageSizeEl) imageSizeEl.hidden = !hasImage;
  }

  function resetForm() {
    if (!hasCatalog) return;
    editingId = null;
    pendingImageData = null;
    pendingImageWidth = null;
    pendingImageHeight = null;
    removeImage = false;
    workForm.reset();
    workForm.hidden = true;
    catalogLayout?.classList.remove('is-editing');
    formTitle.textContent = 'Новая работа';
    deleteBtn.hidden = true;
    imagePreview.removeAttribute('src');
    if (imageSizeEl) imageSizeEl.textContent = '';
    updateImageUi(false);
    if (imageInput) imageInput.value = '';
    setSavingState(false);
  }

  function openBannersSection() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('banners');
    }
    if (catalogPanel) catalogPanel.hidden = true;
    resetForm();
    if (typeof window.loadRecentBannerWorks === 'function') {
      window.loadRecentBannerWorks();
    }
  }

  function closeBannersOverlays() {
    if (catalogPanel) catalogPanel.hidden = true;
    resetForm();
  }

  window.openAdminBannersGate = openBannersSection;
  window.closeAllBannersAdmin = closeBannersOverlays;

  function renderWorkThumb(item) {
    if (item.image) {
      return `<img class="admin-fitness-product-thumb admin-banners-work-thumb" src="${escapeHtml(item.image.split('?')[0])}" alt="">`;
    }
    return `<div class="admin-fitness-product-thumb admin-fitness-product-thumb--placeholder admin-banners-work-thumb--placeholder"><span>${escapeHtml(item.title || '?')}</span></div>`;
  }

  function renderWorkList() {
    updateCatalogCount();

    if (!works.length) {
      workList.innerHTML = `
        <li class="admin-fitness-empty">
          <span class="admin-fitness-empty-icon" aria-hidden="true">🖼️</span>
          <strong>Коллекция пуста</strong>
          <p>Добавьте первую работу — она появится в разделе «Мои Баннеры» на сайте</p>
        </li>`;
      return;
    }

    workList.innerHTML = works.map((item) => `
      <li class="admin-fitness-product-item admin-banners-work-item${editingId === item.id ? ' is-active' : ''}">
        ${renderWorkThumb(item)}
        <div class="admin-fitness-product-info">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(CATEGORIES[item.category] || 'Без категории')}${item.image_width && item.image_height ? ` · ${item.image_width}×${item.image_height}` : ''}</p>
          ${item.description ? `<p class="admin-banners-work-desc">${escapeHtml(item.description.length > 90 ? `${item.description.slice(0, 90)}…` : item.description)}</p>` : ''}
          <span class="admin-banners-category-badge admin-banners-category-badge--${escapeHtml(item.category || 'preview')}">${escapeHtml(CATEGORIES[item.category] || 'Без категории')}</span>
        </div>
        <div class="admin-fitness-product-actions">
          <button type="button" class="btn btn-ghost admin-fitness-edit-btn" data-edit-id="${item.id}">Изменить</button>
          <button type="button" class="btn btn-ghost btn-ghost-danger" data-delete-id="${item.id}">Удалить</button>
        </div>
      </li>
    `).join('');
  }

  async function fetchWorks() {
    workList.classList.add('is-loading');
    try {
      const response = await fetch('/api/works?section=banners');
      if (!response.ok) throw new Error('Не удалось загрузить коллекцию');
      works = await response.json();
      renderWorkList();
    } finally {
      workList.classList.remove('is-loading');
    }
  }

  function openCreateForm() {
    resetForm();
    workForm.hidden = false;
    catalogLayout?.classList.add('is-editing');
    formTitle.textContent = 'Новая работа';
    field('category').value = 'preview';
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
    workForm.hidden = false;
    catalogLayout?.classList.add('is-editing');
    formTitle.textContent = 'Редактирование работы';
    deleteBtn.hidden = false;

    field('title').value = item.title || '';
    field('category').value = item.category || 'preview';
    field('description').value = item.description || '';

    if (item.image) {
      imagePreview.src = item.image;
      if (imageSizeEl && item.image_width && item.image_height) {
        imageSizeEl.textContent = `${item.image_width} × ${item.image_height} px`;
      }
      updateImageUi(true);
    } else {
      imagePreview.removeAttribute('src');
      if (imageSizeEl) imageSizeEl.textContent = '';
      updateImageUi(false);
    }

    renderWorkList();
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
    if (!window.confirm('Удалить эту работу из коллекции?')) return;

    try {
      const response = await fetch(`/api/works/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось удалить работу');

      showToast('Работа удалена');
      resetForm();
      await fetchWorks();
      window.dispatchEvent(new CustomEvent('banners-catalog-changed'));
      if (typeof window.loadRecentBannerWorks === 'function') window.loadRecentBannerWorks();
      if (typeof refreshHomeData === 'function') refreshHomeData();
    } catch (error) {
      showToast(error.message, 'error');
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

  openBtn.addEventListener('click', openBannersSection);
  backBtn?.addEventListener('click', () => {
    closeBannersOverlays();
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
  });

  chooseWorksBtn.addEventListener('click', async () => {
    if (catalogPanel) catalogPanel.hidden = false;
    await fetchWorks();
  });

  catalogClose?.addEventListener('click', () => {
    catalogPanel.hidden = true;
    openBannersSection();
  });

  catalogBack?.addEventListener('click', () => {
    catalogPanel.hidden = true;
    openBannersSection();
  });

  addBtn?.addEventListener('click', openCreateForm);
  cancelBtn?.addEventListener('click', resetForm);
  deleteBtn?.addEventListener('click', () => {
    if (editingId) deleteWork(editingId);
  });

  workForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveWork();
  });

  pickImageBtn?.addEventListener('click', () => imageInput?.click());

  removeImageBtn?.addEventListener('click', () => {
    pendingImageData = null;
    pendingImageWidth = null;
    pendingImageHeight = null;
    removeImage = true;
    imagePreview.removeAttribute('src');
    if (imageSizeEl) imageSizeEl.textContent = '';
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
      imagePreview.src = result.dataUrl;
      if (imageSizeEl) imageSizeEl.textContent = `${result.width} × ${result.height} px`;
      updateImageUi(true);
    } catch (error) {
      showToast(error.message, 'error');
      imageInput.value = '';
    }
  });

  workList?.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit-id]');
    const deleteItemBtn = event.target.closest('[data-delete-id]');
    if (editBtn) {
      openEditForm(Number(editBtn.dataset.editId));
      return;
    }
    if (deleteItemBtn) {
      deleteWork(Number(deleteItemBtn.dataset.deleteId));
    }
  });
})();
