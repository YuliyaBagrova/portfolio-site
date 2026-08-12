(function initAdminUserSession() {
  const STORAGE_KEY = 'portfolio_admin_user';
  const SESSION_COUNT_PREFIX = 'portfolio_admin_browser_visits_';
  const SESSION_ACTIVE_PREFIX = 'portfolio_admin_tab_active_';

  const DEMO_LOCATIONS = ['Москва, Россия', 'Санкт-Петербург, Россия', 'Казань, Россия', 'Новосибирск, Россия'];
  const DEMO_BIOS = [
    'Демонстрационный доступ к панели Portfolio без регистрации.',
    'Гостевой просмотр возможностей админ-панели сайта.',
    'Временный профиль для ознакомления с интерфейсом управления.'
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
      return 'Администратор (Демо-доступ)';
    }
    return 'Демо-доступ';
  }

  function buildDemoProfile(entryType) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const type = entryType || 'preview';
    return {
      isDemo: true,
      id: null,
      name: 'Demo',
      email: `demo.guest${suffix}@portfolio.local`,
      role: demoRole(type),
      entryType: type,
      entryLabel: entryLabel(type),
      registeredAt: null,
      lastLogin: new Date().toISOString(),
      avatarInitials: 'DM',
      avatarUrl: null,
      status: 'demo',
      emailVerified: false,
      location: pickRandom(DEMO_LOCATIONS),
      phone: `+7 (9${Math.floor(10 + Math.random() * 89)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}`,
      bio: pickRandom(DEMO_BIOS),
      sessionsCount: 1
    };
  }

  function entryLabel(entryType) {
    const labels = {
      preview: 'Предварительный просмотр',
      register: 'Пропуск регистрации',
      auth: 'Код аутентификации admin',
      login: 'Вход по аккаунту'
    };
    return labels[entryType] || labels.preview;
  }

  function isRealAdminUser(user) {
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
    if (!isRealAdminUser(user)) return null;
    const name = String(user.name || user.email || 'Пользователь').trim();
    const email = String(user.email || '').trim().toLowerCase();
    const existing = readSession();

    return {
      isDemo: false,
      id: user.id ?? null,
      name,
      email,
      role: user.role || 'Администратор',
      entryType: entryType || user.entryType || 'login',
      entryLabel: user.entryLabel || entryLabel(entryType || user.entryType || 'login'),
      registeredAt: user.registeredAt || user.created_at || null,
      lastLogin: user.lastLogin || new Date().toISOString(),
      avatarInitials: user.avatarInitials || name.slice(0, 2).toUpperCase(),
      avatarUrl: resolveAvatarUrl(user, existing, email),
      status: user.status || 'active',
      emailVerified: user.emailVerified !== false,
      location: resolveContactField(user, 'location', existing, email),
      phone: resolveContactField(user, 'phone', existing, email),
      bio: user.bio || 'Зарегистрированный администратор сайта Portfolio.',
      sessionsCount: user.sessionsCount || getBrowserSessionsCount({ email, isDemo: false })
    };
  }

  function applySessionVisitCount(profile) {
    if (!profile) return profile;
    profile.sessionsCount = recordBrowserSessionVisit(profile);
    writeSession(profile);
    return profile;
  }

  function setAdminSessionUser(user, entryType) {
    const profile = normalizeUser(user, entryType);
    if (!profile) return null;
    profile.lastLogin = new Date().toISOString();
    return applySessionVisitCount(profile);
  }

  function setAdminDemoSession(entryType) {
    const type = entryType || 'preview';
    const existing = readSession();

    if (existing?.isDemo && existing.entryType === type) {
      existing.lastLogin = new Date().toISOString();
      existing.role = demoRole(type);
      return applySessionVisitCount(existing);
    }

    return applySessionVisitCount(buildDemoProfile(type));
  }

  function getAdminSessionUser() {
    return readSession();
  }

  function clearAdminSessionUser() {
    const profile = readSession();
    if (profile) {
      sessionStorage.removeItem(SESSION_ACTIVE_PREFIX + getSessionUserKey(profile));
    }
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function updateAdminSessionAvatar(avatarUrl) {
    const profile = readSession();
    if (!profile) return null;
    profile.avatarUrl = avatarUrl ?? null;
    writeSession(profile);
    return profile;
  }

  function updateAdminSessionProfile(patch) {
    const profile = readSession();
    if (!profile || !patch || typeof patch !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(patch, 'location')) {
      profile.location = patch.location ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'phone')) {
      profile.phone = patch.phone ?? null;
    }
    for (const [key, value] of Object.entries(patch)) {
      if (key !== 'location' && key !== 'phone') {
        profile[key] = value;
      }
    }
    writeSession(profile);
    return profile;
  }

  window.isRealAdminUser = isRealAdminUser;
  window.setAdminSessionUser = setAdminSessionUser;
  window.setAdminDemoSession = setAdminDemoSession;
  window.getAdminSessionUser = getAdminSessionUser;
  window.clearAdminSessionUser = clearAdminSessionUser;
  window.updateAdminSessionAvatar = updateAdminSessionAvatar;
  window.updateAdminSessionProfile = updateAdminSessionProfile;
  window.getBrowserSessionsCount = getBrowserSessionsCount;
})();
