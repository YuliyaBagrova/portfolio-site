(function initSiteUserProfile() {
  const CONTACT_SAVED_MESSAGE = 'Контактная информация изменена и сохранена в системе';
  const AVATAR_UPDATED_MESSAGE = 'Фото профиля обновлено';
  const AVATAR_REMOVED_MESSAGE = 'Фото профиля удалено';

  function showProfileToast(message, type = 'success') {
    if (typeof window.showAdminToast === 'function') {
      window.showAdminToast(message, type);
    }
  }

  const pageRoot = document.getElementById('siteUserProfilePage');
  const isPageMode = Boolean(pageRoot);
  const overlay = document.getElementById('siteUserProfileOverlay');
  const closeBtn = document.getElementById('siteUserProfileClose');
  const changeAvatarBtn = document.getElementById('siteUserProfileChangeAvatar');
  const removeAvatarBtn = document.getElementById('siteUserProfileRemoveAvatar');
  const avatarInput = document.getElementById('siteUserProfileAvatarInput');
  const contactForm = document.getElementById('siteUserProfileContactForm');
  const locationInput = document.getElementById('siteUserProfileLocationInput');
  const phoneInput = document.getElementById('siteUserProfilePhoneInput');
  const contactSaveBtn = document.getElementById('siteUserProfileContactSave');
  const pageDescEl = document.getElementById('siteUserProfilePageDesc');
  const headerAvatar = document.getElementById('siteHeaderUserAvatar');
  const headerAvatarImg = document.getElementById('siteHeaderUserAvatarImg');
  const headerAvatarInitials = document.getElementById('siteHeaderUserAvatarInitials');

  if (!isPageMode && !overlay) {
    async function refreshSiteUserProfileUi() {
      let profile = typeof window.getSiteSessionUser === 'function'
        ? window.getSiteSessionUser()
        : null;

      if (profile && !profile.isDemo && profile.email) {
        try {
          const params = new URLSearchParams({
            email: profile.email,
            entryType: profile.entryType || 'register'
          });
          const response = await fetch(`/api/site/register/profile?${params.toString()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.user && typeof window.setSiteSessionUser === 'function') {
              profile = window.setSiteSessionUser(data.user, profile.entryType || 'register');
            }
          }
        } catch {
          // keep cached profile
        }
      }

      window.refreshSiteUserMenu?.(profile);
      return profile;
    }

    window.openSiteUserProfile = function openSiteUserProfile() {
      if (typeof window.isSiteGateUnlocked === 'function' && !window.isSiteGateUnlocked()) {
        window.showSiteUserGateIfNeeded?.();
        return;
      }
      window.location.href = '/profile.html';
    };
    window.closeSiteUserProfile = function closeSiteUserProfile() {};
    window.refreshSiteUserProfileUi = refreshSiteUserProfileUi;

    window.addEventListener('site-user-session-changed', refreshSiteUserProfileUi);
    if (typeof window.isSiteGateUnlocked === 'function' && window.isSiteGateUnlocked()) {
      refreshSiteUserProfileUi();
    }
    return;
  }

  const els = {
    avatar: document.getElementById('siteUserProfileAvatar'),
    avatarImg: document.getElementById('siteUserProfileAvatarImg'),
    avatarInitials: document.getElementById('siteUserProfileAvatarInitials'),
    name: document.getElementById('siteUserProfileName'),
    email: document.getElementById('siteUserProfileEmail'),
    badge: document.getElementById('siteUserProfileBadge'),
    role: document.getElementById('siteUserProfileRole'),
    entry: document.getElementById('siteUserProfileEntry'),
    registered: document.getElementById('siteUserProfileRegistered'),
    lastLogin: document.getElementById('siteUserProfileLastLogin'),
    bio: document.getElementById('siteUserProfileBio'),
    status: document.getElementById('siteUserProfileStatus'),
    emailVerified: document.getElementById('siteUserProfileEmailVerified'),
    userId: document.getElementById('siteUserProfileUserId'),
    sessions: document.getElementById('siteUserProfileSessions')
  };

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function updatePageDescription(profile) {
    if (!pageDescEl || !profile) return;

    if (profile.isDemo) {
      pageDescEl.textContent = 'Демо-профиль клиента: данные сохраняются в текущем сеансе браузера. Зарегистрируйтесь, чтобы закрепить профиль за аккаунтом.';
      return;
    }

    pageDescEl.textContent = 'Профиль зарегистрированного клиента: контакты, активность и настройки аккаунта на сайте.';
  }

  function renderAvatar(profile) {
    const initials = profile.avatarInitials || 'CL';
    const avatarUrl = profile.avatarUrl || null;
    const hasImage = Boolean(avatarUrl);

    if (els.avatarImg) {
      if (hasImage) {
        els.avatarImg.src = avatarUrl;
        els.avatarImg.hidden = false;
      } else {
        els.avatarImg.removeAttribute('src');
        els.avatarImg.hidden = true;
      }
    }
    if (els.avatarInitials) {
      els.avatarInitials.textContent = initials;
      els.avatarInitials.hidden = hasImage;
      els.avatarInitials.setAttribute('aria-hidden', hasImage ? 'true' : 'false');
    }
    if (els.avatar) {
      els.avatar.dataset.hasImage = hasImage ? 'true' : 'false';
    }
    if (removeAvatarBtn) {
      removeAvatarBtn.hidden = !hasImage;
    }

    if (headerAvatarImg) {
      if (hasImage) {
        headerAvatarImg.src = avatarUrl;
        headerAvatarImg.hidden = false;
      } else {
        headerAvatarImg.removeAttribute('src');
        headerAvatarImg.hidden = true;
      }
    }
    if (headerAvatarInitials) {
      headerAvatarInitials.textContent = initials;
      headerAvatarInitials.hidden = hasImage;
    }
    if (headerAvatar) {
      headerAvatar.dataset.hasImage = hasImage ? 'true' : 'false';
    }
  }

  function renderContactFields(profile) {
    if (locationInput) locationInput.value = profile.location || '';
    if (phoneInput) phoneInput.value = profile.phone || '';
  }

  function renderProfile(profile) {
    if (!profile) return;

    renderAvatar(profile);
    renderContactFields(profile);
    updatePageDescription(profile);

    if (els.name) els.name.textContent = profile.name || 'Клиент';
    if (els.email) els.email.textContent = profile.email || '—';
    if (els.badge) {
      els.badge.textContent = profile.isDemo ? 'Demo' : 'Клиент';
      els.badge.dataset.variant = profile.isDemo ? 'demo' : 'verified';
    }
    if (els.role) els.role.textContent = profile.role || 'Клиент';
    if (els.entry) els.entry.textContent = profile.entryLabel || '—';
    if (els.registered) {
      els.registered.textContent = profile.isDemo ? 'Не зарегистрирован' : formatDate(profile.registeredAt);
    }
    if (els.lastLogin) els.lastLogin.textContent = formatDate(profile.lastLogin);
    if (els.bio) els.bio.textContent = profile.bio || '—';
    if (els.status) {
      els.status.textContent = profile.isDemo ? 'Демо-сессия' : 'Активен';
      els.status.dataset.variant = profile.isDemo ? 'demo' : 'active';
    }
    if (els.emailVerified) {
      els.emailVerified.textContent = profile.emailVerified ? 'Подтверждён' : 'Не требуется';
    }
    if (els.userId) {
      els.userId.textContent = profile.id ? `#${profile.id}` : 'Demo';
    }
    if (els.sessions) {
      els.sessions.textContent = String(profile.sessionsCount || 1);
      els.sessions.title = 'Сколько раз вы заходили на сайт с этого браузера';
    }
  }

  async function refreshSiteUserProfileUi() {
    let profile = typeof window.getSiteSessionUser === 'function'
      ? window.getSiteSessionUser()
      : null;

    if (profile && !profile.isDemo && profile.email) {
      try {
        const params = new URLSearchParams({
          email: profile.email,
          entryType: profile.entryType || 'register'
        });
        const response = await fetch(`/api/site/register/profile?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            profile = typeof window.setSiteSessionUser === 'function'
              ? window.setSiteSessionUser(data.user, profile.entryType || 'register')
              : data.user;
          }
        }
      } catch {
        // keep cached profile
      }
    }

    if (profile) renderProfile(profile);
    else {
      renderAvatar({ avatarInitials: 'CL', avatarUrl: null });
    }
    window.refreshSiteUserMenu?.(profile);
    return profile;
  }

  function openProfile() {
    if (typeof window.isSiteGateUnlocked === 'function' && !window.isSiteGateUnlocked()) {
      window.showSiteUserGateIfNeeded?.();
      return;
    }

    if (isPageMode) {
      refreshSiteUserProfileUi();
      return;
    }

    window.location.href = '/profile.html';
  }

  function closeProfileOverlay() {
    if (isPageMode) return;
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove('site-profile-open');
    if (!document.body.classList.contains('site-gate-open') && !document.body.classList.contains('admin-panel-open')) {
      document.body.style.overflow = '';
    }
  }

  function cropImageToSquare(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Не удалось обработать изображение'));
          return;
        }

        const cropSize = Math.min(img.width, img.height);
        const sx = (img.width - cropSize) / 2;
        const sy = (img.height - cropSize) / 2;

        ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = dataUrl;
    });
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Выберите файл изображения'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('Файл слишком большой. Максимум 5 МБ.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const cropped = await cropImageToSquare(String(reader.result || ''));
          resolve(cropped);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  async function saveAvatar(avatarData) {
    const profile = typeof window.getSiteSessionUser === 'function'
      ? window.getSiteSessionUser()
      : null;

    if (!profile) throw new Error('Сессия не найдена');

    if (profile.isDemo) {
      const updated = typeof window.updateSiteSessionAvatar === 'function'
        ? window.updateSiteSessionAvatar(avatarData)
        : null;
      if (updated) renderProfile(updated);
      showProfileToast(avatarData ? AVATAR_UPDATED_MESSAGE : AVATAR_REMOVED_MESSAGE, 'success');
      window.refreshSiteUserMenu?.(updated);
      return updated;
    }

    if (!profile.email) throw new Error('Email пользователя не найден');

    const response = await fetch('/api/site/register/profile/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: profile.email,
        avatarData: avatarData ?? null,
        entryType: profile.entryType || 'register'
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Не удалось сохранить аватар');

    const updated = typeof window.setSiteSessionUser === 'function'
      ? window.setSiteSessionUser(data.user, profile.entryType || 'register')
      : data.user;

    if (updated) renderProfile(updated);
    showProfileToast(
      data.message || (avatarData ? AVATAR_UPDATED_MESSAGE : AVATAR_REMOVED_MESSAGE),
      'success'
    );
    window.refreshSiteUserMenu?.(updated);
    return updated;
  }

  async function removeAvatar() {
    const profile = typeof window.getSiteSessionUser === 'function'
      ? window.getSiteSessionUser()
      : null;

    if (!profile?.avatarUrl) return;

    if (removeAvatarBtn) {
      removeAvatarBtn.disabled = true;
      removeAvatarBtn.dataset.loading = 'true';
    }

    try {
      await saveAvatar(null);
    } catch (error) {
      showProfileToast(error.message || 'Не удалось удалить фото', 'error');
    } finally {
      if (removeAvatarBtn) {
        removeAvatarBtn.disabled = false;
        delete removeAvatarBtn.dataset.loading;
      }
    }
  }

  async function saveContactInfo(location, phone) {
    const profile = typeof window.getSiteSessionUser === 'function'
      ? window.getSiteSessionUser()
      : null;
    if (!profile) throw new Error('Сессия не найдена');

    const normalizedLocation = String(location || '').trim() || null;
    const normalizedPhone = String(phone || '').trim() || null;

    if (profile.isDemo) {
      const updated = typeof window.updateSiteSessionProfile === 'function'
        ? window.updateSiteSessionProfile({ location: normalizedLocation, phone: normalizedPhone })
        : null;
      if (updated) renderProfile(updated);
      showProfileToast(CONTACT_SAVED_MESSAGE, 'success');
      return updated;
    }

    const response = await fetch('/api/site/register/profile/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: profile.email,
        location: normalizedLocation,
        phone: normalizedPhone,
        entryType: profile.entryType || 'register'
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Не удалось сохранить контакты');

    const updated = typeof window.setSiteSessionUser === 'function'
      ? window.setSiteSessionUser(data.user, profile.entryType || 'register')
      : data.user;
    if (updated) renderProfile(updated);
    showProfileToast(data.message || CONTACT_SAVED_MESSAGE, 'success');
    return updated;
  }

  async function handleAvatarSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (changeAvatarBtn) {
      changeAvatarBtn.disabled = true;
      changeAvatarBtn.dataset.loading = 'true';
    }

    try {
      const avatarData = await readImageFile(file);
      await saveAvatar(avatarData);
    } catch (error) {
      showProfileToast(error.message || 'Не удалось загрузить фото', 'error');
    } finally {
      if (changeAvatarBtn) {
        changeAvatarBtn.disabled = false;
        delete changeAvatarBtn.dataset.loading;
      }
    }
  }

  function initPageAccess() {
    if (!isPageMode) return true;

    if (typeof window.isSiteGateUnlocked === 'function' && !window.isSiteGateUnlocked()) {
      window.location.replace('/');
      return false;
    }

    window.ensureSiteClientSession?.();
    return true;
  }

  closeBtn?.addEventListener('click', closeProfileOverlay);
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeProfileOverlay();
  });

  changeAvatarBtn?.addEventListener('click', () => avatarInput?.click());
  removeAvatarBtn?.addEventListener('click', removeAvatar);
  els.avatar?.addEventListener('click', () => avatarInput?.click());
  avatarInput?.addEventListener('change', handleAvatarSelected);

  contactForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (contactSaveBtn) {
      contactSaveBtn.disabled = true;
      contactSaveBtn.dataset.loading = 'true';
    }
    try {
      await saveContactInfo(locationInput?.value || '', phoneInput?.value || '');
    } catch (error) {
      showProfileToast(error.message || 'Не удалось сохранить контакты', 'error');
    } finally {
      if (contactSaveBtn) {
        contactSaveBtn.disabled = false;
        delete contactSaveBtn.dataset.loading;
      }
    }
  });

  window.openSiteUserProfile = openProfile;
  window.closeSiteUserProfile = closeProfileOverlay;
  window.refreshSiteUserProfileUi = refreshSiteUserProfileUi;

  window.addEventListener('site-user-session-changed', refreshSiteUserProfileUi);

  if (initPageAccess()) {
    refreshSiteUserProfileUi();
  }
})();
