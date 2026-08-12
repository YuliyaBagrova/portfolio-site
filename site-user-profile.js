(function initSiteUserProfile() {
  const overlay = document.getElementById('siteUserProfileOverlay');
  const closeBtn = document.getElementById('siteUserProfileClose');
  const changeAvatarBtn = document.getElementById('siteUserProfileChangeAvatar');
  const removeAvatarBtn = document.getElementById('siteUserProfileRemoveAvatar');
  const avatarInput = document.getElementById('siteUserProfileAvatarInput');
  const contactForm = document.getElementById('siteUserProfileContactForm');
  const locationInput = document.getElementById('siteUserProfileLocationInput');
  const phoneInput = document.getElementById('siteUserProfilePhoneInput');
  const contactSaveBtn = document.getElementById('siteUserProfileContactSave');
  const headerBtn = document.getElementById('siteUserHeaderBtn');
  const headerAvatar = document.getElementById('siteHeaderUserAvatar');
  const headerAvatarImg = document.getElementById('siteHeaderUserAvatarImg');
  const headerAvatarInitials = document.getElementById('siteHeaderUserAvatarInitials');

  if (!overlay) return;

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

  function openProfileOverlay() {
    if (typeof window.isSiteGateUnlocked === 'function' && !window.isSiteGateUnlocked()) {
      window.showSiteUserGateIfNeeded?.();
      return;
    }
    refreshSiteUserProfileUi();
    overlay.hidden = false;
    document.body.classList.add('site-profile-open');
    document.body.style.overflow = 'hidden';
  }

  function closeProfileOverlay() {
    overlay.hidden = true;
    document.body.classList.remove('site-profile-open');
    if (!document.body.classList.contains('site-gate-open') && !document.body.classList.contains('admin-panel-open')) {
      document.body.style.overflow = '';
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
      window.showAdminToast?.('Контактная информация сохранена', 'success');
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
    window.showAdminToast?.(data.message || 'Контактная информация сохранена', 'success');
    return updated;
  }

  closeBtn?.addEventListener('click', closeProfileOverlay);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeProfileOverlay();
  });

  contactForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (contactSaveBtn) {
      contactSaveBtn.disabled = true;
      contactSaveBtn.dataset.loading = 'true';
    }
    try {
      await saveContactInfo(locationInput?.value || '', phoneInput?.value || '');
    } catch (error) {
      window.showAdminToast?.(error.message || 'Не удалось сохранить контакты', 'error');
    } finally {
      if (contactSaveBtn) {
        contactSaveBtn.disabled = false;
        delete contactSaveBtn.dataset.loading;
      }
    }
  });

  window.openSiteUserProfile = openProfileOverlay;
  window.closeSiteUserProfile = closeProfileOverlay;
  window.refreshSiteUserProfileUi = refreshSiteUserProfileUi;

  window.addEventListener('site-user-session-changed', refreshSiteUserProfileUi);

  if (typeof window.isSiteGateUnlocked === 'function' && window.isSiteGateUnlocked()) {
    refreshSiteUserProfileUi();
  }
})();
