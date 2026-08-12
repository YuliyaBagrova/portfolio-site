(function initAdminLogin() {
  const form = document.getElementById('adminLoginForm');
  const emailInput = document.getElementById('adminLoginEmail');
  const passwordInput = document.getElementById('adminLoginPassword');
  const authCodeInput = document.getElementById('adminLoginAuthCode');
  const submitBtn = document.getElementById('adminLoginSubmit');
  const togglePasswordBtn = document.getElementById('adminLoginTogglePassword');
  const showRegisterBtn = document.getElementById('adminShowRegister');

  const CUSTOMER_AUTH_CODE = 'admin';

  if (!form) return;

  function isValidAuthCode(value) {
    return String(value || '').trim() === CUSTOMER_AUTH_CODE;
  }

  function sanitizeClientEmail(value) {
    if (typeof window.sanitizeAdminEmail === 'function') {
      return window.sanitizeAdminEmail(value);
    }
    return String(value || '').trim().toLowerCase();
  }

  function resetLoginForm() {
    form.reset();
    submitBtn.disabled = false;
    delete submitBtn.dataset.loading;
  }

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Сервер вернул некорректный ответ. Запустите сайт через Docker или npm start.');
    }
  }

  function openPanelAfterLogin(user) {
    if (!user?.email) {
      window.showAdminToast?.('Не удалось выполнить вход. Проверьте email и пароль.', 'error');
      return;
    }

    resetLoginForm();

    if (typeof window.openAdminPanel === 'function') {
      const opened = window.openAdminPanel('login', user);
      if (opened === false) {
        window.showAdminToast?.('Не удалось сохранить сессию входа', 'error');
        return;
      }
    }

    window.showAdminToast?.(`Добро пожаловать, ${user.name || user.email}!`);
  }

  async function submitLogin(event) {
    event.preventDefault();

    const authCode = authCodeInput?.value.trim() || '';
    const email = sanitizeClientEmail(emailInput?.value || '');
    const password = passwordInput?.value || '';

    if (emailInput && emailInput.value.trim().toLowerCase() !== email) {
      emailInput.value = email;
    }

    if (!authCode) {
      window.showAdminToast?.('Укажите код аутентификации', 'error');
      return;
    }

    if (!isValidAuthCode(authCode)) {
      window.showAdminToast?.('Неверный код аутентификации', 'error');
      return;
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
      const response = await fetch('/api/admin/register/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, authCode })
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось выполнить вход');
      }

      if (!data.user?.email) {
        throw new Error(data.error || 'Не удалось выполнить вход. Проверьте email и пароль.');
      }

      openPanelAfterLogin(data.user);
    } catch (error) {
      window.showAdminToast?.(error.message || 'Ошибка входа', 'error');
    } finally {
      submitBtn.disabled = false;
      delete submitBtn.dataset.loading;
    }
  }

  window.bindAdminPasswordToggle?.(togglePasswordBtn, passwordInput);

  form.addEventListener('submit', submitLogin);

  showRegisterBtn?.addEventListener('click', () => {
    if (typeof window.showAdminAuthOverlay === 'function') {
      window.showAdminAuthOverlay('register');
    }
  });

  window.resetAdminLogin = resetLoginForm;
})();
