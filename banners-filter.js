(function initBannersFilter() {
  const section = document.getElementById('section-banners');
  if (!section) return;

  const filterBar = section.querySelector('.banners-filter-bar');
  const grid = section.querySelector('.banners-grid');
  if (!filterBar || !grid) return;

  let activeFilter = 'all';

  function getCards() {
    return grid.querySelectorAll('.banners-card[data-category]');
  }

  function applyFilters() {
    const cards = getCards();
    let visibleCount = 0;

    cards.forEach((card) => {
      const category = card.dataset.category || '';
      const visible = activeFilter === 'all' || category === activeFilter;
      card.classList.toggle('is-hidden', !visible);
      if (visible) visibleCount += 1;
    });

    grid.classList.toggle('is-empty', visibleCount === 0 && cards.length > 0);
    const emptyState = document.getElementById('bannersEmpty');
    if (emptyState) {
      emptyState.hidden = cards.length > 0;
    }

    if (window.BannersCatalog && typeof window.BannersCatalog.layoutMasonry === 'function') {
      window.BannersCatalog.layoutMasonry(grid);
    }
  }

  filterBar.addEventListener('click', (event) => {
    const button = event.target.closest('.banners-filter-btn');
    if (!button) return;

    activeFilter = button.dataset.filter || 'all';

    filterBar.querySelectorAll('.banners-filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn === button);
    });

    applyFilters();
  });

  window.addEventListener('banners-catalog-updated', applyFilters);

  applyFilters();
})();
