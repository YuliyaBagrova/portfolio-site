(function initAdminClothingAlertsPage() {
  const section = document.getElementById('adminSectionClothingAlerts');
  const layout = document.getElementById('adminClothingAlertsLayout');
  const pageBackBtn = document.getElementById('adminClothingAlertsPageBack');
  const countEl = document.getElementById('adminClothingAlertsCount');
  const listEl = document.getElementById('adminClothingAlertsList');
  const formEl = document.getElementById('adminClothingAlertsForm');
  const formTitle = document.getElementById('adminClothingAlertsFormTitle');
  const addBtn = document.getElementById('adminClothingAlertsAdd');
  const saveBtn = document.getElementById('adminClothingAlertsSaveBtn');
  const cancelBtn = document.getElementById('adminClothingAlertsCancelBtn');
  const deleteBtn = document.getElementById('adminClothingAlertsDeleteBtn');
  const successEl = document.getElementById('adminClothingAlertsSuccess');
  const warningEl = document.getElementById('adminClothingAlertsWarning');

  if (!section || !layout || !listEl || !formEl) return;

  const ALERT_TYPE_LABELS = {
    sale: 'Скидка',
    new: 'Новинка',
    drop: 'Drop'
  };

  const BADGE_HINTS = {
    sale: {
      hint: 'Для типа «Скидка» — процент или слово Sale. Коротко: 3–6 символов, хорошо читается в маленькой плашке.',
      examples: ['−30%', '−40%', 'Sale', '−20%']
    },
    new: {
      hint: 'Для типа «Новинка» — New / NEW или по-русски «Новинка». Обычно одно слово, без длинных фраз.',
      examples: ['New', 'NEW', 'Новинка']
    },
    drop: {
      hint: 'Для типа «Drop» — короткая метка лимитированной серии: Drop, DROP или Limited.',
      examples: ['Drop', 'DROP', 'Limited']
    }
  };

  const badgeInput = document.getElementById('adminClothingAlertsBadgeInput');
  const badgeHintEl = document.getElementById('adminClothingAlertsBadgeHint');
  const badgeSuggestionsEl = document.getElementById('adminClothingAlertsBadgeSuggestions');
  const badgeDatalistEl = document.getElementById('adminClothingAlertsBadgeDatalist');
  const alertTypeSelect = formEl.elements.alert_type;

  let alerts = [];
  let editingId = null;
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

  function formatAlertsCount(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} предложение`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} предложения`;
    return `${count} предложений`;
  }

  function showMessage(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  function setSavingState(saving) {
    isSaving = saving;
    formEl.classList.toggle('is-saving', saving);
    if (saveBtn) {
      saveBtn.disabled = saving;
      saveBtn.textContent = saving ? 'Сохранение…' : 'Сохранить предложение';
    }
    if (deleteBtn) deleteBtn.disabled = saving;
    if (addBtn) addBtn.disabled = saving;
  }

  function getBadgeHintConfig(type) {
    return BADGE_HINTS[type] || BADGE_HINTS.sale;
  }

  function updateBadgeHints() {
    const type = alertTypeSelect?.value || 'sale';
    const config = getBadgeHintConfig(type);

    if (badgeInput) {
      badgeInput.placeholder = config.examples[0]
        ? `Например: ${config.examples[0]}`
        : 'Короткая метка для плашки';
    }

    if (badgeHintEl) {
      badgeHintEl.textContent = config.hint;
    }

    if (badgeDatalistEl) {
      badgeDatalistEl.innerHTML = config.examples
        .map((example) => `<option value="${escapeHtml(example)}"></option>`)
        .join('');
    }

    if (badgeSuggestionsEl) {
      badgeSuggestionsEl.hidden = !config.examples.length;
      badgeSuggestionsEl.innerHTML = config.examples.map((example) => `
        <button type="button" class="admin-clothing-alerts-badge-suggestion" data-badge-value="${escapeHtml(example)}">${escapeHtml(example)}</button>
      `).join('');
    }
  }

  function resetForm() {
    editingId = null;
    formEl.hidden = true;
    formEl.reset();
    layout.classList.remove('is-editing');
    formTitle.textContent = 'Новое предложение';
    if (deleteBtn) deleteBtn.hidden = true;
    showMessage(successEl, '');
    showMessage(warningEl, '');
    setSavingState(false);
    renderList();
  }

  function renderList() {
    if (countEl) countEl.textContent = formatAlertsCount(alerts.length);

    if (!alerts.length) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-clothing-alerts-empty">
          <strong>Предложений пока нет</strong>
          <p>Нажмите «+ Добавить предложение», чтобы создать первое.</p>
        </li>`;
      return;
    }

    listEl.innerHTML = alerts.map((alert) => {
      const typeLabel = ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type;
      const isActive = alert.id === editingId;

      return `
        <li class="admin-fitness-product-item admin-clothing-alerts-item${isActive ? ' is-active' : ''}" data-select-id="${alert.id}" role="button" tabindex="0" aria-label="Редактировать «${escapeHtml(alert.title)}»">
          <div class="admin-clothing-alerts-item-preview clothing-alert clothing-alert--${escapeHtml(alert.alert_type)}" aria-hidden="true">
            <span class="clothing-alert-badge">${escapeHtml(alert.badge)}</span>
            <div class="clothing-alert-body">
              <strong>${escapeHtml(alert.title)}</strong>
              ${alert.description ? `<p>${escapeHtml(alert.description)}</p>` : ''}
            </div>
          </div>
          <div class="admin-fitness-product-info">
            <strong>${escapeHtml(alert.title)}</strong>
            <p>${escapeHtml(alert.description || typeLabel)}</p>
            <span class="admin-clothing-alerts-pick-meta">${escapeHtml(typeLabel)}</span>
          </div>
          <div class="admin-fitness-product-actions">
            <button type="button" class="btn btn-ghost btn-ghost-danger" data-delete-id="${alert.id}">Удалить</button>
          </div>
        </li>`;
    }).join('');
  }

  async function fetchAlerts() {
    listEl.classList.add('is-loading');
    try {
      const response = await fetch('/api/clothing-alerts');
      if (!response.ok) throw new Error('Не удалось загрузить предложения');
      const payload = await response.json();
      alerts = payload.alerts || [];
      renderList();
    } catch (error) {
      listEl.innerHTML = `
        <li class="admin-fitness-empty admin-clothing-alerts-empty">
          <strong>Не удалось загрузить предложения</strong>
          <p>${escapeHtml(error.message)}</p>
        </li>`;
    } finally {
      listEl.classList.remove('is-loading');
    }
  }

  function openEditForm(alert = null) {
    editingId = alert?.id ?? null;
    formEl.hidden = false;
    layout.classList.add('is-editing');
    formTitle.textContent = alert ? 'Редактировать предложение' : 'Новое предложение';
    if (deleteBtn) deleteBtn.hidden = !alert;
    showMessage(successEl, '');
    showMessage(warningEl, '');

    formEl.elements.alert_type.value = alert?.alert_type || 'sale';
    formEl.elements.badge.value = alert?.badge || '';
    formEl.elements.title.value = alert?.title || '';
    formEl.elements.description.value = alert?.description || '';

    updateBadgeHints();
    renderList();
    formEl.elements.badge.focus();
  }

  async function saveAlert(event) {
    event.preventDefault();
    if (isSaving) return;

    const formData = new FormData(formEl);
    const payload = {
      alert_type: formData.get('alert_type'),
      badge: formData.get('badge'),
      title: formData.get('title'),
      description: formData.get('description')
    };

    setSavingState(true);
    showMessage(successEl, '');
    showMessage(warningEl, '');

    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(
        isEdit ? `/api/clothing-alerts/${editingId}` : '/api/clothing-alerts',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось сохранить предложение');

      showToast(isEdit ? 'Предложение обновлено' : 'Предложение добавлено');
      showMessage(successEl, isEdit ? 'Предложение обновлено' : 'Предложение добавлено');
      window.dispatchEvent(new CustomEvent('clothing-alerts-changed'));
      resetForm();
      await fetchAlerts();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
    }
  }

  async function deleteAlert(alertId) {
    if (isSaving) return;
    const alert = alerts.find((item) => item.id === alertId);
    if (!alert) return;
    if (!window.confirm(`Удалить предложение «${alert.title}»?`)) return;

    setSavingState(true);
    listEl.classList.add('is-loading');

    try {
      const response = await fetch(`/api/clothing-alerts/${alertId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось удалить предложение');

      if (editingId === alertId) resetForm();
      showToast('Предложение удалено');
      window.dispatchEvent(new CustomEvent('clothing-alerts-changed'));
      await fetchAlerts();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingState(false);
      listEl.classList.remove('is-loading');
    }
  }

  async function openPage() {
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothingAlerts');
    }
    resetForm();
    await fetchAlerts();
  }

  function closePage() {
    resetForm();
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('clothing');
    }
  }

  addBtn?.addEventListener('click', () => openEditForm());
  cancelBtn?.addEventListener('click', resetForm);
  saveBtn?.addEventListener('click', saveAlert);
  formEl.addEventListener('submit', saveAlert);
  pageBackBtn?.addEventListener('click', closePage);

  deleteBtn?.addEventListener('click', () => {
    if (editingId) deleteAlert(editingId);
  });

  alertTypeSelect?.addEventListener('change', () => {
    updateBadgeHints();
  });

  badgeSuggestionsEl?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-badge-value]');
    if (!button || !badgeInput) return;
    badgeInput.value = button.dataset.badgeValue;
    badgeInput.focus();
  });

  listEl.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-id]');
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      deleteAlert(Number(deleteButton.dataset.deleteId));
      return;
    }

    const row = event.target.closest('[data-select-id]');
    if (row) {
      const alert = alerts.find((item) => item.id === Number(row.dataset.selectId));
      if (alert) openEditForm(alert);
    }
  });

  listEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-select-id]');
    if (!row) return;
    event.preventDefault();
    const alert = alerts.find((item) => item.id === Number(row.dataset.selectId));
    if (alert) openEditForm(alert);
  });

  window.addEventListener('clothing-alerts-changed', fetchAlerts);

  window.openAdminClothingAlertsPage = openPage;
  window.adminClothingAlertsGoBack = () => {
    if (!formEl.hidden) {
      resetForm();
      return;
    }
    closePage();
  };
})();
