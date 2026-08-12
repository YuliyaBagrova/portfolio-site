(function initSiteUserRegister() {
  const form = document.getElementById('siteUserRegisterForm');
  const stepCredentials = document.getElementById('siteUserRegisterStepCredentials');
  const stepVerify = document.getElementById('siteUserRegisterStepVerify');
  const stepIndicators = document.querySelectorAll('[data-site-register-step-indicator]');
  const passwordInput = document.getElementById('siteUserRegisterPassword');
  const confirmInput = document.getElementById('siteUserRegisterPasswordConfirm');
  const emailInput = document.getElementById('siteUserRegisterEmail');
  const emailCodeInput = document.getElementById('siteUserRegisterEmailCode');
  const sendCodeBtn = document.getElementById('siteUserRegisterSendCode');
  const verifyBtn = document.getElementById('siteUserRegisterVerify');
  const backToCredentialsBtn = document.getElementById('siteUserRegisterBackToCredentials');
  const resendCodeBtn = document.getElementById('siteUserRegisterResendCode');
  const togglePasswordBtn = document.getElementById('siteUserRegisterTogglePassword');
  const strengthBar = document.getElementById('siteUserRegisterStrengthBar');
  const strengthLabel = document.getElementById('siteUserRegisterStrengthLabel');
  const verifyEmailLabel = document.getElementById('siteUserRegisterVerifyEmail');
  const verifyEmailWrap = document.getElementById('siteUserRegisterVerifyEmailWrap');
  const demoHint = document.getElementById('siteUserRegisterDemoHint');
  const demoCodeValue = document.getElementById('siteUserRegisterDemoCodeValue');
  const verifyIntro = document.getElementById('siteUserRegisterVerifyIntro');
  const requirementItems = document.querySelectorAll('[data-site-password-rule]');

  if (!form || !stepCredentials || !stepVerify) return;

  let currentStep = 1;
  let pendingEmail = '';

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
    if (typeof window.sanitizeAdminEmail === 'function') {
      return window.sanitizeAdminEmail(value);
    }
    return String(value || '').trim().toLowerCase();
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

  function readCredentialsPayload() {
    const rawEmail = emailInput?.value.trim() || '';
    return {
      name: document.getElementById('siteUserRegisterName')?.value.trim() || '',
      email: sanitizeClientEmail(rawEmail),
      password: passwordInput?.value || '',
      confirmPassword: confirmInput?.value || ''
    };
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

    requirementItems.forEach((item) => {
      const rule = item.dataset.sitePasswordRule;
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

    if (sendCodeBtn) {
      sendCodeBtn.disabled = !credentialsAreValid();
    }
  }

  function setStep(step) {
    currentStep = step;
    stepCredentials.hidden = step !== 1;
    stepVerify.hidden = step !== 2;

    stepIndicators.forEach((indicator) => {
      const indicatorStep = Number(indicator.dataset.siteRegisterStepIndicator);
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

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Сервер вернул некорректный ответ.');
    }
  }

  function finishRegistration(message, user) {
    window.showAdminToast?.(message || 'Регистрация завершена');
    resetRegistrationForm();
    if (!user || (typeof window.isRealSiteUser === 'function' && !window.isRealSiteUser(user))) {
      return;
    }
    if (typeof window.completeSiteUserAccess === 'function') {
      window.completeSiteUserAccess('register', user);
    } else {
      window.showAdminToast?.(`Добро пожаловать, ${user.name || user.email}!`);
    }
  }

  async function sendVerificationCode() {
    const payload = readCredentialsPayload();
    const emailError = getEmailValidationError(emailInput?.value || '');

    if (emailError) {
      window.showAdminToast?.(emailError, 'error');
      return;
    }

    if (!credentialsAreValid()) {
      window.showAdminToast?.('Заполните все поля и проверьте пароль', 'error');
      return;
    }

    const confirmed = window.confirm(`Отправить код подтверждения на ${payload.email}?`);
    if (!confirmed) return;

    sendCodeBtn.disabled = true;
    sendCodeBtn.dataset.loading = 'true';

    try {
      const response = await fetch('/api/site/register/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить код');
      }

      pendingEmail = data.sentTo || data.email || payload.email;
      if (emailInput) emailInput.value = pendingEmail;
      if (verifyEmailLabel) verifyEmailLabel.textContent = pendingEmail;
      if (verifyEmailWrap) verifyEmailWrap.hidden = false;
      if (emailCodeInput) emailCodeInput.value = '';

      if (data.demoMode || data.showCodeOnScreen) {
        if (demoHint) demoHint.hidden = false;
        if (demoCodeValue && data.demoCode) demoCodeValue.textContent = data.demoCode;
        if (verifyIntro) {
          verifyIntro.textContent = data.demoMode
            ? 'Демо-режим: код показан ниже.'
            : `Код отправлен на ${pendingEmail} и продублирован ниже.`;
        }
      } else {
        if (demoHint) demoHint.hidden = true;
        if (verifyIntro) verifyIntro.textContent = `Код отправлен на ${pendingEmail}.`;
      }

      setStep(2);
      window.showAdminToast?.(data.message || 'Код отправлен');
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
      const response = await fetch('/api/site/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail || payload.email,
          emailCode
        })
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось подтвердить регистрацию');
      }

      finishRegistration(data.message, data.user);
    } catch (error) {
      window.showAdminToast?.(error.message || 'Ошибка подтверждения', 'error');
    } finally {
      verifyBtn.disabled = false;
      delete verifyBtn.dataset.loading;
    }
  }

  passwordInput?.addEventListener('input', updatePasswordUi);
  confirmInput?.addEventListener('input', updatePasswordUi);
  document.getElementById('siteUserRegisterName')?.addEventListener('input', updatePasswordUi);
  emailInput?.addEventListener('input', updatePasswordUi);

  window.bindAdminPasswordToggle?.(togglePasswordBtn, passwordInput);

  emailCodeInput?.addEventListener('input', () => {
    emailCodeInput.value = emailCodeInput.value.replace(/\D/g, '').slice(0, 6);
  });

  sendCodeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    sendVerificationCode();
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
    sendVerificationCode();
  });

  window.resetSiteUserRegistration = resetRegistrationForm;
  updatePasswordUi();
})();
