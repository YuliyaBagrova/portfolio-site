(function initClothingFilter() {
  const section = document.getElementById('section-clothing');
  if (!section) return;

  const filterBar = section.querySelector('.clothing-filter-bar');
  const catalogPanel = document.getElementById('clothingCatalogPanel');
  const lookbookGrid = document.getElementById('clothingLookbookGrid');
  const emptyState = document.getElementById('clothingEmpty');
  const catalogItems = section.querySelectorAll('.clothing-catalog-item');
  if (!filterBar) return;

  let activeFilter = 'all';
  let activeCatalog = null;

  function getCards() {
    return section.querySelectorAll('.clothing-card[data-category]');
  }

  function applyFilters() {
    const isCatalogView = activeFilter === 'catalog';
    const cards = getCards();
    let visibleCount = 0;

    if (catalogPanel) catalogPanel.hidden = !isCatalogView;
    if (lookbookGrid) lookbookGrid.hidden = isCatalogView;

    if (isCatalogView) return;

    cards.forEach((card) => {
      const categories = (card.dataset.category || '').split(/\s+/);
      let visible = activeFilter === 'all' || categories.includes(activeFilter);

      if (visible && activeCatalog) {
        visible = categories.includes(activeCatalog);
      }

      const wrapper = card.closest('.clothing-card-link') || card;
      wrapper.classList.toggle('is-hidden', !visible);
      if (visible) visibleCount += 1;
    });

    if (emptyState) {
      if (!cards.length) {
        emptyState.hidden = false;
        emptyState.textContent = 'Ждите поступления новых товаров';
      } else {
        emptyState.hidden = visibleCount > 0;
        emptyState.textContent = visibleCount > 0 ? '' : 'В этой категории пока нет товаров';
      }
    }
  }

  filterBar.addEventListener('click', (event) => {
    const button = event.target.closest('.clothing-filter-btn');
    if (!button) return;

    activeFilter = button.dataset.filter || 'all';
    activeCatalog = null;

    filterBar.querySelectorAll('.clothing-filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn === button);
    });

    catalogItems.forEach((item) => item.classList.remove('active'));
    applyFilters();
  });

  catalogItems.forEach((item) => {
    item.addEventListener('click', () => {
      const catalogId = item.dataset.catalog;
      const isSame = activeCatalog === catalogId;

      activeFilter = 'all';
      activeCatalog = isSame ? null : catalogId;

      filterBar.querySelectorAll('.clothing-filter-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
      });

      catalogItems.forEach((btn) => {
        btn.classList.toggle('active', !isSame && btn === item);
      });

      if (catalogPanel) catalogPanel.hidden = true;
      if (lookbookGrid) lookbookGrid.hidden = false;
      applyFilters();
    });
  });

  window.addEventListener('clothing-catalog-updated', () => {
    applyFilters();
  });
})();
