(function initSiteUserLogin() {
  const form = document.getElementById('siteUserLoginForm');
  const emailInput = document.getElementById('siteUserLoginEmail');
  const passwordInput = document.getElementById('siteUserLoginPassword');
  const submitBtn = document.getElementById('siteUserLoginSubmit');
  const togglePasswordBtn = document.getElementById('siteUserLoginTogglePassword');
  const showRegisterBtn = document.getElementById('siteUserShowRegister');

  if (!form) return;

  function sanitizeClientEmail(value) {
    if (typeof window.sanitizeAdminEmail === 'function') {
      return window.sanitizeAdminEmail(value);
    }
    return String(value || '').trim().toLowerCase();
  }

  function resetLoginForm() {
    form.reset();
    if (submitBtn) {
      submitBtn.disabled = false;
      delete submitBtn.dataset.loading;
    }
  }

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Сервер вернул некорректный ответ.');
    }
  }

  function finishLogin(message, user) {
    resetLoginForm();
    if (!user || (typeof window.isRealSiteUser === 'function' && !window.isRealSiteUser(user))) {
      window.showAdminToast?.(message || 'Не удалось выполнить вход', 'error');
      return;
    }
    if (typeof window.completeSiteUserAccess === 'function') {
      window.completeSiteUserAccess('login', user);
      return;
    }
    window.showAdminToast?.(message || `Добро пожаловать, ${user.name || user.email}!`);
  }

  async function submitLogin(event) {
    event.preventDefault();

    const email = sanitizeClientEmail(emailInput?.value || '');
    const password = passwordInput?.value || '';

    if (emailInput && emailInput.value.trim().toLowerCase() !== email) {
      emailInput.value = email;
    }

    if (!email) {
      window.showAdminToast?.('Укажите email', 'error');
      return;
    }

    if (!password) {
      window.showAdminToast?.('Укажите пароль', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.dataset.loading = 'true';

    try {
      const response = await fetch('/api/site/register/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось выполнить вход');
      }

      finishLogin(data.message, data.user);
    } catch (error) {
      window.showAdminToast?.(error.message || 'Ошибка входа', 'error');
    } finally {
      submitBtn.disabled = false;
      delete submitBtn.dataset.loading;
    }
  }

  window.bindAdminPasswordToggle?.(togglePasswordBtn, passwordInput);

  form.addEventListener('submit', submitLogin);

  showRegisterBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    window.showSiteUserRegisterOverlay?.();
  });

  window.resetSiteUserLogin = resetLoginForm;
})();
