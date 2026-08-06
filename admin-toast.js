(function initAdminToast() {
  const toast = document.getElementById('adminToast');
  if (!toast) return;

  const iconEl = toast.querySelector('.admin-toast-icon');
  const labelEl = toast.querySelector('.admin-toast-label');
  const messageEl = toast.querySelector('.admin-toast-message');
  const progressEl = toast.querySelector('.admin-toast-progress');
  const closeBtn = toast.querySelector('.admin-toast-close');

  const LABELS = {
    success: 'Готово',
    error: 'Ошибка'
  };

  const ICONS = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };

  const DURATION_MS = 4800;

  function hideToast() {
    toast.classList.remove('is-visible');
    clearTimeout(hideToast._timer);
    clearTimeout(hideToast._hideTimer);
    hideToast._hideTimer = setTimeout(() => {
      toast.hidden = true;
    }, 240);
  }

  function showAdminToast(message, type = 'success') {
    const kind = type === 'error' ? 'error' : 'success';

    toast.className = `admin-toast admin-toast--${kind}`;
    if (labelEl) labelEl.textContent = LABELS[kind];
    if (messageEl) messageEl.textContent = message || '';
    if (iconEl) iconEl.innerHTML = ICONS[kind] || ICONS.success;

    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    if (progressEl) {
      progressEl.style.animation = 'none';
      progressEl.offsetHeight;
      progressEl.style.animation = '';
    }

    clearTimeout(hideToast._timer);
    hideToast._timer = setTimeout(hideToast, DURATION_MS);
  }

  closeBtn?.addEventListener('click', hideToast);

  window.showAdminToast = showAdminToast;
})();
