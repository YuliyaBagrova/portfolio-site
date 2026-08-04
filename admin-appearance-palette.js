(function initAdminAppearancePalette() {
  const openBtn = document.getElementById('adminAppearanceChoosePalette');
  const modal = document.getElementById('adminSectionPaletteModal');
  const closeBtn = document.getElementById('adminSectionPaletteClose');
  const backBtn = document.getElementById('adminSectionPaletteBack');
  const tabsEl = document.getElementById('adminPaletteTabs');
  const editorEl = document.getElementById('adminPaletteEditor');
  const previewEl = document.getElementById('adminPalettePreview');
  const saveBtn = document.getElementById('adminPaletteSave');
  const resetBtn = document.getElementById('adminPaletteReset');
  const statusEl = document.getElementById('adminPaletteStatus');
  const toast = document.getElementById('adminToast');

  if (!openBtn || !modal || !tabsEl || !editorEl || !previewEl) return;

  const SECTIONS = [
    { id: 'home', label: 'Главная' },
    { id: 'supplements', label: 'Фитнес-индустрия' },
    { id: 'clothing', label: 'Одежда' },
    { id: 'banners', label: 'Мои Баннеры' }
  ];

  let themes = {};
  let activeSectionId = 'home';
  let draftInputs = {};
  let isSaving = false;

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

  function openAppearanceSection() {
    if (typeof window.openAdminAppearanceGate === 'function') {
      window.openAdminAppearanceGate();
    }
  }

  function openModal() {
    modal.hidden = false;
    loadThemes();
  }

  function closeModal() {
    modal.hidden = true;
    openAppearanceSection();
  }

  function getDraftTheme() {
    return window.ThemeUtils.computeTheme(activeSectionId, draftInputs[activeSectionId]);
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

  function getPreviewBackground(theme) {
    if (theme.backgroundStyle) {
      return theme.backgroundStyle;
    }

    const defaults = window.ThemeUtils.DEFAULT_INPUTS[activeSectionId];
    if (theme.inputs.gradientMode === 'default' || !theme.inputs.gradientMode) {
      return `linear-gradient(180deg, ${theme.inputs.background} 0%, ${theme.cssVars['--bg-secondary'] || theme.cssVars['--clothing-bg-soft'] || defaults.gradientColor} 100%)`;
    }

    return theme.inputs.background;
  }

  function renderTabs() {
    tabsEl.innerHTML = SECTIONS.map((section) => `
      <button
        type="button"
        class="admin-palette-tab${section.id === activeSectionId ? ' is-active' : ''}"
        data-section-id="${section.id}"
      >
        ${section.label}
      </button>
    `).join('');

    tabsEl.querySelectorAll('.admin-palette-tab').forEach((button) => {
      button.addEventListener('click', () => {
        activeSectionId = button.dataset.sectionId;
        renderTabs();
        renderEditor();
        renderPreview();
      });
    });
  }

  function renderPreview() {
    const theme = getDraftTheme();
    const section = SECTIONS.find((item) => item.id === activeSectionId);
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

    previewEl.innerHTML = `
      <div class="admin-palette-preview-nav">
        <span class="admin-palette-preview-nav-item is-muted">Раздел</span>
        <span class="admin-palette-preview-nav-item is-active">${section?.label || ''}</span>
      </div>
      <div class="admin-palette-preview-body">
        <span class="admin-palette-preview-kicker">Предпросмотр</span>
        <strong class="admin-palette-preview-title">${section?.label || ''}</strong>
        <p class="admin-palette-preview-text">Основной текст подбирается автоматически по контрасту с фоном.</p>
        <button type="button" class="admin-palette-preview-btn">Акцентная кнопка</button>
      </div>
    `;
  }

  function renderEditor() {
    const current = draftInputs[activeSectionId];
    const stored = getStoredTheme(activeSectionId);
    const showGradientColor = current.gradientMode === 'custom';

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
      <p class="admin-palette-note">Цвет основного и второстепенного текста на странице подбирается автоматически. Градиент «По умолчанию» использует оригинальный фон раздела из стилей сайта.</p>
      <p class="admin-palette-meta">${stored.isCustom ? 'Используется пользовательская палитра' : 'Сейчас активна палитра по умолчанию'}</p>
    `;

    bindColorField('adminPaletteBg', 'adminPaletteBgHex', 'background');
    bindColorField('adminPaletteAccent', 'adminPaletteAccentHex', 'accent');
    bindColorField('adminPaletteNav', 'adminPaletteNavHex', 'navText', { skipNormalize: true });
    bindColorField('adminPaletteGradient', 'adminPaletteGradientHex', 'gradientColor');

    editorEl.querySelectorAll('input[name="adminPaletteGradientMode"]').forEach((input) => {
      input.addEventListener('change', () => {
        draftInputs[activeSectionId].gradientMode = input.value;
        renderEditor();
        renderPreview();
      });
    });

    if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = '';
    }
  }

  function bindColorField(colorId, hexId, key, { skipNormalize = false } = {}) {
    const colorInput = document.getElementById(colorId);
    const hexInput = document.getElementById(hexId);
    if (!colorInput || !hexInput) return;

    colorInput.addEventListener('input', () => {
      draftInputs[activeSectionId][key] = colorInput.value;
      hexInput.value = colorInput.value;
      renderPreview();
    });

    hexInput.addEventListener('change', () => {
      try {
        const rawValue = hexInput.value;
        const normalized = skipNormalize
          ? window.ThemeUtils.normalizeInput(rawValue, draftInputs[activeSectionId][key])
          : window.ThemeUtils.normalizeInputs(activeSectionId, {
            ...draftInputs[activeSectionId],
            [key]: rawValue
          })[key];

        draftInputs[activeSectionId][key] = normalized;
        colorInput.value = normalized;
        hexInput.value = normalized;
        renderPreview();
      } catch {
        hexInput.value = draftInputs[activeSectionId][key];
      }
    });
  }

  function syncDraftFromThemes() {
    draftInputs = {};
    SECTIONS.forEach((section) => {
      const theme = getStoredTheme(section.id);
      draftInputs[section.id] = { ...theme.inputs };
    });
  }

  async function loadThemes() {
    try {
      const response = await fetch('/api/section-themes');
      if (!response.ok) throw new Error('Не удалось загрузить палитры');
      const payload = await response.json();
      themes = payload.themes || {};
      syncDraftFromThemes();
      renderTabs();
      renderEditor();
      renderPreview();
    } catch (error) {
      editorEl.innerHTML = `<p class="admin-palette-error">${error.message}</p>`;
    }
  }

  async function savePalette() {
    if (isSaving) return;

    isSaving = true;
    saveBtn.disabled = true;
    resetBtn.disabled = true;

    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = 'Сохранение…';
      statusEl.className = 'admin-palette-status';
    }

    try {
      const inputs = draftInputs[activeSectionId];
      const response = await fetch(`/api/section-themes/${activeSectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось сохранить палитру');

      themes[activeSectionId] = payload;
      syncDraftFromThemes();
      renderEditor();
      renderPreview();
      window.dispatchEvent(new CustomEvent('section-themes-changed'));
      showToast(`Палитра «${payload.label}» сохранена`);
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = error.message;
        statusEl.className = 'admin-palette-status is-error';
      }
      showToast(error.message, 'error');
    } finally {
      isSaving = false;
      saveBtn.disabled = false;
      resetBtn.disabled = false;
    }
  }

  async function resetPalette() {
    if (isSaving) return;

    isSaving = true;
    saveBtn.disabled = true;
    resetBtn.disabled = true;

    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = 'Сброс…';
      statusEl.className = 'admin-palette-status';
    }

    try {
      const response = await fetch(`/api/section-themes/${activeSectionId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось сбросить палитру');

      themes[activeSectionId] = payload;
      syncDraftFromThemes();
      renderEditor();
      renderPreview();
      window.dispatchEvent(new CustomEvent('section-themes-changed'));
      showToast(`Палитра «${payload.label}» восстановлена по умолчанию`);
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = error.message;
        statusEl.className = 'admin-palette-status is-error';
      }
      showToast(error.message, 'error');
    } finally {
      isSaving = false;
      saveBtn.disabled = false;
      resetBtn.disabled = false;
    }
  }

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  backBtn?.addEventListener('click', closeModal);
  saveBtn?.addEventListener('click', savePalette);
  resetBtn?.addEventListener('click', resetPalette);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  window.openAdminPaletteModal = openModal;
})();
