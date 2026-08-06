(function initAdminAppearancePalettePage() {
  const openBtn = document.getElementById('adminAppearanceChoosePalette');
  const section = document.getElementById('adminSectionPalette');
  const layout = document.getElementById('adminPaletteLayout');
  const pageBackBtn = document.getElementById('adminPalettePageBack');
  const countEl = document.getElementById('adminPaletteCount');
  const listEl = document.getElementById('adminPaletteList');
  const formEl = document.getElementById('adminPaletteForm');
  const formTitle = document.getElementById('adminPaletteFormTitle');
  const editorEl = document.getElementById('adminPaletteEditor');
  const previewEl = document.getElementById('adminPalettePreview');
  const metaEl = document.getElementById('adminPaletteMeta');
  const saveBtn = document.getElementById('adminPaletteSave');
  const cancelBtn = document.getElementById('adminPaletteCancelBtn');
  const resetBtn = document.getElementById('adminPaletteReset');
  const successEl = document.getElementById('adminPaletteSuccess');
  const statusEl = document.getElementById('adminPaletteStatus');

  if (!openBtn || !section || !layout || !listEl || !formEl || !editorEl || !previewEl) return;

  const SECTIONS = [
    { id: 'home', label: 'Главная', icon: '🏠' },
    { id: 'supplements', label: 'Фитнес-индустрия', icon: '💪' },
    { id: 'clothing', label: 'Одежда', icon: '👕' },
    { id: 'banners', label: 'Мои Баннеры', icon: '🖼' }
  ];

  let themes = {};
  let editingId = null;
  let draftInputs = {};
  let isSaving = false;

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

  function getSectionMeta(sectionId) {
    return SECTIONS.find((item) => item.id === sectionId) || { id: sectionId, label: sectionId, icon: '🎨' };
  }

  function getStoredTheme(sectionId) {
    const defaults = {
      ...window.ThemeUtils.DEFAULT_INPUTS[sectionId]
    };
    const stored = themes[sectionId];
    if (!stored) {
      return window.ThemeUtils.computeTheme(sectionId, defaults);
    }
    return stored;
  }

  function getDraftTheme() {
    if (!editingId) return getStoredTheme('home');
    return window.ThemeUtils.computeTheme(editingId, draftInputs[editingId]);
  }

  function getPreviewBackground(theme) {
    if (theme.backgroundStyle) {
      return theme.backgroundStyle;
    }

    const defaults = window.ThemeUtils.DEFAULT_INPUTS[editingId || 'home'];
    if (theme.inputs.gradientMode === 'default' || !theme.inputs.gradientMode) {
      return `linear-gradient(180deg, ${theme.inputs.background} 0%, ${theme.cssVars['--bg-secondary'] || theme.cssVars['--clothing-bg-soft'] || defaults.gradientColor} 100%)`;
    }

    return theme.inputs.background;
  }

  function formatCustomCount(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} своя палитра`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} свои палитры`;
    return `${count} своих палитр`;
  }

  function showMessage(el, message, className = '') {
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
    if (className) {
      el.className = className;
    }
  }

  function setSavingState(saving) {
    isSaving = saving;
    formEl.classList.toggle('is-saving', saving);
    if (saveBtn) saveBtn.disabled = saving;
    if (resetBtn) resetBtn.disabled = saving;
    if (cancelBtn) cancelBtn.disabled = saving;
  }

  function syncDraftFromThemes() {
    draftInputs = {};
    SECTIONS.forEach((sectionItem) => {
      const theme = getStoredTheme(sectionItem.id);
      draftInputs[sectionItem.id] = { ...theme.inputs };
    });
  }

  function renderPreview() {
    if (!editingId) return;

    const theme = getDraftTheme();
    const sectionMeta = getSectionMeta(editingId);
    const textPrimary = theme.cssVars['--text-primary']
      || theme.cssVars['--clothing-ink']
      || theme.cssVars['--fitness-white']
      || '#f0f2f5';
    const textSecondary = theme.cssVars['--text-secondary']
      || theme.cssVars['--clothing-ink-muted']
      || theme.cssVars['--fitness-white-muted']
      || '#9ca3af';

    previewEl.style.background = getPreviewBackground(theme);
    previewEl.style.setProperty('--preview-text', textPrimary);
    previewEl.style.setProperty('--preview-muted', textSecondary);
    previewEl.style.setProperty('--preview-accent', theme.inputs.accent);
    previewEl.style.setProperty('--preview-nav', theme.inputs.navText);
    previewEl.style.setProperty('--preview-nav-bg', theme.cssVars['--theme-nav-active-bg']);
    previewEl.style.setProperty('--preview-accent-btn-text', theme.cssVars['--theme-accent-btn-text']);

    previewEl.innerHTML = `
      <div class="admin-palette-preview-nav">
        <span class="admin-palette-preview-nav-item is-muted">Раздел</span>
        <span class="admin-palette-preview-nav-item is-active">${escapeHtml(sectionMeta.label)}</span>
      </div>
      <div class="admin-palette-preview-body">
        <span class="admin-palette-preview-kicker">Предпросмотр</span>
        <strong class="admin-palette-preview-title">${escapeHtml(sectionMeta.label)}</strong>
        <p class="admin-palette-preview-text">Основной текст подбирается автоматически по контрасту с фоном.</p>
        <button type="button" class="admin-palette-preview-btn">Акцентная кнопка</button>
      </div>
    `;
  }

  function renderEditor() {
    if (!editingId) return;

    const current = draftInputs[editingId];
    const stored = getStoredTheme(editingId);
    const showGradientColor = current.gradientMode === 'custom';

    if (resetBtn) {
      resetBtn.hidden = !stored.isCustom;
    }

    editorEl.innerHTML = `
      <div class="admin-palette-fields">
        <label class="admin-palette-field">
          <span>Фон страницы</span>
          <div class="admin-palette-color-row">
            <input type="color" id="adminPaletteBg" value="${current.background}">
            <input type="text" class="admin-palette-hex" id="adminPaletteBgHex" value="${current.background}" maxlength="7" spellcheck="false">
          </div>
        </label>
        <label class="admin-palette-field">
          <span>Акцентный цвет</span>
          <div class="admin-palette-color-row">
            <input type="color" id="adminPaletteAccent" value="${current.accent}">
            <input type="text" class="admin-palette-hex" id="adminPaletteAccentHex" value="${current.accent}" maxlength="7" spellcheck="false">
          </div>
        </label>
        <label class="admin-palette-field">
          <span>Текст кнопок навигации</span>
          <div class="admin-palette-color-row">
            <input type="color" id="adminPaletteNav" value="${current.navText}">
            <input type="text" class="admin-palette-hex" id="adminPaletteNavHex" value="${current.navText}" maxlength="7" spellcheck="false">
          </div>
          <small class="admin-palette-field-hint">Цвет активной кнопки в верхнем меню для этого раздела</small>
        </label>

        <div class="admin-palette-field">
          <span>Градиент фона</span>
          <div class="admin-palette-gradient-options">
            <label class="admin-palette-radio">
              <input type="radio" name="adminPaletteGradientMode" value="default"${current.gradientMode === 'default' ? ' checked' : ''}>
              <span>По умолчанию</span>
            </label>
            <label class="admin-palette-radio">
              <input type="radio" name="adminPaletteGradientMode" value="custom"${current.gradientMode === 'custom' ? ' checked' : ''}>
              <span>Свой градиент</span>
            </label>
            <label class="admin-palette-radio">
              <input type="radio" name="adminPaletteGradientMode" value="off"${current.gradientMode === 'off' ? ' checked' : ''}>
              <span>Без градиента</span>
            </label>
          </div>
        </div>

        <label class="admin-palette-field admin-palette-gradient-color"${showGradientColor ? '' : ' hidden'} id="adminPaletteGradientColorField">
          <span>Второй цвет градиента</span>
          <div class="admin-palette-color-row">
            <input type="color" id="adminPaletteGradient" value="${current.gradientColor}">
            <input type="text" class="admin-palette-hex" id="adminPaletteGradientHex" value="${current.gradientColor}" maxlength="7" spellcheck="false">
          </div>
        </label>
      </div>
      <p class="admin-palette-note">Градиент «По умолчанию» использует оригинальный фон раздела из стилей сайта.</p>
    `;

    if (metaEl) {
      metaEl.textContent = stored.isCustom
        ? 'Используется пользовательская палитра'
        : 'Сейчас активна палитра по умолчанию';
    }

    bindColorField('adminPaletteBg', 'adminPaletteBgHex', 'background');
    bindColorField('adminPaletteAccent', 'adminPaletteAccentHex', 'accent');
    bindColorField('adminPaletteNav', 'adminPaletteNavHex', 'navText', { skipNormalize: true });
    bindColorField('adminPaletteGradient', 'adminPaletteGradientHex', 'gradientColor');

    editorEl.querySelectorAll('input[name="adminPaletteGradientMode"]').forEach((input) => {
      input.addEventListener('change', () => {
        draftInputs[editingId].gradientMode = input.value;
        renderEditor();
        renderPreview();
      });
    });
  }

  function bindColorField(colorId, hexId, key, { skipNormalize = false } = {}) {
    const colorInput = document.getElementById(colorId);
    const hexInput = document.getElementById(hexId);
    if (!colorInput || !hexInput) return;

    colorInput.addEventListener('input', () => {
      draftInputs[editingId][key] = colorInput.value;
      hexInput.value = colorInput.value;
      renderPreview();
    });

    hexInput.addEventListener('change', () => {
      try {
        const rawValue = hexInput.value;
        const normalized = skipNormalize
          ? window.ThemeUtils.normalizeInput(rawValue, draftInputs[editingId][key])
          : window.ThemeUtils.normalizeInputs(editingId, {
            ...draftInputs[editingId],
            [key]: rawValue
          })[key];

        draftInputs[editingId][key] = normalized;
        colorInput.value = normalized;
        hexInput.value = normalized;
        renderPreview();
      } catch {
        hexInput.value = draftInputs[editingId][key];
      }
    });
  }

  function renderList() {
    const customCount = SECTIONS.filter((item) => getStoredTheme(item.id).isCustom).length;
    if (countEl) countEl.textContent = formatCustomCount(customCount);

    listEl.innerHTML = SECTIONS.map((sectionItem) => {
      const theme = getStoredTheme(sectionItem.id);
      const inputs = theme.inputs;
      const isCustom = theme.isCustom;
      const isActive = editingId === sectionItem.id;
      const statusLabel = isCustom ? 'Пользовательская палитра' : 'Палитра по умолчанию';

      return `
        <li class="admin-fitness-product-item admin-section-palette-item${isActive ? ' is-active' : ''}" data-select-id="${sectionItem.id}" role="button" tabindex="0" aria-label="Редактировать палитру «${escapeHtml(sectionItem.label)}»">
          <div class="admin-section-palette-swatches" aria-hidden="true">
            <span class="admin-section-palette-swatch" style="background:${escapeHtml(inputs.background)}" title="Фон"></span>
            <span class="admin-section-palette-swatch" style="background:${escapeHtml(inputs.accent)}" title="Акцент"></span>
            <span class="admin-section-palette-swatch" style="background:${escapeHtml(inputs.navText)}" title="Навигация"></span>
          </div>
          <div class="admin-fitness-product-info">
            <strong>${escapeHtml(sectionItem.label)}</strong>
            <p>${escapeHtml(statusLabel)}</p>
            <span class="admin-section-palette-pick-meta">${isCustom ? 'Своя палитра' : 'По умолчанию'}</span>
          </div>
          <div class="admin-fitness-product-actions">
            ${isCustom
              ? `<button type="button" class="btn btn-ghost btn-ghost-danger" data-reset-id="${sectionItem.id}">Сбросить</button>`
              : ''}
          </div>
        </li>`;
    }).join('');
  }

  function resetForm() {
    if (editingId) {
      const theme = getStoredTheme(editingId);
      draftInputs[editingId] = { ...theme.inputs };
    }

    editingId = null;
    formEl.hidden = true;
    layout.classList.remove('is-editing');
    formTitle.textContent = 'Палитра раздела';
    showMessage(successEl, '');
    showMessage(statusEl, '', 'admin-palette-status');
    setSavingState(false);
    renderList();
  }

  function openEditForm(sectionId) {
    if (!getSectionMeta(sectionId)) return;

    editingId = sectionId;
    const theme = getStoredTheme(sectionId);
    draftInputs[sectionId] = { ...theme.inputs };
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = getSectionMeta(sectionId).label;
    showMessage(successEl, '');
    showMessage(statusEl, '', 'admin-palette-status');
    renderEditor();
    renderPreview();
    renderList();
  }

  async function loadThemes() {
    listEl.classList.add('is-loading');
    try {
      const response = await fetch('/api/section-themes');
      if (!response.ok) throw new Error('Не удалось загрузить палитры');
      const payload = await response.json();
      themes = payload.themes || {};
      syncDraftFromThemes();
      renderList();
      if (editingId && !formEl.hidden) {
        renderEditor();
        renderPreview();
      }
    } catch (error) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-section-palette-empty">
          <strong>Не удалось загрузить палитры</strong>
          <p>${escapeHtml(error.message)}</p>
        </li>`;
    } finally {
      listEl.classList.remove('is-loading');
    }
  }

  async function savePalette() {
    if (isSaving || !editingId) return;

    setSavingState(true);
    showMessage(successEl, '');
    showMessage(statusEl, 'Сохранение…', 'admin-palette-status');

    try {
      const inputs = draftInputs[editingId];
      const response = await fetch(`/api/section-themes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось сохранить палитру');

      themes[editingId] = payload;
      syncDraftFromThemes();
      renderEditor();
      renderPreview();
      renderList();
      window.dispatchEvent(new CustomEvent('section-themes-changed'));
      showToast(`Палитра «${payload.label}» сохранена`);
      showMessage(successEl, 'Палитра сохранена');
      showMessage(statusEl, '', 'admin-palette-status');
    } catch (error) {
      showMessage(statusEl, error.message, 'admin-palette-status is-error');
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function resetPalette(sectionId) {
    if (isSaving) return;
    const targetId = sectionId || editingId;
    if (!targetId) return;

    const label = getSectionMeta(targetId).label;
    if (!window.confirm(`Сбросить палитру «${label}» к стандартной?`)) return;

    setSavingState(true);
    showMessage(successEl, '');
    showMessage(statusEl, 'Сброс…', 'admin-palette-status');

    try {
      const response = await fetch(`/api/section-themes/${targetId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось сбросить палитру');

      themes[targetId] = payload;
      syncDraftFromThemes();
      showToast(`Палитра «${label}» восстановлена по умолчанию`);
      window.dispatchEvent(new CustomEvent('section-themes-changed'));

      if (editingId === targetId) {
        renderEditor();
        renderPreview();
        showMessage(successEl, '');
        showMessage(statusEl, '', 'admin-palette-status');
      } else {
        resetForm();
      }

      await loadThemes();
    } catch (error) {
      showMessage(statusEl, error.message, 'admin-palette-status is-error');
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function openPage() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('palette');
    }
    resetForm();
    await loadThemes();
  }

  function closePage() {
    resetForm();
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('appearance');
    }
  }

  openBtn.addEventListener('click', openPage);
  pageBackBtn?.addEventListener('click', closePage);
  cancelBtn?.addEventListener('click', resetForm);
  saveBtn?.addEventListener('click', savePalette);
  resetBtn?.addEventListener('click', () => resetPalette(editingId));

  listEl.addEventListener('click', (event) => {
    const resetButton = event.target.closest('[data-reset-id]');
    if (resetButton) {
      event.preventDefault();
      event.stopPropagation();
      resetPalette(resetButton.dataset.resetId);
      return;
    }

    const row = event.target.closest('[data-select-id]');
    if (row) {
      openEditForm(row.dataset.selectId);
    }
  });

  listEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-select-id]');
    if (!row) return;
    event.preventDefault();
    openEditForm(row.dataset.selectId);
  });

  window.addEventListener('section-themes-changed', loadThemes);

  window.openAdminPalettePage = openPage;
  window.openAdminPaletteModal = openPage;
  window.adminPaletteGoBack = () => {
    if (!formEl.hidden) {
      resetForm();
      return;
    }
    closePage();
  };
})();
