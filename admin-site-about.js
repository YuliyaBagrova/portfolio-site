(function initAdminSiteAboutEditor() {
  const openBtn = document.getElementById('adminSiteAboutManage');
  const backBtn = document.getElementById('adminSiteAboutBack');
  const saveBtn = document.getElementById('adminSiteAboutSave');
  const resetBtn = document.getElementById('adminSiteAboutReset');
  const previewToggle = document.getElementById('adminSiteAboutPreviewToggle');
  const editorRoot = document.getElementById('adminSiteAboutEditor');
  const previewRoot = document.getElementById('adminSiteAboutPreview');
  const previewPanel = document.getElementById('adminSiteAboutPreviewPanel');
  const layoutEl = document.getElementById('adminSiteAboutLayout');
  const statusEl = document.getElementById('adminSiteAboutStatus');
  const saveModal = document.getElementById('adminSiteAboutSaveModal');
  const saveYesBtn = document.getElementById('adminSiteAboutSaveYes');
  const saveNoBtn = document.getElementById('adminSiteAboutSaveNo');

  if (!openBtn || !editorRoot) return;

  const ITEM_LABELS = {
    text: 'Абзац',
    subtitle: 'Подзаголовок',
    list: 'Список',
    faq: 'FAQ'
  };

  let content = null;
  let isDirty = false;
  let isSaving = false;
  let previewVisible = true;

  function showToast(message, type = 'success') {
    window.showAdminToast(message, type);
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || '';
  }

  function markDirty() {
    isDirty = true;
    setStatus('Есть несохранённые изменения');
    updatePreview();
  }

  function markClean(savedText) {
    isDirty = false;
    setStatus(savedText || 'Все изменения сохранены');
  }

  function newId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function cloneContent(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function getBlockAnchors() {
    return content.blocks
      .map((block) => block.anchor)
      .filter(Boolean);
  }

  function ensureNavArray() {
    if (!Array.isArray(content.nav)) {
      content.nav = [];
    }
  }

  /** Удаляет кнопки навигации, если якорь блока больше не существует */
  function cleanupNavAnchors() {
    ensureNavArray();
    const anchors = new Set(getBlockAnchors());
    content.nav = content.nav.filter((item) => anchors.has(item.anchor));
  }

  /** Первичная инициализация nav из блоков, если в данных nav пуст */
  function initNavFromBlocksIfEmpty() {
    ensureNavArray();
    if (content.nav.length) return;

    content.nav = content.blocks
      .filter((block) => block.anchor)
      .map((block) => ({
        anchor: block.anchor,
        label: block.title
      }));
  }

  function applyToPublicSite(savedContent) {
    if (typeof window.applyPublicAboutPageContent === 'function') {
      window.applyPublicAboutPageContent(savedContent);
      return;
    }

    const publicRoot = document.getElementById('aboutPageRoot');
    if (publicRoot && typeof window.renderAboutPageContent === 'function') {
      window.renderAboutPageContent(publicRoot, savedContent);
      publicRoot.hidden = false;
      const loading = document.getElementById('aboutPageLoading');
      if (loading) loading.hidden = true;
    }
  }

  function openSaveConfirmModal() {
    if (!saveModal) return;
    saveModal.hidden = false;
    document.body.style.overflow = 'hidden';
    saveYesBtn?.focus();
  }

  function closeSaveConfirmModal() {
    if (!saveModal) return;
    saveModal.hidden = true;
    if (!document.getElementById('adminPanel')?.hidden) {
      document.body.style.overflow = 'hidden';
    } else if (!document.getElementById('topNav')?.classList.contains('open')) {
      document.body.style.overflow = '';
    }
  }

  function bindSaveModalEvents() {
    saveYesBtn?.addEventListener('click', () => {
      closeSaveConfirmModal();
      performSave();
    });
    saveNoBtn?.addEventListener('click', closeSaveConfirmModal);

    saveModal?.addEventListener('click', (event) => {
      if (event.target === saveModal) closeSaveConfirmModal();
    });

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape' || saveModal?.hidden) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSaveConfirmModal();
      },
      true
    );
  }

  bindSaveModalEvents();
  syncPreviewVisibility();

  function updatePreview() {
    if (!previewRoot || !content || typeof window.renderAboutPageContent !== 'function') return;
    window.renderAboutPageContent(previewRoot, content);
  }

  function bindInput(el, handler) {
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  }

  function moveItem(blockIndex, itemIndex, direction) {
    const items = content.blocks[blockIndex].items;
    const target = itemIndex + direction;
    if (target < 0 || target >= items.length) return;
    const [item] = items.splice(itemIndex, 1);
    items.splice(target, 0, item);
    markDirty();
    renderEditor();
  }

  function moveBlock(blockIndex, direction) {
    const target = blockIndex + direction;
    if (target < 0 || target >= content.blocks.length) return;
    const [block] = content.blocks.splice(blockIndex, 1);
    content.blocks.splice(target, 0, block);
    markDirty();
    renderEditor();
  }

  function moveNavItem(navIndex, direction) {
    ensureNavArray();
    const target = navIndex + direction;
    if (target < 0 || target >= content.nav.length) return;
    const [item] = content.nav.splice(navIndex, 1);
    content.nav.splice(target, 0, item);
    markDirty();
    renderEditor();
  }

  function renderAnchorOptions(selectedAnchor) {
    const anchors = getBlockAnchors();
    if (!anchors.length) {
      return '<option value="">— Сначала задайте якорь блоку —</option>';
    }

    return anchors
      .map(
        (anchor) =>
          `<option value="${anchor.replace(/"/g, '&quot;')}"${anchor === selectedAnchor ? ' selected' : ''}>#${anchor}</option>`
      )
      .join('');
  }

  function renderNavEditor() {
    ensureNavArray();
    const anchors = getBlockAnchors();

    const itemsHtml = content.nav.length
      ? content.nav
          .map((item, navIndex) => {
            const anchorMissing = item.anchor && !anchors.includes(item.anchor);
            return `
          <div class="site-about-nav-row${anchorMissing ? ' site-about-nav-row--warn' : ''}" data-nav-index="${navIndex}">
            <span class="site-about-nav-grip" aria-hidden="true">☰</span>
            <label class="site-about-field site-about-nav-field">
              <span class="site-about-field-label">Текст кнопки</span>
              <input type="text" class="site-about-input" data-nav-label value="${(item.label || '').replace(/"/g, '&quot;')}" placeholder="Например: Как заказать">
            </label>
            <label class="site-about-field site-about-nav-field">
              <span class="site-about-field-label">Якорь блока</span>
              <select class="site-about-input" data-nav-anchor>
                ${renderAnchorOptions(item.anchor)}
              </select>
            </label>
            <div class="site-about-nav-row-actions">
              <button type="button" class="site-about-icon-btn" data-nav-up title="Левее" aria-label="Левее">←</button>
              <button type="button" class="site-about-icon-btn" data-nav-down title="Правее" aria-label="Правее">→</button>
              <button type="button" class="site-about-icon-btn site-about-icon-btn--danger" data-nav-remove title="Удалить кнопку" aria-label="Удалить кнопку">✕</button>
            </div>
            ${anchorMissing ? '<p class="site-about-nav-warn">Якорь не найден среди блоков — выберите другой или задайте якорь блоку</p>' : ''}
          </div>`;
          })
          .join('')
      : '<p class="site-about-empty">Кнопок пока нет. Добавьте якорь блоку и нажмите «Добавить кнопку».</p>';

    return `
      <div class="site-about-nav-card card">
        <div class="card-header site-about-nav-card-header">
          <div>
            <h2>Кнопки навигации</h2>
            <p class="site-about-nav-desc">Ссылки под заголовком страницы — «Как заказать», «Частые вопросы» и другие</p>
          </div>
          <button type="button" class="site-about-chip site-about-chip--accent" id="adminSiteAboutAddNav"${anchors.length ? '' : ' disabled title="Сначала задайте якорь хотя бы одному блоку"'}>+ Добавить кнопку</button>
        </div>
        <div class="site-about-nav-list">${itemsHtml}</div>
      </div>`;
  }

  function renderListEditor(blockIndex, itemIndex, item) {
    const entries = item.entries?.length ? item.entries : [''];

    return `
      <div class="site-about-list-editor" data-list-editor="${blockIndex}-${itemIndex}">
        ${entries
          .map(
            (entry, entryIndex) => `
          <div class="site-about-list-row">
            <textarea class="site-about-input site-about-textarea" rows="2" data-list-entry="${entryIndex}" placeholder="Пункт списка">${entry.replace(/</g, '&lt;')}</textarea>
            <button type="button" class="site-about-icon-btn" data-list-remove="${entryIndex}" title="Удалить пункт" aria-label="Удалить пункт">✕</button>
          </div>`
          )
          .join('')}
        <button type="button" class="site-about-text-btn" data-list-add>+ Добавить пункт</button>
      </div>`;
  }

  function renderFaqEditor(blockIndex, itemIndex, item) {
    const entries = item.entries?.length ? item.entries : [{ question: '', answer: '' }];

    return `
      <div class="site-about-faq-editor" data-faq-editor="${blockIndex}-${itemIndex}">
        ${entries
          .map(
            (entry, entryIndex) => `
          <div class="site-about-faq-card">
            <label class="site-about-field">
              <span class="site-about-field-label">Вопрос</span>
              <input type="text" class="site-about-input" data-faq-question="${entryIndex}" value="${(entry.question || '').replace(/"/g, '&quot;')}" placeholder="Формулировка вопроса">
            </label>
            <label class="site-about-field">
              <span class="site-about-field-label">Ответ</span>
              <textarea class="site-about-input site-about-textarea" rows="3" data-faq-answer="${entryIndex}" placeholder="Текст ответа">${(entry.answer || '').replace(/</g, '&lt;')}</textarea>
            </label>
            <button type="button" class="site-about-text-btn site-about-text-btn--danger" data-faq-remove="${entryIndex}">Удалить вопрос</button>
          </div>`
          )
          .join('')}
        <button type="button" class="site-about-text-btn" data-faq-add>+ Добавить вопрос</button>
      </div>`;
  }

  function renderItemEditor(blockIndex, item, itemIndex) {
    const type = item.type || 'text';
    let body = '';

    if (type === 'subtitle') {
      body = `<input type="text" class="site-about-input" data-item-subtitle value="${(item.text || '').replace(/"/g, '&quot;')}" placeholder="Текст подзаголовка">`;
    } else if (type === 'list') {
      body = renderListEditor(blockIndex, itemIndex, item);
    } else if (type === 'faq') {
      body = renderFaqEditor(blockIndex, itemIndex, item);
    } else {
      body = `<textarea class="site-about-input site-about-textarea site-about-textarea--rich" rows="4" data-item-text placeholder="Текст абзаца">${(item.html || '').replace(/</g, '&lt;')}</textarea>
        <p class="site-about-hint">Можно использовать <code>&lt;strong&gt;</code> и ссылки <code>&lt;a href="..." class="about-link"&gt;</code></p>`;
    }

    return `
      <div class="site-about-item" data-item-block="${blockIndex}" data-item-index="${itemIndex}">
        <div class="site-about-item-head">
          <span class="site-about-item-badge site-about-item-badge--${type}">${ITEM_LABELS[type] || type}</span>
          <div class="site-about-item-actions">
            <button type="button" class="site-about-icon-btn" data-item-up title="Выше" aria-label="Выше">↑</button>
            <button type="button" class="site-about-icon-btn" data-item-down title="Ниже" aria-label="Ниже">↓</button>
            <button type="button" class="site-about-icon-btn site-about-icon-btn--danger" data-item-remove title="Удалить" aria-label="Удалить">✕</button>
          </div>
        </div>
        <div class="site-about-item-body">${body}</div>
      </div>`;
  }

  function renderBlockEditor(block, blockIndex) {
    const itemsHtml = (block.items || [])
      .map((item, itemIndex) => renderItemEditor(blockIndex, item, itemIndex))
      .join('');

    return `
      <article class="site-about-block-card" data-block-index="${blockIndex}">
        <header class="site-about-block-head">
          <div class="site-about-block-title-row">
            <span class="site-about-block-num">${blockIndex + 1}</span>
            <input type="text" class="site-about-input site-about-block-title" data-block-title value="${(block.title || '').replace(/"/g, '&quot;')}" placeholder="Заголовок блока">
          </div>
          <div class="site-about-block-actions">
            <button type="button" class="site-about-icon-btn" data-block-up title="Блок выше" aria-label="Блок выше">↑</button>
            <button type="button" class="site-about-icon-btn" data-block-down title="Блок ниже" aria-label="Блок ниже">↓</button>
            <button type="button" class="site-about-icon-btn site-about-icon-btn--danger" data-block-remove title="Удалить блок" aria-label="Удалить блок">✕</button>
          </div>
        </header>

        <div class="site-about-block-meta">
          <label class="site-about-field site-about-field--inline">
            <span class="site-about-field-label">Якорь (для навигации)</span>
            <input type="text" class="site-about-input" data-block-anchor value="${block.anchor || ''}" placeholder="например: order">
          </label>
          <label class="site-about-field site-about-field--inline">
            <span class="site-about-field-label">Стиль блока</span>
            <select class="site-about-input" data-block-variant>
              <option value="default" ${block.variant !== 'author' ? 'selected' : ''}>Обычный</option>
              <option value="author" ${block.variant === 'author' ? 'selected' : ''}>Акцентный (автор)</option>
            </select>
          </label>
        </div>

        <div class="site-about-items">${itemsHtml || '<p class="site-about-empty">Добавьте элементы контента ниже</p>'}</div>

        <div class="site-about-add-toolbar">
          <span class="site-about-add-label">Добавить:</span>
          <button type="button" class="site-about-chip" data-add-item="text">Абзац</button>
          <button type="button" class="site-about-chip" data-add-item="subtitle">Подзаголовок</button>
          <button type="button" class="site-about-chip" data-add-item="list">Список</button>
          <button type="button" class="site-about-chip" data-add-item="faq">FAQ</button>
        </div>
      </article>`;
  }

  function renderEditor() {
    if (!content) return;

    editorRoot.innerHTML = `
      <div class="site-about-page-card card">
        <div class="card-header">
          <h2>Заголовок страницы</h2>
        </div>
        <div class="site-about-page-fields">
          <label class="site-about-field">
            <span class="site-about-field-label">Заголовок</span>
            <input type="text" class="site-about-input" id="adminSiteAboutPageTitle" value="${(content.page.title || '').replace(/"/g, '&quot;')}">
          </label>
          <label class="site-about-field">
            <span class="site-about-field-label">Описание под заголовком</span>
            <textarea class="site-about-input site-about-textarea" rows="2" id="adminSiteAboutPageDesc">${(content.page.description || '').replace(/</g, '&lt;')}</textarea>
          </label>
        </div>
      </div>

      ${renderNavEditor()}

      <div class="site-about-blocks-head">
        <h3>Блоки контента</h3>
        <button type="button" class="site-about-text-btn" id="adminSiteAboutAddBlock">+ Новый блок</button>
      </div>

      <div class="site-about-blocks-list">
        ${content.blocks.map((block, index) => renderBlockEditor(block, index)).join('')}
      </div>
    `;

    bindEditorEvents();
    updatePreview();
  }

  function bindNavEvents() {
    const addNavBtn = document.getElementById('adminSiteAboutAddNav');
    addNavBtn?.addEventListener('click', () => {
      const anchors = getBlockAnchors();
      if (!anchors.length) {
        showToast('Сначала задайте якорь хотя бы одному блоку', 'error');
        return;
      }

      const firstFree =
        anchors.find((anchor) => !content.nav.some((item) => item.anchor === anchor)) || anchors[0];
      const block = content.blocks.find((entry) => entry.anchor === firstFree);

      ensureNavArray();
      content.nav.push({
        anchor: firstFree,
        label: block?.title || firstFree
      });
      markDirty();
      renderEditor();
    });

    editorRoot.querySelectorAll('[data-nav-index]').forEach((rowEl) => {
      const navIndex = Number(rowEl.dataset.navIndex);
      const navItem = content.nav[navIndex];
      if (!navItem) return;

      rowEl.querySelector('[data-nav-label]')?.addEventListener('input', (e) => {
        navItem.label = e.target.value;
        markDirty();
      });

      rowEl.querySelector('[data-nav-anchor]')?.addEventListener('change', (e) => {
        navItem.anchor = e.target.value;
        markDirty();
        renderEditor();
      });

      rowEl.querySelector('[data-nav-up]')?.addEventListener('click', () => moveNavItem(navIndex, -1));
      rowEl.querySelector('[data-nav-down]')?.addEventListener('click', () => moveNavItem(navIndex, 1));
      rowEl.querySelector('[data-nav-remove]')?.addEventListener('click', () => {
        content.nav.splice(navIndex, 1);
        markDirty();
        renderEditor();
      });
    });
  }

  function bindBlockEvents(blockEl, blockIndex) {
    const block = content.blocks[blockIndex];
    if (!block) return;

    blockEl.querySelector('[data-block-title]')?.addEventListener('input', (e) => {
      block.title = e.target.value;
      markDirty();
    });

    const anchorInput = blockEl.querySelector('[data-block-anchor]');
    if (anchorInput) {
      anchorInput.addEventListener('focus', () => {
        anchorInput.dataset.prevAnchor = block.anchor || '';
      });

      anchorInput.addEventListener('change', (e) => {
        const prevAnchor = anchorInput.dataset.prevAnchor || '';
        const value = e.target.value.trim();
        block.anchor = value || null;

        ensureNavArray();
        if (prevAnchor && prevAnchor !== block.anchor) {
          content.nav.forEach((item) => {
            if (item.anchor === prevAnchor) {
              item.anchor = block.anchor || prevAnchor;
            }
          });
        }

        cleanupNavAnchors();
        markDirty();
        renderEditor();
      });
    }

    blockEl.querySelector('[data-block-variant]')?.addEventListener('change', (e) => {
      block.variant = e.target.value;
      markDirty();
    });

    blockEl.querySelector('[data-block-up]')?.addEventListener('click', () => moveBlock(blockIndex, -1));
    blockEl.querySelector('[data-block-down]')?.addEventListener('click', () => moveBlock(blockIndex, 1));
    blockEl.querySelector('[data-block-remove]')?.addEventListener('click', () => {
      if (!window.confirm('Удалить этот блок?')) return;
      const removedAnchor = block.anchor;
      content.blocks.splice(blockIndex, 1);
      if (removedAnchor) {
        content.nav = content.nav.filter((item) => item.anchor !== removedAnchor);
      }
      markDirty();
      renderEditor();
    });

    blockEl.querySelectorAll('[data-add-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.addItem;
        const newItem =
          type === 'subtitle'
            ? { type, text: '' }
            : type === 'list'
              ? { type, entries: [''] }
              : type === 'faq'
                ? { type, entries: [{ question: '', answer: '' }] }
                : { type: 'text', html: '' };
        block.items.push(newItem);
        markDirty();
        renderEditor();
      });
    });

    blockEl.querySelectorAll('.site-about-item').forEach((itemEl) => {
      bindItemEvents(itemEl, blockIndex);
    });
  }

  function bindItemEvents(itemEl, blockIndex) {
    const itemIndex = Number(itemEl.dataset.itemIndex);
    const block = content.blocks[blockIndex];
    const item = block?.items[itemIndex];
    if (!item) return;

    itemEl.querySelector('[data-item-text]')?.addEventListener('input', (e) => {
      item.html = e.target.value;
      markDirty();
    });

    itemEl.querySelector('[data-item-subtitle]')?.addEventListener('input', (e) => {
      item.text = e.target.value;
      markDirty();
    });

    itemEl.querySelector('[data-item-up]')?.addEventListener('click', () => moveItem(blockIndex, itemIndex, -1));
    itemEl.querySelector('[data-item-down]')?.addEventListener('click', () => moveItem(blockIndex, itemIndex, 1));
    itemEl.querySelector('[data-item-remove]')?.addEventListener('click', () => {
      block.items.splice(itemIndex, 1);
      markDirty();
      renderEditor();
    });

    itemEl.querySelectorAll('[data-list-entry]').forEach((textarea) => {
      textarea.addEventListener('input', (e) => {
        const entryIndex = Number(e.target.dataset.listEntry);
        item.entries[entryIndex] = e.target.value;
        markDirty();
      });
    });

    itemEl.querySelector('[data-list-add]')?.addEventListener('click', () => {
      item.entries.push('');
      markDirty();
      renderEditor();
    });

    itemEl.querySelectorAll('[data-list-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entryIndex = Number(btn.dataset.listRemove);
        item.entries.splice(entryIndex, 1);
        if (!item.entries.length) item.entries.push('');
        markDirty();
        renderEditor();
      });
    });

    itemEl.querySelectorAll('[data-faq-question]').forEach((input) => {
      input.addEventListener('input', (e) => {
        const entryIndex = Number(e.target.dataset.faqQuestion);
        item.entries[entryIndex].question = e.target.value;
        markDirty();
      });
    });

    itemEl.querySelectorAll('[data-faq-answer]').forEach((textarea) => {
      textarea.addEventListener('input', (e) => {
        const entryIndex = Number(e.target.dataset.faqAnswer);
        item.entries[entryIndex].answer = e.target.value;
        markDirty();
      });
    });

    itemEl.querySelector('[data-faq-add]')?.addEventListener('click', () => {
      item.entries.push({ question: '', answer: '' });
      markDirty();
      renderEditor();
    });

    itemEl.querySelectorAll('[data-faq-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entryIndex = Number(btn.dataset.faqRemove);
        item.entries.splice(entryIndex, 1);
        if (!item.entries.length) item.entries.push({ question: '', answer: '' });
        markDirty();
        renderEditor();
      });
    });
  }

  function bindEditorEvents() {
    const pageTitle = document.getElementById('adminSiteAboutPageTitle');
    const pageDesc = document.getElementById('adminSiteAboutPageDesc');
    const addBlockBtn = document.getElementById('adminSiteAboutAddBlock');

    if (pageTitle) {
      bindInput(pageTitle, () => {
        content.page.title = pageTitle.value;
        markDirty();
      });
    }

    if (pageDesc) {
      bindInput(pageDesc, () => {
        content.page.description = pageDesc.value;
        markDirty();
      });
    }

    addBlockBtn?.addEventListener('click', () => {
      content.blocks.push({
        id: newId('block'),
        anchor: null,
        title: 'Новый блок',
        variant: 'default',
        items: [{ type: 'text', html: '' }]
      });
      markDirty();
      renderEditor();
    });

    bindNavEvents();

    editorRoot.querySelectorAll('.site-about-block-card').forEach((blockEl) => {
      const blockIndex = Number(blockEl.dataset.blockIndex);
      bindBlockEvents(blockEl, blockIndex);
    });
  }

  function validateBeforeSave() {
    ensureNavArray();
    cleanupNavAnchors();

    const anchors = new Set(getBlockAnchors());
    const broken = content.nav.filter((item) => !item.label?.trim() || !anchors.has(item.anchor));
    if (broken.length) {
      showToast('Проверьте кнопки навигации: нужны текст и существующий якорь блока', 'error');
      renderEditor();
      return false;
    }

    const seen = new Set();
    for (const item of content.nav) {
      if (seen.has(item.anchor)) {
        showToast('Две кнопки не могут вести на один якорь — измените или удалите дубликат', 'error');
        return false;
      }
      seen.add(item.anchor);
    }

    return true;
  }

  async function loadAdminSiteAbout() {
    setStatus('Загрузка…');
    editorRoot.innerHTML = '<p class="site-about-loading">Загрузка редактора…</p>';

    try {
      const response = await fetch('/api/about-page');
      if (!response.ok) throw new Error('Не удалось загрузить данные');
      content = cloneContent(await response.json());
      initNavFromBlocksIfEmpty();
      markClean('Готово к редактированию');
      renderEditor();
      syncPreviewVisibility();
    } catch (error) {
      editorRoot.innerHTML = `<p class="site-about-loading site-about-loading--error">${error.message}</p>`;
      setStatus('');
    }
  }

  function requestSave() {
    if (!content || isSaving) return;
    if (!validateBeforeSave()) return;
    openSaveConfirmModal();
  }

  async function performSave() {
    if (!content || isSaving) return;

    isSaving = true;
    if (saveBtn) saveBtn.disabled = true;
    setStatus('Сохранение…');

    try {
      const response = await fetch('/api/admin/about-page', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка сохранения');

      content = cloneContent(data.content);
      applyToPublicSite(content);
      markClean('Сохранено на сайте');
      showToast('Страница «О сайте» сохранена');
      renderEditor();
    } catch (error) {
      setStatus('Ошибка сохранения');
      showToast(error.message, 'error');
    } finally {
      isSaving = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function saveContent() {
    requestSave();
  }

  async function resetContent() {
    if (!window.confirm('Вернуть текст страницы к исходному варианту? Текущие правки будут потеряны.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/about-page/reset', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка сброса');

      content = cloneContent(data.content);
      markClean('Восстановлен исходный текст');
      renderEditor();
      showToast('Восстановлен исходный текст');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function openSiteAboutSection() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('siteAbout');
    }
  }

  function syncPreviewVisibility() {
    if (previewPanel) {
      previewPanel.hidden = !previewVisible;
      previewPanel.classList.toggle('is-collapsed', !previewVisible);
      previewPanel.setAttribute('aria-hidden', previewVisible ? 'false' : 'true');
    }

    if (layoutEl) {
      layoutEl.classList.toggle('site-about-layout--preview-hidden', !previewVisible);
    }

    if (previewToggle) {
      previewToggle.textContent = previewVisible ? 'Скрыть превью' : 'Показать превью';
      previewToggle.setAttribute('aria-pressed', previewVisible ? 'true' : 'false');
      previewToggle.classList.toggle('is-active', previewVisible);
    }
  }

  function togglePreview() {
    previewVisible = !previewVisible;
    syncPreviewVisibility();
  }

  openBtn.addEventListener('click', openSiteAboutSection);
  backBtn?.addEventListener('click', () => {
    if (isDirty && !window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) return;
    if (typeof window.showAdminSection === 'function') window.showAdminSection('dashboard');
  });
  saveBtn?.addEventListener('click', saveContent);
  resetBtn?.addEventListener('click', resetContent);
  previewToggle?.addEventListener('click', togglePreview);

  window.loadAdminSiteAbout = loadAdminSiteAbout;
})();
