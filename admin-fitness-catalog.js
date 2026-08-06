(function initAdminFitnessCatalogPage() {
  const section = document.getElementById('adminSectionFitnessCatalog');
  const layout = document.getElementById('adminFitnessCatalogLayout');
  const pageBackBtn = document.getElementById('adminFitnessCatalogPageBack');
  const countEl = document.getElementById('adminFitnessCatalogCount');
  const listEl = document.getElementById('adminFitnessProductList');
  const formEl = document.getElementById('adminFitnessProductForm');
  const formTitle = document.getElementById('adminFitnessFormTitle');
  const addBtn = document.getElementById('adminFitnessAddProduct');
  const cancelBtn = document.getElementById('adminFitnessCancelProduct');
  const saveBtn = document.getElementById('adminFitnessSaveProduct');
  const deleteBtn = document.getElementById('adminFitnessDeleteProduct');
  const pickImageBtn = document.getElementById('adminFitnessPickImage');
  const removeImageBtn = document.getElementById('adminFitnessRemoveImage');
  const imageInput = document.getElementById('adminFitnessProductImage');
  const imagePreview = document.getElementById('adminFitnessProductImagePreview');

  if (!section || !layout || !listEl || !formEl) return;

  const CATEGORIES = {
    protein: 'Протеин',
    creatine: 'Креатин',
    vitamins: 'Витамины',
    equipment: 'Спорт-инвентарь'
  };

  const DEFAULT_GRADIENTS = {
    protein: 'linear-gradient(145deg, #ea580c 0%, #9a3412 55%, #1c1410 100%)',
    creatine: 'linear-gradient(145deg, #f97316 0%, #c2410c 50%, #0f1117 100%)',
    vitamins: 'linear-gradient(145deg, #fdba74 0%, #f97316 40%, #7c2d12 100%)',
    equipment: 'linear-gradient(145deg, #fb923c 0%, #ea580c 45%, #1a120b 100%)'
  };

  let products = [];
  let editingId = null;
  let pendingImageData = null;
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
    if (mod10 === 1 && mod100 !== 11) return `${count} товар`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} товара`;
    return `${count} товаров`;
  }

  function setSavingState(saving) {
    isSaving = saving;
    formEl.classList.toggle('is-saving', saving);
    if (saveBtn) {
      saveBtn.disabled = saving;
      saveBtn.textContent = saving ? 'Сохранение…' : 'Сохранить товар';
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
      const item = products.find((product) => product.id === editingId);
      if (item?.image) return item.image.split('?')[0];
    }
    return '';
  }

  function updateImageUi(hasImage, previewUrl = '') {
    const url = hasImage ? (previewUrl || getFormPreviewUrl()) : '';

    if (removeImageBtn) removeImageBtn.hidden = !hasImage;
    if (imagePreview) {
      if (hasImage && url) {
        imagePreview.src = url;
        imagePreview.hidden = false;
        imagePreview.removeAttribute('hidden');
        imagePreview.classList.add('is-zoomable');
        imagePreview.dataset.zoomSrc = url.startsWith('data:') ? '' : url.split('?')[0];
        imagePreview.alt = formTitle.textContent || 'Предпросмотр товара';
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
    removeImage = false;
    formEl.reset();
    formEl.hidden = true;
    layout.classList.remove('is-editing');
    formTitle.textContent = 'Новый товар';
    deleteBtn.hidden = true;
    imagePreview?.removeAttribute('src');
    updateImageUi(false);
    if (imageInput) imageInput.value = '';
    setSavingState(false);
    renderList();
  }

  function renderProductThumb(item) {
    if (item.image) {
      const imageUrl = item.image.split('?')[0];
      const title = escapeHtml(item.title || 'Товар');
      return `<button type="button" class="admin-fitness-catalog-thumb-btn" data-zoom-src="${escapeHtml(imageUrl)}" data-zoom-label="${title}" aria-label="Увеличить «${title}»">
        <img class="admin-fitness-product-thumb admin-fitness-catalog-thumb" src="${escapeHtml(imageUrl)}" alt="">
      </button>`;
    }

    const gradient = item.gradient || DEFAULT_GRADIENTS[item.category] || DEFAULT_GRADIENTS.protein;
    const label = escapeHtml(item.placeholder_text || item.title || '?');
    return `<div class="admin-fitness-product-thumb admin-fitness-product-thumb--placeholder admin-fitness-catalog-thumb" style="background:${gradient}"><span>${label}</span></div>`;
  }

  function renderList() {
    if (countEl) countEl.textContent = formatCount(products.length);

    if (!products.length) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-fitness-catalog-empty">
          <span class="admin-fitness-empty-icon" aria-hidden="true">📦</span>
          <strong>Каталог пуст</strong>
          <p>Добавьте первый товар — он появится в разделе «Фитнес-индустрия» на сайте</p>
        </li>`;
      return;
    }

    listEl.innerHTML = products.map((item) => `
      <li class="admin-fitness-product-item admin-fitness-catalog-item${editingId === item.id ? ' is-active' : ''}" data-select-id="${item.id}" role="button" tabindex="0" aria-label="Редактировать «${escapeHtml(item.title)}»">
        ${renderProductThumb(item)}
        <div class="admin-fitness-product-info">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.description || 'Без описания')}</p>
          <span class="admin-fitness-category-badge admin-fitness-category-badge--${escapeHtml(item.category || 'protein')}">${escapeHtml(CATEGORIES[item.category] || 'Без категории')}</span>
          ${item.price_usd != null ? `<span class="admin-fitness-price">$${Number(item.price_usd).toFixed(2)}</span>` : ''}
        </div>
        <div class="admin-fitness-product-actions">
          <button type="button" class="btn btn-ghost btn-ghost-danger" data-delete-id="${item.id}">Удалить</button>
        </div>
      </li>
    `).join('');
  }

  async function fetchProducts() {
    listEl.classList.add('is-loading');
    try {
      const response = await fetch('/api/works?section=supplements');
      if (!response.ok) throw new Error('Не удалось загрузить каталог');
      products = await response.json();
      renderList();
    } catch (error) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-fitness-catalog-empty">
          <strong>Не удалось загрузить каталог</strong>
          <p>${escapeHtml(error.message)}</p>
        </li>`;
    } finally {
      listEl.classList.remove('is-loading');
    }
  }

  function openCreateForm() {
    editingId = null;
    pendingImageData = null;
    removeImage = false;
    formEl.reset();
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = 'Новый товар';
    deleteBtn.hidden = true;
    imagePreview?.removeAttribute('src');
    updateImageUi(false);
    if (imageInput) imageInput.value = '';
    field('category').value = 'protein';
    renderList();
    field('title')?.focus();
  }

  function openEditForm(id) {
    const item = products.find((product) => product.id === id);
    if (!item) return;

    editingId = id;
    pendingImageData = null;
    removeImage = false;
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = item.title || 'Редактирование товара';
    deleteBtn.hidden = false;

    field('title').value = item.title || '';
    field('description').value = item.description || '';
    field('category').value = item.category || 'protein';
    field('placeholder_text').value = item.placeholder_text || '';
    field('tags').value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
    field('price_usd').value = item.price_usd != null ? item.price_usd : '';

    if (item.image) {
      updateImageUi(true, item.image);
    } else {
      imagePreview.removeAttribute('src');
      updateImageUi(false);
    }

    renderList();
    field('title')?.focus();
  }

  async function saveProduct() {
    if (isSaving) return;

    const title = field('title')?.value.trim() || '';
    const payload = {
      section_id: 'supplements',
      title,
      description: field('description')?.value.trim() || '',
      category: field('category')?.value || 'protein',
      placeholder_text: field('placeholder_text')?.value.trim() || '',
      tags: field('tags')?.value.trim() || '',
      price_usd: field('price_usd')?.value.trim() || null,
      gradient: DEFAULT_GRADIENTS[field('category')?.value] || DEFAULT_GRADIENTS.protein
    };

    if (!title) {
      showToast('Укажите название товара', 'error');
      field('title')?.focus();
      return;
    }

    if (pendingImageData) payload.image = pendingImageData;
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
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить товар');

      showToast(editingId ? 'Товар обновлён' : 'Товар добавлен');
      resetForm();
      await fetchProducts();
      window.dispatchEvent(new CustomEvent('fitness-catalog-changed'));
      if (typeof refreshHomeData === 'function') refreshHomeData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function deleteProduct(id) {
    if (isSaving) return;

    setSavingState(true);

    try {
      const response = await fetch(`/api/works/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось удалить товар');

      showToast('Товар удалён');
      if (editingId === id) resetForm();
      await fetchProducts();
      window.dispatchEvent(new CustomEvent('fitness-catalog-changed'));
      if (typeof refreshHomeData === 'function') refreshHomeData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function openPage() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('fitnessCatalog');
    }
    resetForm();
    await fetchProducts();
  }

  function closePage() {
    resetForm();
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('fitness');
    }
  }

  addBtn?.addEventListener('click', openCreateForm);
  cancelBtn?.addEventListener('click', resetForm);
  pageBackBtn?.addEventListener('click', closePage);
  pickImageBtn?.addEventListener('click', () => imageInput?.click());

  imagePreview?.addEventListener('click', () => {
    const src = imagePreview.dataset.zoomSrc || imagePreview.src;
    if (imagePreview.hidden || !src) return;
    openPreviewLightbox(src, imagePreview.alt || 'Товар');
  });

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveProduct();
  });

  deleteBtn?.addEventListener('click', async () => {
    if (!editingId || isSaving) return;
    const item = products.find((product) => product.id === editingId);
    const name = item?.title || 'этот товар';
    if (!window.confirm(`Удалить «${name}»?`)) return;
    await deleteProduct(editingId);
  });

  removeImageBtn?.addEventListener('click', () => {
    pendingImageData = null;
    removeImage = true;
    imagePreview?.removeAttribute('src');
    updateImageUi(false);
    if (imageInput) imageInput.value = '';
  });

  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;

    if (!/^image\/(jpeg|png|webp)$/i.test(file.type || '')) {
      showToast('Поддерживаются только JPG, PNG и WebP', 'error');
      imageInput.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Файл слишком большой. Максимум — 15 МБ', 'error');
      imageInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      pendingImageData = reader.result;
      removeImage = false;
      updateImageUi(true, pendingImageData);
    };
    reader.readAsDataURL(file);
  });

  listEl.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-delete-id]');
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      const id = Number(deleteButton.dataset.deleteId);
      const item = products.find((product) => product.id === id);
      const name = item?.title || 'этот товар';
      if (!window.confirm(`Удалить «${name}»?`)) return;
      await deleteProduct(id);
      return;
    }

    const zoomBtn = event.target.closest('[data-zoom-src]');
    if (zoomBtn) {
      event.preventDefault();
      event.stopPropagation();
      openPreviewLightbox(zoomBtn.dataset.zoomSrc, zoomBtn.dataset.zoomLabel || 'Товар');
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

  window.addEventListener('fitness-catalog-changed', fetchProducts);

  window.openAdminFitnessCatalogPage = openPage;
  window.adminFitnessCatalogGoBack = () => {
    if (!formEl.hidden) {
      resetForm();
      return;
    }
    closePage();
  };
})();
