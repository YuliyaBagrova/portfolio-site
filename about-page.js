(function initAboutPage() {
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderItem(item) {
    if (!item || !item.type) return '';

    if (item.type === 'subtitle') {
      return `<h3 class="about-subtitle">${escapeHtml(item.text)}</h3>`;
    }

    if (item.type === 'list') {
      const entries = (item.entries || [])
        .map((entry) => `<li>${entry}</li>`)
        .join('');
      return entries ? `<ul class="about-list">${entries}</ul>` : '';
    }

    if (item.type === 'faq') {
      return (item.entries || [])
        .map(
          (entry) => `<details class="about-faq-item">
              <summary>${escapeHtml(entry.question)}</summary>
              <p>${entry.answer}</p>
            </details>`
        )
        .join('');
    }

    return item.html ? `<p class="about-text">${item.html}</p>` : '';
  }

  function renderBlock(block) {
    const variantClass = block.variant === 'author' ? ' about-block--author' : '';
    const idAttr = block.anchor ? ` id="${escapeHtml(block.anchor)}"` : '';
    const hasFaq = (block.items || []).some((entry) => entry.type === 'faq');
    const bodyClass = hasFaq ? 'about-block-body about-faq' : 'about-block-body';

    const itemsHtml = (block.items || []).map(renderItem).join('');

    return `<article class="card about-block${variantClass}"${idAttr}>
      <div class="card-header">
        <h2>${escapeHtml(block.title)}</h2>
      </div>
      <div class="${bodyClass}">${itemsHtml}</div>
    </article>`;
  }

  function renderAboutPageContent(root, content) {
    if (!root || !content) return;

    const navHtml = (content.nav || [])
      .map(
        (item) =>
          `<a href="#${escapeHtml(item.anchor)}" class="about-page-nav-link">${escapeHtml(item.label)}</a>`
      )
      .join('');

    root.innerHTML = `
      <div class="about-page-intro">
        <div class="section-header">
          <div>
            <h2>${escapeHtml(content.page?.title)}</h2>
            <p class="section-desc">${escapeHtml(content.page?.description)}</p>
          </div>
        </div>
        ${
          navHtml
            ? `<nav class="about-page-nav" aria-label="Разделы страницы">${navHtml}</nav>`
            : ''
        }
      </div>
      ${(content.blocks || []).map(renderBlock).join('')}
    `;

    root.querySelectorAll('.about-page-nav-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (!href?.startsWith('#')) return;

        const target = document.querySelector(href);
        if (!target || !root.contains(target)) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  async function loadPublicAboutPage() {
    const root = document.getElementById('aboutPageRoot');
    const loading = document.getElementById('aboutPageLoading');
    if (!root) return;

    try {
      const response = await fetch('/api/about-page');
      if (!response.ok) throw new Error('Не удалось загрузить страницу');

      const content = await response.json();
      renderAboutPageContent(root, content);
      root.hidden = false;
    } catch {
      if (loading) {
        loading.textContent = 'Не удалось загрузить содержимое. Обновите страницу.';
        loading.classList.add('about-page-loading--error');
      }
      return;
    }

    if (loading) loading.hidden = true;
  }

  window.renderAboutPageContent = renderAboutPageContent;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPublicAboutPage);
  } else {
    loadPublicAboutPage();
  }
})();
