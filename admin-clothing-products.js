(function initAdminClothingProducts() {
  const chooseCatalogBtn = document.getElementById('adminClothingChooseCatalog');
  const catalogPanel = document.getElementById('adminClothingCatalogPanel');
  const catalogLayout = document.getElementById('adminClothingCatalogLayout');
  const catalogClose = document.getElementById('adminClothingCatalogClose');
  const catalogBack = document.getElementById('adminClothingCatalogBack');
  const catalogCount = document.getElementById('adminClothingCatalogCount');
  const productList = document.getElementById('adminClothingProductList');
  const productForm = document.getElementById('adminClothingProductForm');
  const formTitle = document.getElementById('adminClothingFormTitle');
  const addBtn = document.getElementById('adminClothingAddProduct');
  const cancelBtn = document.getElementById('adminClothingCancelProduct');
  const saveBtn = document.getElementById('adminClothingSaveProduct');
  const deleteBtn = document.getElementById('adminClothingDeleteProduct');
  const pickImageBtn = document.getElementById('adminClothingPickImage');
  const removeImageBtn = document.getElementById('adminClothingRemoveImage');
  const imageInput = document.getElementById('adminClothingProductImage');
  const imagePreview = document.getElementById('adminClothingProductImagePreview');
  const toast = document.getElementById('adminToast');

  if (!chooseCatalogBtn || !catalogPanel || !productList || !productForm) return;

  const LINE_LABELS = { sport: 'Спорт', casual: 'Casual' };
  const PROMO_LABELS = { sale: 'Распродажа', new: 'Новинка', limited: 'Лимитированный', hot: 'Горячее' };
  const CATALOG_CATEGORIES = [
    { id: 'men', label: 'Мужчинам' },
    { id: 'women', label: 'Женщинам' },
    { id: 'shirts', label: 'Рубашки' },
    { id: 'pants', label: 'Брюки' },
    { id: 'jeans', label: 'Джинсы' },
    { id: 'accessories', label: 'Аксессуары' }
  ];
  const CATALOG_CATEGORY_IDS = new Set(CATALOG_CATEGORIES.map((item) => item.id));
  const CATALOG_CATEGORY_LABELS = Object.fromEntries(CATALOG_CATEGORIES.map((item) => [item.id, item.label]));
  const MANAGED_TAG_KEYS = new Set(['catalog', 'popular', ...CATALOG_CATEGORY_IDS]);
  const DEFAULT_GRADIENTS = {
    sport: 'linear-gradient(160deg, #2c3e50 0%, #5d7a96 100%)',
    casual: 'linear-gradient(160deg, #6b5b73 0%, #a8929f 100%)'
  };

  const siblingModalIds = [
    'adminClothingBannerModal',
    'adminClothingCatalogIconsModal',
    'adminClothingAlertsModal',
    'adminClothingCatalogPromoModal'
  ];

  let products = [];
  let editingId = null;
  let pendingImageData = null;
  let removeImage = false;
  let isSaving = false;

  function field(name) {
    return productForm.elements.namedItem(name);
  }

  function normalizeTagKey(tag) {
    return String(tag).trim().replace(/^#/, '').toLowerCase();
  }

  function parseTagsInput(value) {
    return String(value || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function splitProductTags(tags) {
    const catalogCategories = [];
    const extraTags = [];

    (Array.isArray(tags) ? tags : parseTagsInput(tags)).forEach((tag) => {
      const key = normalizeTagKey(tag);
      if (!key) return;
      if (CATALOG_CATEGORY_IDS.has(key)) {
        if (!catalogCategories.includes(key)) catalogCategories.push(key);
        return;
      }
      if (key === 'catalog') return;
      if (!extraTags.some((item) => normalizeTagKey(item) === key)) {
        extraTags.push(tag.trim());
      }
    });

    return { catalogCategories, extraTags };
  }

  function getSelectedCatalogCategories() {
    return Array.from(productForm.querySelectorAll('input[name="catalog_categories"]:checked'))
      .map((input) => input.value)
      .filter((value) => CATALOG_CATEGORY_IDS.has(value));
  }

  function setCatalogCategories(categories) {
    const selected = new Set(
      (Array.isArray(categories) ? categories : [])
        .map((tag) => normalizeTagKey(tag))
        .filter((tag) => CATALOG_CATEGORY_IDS.has(tag))
    );

    productForm.querySelectorAll('input[name="catalog_categories"]').forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function buildTagsValue() {
    const catalogCategories = getSelectedCatalogCategories();
    const extraTags = parseTagsInput(field('tags')?.value)
      .filter((tag) => !MANAGED_TAG_KEYS.has(normalizeTagKey(tag)));
    const tags = [...extraTags];

    if (catalogCategories.length) {
      tags.push('catalog', ...catalogCategories);
    }

    return tags.join(', ');
  }

  function renderCatalogBadges(item) {
    const { catalogCategories } = splitProductTags(item.tags);
    if (!catalogCategories.length) return '';

    return catalogCategories
      .map((categoryId) => `
        <span class="admin-clothing-product-badge admin-clothing-product-badge--catalog">
          ${escapeHtml(CATALOG_CATEGORY_LABELS[categoryId] || categoryId)}
        </span>
      `)
      .join('');
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

  function parseOptionalNumber(value) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return null;
    const num = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(num)) return null;
    return Math.round(num * 100) / 100;
  }

  function calcDiscountPercent(price, compare) {
    if (price == null || compare == null || compare <= price) return null;
    return Math.round((1 - price / compare) * 100);
  }

  function resolveDiscountPrices() {
    let price = parseOptionalNumber(field('price_usd')?.value);
    let compare = parseOptionalNumber(field('compare_price_usd')?.value);
    const discount = parseOptionalNumber(field('discount_percent')?.value);

    if (discount != null && discount > 0 && discount < 100) {
      if (price != null && compare == null) {
        compare = Math.round((price / (1 - discount / 100)) * 100) / 100;
      } else if (compare != null && price == null) {
        price = Math.round(compare * (1 - discount / 100) * 100) / 100;
      }
    }

    return { price, compare, discount };
  }

  function syncDiscountPreview() {
    const resolved = resolveDiscountPrices();
    const compareField = field('compare_price_usd');
    const priceField = field('price_usd');
    const discountField = field('discount_percent');

    if (!compareField || !priceField || !discountField) return;

    if (resolved.discount != null && resolved.price != null && !String(compareField.value ?? '').trim()) {
      compareField.placeholder = String(resolved.compare ?? '');
    }

    if (resolved.price != null && resolved.compare != null && resolved.compare > resolved.price) {
      const autoDiscount = calcDiscountPercent(resolved.price, resolved.compare);
      if (autoDiscount != null && !String(discountField.value ?? '').trim()) {
        discountField.placeholder = String(autoDiscount);
      }
    }
  }

  function resetForm() {
    editingId = null;
    pendingImageData = null;
    removeImage = false;
    productForm.reset();
    productForm.hidden = true;
    catalogLayout?.classList.remove('is-editing');
    formTitle.textContent = 'Новый товар';
    deleteBtn.hidden = true;
    imagePreview?.removeAttribute('src');
    updateImageUi(false);
    if (imageInput) imageInput.value = '';
    setSavingState(false);
  }

  function hideSiblingModals() {
    siblingModalIds.forEach((id) => {
      const modal = document.getElementById(id);
      if (modal) modal.hidden = true;
    });
  }

  function closeCatalogPanel() {
    catalogPanel.hidden = true;
    resetForm();
    document.body.style.overflow = '';
  }

  const prevCloseAll = window.closeAllClothingAdmin;
  window.closeAllClothingAdmin = function closeAllClothingAdminWithCatalog() {
    closeCatalogPanel();
    if (typeof prevCloseAll === 'function') prevCloseAll();
  };

  function renderProductThumb(item) {
    if (item.image) {
      return `<img class="admin-clothing-product-thumb" src="${escapeHtml(item.image.split('?')[0])}" alt="">`;
    }
    const gradient = item.gradient || DEFAULT_GRADIENTS[item.category] || DEFAULT_GRADIENTS.casual;
    const label = escapeHtml(item.placeholder_text || item.title || '?');
    return `<div class="admin-clothing-product-thumb admin-clothing-product-thumb--placeholder" style="background:${gradient}"><span>${label}</span></div>`;
  }

  function renderProductList() {
    updateCatalogCount();

    if (!products.length) {
      productList.innerHTML = `
        <li class="admin-clothing-product-empty">
          <span class="admin-clothing-product-empty-icon" aria-hidden="true">👗</span>
          <strong>Каталог пуст</strong>
          <p>Добавьте первый товар — он появится в разделе «Одежда» на сайте</p>
        </li>`;
      return;
    }

    productList.innerHTML = products.map((item) => `
      <li class="admin-clothing-product-item${editingId === item.id ? ' is-active' : ''}">
        ${renderProductThumb(item)}
        <div class="admin-clothing-product-info">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.description || 'Без описания')}</p>
          <div class="admin-clothing-product-meta">
            <span class="admin-clothing-product-badge admin-clothing-product-badge--${escapeHtml(item.category || 'casual')}">${escapeHtml(LINE_LABELS[item.category] || item.category || 'Без категории')}</span>
            ${renderCatalogBadges(item)}
            ${item.promo_type ? `<span class="admin-clothing-product-badge admin-clothing-product-badge--promo admin-clothing-product-badge--${escapeHtml(item.promo_type)}">${escapeHtml(item.promo_label || PROMO_LABELS[item.promo_type] || item.promo_type)}</span>` : ''}
            ${item.price_usd != null ? `<span class="admin-clothing-product-price">${item.compare_price_usd != null && item.compare_price_usd > item.price_usd ? `<s>$${Number(item.compare_price_usd).toFixed(2)}</s> ` : ''}$${Number(item.price_usd).toFixed(2)}</span>` : ''}
          </div>
        </div>
        <div class="admin-clothing-product-actions">
          <button type="button" class="btn btn-ghost" data-edit-id="${item.id}">Изменить</button>
          <button type="button" class="btn btn-ghost btn-ghost-danger" data-delete-id="${item.id}">Удалить</button>
        </div>
      </li>
    `).join('');
  }

  async function fetchProducts() {
    productList.classList.add('is-loading');
    try {
      const response = await fetch('/api/works?section=clothing');
      if (!response.ok) throw new Error('Не удалось загрузить каталог');
      products = await response.json();
      renderProductList();
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    } finally {
      productList.classList.remove('is-loading');
    }
  }

  function openCreateForm() {
    resetForm();
    productForm.hidden = false;
    catalogLayout?.classList.add('is-editing');
    formTitle.textContent = 'Новый товар';
    field('category').value = 'sport';
    setCatalogCategories([]);
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
    field('category').value = item.category || 'sport';
    field('placeholder_text').value = item.placeholder_text || '';
    const { catalogCategories, extraTags } = splitProductTags(item.tags);
    setCatalogCategories(catalogCategories);
    field('tags').value = extraTags.join(', ');
    field('price_usd').value = item.price_usd != null ? item.price_usd : '';
    field('compare_price_usd').value = item.compare_price_usd != null ? item.compare_price_usd : '';
    field('promo_type').value = item.promo_type || '';
    field('promo_label').value = item.promo_label || '';
    const discount = calcDiscountPercent(
      item.price_usd != null ? Number(item.price_usd) : null,
      item.compare_price_usd != null ? Number(item.compare_price_usd) : null
    );
    field('discount_percent').value = discount != null ? discount : '';

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
    const resolved = resolveDiscountPrices();

    if (resolved.compare != null && resolved.price != null && resolved.compare <= resolved.price) {
      showToast('Цена без скидки должна быть выше цены со скидкой', 'error');
      field('compare_price_usd')?.focus();
      return;
    }

    const promoTypeValue = field('promo_type')?.value.trim() || '';
    const payload = {
      section_id: 'clothing',
      title,
      description: field('description')?.value.trim() || '',
      category: field('category')?.value || 'sport',
      placeholder_text: field('placeholder_text')?.value.trim() || '',
      tags: buildTagsValue(),
      price_usd: resolved.price,
      compare_price_usd: resolved.compare,
      promo_type: promoTypeValue || (
        resolved.compare != null && resolved.price != null && resolved.compare > resolved.price
          ? 'sale'
          : null
      ),
      promo_label: field('promo_label')?.value.trim() || null,
      gradient: DEFAULT_GRADIENTS[field('category')?.value] || DEFAULT_GRADIENTS.casual
    };

    if (resolved.discount != null) {
      payload.discount_percent = resolved.discount;
    }

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
      window.dispatchEvent(new CustomEvent('clothing-catalog-changed'));
      if (typeof refreshHomeData === 'function') refreshHomeData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function deleteProduct(id) {
    if (isSaving) return;
    if (!window.confirm('Удалить этот товар из каталога?')) return;

    setSavingState(true);

    try {
      const response = await fetch(`/api/works/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось удалить товар');

      showToast('Товар удалён');
      if (editingId === id) resetForm();
      await fetchProducts();
      window.dispatchEvent(new CustomEvent('clothing-catalog-changed'));
      if (typeof refreshHomeData === 'function') refreshHomeData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  function openCatalogPanel() {
    hideSiblingModals();
    resetForm();
    catalogPanel.hidden = false;
    document.body.style.overflow = 'hidden';
    fetchProducts().catch(() => {});
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  chooseCatalogBtn.addEventListener('click', openCatalogPanel);

  catalogClose?.addEventListener('click', () => {
    closeCatalogPanel();
    if (typeof window.openAdminClothingGate === 'function') window.openAdminClothingGate();
  });

  catalogBack?.addEventListener('click', () => {
    closeCatalogPanel();
    if (typeof window.openAdminClothingGate === 'function') window.openAdminClothingGate();
  });

  addBtn?.addEventListener('click', openCreateForm);
  cancelBtn?.addEventListener('click', resetForm);
  deleteBtn?.addEventListener('click', () => {
    if (editingId) deleteProduct(editingId);
  });

  productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveProduct();
  });

  productList.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit-id]');
    const deleteBtnEl = event.target.closest('[data-delete-id]');
    if (editBtn) openEditForm(Number(editBtn.dataset.editId));
    if (deleteBtnEl) deleteProduct(Number(deleteBtnEl.dataset.deleteId));
  });

  pickImageBtn?.addEventListener('click', () => {
    if (isSaving) return;
    imageInput?.click();
  });

  imageInput?.addEventListener('change', async () => {
    const file = imageInput.files?.[0];
    imageInput.value = '';
    if (!file || isSaving) return;

    try {
      pendingImageData = await readFileAsDataUrl(file);
      removeImage = false;
      imagePreview.src = pendingImageData;
      updateImageUi(true);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  removeImageBtn?.addEventListener('click', () => {
    if (isSaving) return;
    pendingImageData = null;
    removeImage = true;
    imagePreview.removeAttribute('src');
    updateImageUi(false);
  });

  catalogPanel.addEventListener('click', (event) => {
    if (event.target === catalogPanel) {
      closeCatalogPanel();
      if (typeof window.openAdminClothingGate === 'function') window.openAdminClothingGate();
    }
  });

  ['price_usd', 'compare_price_usd', 'discount_percent'].forEach((name) => {
    field(name)?.addEventListener('input', syncDiscountPreview);
  });
})();
