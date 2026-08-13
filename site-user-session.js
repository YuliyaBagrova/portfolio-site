(function initSiteUserSession() {
  const STORAGE_KEY = 'portfolio_site_user';
  const SESSION_COUNT_PREFIX = 'portfolio_site_browser_visits_';
  const SESSION_ACTIVE_PREFIX = 'portfolio_site_tab_active_';
  const GATE_KEY = 'site_gate_unlocked';
  const GATE_MODE_KEY = 'site_gate_mode';
  const DEMO_SHARED_SCOPE = 'demo:shared';

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

  function getSiteGateMode() {
    return localStorage.getItem(GATE_MODE_KEY) || '';
  }

  function setSiteGateMode(mode) {
    if (mode) {
      localStorage.setItem(GATE_MODE_KEY, mode);
    } else {
      localStorage.removeItem(GATE_MODE_KEY);
    }
  }

  function unlockSiteGate(mode) {
    localStorage.setItem(GATE_KEY, '1');
    if (mode === 'demo' || mode === 'user') {
      setSiteGateMode(mode);
    }
  }

  function lockSiteGate() {
    localStorage.removeItem(GATE_KEY);
    localStorage.removeItem(GATE_MODE_KEY);
  }

  function isSiteDemoClientMode() {
    const profile = readSession();
    if (profile?.isDemo) return true;
    if (profile && isRealSiteUser(profile)) return false;
    if (!isSiteGateUnlocked()) return false;

    const mode = getSiteGateMode();
    if (mode === 'demo') return true;
    if (mode === 'user') return false;

    // Старые сессии до site_gate_mode: считаем demo, если нет профиля зарегистрированного клиента.
    return true;
  }

  function ensureSiteClientSession() {
    if (!isSiteGateUnlocked()) return readSession();

    const profile = readSession();
    if (profile?.isDemo) return profile;
    if (profile && isRealSiteUser(profile)) return profile;

    if (isSiteDemoClientMode()) {
      if (getSiteGateMode() !== 'demo') {
        setSiteGateMode('demo');
      }
      const restored = setSiteDemoSession('preview');
      if (!profile && restored) {
        window.dispatchEvent(new CustomEvent('site-user-session-changed'));
      }
      return restored;
    }

    return profile;
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
  function getSiteDataScopeKey() {
    const profile = readSession();
    if (!profile) return 'guest';
    if (profile.isDemo) {
      const email = String(profile.email || '').trim().toLowerCase();
      return email ? `demo:${email}` : `demo:${profile.entryType || 'preview'}`;
    }
    if (profile.id != null) return `user:${profile.id}`;
    const email = String(profile.email || '').trim().toLowerCase();
    return email ? `user-email:${email}` : 'guest';
  }

  function getSiteCartScopeKey() {
    ensureSiteClientSession();
    const profile = readSession();
    if (!profile) {
      if (isSiteDemoClientMode()) return DEMO_SHARED_SCOPE;
      return 'guest';
    }
    if (profile.isDemo) return DEMO_SHARED_SCOPE;
    if (profile.id != null) return `user:${profile.id}`;
    const email = String(profile.email || '').trim().toLowerCase();
    return email ? `user-email:${email}` : 'guest';
  }

  function getSiteOrderScopeKey() {
    ensureSiteClientSession();
    const profile = readSession();
    if (!profile) {
      if (isSiteDemoClientMode()) return DEMO_SHARED_SCOPE;
      return 'guest';
    }
    if (profile.isDemo) return DEMO_SHARED_SCOPE;
    if (profile.id != null) return `user:${profile.id}`;
    const email = String(profile.email || '').trim().toLowerCase();
    return email ? `user-email:${email}` : 'guest';
  }

  function isSiteDemoOrder(order) {
    if (!order) return false;
    if (order.is_demo === true || order.is_demo === 1 || order.is_demo === '1') return true;

    if (order.site_user_id == null || order.site_user_id === '') return true;

    const email = String(order.email || '').trim().toLowerCase();
    if (email.endsWith('@portfolio.local')) return true;

    const scope = String(order.client_scope || '').trim();
    if (scope.startsWith('demo:')) return true;

    return false;
  }

  function belongsToRegisteredSiteOrder(order) {
    const profile = readSession();
    if (!profile || profile.isDemo) return false;
    if (isSiteDemoOrder(order)) return false;

    const scope = getSiteOrderScopeKey();
    if (order.client_scope === scope) return true;
    if (profile.id != null && Number(order.site_user_id) === Number(profile.id)) return true;

    return false;
  }

  function getSiteOrderContext() {
    ensureSiteClientSession();
    const profile = readSession();

    if (!profile) {
      if (isSiteDemoClientMode()) {
        return {
          isDemo: true,
          is_demo: 1,
          site_user_id: null,
          email: ''
        };
      }

      return {
        isDemo: false,
        is_demo: 0,
        site_user_id: null,
        email: ''
      };
    }

    if (profile.isDemo) {
      return {
        isDemo: true,
        is_demo: 1,
        site_user_id: null,
        email: String(profile.email || '').trim().toLowerCase()
      };
    }

    return {
      isDemo: false,
      is_demo: 0,
      site_user_id: profile.id ?? null,
      email: String(profile.email || '').trim().toLowerCase()
    };
  }

  function getSiteOrderQueryParams() {
    return {
      client_scope: getSiteOrderScopeKey()
    };
  }

  function appendSiteOrderFields(payload) {
    const ctx = getSiteOrderContext();
    return {
      ...payload,
      is_demo: ctx.is_demo,
      site_user_id: ctx.site_user_id,
      client_scope: getSiteOrderScopeKey()
    };
  }

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
  window.getSiteDataScopeKey = getSiteDataScopeKey;
  window.getSiteCartScopeKey = getSiteCartScopeKey;
  window.getSiteOrderScopeKey = getSiteOrderScopeKey;
  window.isSiteDemoClientMode = isSiteDemoClientMode;
  window.ensureSiteClientSession = ensureSiteClientSession;
  window.getSiteGateMode = getSiteGateMode;
  window.setSiteGateMode = setSiteGateMode;
  window.isSiteDemoOrder = isSiteDemoOrder;
  window.belongsToRegisteredSiteOrder = belongsToRegisteredSiteOrder;
  window.getSiteOrderContext = getSiteOrderContext;
  window.getSiteOrderQueryParams = getSiteOrderQueryParams;
  window.appendSiteOrderFields = appendSiteOrderFields;
  window.applySiteCustomerToForm = applySiteCustomerToForm;
  window.applySiteCustomerToForms = applySiteCustomerToForms;
  window.isSiteGateUnlocked = isSiteGateUnlocked;
  window.unlockSiteGate = unlockSiteGate;
  window.lockSiteGate = lockSiteGate;

  ensureSiteClientSession();
})();
