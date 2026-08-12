(function initSiteUserSession() {
  const STORAGE_KEY = 'portfolio_site_user';
  const SESSION_COUNT_PREFIX = 'portfolio_site_browser_visits_';
  const SESSION_ACTIVE_PREFIX = 'portfolio_site_tab_active_';
  const GATE_KEY = 'site_gate_unlocked';

  const DEMO_LOCATIONS = ['Москва, Россия', 'Санкт-Петербург, Россия', 'Казань, Россия', 'Новосибирск, Россия'];
  const DEMO_BIOS = [
    'Демонстрационный доступ к сайту Portfolio без регистрации.',
    'Гостевой просмотр каталога и разделов портфолио.',
    'Временный профиль клиента для ознакомления с сайтом.'
  ];

  function readSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSession(profile) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function getSessionUserKey(profile) {
    if (!profile) return 'unknown';
    if (profile.isDemo) return `demo:${profile.entryType || 'preview'}`;
    return String(profile.email || 'user').toLowerCase();
  }

  function getBrowserSessionsCount(profile) {
    const count = Number(localStorage.getItem(SESSION_COUNT_PREFIX + getSessionUserKey(profile)) || 0);
    return count > 0 ? count : 1;
  }

  function recordBrowserSessionVisit(profile) {
    if (!profile) return 1;
    const userKey = getSessionUserKey(profile);
    const activeKey = SESSION_ACTIVE_PREFIX + userKey;

    if (sessionStorage.getItem(activeKey)) {
      return getBrowserSessionsCount(profile);
    }

    sessionStorage.setItem(activeKey, String(Date.now()));
    const count = Number(localStorage.getItem(SESSION_COUNT_PREFIX + userKey) || 0) + 1;
    localStorage.setItem(SESSION_COUNT_PREFIX + userKey, String(count));
    return count;
  }

  function demoRole(entryType) {
    if (entryType === 'preview') {
      return 'Клиент (Демо-доступ)';
    }
    return 'Клиент';
  }

  function entryLabel(entryType) {
    const labels = {
      preview: 'Предварительный просмотр',
      register: 'Регистрация',
      login: 'Вход по аккаунту'
    };
    return labels[entryType] || labels.preview;
  }

  function buildDemoProfile(entryType) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const type = entryType || 'preview';
    return {
      isDemo: true,
      id: null,
      name: 'Demo',
      email: `demo.client${suffix}@portfolio.local`,
      role: demoRole(type),
      entryType: type,
      entryLabel: entryLabel(type),
      registeredAt: null,
      lastLogin: new Date().toISOString(),
      avatarInitials: 'CL',
      avatarUrl: null,
      status: 'demo',
      emailVerified: false,
      location: pickRandom(DEMO_LOCATIONS),
      phone: `+7 (9${Math.floor(10 + Math.random() * 89)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}`,
      bio: pickRandom(DEMO_BIOS),
      sessionsCount: 1
    };
  }

  function isRealSiteUser(user) {
    if (!user || typeof user !== 'object') return false;
    if (user.isDemo === true) return false;
    return Boolean(String(user.email || '').trim() || user.id != null);
  }

  function resolveAvatarUrl(user, existing, email) {
    const hasAvatarField = Object.prototype.hasOwnProperty.call(user, 'avatarUrl')
      || Object.prototype.hasOwnProperty.call(user, 'avatar_data');

    if (hasAvatarField) {
      const value = user.avatarUrl ?? user.avatar_data ?? null;
      return value ? String(value) : null;
    }

    if (existing && !existing.isDemo && existing.email === email && existing.avatarUrl) {
      return existing.avatarUrl;
    }

    return null;
  }

  function resolveContactField(user, field, existing, email) {
    if (Object.prototype.hasOwnProperty.call(user, field)) {
      const value = user[field];
      if (value == null || value === '') return null;
      return String(value).trim() || null;
    }

    if (existing?.email === email && existing[field] != null) {
      return existing[field];
    }

    return null;
  }

  function normalizeUser(user, entryType) {
    if (!isRealSiteUser(user)) return null;
    const name = String(user.name || user.email || 'Клиент').trim();
    const email = String(user.email || '').trim().toLowerCase();
    const existing = readSession();

    return {
      isDemo: false,
      id: user.id ?? null,
      name,
      email,
      role: user.role || 'Клиент',
      entryType: entryType || user.entryType || 'register',
      entryLabel: user.entryLabel || entryLabel(entryType || user.entryType || 'register'),
      registeredAt: user.registeredAt || user.created_at || null,
      lastLogin: user.lastLogin || new Date().toISOString(),
      avatarInitials: user.avatarInitials || name.slice(0, 2).toUpperCase(),
      avatarUrl: resolveAvatarUrl(user, existing, email),
      status: user.status || 'active',
      emailVerified: user.emailVerified !== false,
      location: resolveContactField(user, 'location', existing, email),
      phone: resolveContactField(user, 'phone', existing, email),
      bio: user.bio || 'Зарегистрированный клиент сайта Portfolio.',
      sessionsCount: user.sessionsCount || getBrowserSessionsCount({ email, isDemo: false })
    };
  }

  function applySessionVisitCount(profile) {
    if (!profile) return profile;
    profile.sessionsCount = recordBrowserSessionVisit(profile);
    writeSession(profile);
    return profile;
  }

  function setSiteSessionUser(user, entryType) {
    const profile = normalizeUser(user, entryType);
    if (!profile) return null;
    profile.lastLogin = new Date().toISOString();
    return applySessionVisitCount(profile);
  }

  function setSiteDemoSession(entryType) {
    const type = entryType || 'preview';
    const existing = readSession();

    if (existing?.isDemo && existing.entryType === type) {
      existing.lastLogin = new Date().toISOString();
      existing.role = demoRole(type);
      return applySessionVisitCount(existing);
    }

    return applySessionVisitCount(buildDemoProfile(type));
  }

  function getSiteSessionUser() {
    return readSession();
  }

  function clearSiteSessionUser() {
    const profile = readSession();
    if (profile) {
      sessionStorage.removeItem(SESSION_ACTIVE_PREFIX + getSessionUserKey(profile));
    }
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function logoutSiteUser() {
    clearSiteSessionUser();
    lockSiteGate();
    if (typeof window.returnToSiteWelcomeGate === 'function') {
      window.returnToSiteWelcomeGate();
    } else {
      window.dispatchEvent(new CustomEvent('site-user-session-changed'));
      window.showSiteUserGateIfNeeded?.();
    }
    return true;
  }

  function isSiteGateUnlocked() {
    return localStorage.getItem(GATE_KEY) === '1';
  }

  function unlockSiteGate() {
    localStorage.setItem(GATE_KEY, '1');
  }

  function lockSiteGate() {
    localStorage.removeItem(GATE_KEY);
  }

  function updateSiteSessionAvatar(avatarUrl) {
    const profile = readSession();
    if (!profile) return null;
    profile.avatarUrl = avatarUrl ?? null;
    writeSession(profile);
    return profile;
  }

  function updateSiteSessionProfile(patch) {
    const profile = readSession();
    if (!profile || !patch || typeof patch !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(patch, 'location')) {
      profile.location = patch.location ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'phone')) {
      profile.phone = patch.phone ?? null;
    }
    writeSession(profile);
    return profile;
  }

  window.isRealSiteUser = isRealSiteUser;
  window.setSiteSessionUser = setSiteSessionUser;
  window.setSiteDemoSession = setSiteDemoSession;
  window.getSiteSessionUser = getSiteSessionUser;
  window.clearSiteSessionUser = clearSiteSessionUser;
  window.logoutSiteUser = logoutSiteUser;
  window.updateSiteSessionAvatar = updateSiteSessionAvatar;
  window.updateSiteSessionProfile = updateSiteSessionProfile;
  window.getSiteBrowserSessionsCount = getBrowserSessionsCount;
  function getSiteCustomerContext() {
    const profile = readSession();
    if (!profile) {
      return {
        name: '',
        email: '',
        phone: '',
        isRegistered: false,
        isDemo: false
      };
    }

    if (profile.isDemo) {
      return {
        name: '',
        email: '',
        phone: '',
        isRegistered: false,
        isDemo: true,
        profile
      };
    }

    return {
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      isRegistered: true,
      isDemo: false,
      profile
    };
  }

  function applySiteCustomerToForm(form) {
    if (!form) return;
    const ctx = getSiteCustomerContext();
    if (!ctx.isRegistered) return;

    const nameInput = form.querySelector('[name="customer_name"]');
    const emailInput = form.querySelector('[name="email"]');
    const phoneInput = form.querySelector('[name="phone"]');

    if (nameInput && !String(nameInput.value || '').trim()) {
      nameInput.value = ctx.name;
    }
    if (emailInput && !String(emailInput.value || '').trim()) {
      emailInput.value = ctx.email;
    }
    if (phoneInput && ctx.phone && !String(phoneInput.value || '').trim()) {
      phoneInput.value = ctx.phone;
    }
  }

  function applySiteCustomerToForms(root = document) {
    root.querySelectorAll('form').forEach((form) => {
      if (form.querySelector('[name="customer_name"]') && form.querySelector('[name="email"]')) {
        applySiteCustomerToForm(form);
      }
    });
  }

  window.getSiteCustomerContext = getSiteCustomerContext;
  window.applySiteCustomerToForm = applySiteCustomerToForm;
  window.applySiteCustomerToForms = applySiteCustomerToForms;
  window.isSiteGateUnlocked = isSiteGateUnlocked;
  window.unlockSiteGate = unlockSiteGate;
  window.lockSiteGate = lockSiteGate;
})();
