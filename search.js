(function initSiteSearch() {

  const box = document.getElementById('siteSearchBox');

  const input = document.getElementById('siteSearchInput');

  const button = document.getElementById('siteSearchBtn');

  const dropdown = document.getElementById('siteSearchResults');



  if (!box || !input || !button || !dropdown) return;



  const SECTIONS = {

    supplements: 'Фитнес-индустрия',

    banners: 'Мои Баннеры',

    clothing: 'Одежда'

  };



  const CATEGORIES = {

    protein: 'Протеин',

    creatine: 'Креатин',

    vitamins: 'Витамины',

    equipment: 'Спорт-инвентарь',

    preview: 'Превью',

    illustrations: 'Иллюстрации',

    logos: 'Логотипы',

    pictures: 'Картинки',

    sport: 'Спорт',

    casual: 'Casual'

  };



  let debounceTimer = null;

  let requestId = 0;

  let results = [];

  let randomResult = null;

  let activeIndex = -1;

  let currentQuery = '';



  function escapeHtml(value) {

    return String(value)

      .replaceAll('&', '&amp;')

      .replaceAll('<', '&lt;')

      .replaceAll('>', '&gt;')

      .replaceAll('"', '&quot;');

  }



  function formatPrice(amount) {

    if (amount == null) return '';

    return new Intl.NumberFormat('en-US', {

      style: 'currency',

      currency: 'USD'

    }).format(amount);

  }



  function setDropdownOpen(isOpen) {

    dropdown.hidden = !isOpen;

    input.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

  }



  function closeDropdown() {

    setDropdownOpen(false);

    activeIndex = -1;

  }



  function buildResultMeta(item) {

    const section = SECTIONS[item.section_id] || '';

    const category = CATEGORIES[item.category] || item.category || '';

    const price = item.price_usd != null ? formatPrice(item.price_usd) : '';

    const parts = [section, category, price].filter(Boolean);

    return parts.join(' · ');

  }



  function navigateToResult(item, { notFound = false, query = '' } = {}) {

    if (!item?.id) return;



    const sectionId = item.section_id || 'supplements';



    if (sectionId === 'banners') {

      window.location.href = `/?work=${item.id}#banners`;

      return;

    }



    if (sectionId === 'clothing') {

      let url = `/clothing-product.html?id=${item.id}`;

      if (notFound && query) {

        url += `&notfound=1&q=${encodeURIComponent(query)}`;

      }

      window.location.href = url;

      return;

    }



    let url = `/product.html?id=${item.id}`;

    if (notFound && query) {

      url += `&notfound=1&q=${encodeURIComponent(query)}`;

    }

    window.location.href = url;

  }



  function renderDropdownEmpty(message) {

    dropdown.innerHTML = `<p class="search-dropdown-empty">${escapeHtml(message)}</p>`;

    setDropdownOpen(true);

  }



  function renderDropdownResults(items) {

    if (!items.length) {

      renderDropdownEmpty('Ничего не найдено. Нажмите «Найти», чтобы открыть случайный результат.');

      return;

    }



    dropdown.innerHTML = items.map((item, index) => {

      const meta = buildResultMeta(item);

      const isActive = index === activeIndex;



      return `

        <button

          type="button"

          class="search-dropdown-item${isActive ? ' is-active' : ''}"

          role="option"

          aria-selected="${isActive ? 'true' : 'false'}"

          data-index="${index}"

        >

          <span class="search-dropdown-item-main">

            <strong>${escapeHtml(item.title)}</strong>

            <span class="search-dropdown-item-meta">${escapeHtml(meta)}</span>

          </span>

          <span class="search-dropdown-item-arrow" aria-hidden="true">→</span>

        </button>

      `;

    }).join('');



    dropdown.querySelectorAll('.search-dropdown-item').forEach((element) => {

      element.addEventListener('mousedown', (event) => {

        event.preventDefault();

      });



      element.addEventListener('click', () => {

        const index = Number(element.dataset.index);

        const item = results[index];

        if (item) navigateToResult(item);

      });

    });



    setDropdownOpen(true);

  }



  function highlightActiveItem() {

    dropdown.querySelectorAll('.search-dropdown-item').forEach((element, index) => {

      const isActive = index === activeIndex;

      element.classList.toggle('is-active', isActive);

      element.setAttribute('aria-selected', isActive ? 'true' : 'false');

      if (isActive) element.scrollIntoView({ block: 'nearest' });

    });

  }



  async function fetchResults(query) {

    const trimmed = query.trim();

    currentQuery = trimmed;



    if (!trimmed) {

      results = [];

      randomResult = null;

      activeIndex = -1;

      dropdown.innerHTML = '';

      closeDropdown();

      return;

    }



    const currentRequest = ++requestId;



    try {

      const response = await fetch(`/api/works/search?q=${encodeURIComponent(trimmed)}&limit=8`);

      if (!response.ok) throw new Error('Search failed');

      const payload = await response.json();

      if (currentRequest !== requestId) return;



      results = payload.results || [];

      randomResult = payload.random_id

        ? { id: payload.random_id, section_id: payload.random_section_id || 'supplements' }

        : null;

      activeIndex = results.length ? 0 : -1;

      renderDropdownResults(results);

    } catch {

      if (currentRequest !== requestId) return;

      renderDropdownEmpty('Не удалось выполнить поиск. Попробуйте ещё раз.');

    }

  }



  function scheduleSearch() {

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {

      fetchResults(input.value);

    }, 260);

  }



  function submitSearch() {

    const query = input.value.trim();

    if (!query) return;



    if (results.length) {

      const index = activeIndex >= 0 ? activeIndex : 0;

      navigateToResult(results[index]);

      return;

    }



    if (randomResult) {

      navigateToResult(randomResult, { notFound: true, query });

      return;

    }



    renderDropdownEmpty('В каталоге пока нет материалов для поиска.');

  }



  input.addEventListener('input', scheduleSearch);



  input.addEventListener('focus', () => {

    if (input.value.trim()) {

      scheduleSearch();

    }

  });



  input.addEventListener('keydown', (event) => {

    if (event.key === 'ArrowDown') {

      event.preventDefault();

      if (!results.length) return;

      activeIndex = Math.min(activeIndex + 1, results.length - 1);

      highlightActiveItem();

      setDropdownOpen(true);

      return;

    }



    if (event.key === 'ArrowUp') {

      event.preventDefault();

      if (!results.length) return;

      activeIndex = Math.max(activeIndex - 1, 0);

      highlightActiveItem();

      setDropdownOpen(true);

      return;

    }



    if (event.key === 'Enter') {

      event.preventDefault();

      submitSearch();

      return;

    }



    if (event.key === 'Escape') {

      closeDropdown();

    }

  });



  button.addEventListener('click', submitSearch);



  document.addEventListener('click', (event) => {

    if (!box.contains(event.target)) {

      closeDropdown();

    }

  });

})();

