(function initAdminRegister() {
  const form = document.getElementById('adminRegisterForm');
  const stepCredentials = document.getElementById('adminRegisterStepCredentials');
  const stepVerify = document.getElementById('adminRegisterStepVerify');
  const stepIndicators = document.querySelectorAll('[data-register-step-indicator]');
  const passwordInput = document.getElementById('adminRegisterPassword');
  const confirmInput = document.getElementById('adminRegisterPasswordConfirm');
  const emailInput = document.getElementById('adminRegisterEmail');
  const authCodeInput = document.getElementById('adminRegisterAuthCode');
  const emailCodeInput = document.getElementById('adminRegisterEmailCode');
  const sendCodeBtn = document.getElementById('adminRegisterSendCode');
  const loginBtn = document.getElementById('adminRegisterLogin');
  const verifyBtn = document.getElementById('adminRegisterVerify');
  const backToCredentialsBtn = document.getElementById('adminRegisterBackToCredentials');
  const resendCodeBtn = document.getElementById('adminRegisterResendCode');
  const togglePasswordBtn = document.getElementById('adminRegisterTogglePassword');
  const strengthBar = document.getElementById('adminRegisterStrengthBar');
  const strengthLabel = document.getElementById('adminRegisterStrengthLabel');
  const verifyEmailLabel = document.getElementById('adminRegisterVerifyEmail');
  const verifyEmailWrap = document.getElementById('adminRegisterVerifyEmailWrap');
  const demoHint = document.getElementById('adminRegisterDemoHint');
  const demoCodeValue = document.getElementById('adminRegisterDemoCodeValue');
  const verifyIntro = document.getElementById('adminRegisterVerifyIntro');
  const requirementItems = document.querySelectorAll('[data-password-rule]');

  const CUSTOMER_AUTH_CODE = 'admin';

  if (!form || !stepCredentials || !stepVerify) return;

  let currentStep = 1;
  let pendingEmail = '';
  let mailConfig = {
    senderEmail: '',
    deliveryMode: 'personal-smtp'
  };

  async function loadMailConfig() {
    try {
      const response = await fetch('/api/admin/register/mail-status');
      if (!response.ok) return;
      const data = await response.json();
      mailConfig = {
        senderEmail: String(data.senderEmail || data.user || '').trim().toLowerCase(),
        deliveryMode: data.deliveryMode || 'personal-smtp',
        provider: data.provider || 'smtp'
      };
    } catch {
      // ignore
    }
  }

  const PASSWORD_RULES = {
    minLength: true,
    upper: true,
    lower: true,
    digit: true,
    english: true
  };

  function getPasswordChecks(password) {
    const value = String(password || '');
    return {
      minLength: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      digit: /\d/.test(value),
      english: value.length === 0 || (/^[\x21-\x7E]+$/.test(value) && !/[А-Яа-яЁё]/.test(value))
    };
  }

  function allChecksPassed(checks) {
    return Object.keys(PASSWORD_RULES).every((key) => checks[key]);
  }

  function sanitizeClientEmail(value) {
    const homoglyphs = {
      '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c',
      '\u0443': 'y', '\u0445': 'x', '\u0456': 'i', '\u0410': 'a', '\u0415': 'e',
      '\u041e': 'o', '\u0420': 'p', '\u0421': 'c', '\u0423': 'y', '\u0425': 'x'
    };
    return String(value || '')
      .trim()
      .split('')
      .map((char) => homoglyphs[char] || char)
      .join('')
      .toLowerCase();
  }

  function getEmailValidationError(value) {
    const email = sanitizeClientEmail(value);
    if (!email) return 'Укажите email';
    if (/[^\x00-\x7F]/.test(email)) {
      return 'Email только латиницей (переключите раскладку на ENG)';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,63}$/.test(email)) {
      return 'Некорректный формат email';
    }
    return null;
  }

  function credentialsAreValid() {
    const payload = readCredentialsPayload();
    return payload.name
      && payload.email
      && !getEmailValidationError(payload.email)
      && payload.password
      && payload.confirmPassword
      && payload.password === payload.confirmPassword
      && allChecksPassed(getPasswordChecks(payload.password));
  }

  function hasCustomerAuthCode() {
    return authCodeInput?.value.trim() === CUSTOMER_AUTH_CODE;
  }

  function getStrengthScore(password) {
    const checks = getPasswordChecks(password);
    let score = Object.values(checks).filter(Boolean).length;
    if (password.length >= 12) score += 1;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) score += 1;
    return Math.min(score, 6);
  }

  function updatePasswordUi() {
    const password = passwordInput?.value || '';
    const checks = getPasswordChecks(password);
    const validCredentials = credentialsAreValid();

    requirementItems.forEach((item) => {
      const rule = item.dataset.passwordRule;
      const ok = Boolean(checks[rule]);
      item.classList.toggle('is-valid', ok);
      item.classList.toggle('is-invalid', password.length > 0 && !ok);
    });

    if (strengthBar && strengthLabel) {
      const score = getStrengthScore(password);
      const widths = ['0%', '20%', '35%', '50%', '65%', '82%', '100%'];
      const labels = ['', 'Слабый', 'Слабый', 'Средний', 'Хороший', 'Надёжный', 'Отличный'];
      strengthBar.style.width = widths[score];
      strengthBar.dataset.level = String(score);
      strengthLabel.textContent = password ? (labels[score] || '') : 'Надёжность пароля';
    }

    if (confirmInput) {
      const mismatch = confirmInput.value.length > 0 && confirmInput.value !== password;
      confirmInput.classList.toggle('is-invalid', mismatch);
      confirmInput.setAttribute('aria-invalid', mismatch ? 'true' : 'false');
    }

    if (loginBtn) {
      loginBtn.disabled = !hasCustomerAuthCode();
    }

    if (sendCodeBtn) {
      sendCodeBtn.disabled = !validCredentials;
    }
  }

  function setStep(step) {
    currentStep = step;
    stepCredentials.hidden = step !== 1;
    stepVerify.hidden = step !== 2;

    stepIndicators.forEach((indicator) => {
      const indicatorStep = Number(indicator.dataset.registerStepIndicator);
      indicator.classList.toggle('is-active', indicatorStep === step);
      indicator.classList.toggle('is-done', indicatorStep < step);
    });
  }

  function resetRegistrationForm() {
    form.reset();
    pendingEmail = '';
    setStep(1);
    if (verifyEmailLabel) verifyEmailLabel.textContent = '';
    if (verifyEmailWrap) verifyEmailWrap.hidden = true;
    if (demoHint) demoHint.hidden = true;
    if (demoCodeValue) demoCodeValue.textContent = '';
    if (verifyIntro) verifyIntro.textContent = 'Введите 6-значный код подтверждения.';
    updatePasswordUi();
  }

  function readCredentialsPayload() {
    const rawEmail = emailInput?.value.trim() || '';
    return {
      name: document.getElementById('adminRegisterName')?.value.trim() || '',
      email: sanitizeClientEmail(rawEmail),
      password: passwordInput?.value || '',
      confirmPassword: confirmInput?.value || '',
      authCode: authCodeInput?.value.trim() || ''
    };
  }

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Сервер вернул некорректный ответ. Запустите сайт через npm start.');
    }
  }

  function finishRegistration(message) {
    window.showAdminToast?.(message || 'Регистрация завершена');
    resetRegistrationForm();
    if (typeof window.openAdminPanel === 'function') {
      window.openAdminPanel('register');
    }
  }

  async function loginWithAuthCode() {
    const authCode = authCodeInput?.value.trim() || '';

    if (authCode !== CUSTOMER_AUTH_CODE) {
      window.showAdminToast?.('Неверный код аутентификации', 'error');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.dataset.loading = 'true';

    try {
      const response = await fetch('/api/admin/register/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authCode })
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось выполнить вход');
      }

      resetRegistrationForm();
      if (typeof window.openAdminPanel === 'function') {
        window.openAdminPanel('auth');
      }
      window.showAdminToast?.(data.message || 'Вход выполнен');
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('npm start')) {
        resetRegistrationForm();
        if (typeof window.openAdminPanel === 'function') {
          window.openAdminPanel('auth');
        }
        window.showAdminToast?.('Вход выполнен');
        return;
      }

      window.showAdminToast?.(error.message || 'Ошибка входа', 'error');
    } finally {
      loginBtn.disabled = false;
      delete loginBtn.dataset.loading;
      updatePasswordUi();
    }
  }

  async function sendVerificationCode() {
    const payload = readCredentialsPayload();
    const emailError = getEmailValidationError(emailInput?.value || '');

    if (emailError) {
      window.showAdminToast?.(emailError, 'error');
      return;
    }

    if (mailConfig.deliveryMode === 'personal-smtp' && mailConfig.senderEmail && payload.email === mailConfig.senderEmail) {
      const proceedSame = window.confirm(
        `Вы указали email отправителя (${payload.email}). Код придёт на этот же ящик.\n\nДля другого пользователя укажите его email.`
      );
      if (!proceedSame) return;
    } else {
      const confirmed = window.confirm(`Отправить код подтверждения на ${payload.email}?`);
      if (!confirmed) return;
    }

    if (!credentialsAreValid()) {
      window.showAdminToast?.('Заполните все поля и проверьте пароль', 'error');
      return;
    }

    sendCodeBtn.disabled = true;
    sendCodeBtn.dataset.loading = 'true';

    try {
      const response = await fetch('/api/admin/register/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить код на email');
      }

      pendingEmail = data.sentTo || data.email || payload.email.toLowerCase();
      if (verifyEmailLabel) verifyEmailLabel.textContent = pendingEmail;
      if (verifyEmailWrap) verifyEmailWrap.hidden = false;
      if (emailCodeInput) emailCodeInput.value = '';

      if (data.demoMode || data.showCodeOnScreen) {
        if (demoHint) demoHint.hidden = false;
        if (demoCodeValue && data.demoCode) demoCodeValue.textContent = data.demoCode;
        if (verifyIntro) {
          verifyIntro.textContent = data.mailSent === false
            ? `Письмо не доставлено на ${pendingEmail}. Используйте код ниже — регистрация всё равно возможна.`
            : data.demoMode
              ? 'Демо-режим: код показан ниже. Письмо не отправляется.'
              : data.mailProvider === 'brevo'
                ? `Код отправлен на ${pendingEmail} через Brevo. Проверьте «Входящие» и «Спам». Код также показан ниже.`
                : data.mailProvider === 'gas'
                  ? `Код отправлен на ${pendingEmail} через Google Apps Script. Проверьте «Входящие» и «Спам». Код также показан ниже.`
                  : `Код отправлен на ${pendingEmail} и продублирован ниже на экране.`;
        }
      } else {
        if (demoHint) demoHint.hidden = true;
        if (demoCodeValue) demoCodeValue.textContent = '';
        if (verifyIntro) {
          verifyIntro.textContent = `Код отправлен на ${pendingEmail}. Проверьте «Входящие» и «Спам».`;
        }
      }

      setStep(2);
      window.showAdminToast?.(data.message || 'Код отправлен на email');
      emailCodeInput?.focus();
    } catch (error) {
      window.showAdminToast?.(error.message || 'Ошибка отправки кода', 'error');
    } finally {
      sendCodeBtn.disabled = false;
      delete sendCodeBtn.dataset.loading;
      updatePasswordUi();
    }
  }

  async function verifyAndRegister() {
    const payload = readCredentialsPayload();
    const emailCode = emailCodeInput?.value.trim() || '';

    if (!/^\d{6}$/.test(emailCode)) {
      window.showAdminToast?.('Введите 6-значный код из email', 'error');
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.dataset.loading = 'true';

    try {
      const response = await fetch('/api/admin/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail || payload.email.toLowerCase(),
          emailCode
        })
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось подтвердить регистрацию');
      }

      finishRegistration(data.message);
    } catch (error) {
      window.showAdminToast?.(error.message || 'Ошибка подтверждения', 'error');
    } finally {
      verifyBtn.disabled = false;
      delete verifyBtn.dataset.loading;
    }
  }

  passwordInput?.addEventListener('input', updatePasswordUi);
  confirmInput?.addEventListener('input', updatePasswordUi);
  document.getElementById('adminRegisterName')?.addEventListener('input', updatePasswordUi);
  emailInput?.addEventListener('input', updatePasswordUi);
  authCodeInput?.addEventListener('input', updatePasswordUi);

  togglePasswordBtn?.addEventListener('click', () => {
    if (!passwordInput) return;
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePasswordBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    togglePasswordBtn.textContent = isHidden ? 'Скрыть' : 'Показать';
  });

  emailCodeInput?.addEventListener('input', () => {
    emailCodeInput.value = emailCodeInput.value.replace(/\D/g, '').slice(0, 6);
  });

  sendCodeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    sendVerificationCode();
  });

  loginBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    loginWithAuthCode();
  });

  resendCodeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    sendVerificationCode();
  });

  backToCredentialsBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    setStep(1);
  });

  verifyBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    verifyAndRegister();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (currentStep === 2) {
      verifyAndRegister();
      return;
    }

    if (document.activeElement === authCodeInput && hasCustomerAuthCode()) {
      loginWithAuthCode();
      return;
    }

    sendVerificationCode();
  });

  window.resetAdminRegistration = resetRegistrationForm;
  loadMailConfig();
  updatePasswordUi();
})();
