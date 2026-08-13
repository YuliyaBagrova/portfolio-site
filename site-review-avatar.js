(function initSiteReviewAvatar() {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function getInitialsFromName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  function getReviewAvatarInitials(review) {
    if (review?.author_avatar_initials) {
      return String(review.author_avatar_initials).trim().slice(0, 8);
    }
    return getInitialsFromName(review?.author_name);
  }

  function getSiteReviewAvatarPayload(authorName) {
    const name = String(authorName || '').trim();
    const profile = typeof window.getSiteSessionUser === 'function'
      ? window.getSiteSessionUser()
      : null;

    if (profile && !profile.isDemo) {
      if (profile.avatarUrl) {
        return {
          author_avatar_url: profile.avatarUrl,
          author_avatar_initials: profile.avatarInitials || getInitialsFromName(profile.name || name)
        };
      }

      if (profile.avatarInitials) {
        return {
          author_avatar_url: null,
          author_avatar_initials: profile.avatarInitials
        };
      }
    }

    return {
      author_avatar_url: null,
      author_avatar_initials: getInitialsFromName(name)
    };
  }

  function appendSiteReviewFields(payload) {
    const authorName = payload?.author_name;
    const avatarFields = getSiteReviewAvatarPayload(authorName);
    return {
      ...payload,
      ...avatarFields
    };
  }

  function renderSiteReviewAvatarHtml(review, className = 'site-review-avatar') {
    const avatarUrl = review?.author_avatar_url || null;
    const initials = getReviewAvatarInitials(review);

    if (avatarUrl) {
      return `<span class="${escapeAttr(className)} site-review-avatar--image" aria-hidden="true"><img src="${escapeAttr(avatarUrl)}" alt="" loading="lazy" decoding="async"></span>`;
    }

    return `<span class="${escapeAttr(className)}" aria-hidden="true">${escapeHtml(initials)}</span>`;
  }

  function applySiteReviewAvatarToElement(el, { avatarUrl, initials, name } = {}) {
    if (!el) return;

    el.classList.remove('site-review-avatar--image');
    const existingImg = el.querySelector('img');
    if (existingImg) existingImg.remove();

    const resolvedInitials = initials || getInitialsFromName(name);

    if (avatarUrl) {
      el.classList.add('site-review-avatar--image');
      el.textContent = '';
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      el.appendChild(img);
      return;
    }

    el.textContent = resolvedInitials;
  }

  function applySiteReviewAuthorToForm(form) {
    if (!form) return;

    const nameInput = form.querySelector('[name="author_name"]');
    const profile = typeof window.getSiteSessionUser === 'function'
      ? window.getSiteSessionUser()
      : null;

    if (nameInput && profile && !profile.isDemo && profile.name && !String(nameInput.value || '').trim()) {
      nameInput.value = profile.name;
    }

    const avatarEl = form.querySelector('[data-review-avatar]');
    if (avatarEl) {
      const payload = getSiteReviewAvatarPayload(nameInput?.value || profile?.name || '');
      applySiteReviewAvatarToElement(avatarEl, {
        avatarUrl: payload.author_avatar_url,
        initials: payload.author_avatar_initials,
        name: nameInput?.value || profile?.name || ''
      });
    }
  }

  function bindSiteReviewAuthorForm(form) {
    if (!form || form.dataset.reviewAvatarBound === '1') return;
    form.dataset.reviewAvatarBound = '1';

    applySiteReviewAuthorToForm(form);

    const nameInput = form.querySelector('[name="author_name"]');
    if (nameInput) {
      nameInput.addEventListener('input', () => applySiteReviewAuthorToForm(form));
    }

    window.addEventListener('site-user-session-changed', () => applySiteReviewAuthorToForm(form));
  }

  function applySiteReviewAuthorToForms(root = document) {
    root.querySelectorAll('[data-review-form]').forEach((form) => {
      bindSiteReviewAuthorForm(form);
    });
  }

  window.getSiteReviewAvatarPayload = getSiteReviewAvatarPayload;
  window.appendSiteReviewFields = appendSiteReviewFields;
  window.renderSiteReviewAvatarHtml = renderSiteReviewAvatarHtml;
  window.applySiteReviewAvatarToElement = applySiteReviewAvatarToElement;
  window.applySiteReviewAuthorToForm = applySiteReviewAuthorToForm;
  window.applySiteReviewAuthorToForms = applySiteReviewAuthorToForms;
})();
