const fitnessSection = document.getElementById('section-supplements');

if (fitnessSection) {
  const filterBar = fitnessSection.querySelector('.fitness-filter-bar');
  const emptyState = document.getElementById('fitnessEmpty');
  let activeFilter = 'all';

  function getCards() {
    return fitnessSection.querySelectorAll('.fitness-card[data-category]');
  }

  function applyFitnessFilter(category) {
    activeFilter = category;
    const cards = getCards();
    let visibleCount = 0;

    cards.forEach((card) => {
      const match = category === 'all' || card.dataset.category === category;
      const wrapper = card.closest('.fitness-card-link') || card;
      wrapper.classList.toggle('is-hidden', !match);
      if (match) visibleCount += 1;
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

  filterBar?.querySelectorAll('.filter-btn[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('.filter-btn').forEach((item) => {
        item.classList.remove('active');
      });
      btn.classList.add('active');
      applyFitnessFilter(btn.dataset.filter || 'all');
    });
  });

  window.addEventListener('fitness-catalog-updated', () => {
    applyFitnessFilter(activeFilter);
  });
}
