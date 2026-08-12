(function initAdminProfile() {
  const section = document.getElementById('adminSectionProfile');
  const profileBtn = document.getElementById('adminProfileBtn');
  const changeAvatarBtn = document.getElementById('adminProfileChangeAvatar');
  const removeAvatarBtn = document.getElementById('adminProfileRemoveAvatar');
  const avatarInput = document.getElementById('adminProfileAvatarInput');
  const contactForm = document.getElementById('adminProfileContactForm');
  const locationInput = document.getElementById('adminProfileLocationInput');
  const phoneInput = document.getElementById('adminProfilePhoneInput');
  const contactSaveBtn = document.getElementById('adminProfileContactSave');

  if (!section) return;

  const els = {
    avatar: document.getElementById('adminProfileAvatar'),
    avatarImg: document.getElementById('adminProfileAvatarImg'),
    avatarInitials: document.getElementById('adminProfileAvatarInitials'),
    headerAvatar: document.getElementById('adminProfileBtnAvatar'),
    headerAvatarImg: document.getElementById('adminProfileBtnAvatarImg'),
    headerAvatarInitials: document.getElementById('adminProfileBtnAvatarInitials'),
    name: document.getElementById('adminProfileName'),
    email: document.getElementById('adminProfileEmail'),
    badge: document.getElementById('adminProfileBadge'),
    role: document.getElementById('adminProfileRole'),
    entry: document.getElementById('adminProfileEntry'),
    registered: document.getElementById('adminProfileRegistered'),
    lastLogin: document.getElementById('adminProfileLastLogin'),
    bio: document.getElementById('adminProfileBio'),
    status: document.getElementById('adminProfileStatus'),
    emailVerified: document.getElementById('adminProfileEmailVerified'),
    userId: document.getElementById('adminProfileUserId'),
    sessions: document.getElementById('adminProfileSessions')
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
    const initials = profile.avatarInitials || 'U';
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

    if (els.headerAvatarImg) {
      if (hasImage) {
        els.headerAvatarImg.src = avatarUrl;
        els.headerAvatarImg.hidden = false;
      } else {
        els.headerAvatarImg.removeAttribute('src');
        els.headerAvatarImg.hidden = true;
      }
    }
    if (els.headerAvatarInitials) {
      els.headerAvatarInitials.textContent = initials;
      els.headerAvatarInitials.hidden = hasImage;
      els.headerAvatarInitials.setAttribute('aria-hidden', hasImage ? 'true' : 'false');
    }
    if (els.headerAvatar) {
      els.headerAvatar.dataset.hasImage = hasImage ? 'true' : 'false';
    }

    if (removeAvatarBtn) {
      removeAvatarBtn.hidden = !hasImage;
    }
  }

  function renderContactFields(profile) {
    if (locationInput) {
      locationInput.value = profile.location || '';
    }
    if (phoneInput) {
      phoneInput.value = profile.phone || '';
    }
  }

  function renderProfile(profile) {
    if (!profile) return;

    renderAvatar(profile);
    renderContactFields(profile);

    if (els.name) els.name.textContent = profile.name || 'Пользователь';
    if (els.email) els.email.textContent = profile.email || '—';
    if (els.badge) {
      els.badge.textContent = profile.isDemo ? 'Demo' : 'Аккаунт';
      els.badge.dataset.variant = profile.isDemo ? 'demo' : 'verified';
    }
    if (els.role) els.role.textContent = profile.role || '—';
    if (els.entry) els.entry.textContent = profile.entryLabel || '—';
    if (els.registered) {
      els.registered.textContent = profile.isDemo
        ? 'Не зарегистрирован'
        : formatDate(profile.registeredAt);
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
      const count = profile.sessionsCount || 1;
      els.sessions.textContent = String(count);
      els.sessions.title = 'Сколько раз вы входили в панель с этого браузера';
    }

    if (profileBtn) {
      profileBtn.title = profile.isDemo
        ? `${profile.name || 'Demo'} — профиль`
        : `${profile.name} — профиль`;
      profileBtn.setAttribute('aria-label', profileBtn.title);
    }
  }

  async function refreshAdminProfileUi() {
    let profile = typeof window.getAdminSessionUser === 'function'
      ? window.getAdminSessionUser()
      : null;

    if (profile && !profile.isDemo && profile.email) {
      try {
        const params = new URLSearchParams({
          email: profile.email,
          entryType: profile.entryType || 'login'
        });
        const response = await fetch(`/api/admin/register/profile?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            const mergedUser = {
              ...data.user,
              avatarUrl: Object.prototype.hasOwnProperty.call(data.user, 'avatarUrl')
                ? (data.user.avatarUrl || null)
                : (profile.avatarUrl || null),
              location: Object.prototype.hasOwnProperty.call(data.user, 'location')
                ? (data.user.location || null)
                : (profile.location ?? null),
              phone: Object.prototype.hasOwnProperty.call(data.user, 'phone')
                ? (data.user.phone || null)
                : (profile.phone ?? null),
              sessionsCount: typeof window.getBrowserSessionsCount === 'function'
                ? window.getBrowserSessionsCount(profile)
                : (profile.sessionsCount || 1)
            };
            profile = typeof window.setAdminSessionUser === 'function'
              ? window.setAdminSessionUser(mergedUser, profile.entryType || 'login')
              : mergedUser;
          }
        }
      } catch {
        // keep cached profile
      }
    }

    if (profile) renderProfile(profile);
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
    const profile = typeof window.getAdminSessionUser === 'function'
      ? window.getAdminSessionUser()
      : null;

    if (!profile) {
      throw new Error('Сессия не найдена');
    }

    if (profile.isDemo) {
      const updated = typeof window.updateAdminSessionAvatar === 'function'
        ? window.updateAdminSessionAvatar(avatarData)
        : null;
      if (updated) renderProfile(updated);
      if (typeof window.showAdminToast === 'function') {
        window.showAdminToast(avatarData ? 'Фото профиля обновлено' : 'Фото профиля удалено', 'success');
      }
      return updated;
    }

    if (!profile.email) {
      throw new Error('Email пользователя не найден');
    }

    const response = await fetch('/api/admin/register/profile/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: profile.email,
        avatarData: avatarData ?? null,
        entryType: profile.entryType || 'login'
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Не удалось сохранить аватар');
    }

    const updated = typeof window.setAdminSessionUser === 'function'
      ? window.setAdminSessionUser(data.user, profile.entryType || 'login')
      : data.user;

    if (updated) renderProfile(updated);
    if (typeof window.showAdminToast === 'function') {
      window.showAdminToast(
        data.message || (avatarData ? 'Фото профиля обновлено' : 'Фото профиля удалено'),
        'success'
      );
    }
    return updated;
  }

  async function removeAvatar() {
    const profile = typeof window.getAdminSessionUser === 'function'
      ? window.getAdminSessionUser()
      : null;

    if (!profile?.avatarUrl) return;

    if (removeAvatarBtn) {
      removeAvatarBtn.disabled = true;
      removeAvatarBtn.dataset.loading = 'true';
    }

    try {
      await saveAvatar(null);
    } catch (error) {
      if (typeof window.showAdminToast === 'function') {
        window.showAdminToast(error.message || 'Не удалось удалить фото', 'error');
      }
    } finally {
      if (removeAvatarBtn) {
        removeAvatarBtn.disabled = false;
        delete removeAvatarBtn.dataset.loading;
      }
    }
  }

  const CONTACT_SAVED_MESSAGE = 'Контактная информация изменена и сохранена в системе';

  async function saveContactInfo(location, phone) {
    const profile = typeof window.getAdminSessionUser === 'function'
      ? window.getAdminSessionUser()
      : null;

    if (!profile) {
      throw new Error('Сессия не найдена');
    }

    const normalizedLocation = String(location || '').trim() || null;
    const normalizedPhone = String(phone || '').trim() || null;

    if (profile.isDemo) {
      const updated = typeof window.updateAdminSessionProfile === 'function'
        ? window.updateAdminSessionProfile({
          location: normalizedLocation,
          phone: normalizedPhone
        })
        : null;
      if (updated) renderProfile(updated);
      showContactSavedToast();
      return updated;
    }

    if (!profile.email) {
      throw new Error('Email пользователя не найден');
    }

    const response = await fetch('/api/admin/register/profile/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: profile.email,
        location: normalizedLocation,
        phone: normalizedPhone,
        entryType: profile.entryType || 'login'
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Не удалось сохранить контакты');
    }

    const updated = typeof window.setAdminSessionUser === 'function'
      ? window.setAdminSessionUser(data.user, profile.entryType || 'login')
      : data.user;

    if (updated) renderProfile(updated);
    showContactSavedToast(data.message);
    return updated;
  }

  function showContactSavedToast(serverMessage) {
    if (typeof window.showAdminToast !== 'function') return;
    window.showAdminToast(serverMessage || CONTACT_SAVED_MESSAGE, 'success');
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
      window.showAdminToast?.(error.message || 'Не удалось загрузить фото', 'error');
    } finally {
      if (changeAvatarBtn) {
        changeAvatarBtn.disabled = false;
        delete changeAvatarBtn.dataset.loading;
      }
    }
  }

  async function handleContactSubmit(event) {
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
  }

  profileBtn?.addEventListener('click', () => {
    refreshAdminProfileUi();
    if (typeof window.showAdminSection === 'function') {
      window.showAdminSection('profile');
    }
  });

  changeAvatarBtn?.addEventListener('click', () => {
    avatarInput?.click();
  });

  removeAvatarBtn?.addEventListener('click', removeAvatar);

  els.avatar?.addEventListener('click', () => {
    avatarInput?.click();
  });

  avatarInput?.addEventListener('change', handleAvatarSelected);
  contactForm?.addEventListener('submit', handleContactSubmit);

  window.refreshAdminProfileUi = refreshAdminProfileUi;
})();
