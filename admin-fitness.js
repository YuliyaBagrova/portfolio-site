(function initAdminFitnessPanel() {

  const openBtn = document.getElementById('adminFitnessManage');

  const backBtn = document.getElementById('adminFitnessBackToDashboard');

  const chooseCatalogBtn = document.getElementById('adminFitnessChooseCatalog');

  const catalogPanel = document.getElementById('adminFitnessCatalogPanel');

  const catalogLayout = document.getElementById('adminFitnessCatalogLayout');

  const catalogClose = document.getElementById('adminFitnessCatalogClose');

  const catalogBack = document.getElementById('adminFitnessCatalogBack');

  const catalogCount = document.getElementById('adminFitnessCatalogCount');

  const productList = document.getElementById('adminFitnessProductList');

  const productForm = document.getElementById('adminFitnessProductForm');

  const formTitle = document.getElementById('adminFitnessFormTitle');

  const addBtn = document.getElementById('adminFitnessAddProduct');

  const cancelBtn = document.getElementById('adminFitnessCancelProduct');

  const saveBtn = document.getElementById('adminFitnessSaveProduct');

  const deleteBtn = document.getElementById('adminFitnessDeleteProduct');

  const pickImageBtn = document.getElementById('adminFitnessPickImage');

  const removeImageBtn = document.getElementById('adminFitnessRemoveImage');

  const imageInput = document.getElementById('adminFitnessProductImage');

  const imagePreview = document.getElementById('adminFitnessProductImagePreview');

  const toast = document.getElementById('adminToast');



  if (!openBtn || !chooseCatalogBtn) return;



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



  const hasCatalog = catalogPanel && productList && productForm;

  let products = [];

  let editingId = null;

  let pendingImageData = null;

  let removeImage = false;

  let isSaving = false;



  function field(name) {

    return productForm?.elements.namedItem(name);

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

    if (mod10 === 1 && mod100 !== 11) return `${count} товар`;

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} товара`;

    return `${count} товаров`;

  }



  function updateCatalogCount() {

    if (catalogCount) catalogCount.textContent = formatCount(products.length);

  }



  function setSavingState(saving) {

    isSaving = saving;

    if (!productForm) return;

    productForm.classList.toggle('is-saving', saving);

    if (saveBtn) {

      saveBtn.disabled = saving;

      saveBtn.textContent = saving ? 'Сохранение…' : 'Сохранить';

    }

    if (addBtn) addBtn.disabled = saving;

  }



  function updateImageUi(hasImage) {

    if (removeImageBtn) removeImageBtn.hidden = !hasImage;

    if (imagePreview) imagePreview.hidden = !hasImage;

  }



  function resetForm() {

    if (!hasCatalog) return;

    editingId = null;

    pendingImageData = null;

    removeImage = false;

    productForm.reset();

    productForm.hidden = true;

    catalogLayout?.classList.remove('is-editing');

    formTitle.textContent = 'Новый товар';

    deleteBtn.hidden = true;

    imagePreview.removeAttribute('src');

    updateImageUi(false);

    if (imageInput) imageInput.value = '';

    setSavingState(false);

  }



  function openFitnessSection() {

    if (typeof window.showAdminSection === 'function') {

      window.showAdminSection('fitness');

    }

    if (catalogPanel) catalogPanel.hidden = true;

    const bannerModal = document.getElementById('adminFitnessBannerModal');

    if (bannerModal) bannerModal.hidden = true;

    resetForm();

  }



  function closeFitnessOverlays() {

    if (catalogPanel) catalogPanel.hidden = true;

    const bannerModal = document.getElementById('adminFitnessBannerModal');

    if (bannerModal) bannerModal.hidden = true;

    resetForm();

  }



  window.openAdminFitnessGate = openFitnessSection;

  window.closeAllFitnessAdmin = closeFitnessOverlays;



  function renderProductThumb(item) {

    if (item.image) {

      return `<img class="admin-fitness-product-thumb" src="${escapeHtml(item.image.split('?')[0])}" alt="">`;

    }

    const gradient = item.gradient || DEFAULT_GRADIENTS[item.category] || DEFAULT_GRADIENTS.protein;

    const label = escapeHtml(item.placeholder_text || item.title || '?');

    return `<div class="admin-fitness-product-thumb admin-fitness-product-thumb--placeholder" style="background:${gradient}"><span>${label}</span></div>`;

  }



  function renderProductList() {

    updateCatalogCount();



    if (!products.length) {

      productList.innerHTML = `

        <li class="admin-fitness-empty">

          <span class="admin-fitness-empty-icon" aria-hidden="true">📦</span>

          <strong>Каталог пуст</strong>

          <p>Добавьте первый товар — он появится в разделе «Фитнес-индустрия» на сайте</p>

        </li>`;

      return;

    }



    productList.innerHTML = products.map((item) => `

      <li class="admin-fitness-product-item${editingId === item.id ? ' is-active' : ''}">

        ${renderProductThumb(item)}

        <div class="admin-fitness-product-info">

          <strong>${escapeHtml(item.title)}</strong>

          <p>${escapeHtml(item.description || 'Без описания')}</p>

          <span class="admin-fitness-category-badge admin-fitness-category-badge--${escapeHtml(item.category || 'protein')}">${escapeHtml(CATEGORIES[item.category] || 'Без категории')}</span>

          ${item.price_usd != null ? `<span class="admin-fitness-price">$${Number(item.price_usd).toFixed(2)}</span>` : ''}

        </div>

        <div class="admin-fitness-product-actions">

          <button type="button" class="btn btn-ghost admin-fitness-edit-btn" data-edit-id="${item.id}">Изменить</button>

          <button type="button" class="btn btn-ghost btn-ghost-danger" data-delete-id="${item.id}">Удалить</button>

        </div>

      </li>

    `).join('');

  }



  async function fetchProducts() {

    productList.classList.add('is-loading');

    try {

      const response = await fetch('/api/works?section=supplements');

      if (!response.ok) throw new Error('Не удалось загрузить каталог');

      products = await response.json();

      renderProductList();

    } finally {

      productList.classList.remove('is-loading');

    }

  }



  function openCreateForm() {

    resetForm();

    productForm.hidden = false;

    catalogLayout?.classList.add('is-editing');

    formTitle.textContent = 'Новый товар';

    field('category').value = 'protein';

    field('title')?.focus();

  }



  function openEditForm(id) {

    const item = products.find((product) => product.id === id);

    if (!item) return;



    editingId = id;

    pendingImageData = null;

    removeImage = false;

    productForm.hidden = false;

    catalogLayout?.classList.add('is-editing');

    formTitle.textContent = 'Редактирование товара';

    deleteBtn.hidden = false;



    field('title').value = item.title || '';

    field('description').value = item.description || '';

    field('category').value = item.category || 'protein';

    field('placeholder_text').value = item.placeholder_text || '';

    field('tags').value = Array.isArray(item.tags) ? item.tags.join(', ') : '';

    field('price_usd').value = item.price_usd != null ? item.price_usd : '';



    if (item.image) {

      imagePreview.src = item.image;

      updateImageUi(true);

    } else {

      imagePreview.removeAttribute('src');

      updateImageUi(false);

    }



    renderProductList();

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

      if (!response.ok) {

        throw new Error(data.error || 'Не удалось сохранить товар');

      }



      showToast(editingId ? 'Товар обновлён' : 'Товар добавлен');

      resetForm();

      await fetchProducts();

      window.dispatchEvent(new CustomEvent('fitness-catalog-changed'));

      if (typeof refreshHomeData === 'function') refreshHomeData();

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

      if (!response.ok) {

        throw new Error(data.error || 'Не удалось удалить товар');

      }



      showToast('Товар удалён');

      if (editingId === id) resetForm();

      await fetchProducts();

      window.dispatchEvent(new CustomEvent('fitness-catalog-changed'));

      if (typeof refreshHomeData === 'function') refreshHomeData();

    } finally {

      setSavingState(false);

    }

  }



  function openCatalogPanel() {

    if (!hasCatalog) {

      showToast('Каталог недоступен', 'error');

      return;

    }

    catalogPanel.hidden = false;

    fetchProducts().catch((error) => showToast(error.message, 'error'));

  }



  openBtn.addEventListener('click', openFitnessSection);

  backBtn?.addEventListener('click', () => {

    if (typeof window.showAdminSection === 'function') {

      window.showAdminSection('dashboard');

    }

  });

  catalogClose?.addEventListener('click', () => {

    closeFitnessOverlays();

    openFitnessSection();

  });

  catalogBack?.addEventListener('click', () => {

    closeFitnessOverlays();

    openFitnessSection();

  });

  chooseCatalogBtn.addEventListener('click', openCatalogPanel);



  if (hasCatalog) {

    catalogPanel.addEventListener('click', (e) => {

      if (e.target === catalogPanel) {

        closeFitnessOverlays();

        openFitnessSection();

      }

    });



    addBtn?.addEventListener('click', openCreateForm);

    cancelBtn?.addEventListener('click', resetForm);

    pickImageBtn?.addEventListener('click', () => imageInput?.click());



    productList.addEventListener('click', async (e) => {

      const editBtn = e.target.closest('[data-edit-id]');

      const deleteItemBtn = e.target.closest('[data-delete-id]');



      if (editBtn) {

        openEditForm(Number(editBtn.dataset.editId));

        return;

      }



      if (deleteItemBtn) {

        const id = Number(deleteItemBtn.dataset.deleteId);

        const item = products.find((product) => product.id === id);

        const name = item?.title || 'этот товар';

        if (!window.confirm(`Удалить «${name}»?`)) return;

        try {

          await deleteProduct(id);

        } catch (error) {

          showToast(error.message, 'error');

        }

      }

    });



    removeImageBtn?.addEventListener('click', () => {

      pendingImageData = null;

      removeImage = true;

      imagePreview.removeAttribute('src');

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

        imagePreview.src = pendingImageData;

        updateImageUi(true);

      };

      reader.readAsDataURL(file);

    });



    deleteBtn?.addEventListener('click', async () => {

      if (!editingId || isSaving) return;

      const item = products.find((product) => product.id === editingId);

      const name = item?.title || 'этот товар';

      if (!window.confirm(`Удалить «${name}»?`)) return;

      try {

        await deleteProduct(editingId);

      } catch (error) {

        showToast(error.message, 'error');

      }

    });



    productForm.addEventListener('submit', async (e) => {

      e.preventDefault();

      try {

        await saveProduct();

      } catch (error) {

        showToast(error.message, 'error');

      }

    });

  }

})();


