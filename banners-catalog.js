const BANNER_CATEGORIES = {
  preview: 'Превью',
  illustrations: 'Иллюстрации',
  logos: 'Логотипы',
  pictures: 'Картинки'
};

const VISITOR_KEY_STORAGE = 'bannersVisitorKey';
const COMMENT_NAME_STORAGE = 'bannersCommentAuthorName';

const EYE_ICON = `
  <span class="banners-card-hover" aria-hidden="true">
    <span class="banners-card-eye">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </span>
  </span>
`;

const LIKE_ICON = `
  <span class="banners-like-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path>
    </svg>
  </span>
`;

const bannersViewer = document.getElementById('bannersViewer');
const bannersViewerClose = document.getElementById('bannersViewerClose');
const bannersViewerImage = document.getElementById('bannersViewerImage');
const bannersViewerTitle = document.getElementById('bannersViewerTitle');
const bannersViewerDate = document.getElementById('bannersViewerDate');
const bannersViewerTags = document.getElementById('bannersViewerTags');
const bannersViewerDescBlock = document.getElementById('bannersViewerDescBlock');
const bannersViewerDesc = document.getElementById('bannersViewerDesc');
const bannersViewerLikeBtn = document.getElementById('bannersViewerLikeBtn');
const bannersViewerLikeCount = document.getElementById('bannersViewerLikeCount');
const bannersViewerCommentsCount = document.getElementById('bannersViewerCommentsCount');
const bannersViewerCommentsList = document.getElementById('bannersViewerCommentsList');
const bannersViewerCommentsEmpty = document.getElementById('bannersViewerCommentsEmpty');
const bannersViewerCommentForm = document.getElementById('bannersViewerCommentForm');
const bannersViewerCommentAvatar = document.getElementById('bannersViewerCommentAvatar');
const bannersViewerCommentName = document.getElementById('bannersViewerCommentName');
const bannersViewerCommentText = document.getElementById('bannersViewerCommentText');
const bannersViewerCommentSend = document.getElementById('bannersViewerCommentSend');
const bannersViewerCommentStatus = document.getElementById('bannersViewerCommentStatus');

let catalogItems = [];
let activeViewerWorkId = null;
let viewerComments = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getVisitorKey() {
  let key = localStorage.getItem(VISITOR_KEY_STORAGE);
  if (!key) {
    key = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY_STORAGE, key);
  }
  return key;
}

function formatPublishedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getLayoutClass(width, height) {
  if (!width || !height) return '';
  const ratio = width / height;
  if (ratio >= 2.2) return 'wide';
  return '';
}

function getCommentAuthorName() {
  const profile = typeof window.getSiteSessionUser === 'function' ? window.getSiteSessionUser() : null;
  if (profile && !profile.isDemo && profile.name) {
    return profile.name;
  }
  return localStorage.getItem(COMMENT_NAME_STORAGE) || '';
}

function isRegisteredSiteCommentAuthor() {
  const profile = typeof window.getSiteSessionUser === 'function' ? window.getSiteSessionUser() : null;
  if (!profile || profile.isDemo) return false;
  return typeof window.isRealSiteUser === 'function' ? window.isRealSiteUser(profile) : Boolean(profile.email);
}

function getRegisteredCommentAuthorName(profile) {
  if (!profile) return '';
  const name = String(profile.name || '').trim();
  if (name) return name;
  const email = String(profile.email || '').trim();
  if (email.includes('@')) return email.split('@')[0];
  return 'Клиент';
}

function applyCommentAuthorFieldState() {
  if (!bannersViewerCommentName) return;

  const profile = typeof window.getSiteSessionUser === 'function' ? window.getSiteSessionUser() : null;
  const isRegistered = isRegisteredSiteCommentAuthor();

  if (isRegistered) {
    bannersViewerCommentName.value = getRegisteredCommentAuthorName(profile);
    bannersViewerCommentName.readOnly = true;
    bannersViewerCommentName.classList.add('is-locked');
    bannersViewerCommentName.setAttribute('aria-readonly', 'true');
    bannersViewerCommentName.title = 'Имя берётся из профиля зарегистрированного клиента';
    return;
  }

  bannersViewerCommentName.readOnly = false;
  bannersViewerCommentName.classList.remove('is-locked');
  bannersViewerCommentName.removeAttribute('aria-readonly');
  bannersViewerCommentName.removeAttribute('title');
  if (!bannersViewerCommentName.value.trim()) {
    bannersViewerCommentName.value = getCommentAuthorName();
  }
}

function saveCommentAuthorName(name) {
  const trimmed = String(name || '').trim();
  if (trimmed) localStorage.setItem(COMMENT_NAME_STORAGE, trimmed);
}

function getAvatarInitial(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function formatCommentTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ч`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'вчера';
  if (diffDays < 7) return `${diffDays} дн`;

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function setCommentStatus(message, isError = false) {
  if (!bannersViewerCommentStatus) return;
  if (!message) {
    bannersViewerCommentStatus.hidden = true;
    bannersViewerCommentStatus.textContent = '';
    bannersViewerCommentStatus.classList.remove('is-error');
    return;
  }
  bannersViewerCommentStatus.hidden = false;
  bannersViewerCommentStatus.textContent = message;
  bannersViewerCommentStatus.classList.toggle('is-error', isError);
}

function resizeCommentTextarea() {
  if (!bannersViewerCommentText) return;
  bannersViewerCommentText.style.height = 'auto';
  bannersViewerCommentText.style.height = `${Math.min(bannersViewerCommentText.scrollHeight, 120)}px`;
}

function updateCommentComposeState() {
  const name = bannersViewerCommentName?.value.trim() || '';
  const text = bannersViewerCommentText?.value.trim() || '';
  if (bannersViewerCommentAvatar) {
    const payload = window.getSiteReviewAvatarPayload?.(name) || {};
    window.applySiteReviewAvatarToElement?.(bannersViewerCommentAvatar, {
      avatarUrl: payload.author_avatar_url,
      initials: payload.author_avatar_initials,
      name
    });
  }
  if (bannersViewerCommentSend) {
    bannersViewerCommentSend.disabled = !(name && text);
  }
}

function resetCommentCompose() {
  if (bannersViewerCommentText) {
    bannersViewerCommentText.value = '';
    bannersViewerCommentText.style.height = 'auto';
  }
  applyCommentAuthorFieldState();
  setCommentStatus('');
  updateCommentComposeState();
}

function renderViewerComments(comments) {
  viewerComments = comments;

  if (bannersViewerCommentsCount) {
    bannersViewerCommentsCount.textContent = String(comments.length);
  }

  if (bannersViewerCommentsEmpty) {
    bannersViewerCommentsEmpty.hidden = comments.length > 0;
  }

  if (!bannersViewerCommentsList) return;

  if (!comments.length) {
    bannersViewerCommentsList.querySelectorAll('.banners-viewer-comment-item').forEach((item) => item.remove());
    if (bannersViewerCommentsEmpty && !bannersViewerCommentsList.contains(bannersViewerCommentsEmpty)) {
      bannersViewerCommentsList.appendChild(bannersViewerCommentsEmpty);
    }
    return;
  }

  if (bannersViewerCommentsEmpty) {
    bannersViewerCommentsEmpty.hidden = true;
  }

  bannersViewerCommentsList.querySelectorAll('.banners-viewer-comment-item').forEach((item) => item.remove());
  bannersViewerCommentsList.insertAdjacentHTML('beforeend', comments.map((comment) => {
    const avatarHtml = window.renderSiteReviewAvatarHtml?.(comment, 'banners-viewer-comment-avatar site-review-avatar')
      || `<span class="banners-viewer-comment-avatar" aria-hidden="true">${escapeHtml(getAvatarInitial(comment.author_name))}</span>`;
    const timeLabel = formatCommentTime(comment.created_at);
    const replyBlock = comment.admin_reply
      ? `
        <div class="banners-viewer-comment-reply">
          <span class="banners-viewer-comment-reply-label">Ответ автора</span>
          <p>${escapeHtml(comment.admin_reply)}</p>
        </div>
      `
      : '';

    return `
      <article class="banners-viewer-comment-item">
        ${avatarHtml}
        <div class="banners-viewer-comment-bubble">
          <div class="banners-viewer-comment-meta">
            <strong class="banners-viewer-comment-author">${escapeHtml(comment.author_name)}</strong>
            <time class="banners-viewer-comment-time" datetime="${escapeHtml(comment.created_at || '')}">${escapeHtml(timeLabel)}</time>
          </div>
          <p class="banners-viewer-comment-text-display">${escapeHtml(comment.review_text || '')}</p>
          ${replyBlock}
        </div>
      </article>
    `;
  }).join(''));
}

async function loadViewerComments(workId) {
  if (!workId) {
    renderViewerComments([]);
    return;
  }

  try {
    const response = await fetch(`/api/works/${workId}/reviews`);
    if (!response.ok) throw new Error('Не удалось загрузить отзывы');
    const comments = await response.json();
    renderViewerComments(Array.isArray(comments) ? comments : []);
  } catch (error) {
    console.error('Banner reviews load failed:', error);
    renderViewerComments([]);
    setCommentStatus('Не удалось загрузить отзывы', true);
  }
}

async function submitViewerComment(workId) {
  const profile = typeof window.getSiteSessionUser === 'function' ? window.getSiteSessionUser() : null;
  const authorName = isRegisteredSiteCommentAuthor()
    ? getRegisteredCommentAuthorName(profile)
    : (bannersViewerCommentName?.value.trim() || '');
  const reviewText = bannersViewerCommentText?.value.trim() || '';

  if (!authorName || !reviewText) {
    updateCommentComposeState();
    return;
  }

  if (bannersViewerCommentSend) bannersViewerCommentSend.disabled = true;
  setCommentStatus('Отправка…');

  try {
    const response = await fetch(`/api/works/${workId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(window.appendSiteReviewFields?.({
        author_name: authorName,
        review_text: reviewText
      }) || {
        author_name: authorName,
        review_text: reviewText
      })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Не удалось отправить отзыв');

    if (!isRegisteredSiteCommentAuthor()) {
      saveCommentAuthorName(authorName);
    }
    viewerComments = [payload, ...viewerComments];
    renderViewerComments(viewerComments);

    if (bannersViewerCommentsList) {
      bannersViewerCommentsList.scrollTop = 0;
    }

    if (bannersViewerCommentText) {
      bannersViewerCommentText.value = '';
      bannersViewerCommentText.style.height = 'auto';
      bannersViewerCommentText.focus();
    }
    setCommentStatus('Отзыв опубликован');
    updateCommentComposeState();

    window.setTimeout(() => {
      if (activeViewerWorkId === workId) setCommentStatus('');
    }, 2200);
  } catch (error) {
    setCommentStatus(error.message, true);
    updateCommentComposeState();
  } finally {
    if (bannersViewerCommentSend) bannersViewerCommentSend.disabled = false;
    updateCommentComposeState();
  }
}

function initBannerComments() {
  if (bannersViewerCommentName) {
    applyCommentAuthorFieldState();
    bannersViewerCommentName.addEventListener('input', updateCommentComposeState);
  }

  if (bannersViewerCommentText) {
    bannersViewerCommentText.addEventListener('input', () => {
      resizeCommentTextarea();
      updateCommentComposeState();
    });
  }

  if (bannersViewerCommentForm) {
    bannersViewerCommentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!activeViewerWorkId) return;
      await submitViewerComment(activeViewerWorkId);
    });
  }

  updateCommentComposeState();
  window.addEventListener('site-user-session-changed', () => {
    applyCommentAuthorFieldState();
    updateCommentComposeState();
  });
}

function renderLikeButton(workId, likeCount, liked, extraClass = '') {
  return `
    <button type="button" class="banners-like-btn${liked ? ' is-liked' : ''}${extraClass ? ` ${extraClass}` : ''}" data-like-id="${workId}" aria-pressed="${liked ? 'true' : 'false'}" aria-label="${liked ? 'Убрать лайк' : 'Поставить лайк'}">
      ${LIKE_ICON}
      <span class="banners-like-count">${likeCount}</span>
    </button>
  `;
}

function updateLikeButtonState(button, liked, likeCount) {
  if (!button) return;
  button.classList.toggle('is-liked', liked);
  button.setAttribute('aria-pressed', liked ? 'true' : 'false');
  button.setAttribute('aria-label', liked ? 'Убрать лайк' : 'Поставить лайк');
  const count = button.querySelector('.banners-like-count');
  if (count) count.textContent = String(likeCount);
}

function syncLikeState(workId, liked, likeCount) {
  catalogItems = catalogItems.map((item) => (
    item.id === workId ? { ...item, liked, like_count: likeCount } : item
  ));

  document.querySelectorAll(`.banners-like-btn[data-like-id="${workId}"]`).forEach((button) => {
    updateLikeButtonState(button, liked, likeCount);
  });

  const card = document.querySelector(`.banners-card[data-work-id="${workId}"]`);
  if (card) {
    card.dataset.workLikes = String(likeCount);
    card.dataset.workLiked = liked ? '1' : '0';
  }

  if (activeViewerWorkId === workId) {
    updateLikeButtonState(bannersViewerLikeBtn, liked, likeCount);
  }
}

async function toggleWorkLike(workId) {
  const response = await fetch(`/api/banner-works/${workId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitor_key: getVisitorKey() })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Не удалось поставить лайк');

  syncLikeState(workId, payload.liked, payload.like_count);
  return payload;
}

function renderBannerCard(item) {
  const width = Number(item.image_width) || null;
  const height = Number(item.image_height) || null;
  const layoutClass = getLayoutClass(width, height);
  const categoryLabel = BANNER_CATEGORIES[item.category] || item.category || '';
  const sizeLabel = width && height ? `${width}×${height}` : '';
  const aspectStyle = width && height ? `--work-aspect: ${width} / ${height};` : '';
  const imageUrl = item.image ? item.image.split('?')[0] : '';
  const publishedAt = formatPublishedAt(item.created_at);
  const description = item.description ? String(item.description).trim() : '';
  const likeCount = Number(item.like_count) || 0;
  const liked = Boolean(item.liked);

  const imageMarkup = item.image
    ? `<img class="banners-work-image" src="${escapeHtml(`${imageUrl}?t=${Date.now()}`)}" alt="${escapeHtml(item.title)}" width="${width || ''}" height="${height || ''}" loading="lazy" decoding="async">`
    : `<span class="portfolio-placeholder">${escapeHtml(item.title)}</span>`;

  const cardAttrs = item.image
    ? ` data-work-id="${item.id}" data-work-image="${escapeHtml(imageUrl)}" data-work-title="${escapeHtml(item.title)}" data-work-date="${escapeHtml(item.created_at || '')}" data-work-category="${escapeHtml(categoryLabel)}" data-work-size="${escapeHtml(sizeLabel)}" data-work-desc="${escapeHtml(description)}" data-work-likes="${likeCount}" data-work-liked="${liked ? '1' : '0'}" tabindex="0" role="button" aria-label="Открыть работу «${escapeHtml(item.title)}»"`
    : ` data-work-id="${item.id}"`;

  return `
    <article class="portfolio-card banners-card${layoutClass ? ` ${layoutClass}` : ''}${item.image ? ' is-viewable' : ''}" data-category="${escapeHtml(item.category || '')}"${cardAttrs}>
      <div class="portfolio-image banners-work-media${item.image ? ' has-image is-zoomable' : ''}" style="${aspectStyle}">
        ${imageMarkup}
        ${item.image ? EYE_ICON : ''}
      </div>
      <div class="portfolio-body">
        <h3>${escapeHtml(item.title)}</h3>
        ${publishedAt ? `<time class="banners-card-date" datetime="${escapeHtml(item.created_at || '')}">${escapeHtml(publishedAt)}</time>` : ''}
        ${description ? `<p class="banners-card-desc">${escapeHtml(description)}</p>` : ''}
        <div class="portfolio-tags">
          ${sizeLabel ? `<span class="tag">${escapeHtml(sizeLabel)}</span>` : ''}
          ${categoryLabel ? `<span class="tag">${escapeHtml(categoryLabel)}</span>` : ''}
        </div>
        <div class="banners-card-like-wrap">
          ${renderLikeButton(item.id, likeCount, liked, 'banners-like-btn--card')}
        </div>
      </div>
    </article>
  `;
}

function getPendingBannerWorkId() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('work'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function clearPendingBannerWorkParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('work')) return;
  url.searchParams.delete('work');
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function openBannersViewerById(workId) {
  const card = document.querySelector(`.banners-card[data-work-id="${workId}"]`);
  if (card?.dataset.workImage) {
    openBannersViewer(card);
    return true;
  }

  const item = catalogItems.find((entry) => entry.id === workId);
  if (!item?.image) return false;

  const proxy = document.createElement('article');
  const imageUrl = item.image.split('?')[0];
  const categoryLabel = BANNER_CATEGORIES[item.category] || item.category || '';
  const width = Number(item.image_width) || null;
  const height = Number(item.image_height) || null;
  const sizeLabel = width && height ? `${width}×${height}` : '';

  proxy.dataset.workId = String(item.id);
  proxy.dataset.workImage = imageUrl;
  proxy.dataset.workTitle = item.title || '';
  proxy.dataset.workDate = item.created_at || '';
  proxy.dataset.workCategory = categoryLabel;
  proxy.dataset.workSize = sizeLabel;
  proxy.dataset.workDesc = (item.description || '').trim();
  proxy.dataset.workLikes = String(Number(item.like_count) || 0);
  proxy.dataset.workLiked = item.liked ? '1' : '0';

  openBannersViewer(proxy);
  return true;
}

function tryOpenPendingBannerWork() {
  const workId = getPendingBannerWorkId();
  if (!workId) return;
  if (openBannersViewerById(workId)) {
    clearPendingBannerWorkParam();
  }
}

function openBannersViewer(card) {
  if (!bannersViewer || !card?.dataset.workImage) return;

  const workId = Number(card.dataset.workId);
  activeViewerWorkId = workId;
  const title = card.dataset.workTitle || '';
  const imageSrc = card.dataset.workImage;
  const dateLabel = formatPublishedAt(card.dataset.workDate);
  const category = card.dataset.workCategory || '';
  const size = card.dataset.workSize || '';
  const description = card.dataset.workDesc || '';
  const likeCount = Number(card.dataset.workLikes) || 0;
  const liked = card.dataset.workLiked === '1';

  bannersViewerImage.src = `${imageSrc}?t=${Date.now()}`;
  bannersViewerImage.alt = title;
  bannersViewerTitle.textContent = title;

  if (dateLabel) {
    bannersViewerDate.textContent = dateLabel;
    bannersViewerDate.dateTime = card.dataset.workDate || '';
    bannersViewerDate.hidden = false;
  } else {
    bannersViewerDate.hidden = true;
  }

  bannersViewerTags.innerHTML = [
    size ? `<span class="banners-viewer-tag">${escapeHtml(size)}</span>` : '',
    category ? `<span class="banners-viewer-tag">${escapeHtml(category)}</span>` : ''
  ].filter(Boolean).join('');

  if (description) {
    bannersViewerDesc.textContent = description;
    bannersViewerDescBlock.hidden = false;
  } else {
    bannersViewerDesc.textContent = '';
    bannersViewerDescBlock.hidden = true;
  }

  if (bannersViewerLikeBtn) {
    bannersViewerLikeBtn.dataset.likeId = String(workId);
    updateLikeButtonState(bannersViewerLikeBtn, liked, likeCount);
  }

  resetCommentCompose();
  loadViewerComments(workId);

  bannersViewer.hidden = false;
  requestAnimationFrame(() => bannersViewer.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
  bannersViewerClose?.focus();
}

function closeBannersViewer() {
  if (!bannersViewer || bannersViewer.hidden) return;
  bannersViewer.classList.remove('is-open');
  bannersViewer.hidden = true;
  bannersViewerImage.removeAttribute('src');
  activeViewerWorkId = null;
  renderViewerComments([]);
  resetCommentCompose();
  const imageLightbox = document.getElementById('imageLightbox');
  const navOpen = document.getElementById('topNav')?.classList.contains('open');
  if (!navOpen && (!imageLightbox || imageLightbox.hidden)) {
    document.body.style.overflow = '';
  }
}

function bindLikeButtons(root) {
  if (!root) return;

  root.querySelectorAll('.banners-like-btn[data-like-id]').forEach((button) => {
    if (button.dataset.likeBound === '1') return;
    button.dataset.likeBound = '1';

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const workId = Number(button.dataset.likeId);
      if (!workId || button.disabled) return;

      button.disabled = true;
      try {
        await toggleWorkLike(workId);
      } catch (error) {
        console.error('Like toggle failed:', error);
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function handleViewerLikeClick(event) {
  event.preventDefault();
  event.stopPropagation();

  const workId = Number(bannersViewerLikeBtn?.dataset.likeId || activeViewerWorkId);
  if (!workId || !bannersViewerLikeBtn || bannersViewerLikeBtn.disabled) return;

  bannersViewerLikeBtn.disabled = true;
  try {
    await toggleWorkLike(workId);
  } catch (error) {
    console.error('Like toggle failed:', error);
  } finally {
    bannersViewerLikeBtn.disabled = false;
  }
}

function bindBannerViewer(grid) {
  if (!grid) return;

  grid.querySelectorAll('.banners-card.is-viewable').forEach((card) => {
    const open = (event) => {
      if (event.target.closest('.banners-like-btn')) return;
      if (event.target.closest('a')) return;
      event.preventDefault();
      openBannersViewer(card);
    };

    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.target.closest('.banners-like-btn')) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openBannersViewer(card);
      }
    });
  });

  bindLikeButtons(grid);
}

if (bannersViewer) {
  initBannerComments();
  bannersViewerClose?.addEventListener('click', closeBannersViewer);
  bannersViewer.querySelectorAll('[data-banners-viewer-close]').forEach((el) => {
    el.addEventListener('click', closeBannersViewer);
  });
  bannersViewer.addEventListener('click', (event) => {
    if (event.target === bannersViewer || event.target.classList.contains('banners-viewer-backdrop')) {
      closeBannersViewer();
    }
  });
  bannersViewerLikeBtn?.addEventListener('click', handleViewerLikeClick);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && bannersViewer && !bannersViewer.hidden) {
      closeBannersViewer();
    }
  });
}

async function loadBannersCatalog() {
  const grid = document.getElementById('bannersGrid');
  const emptyState = document.getElementById('bannersEmpty');
  if (!grid) return [];

  try {
    const visitorKey = encodeURIComponent(getVisitorKey());
    const response = await fetch(`/api/works?section=banners&visitor_key=${visitorKey}`);
    if (!response.ok) throw new Error('Не удалось загрузить коллекцию');

    catalogItems = await response.json();
    grid.querySelectorAll('.banners-card').forEach((card) => card.remove());

    if (!catalogItems.length) {
      if (emptyState) emptyState.hidden = false;
      window.dispatchEvent(new CustomEvent('banners-catalog-updated', { detail: { items: [] } }));
      return [];
    }

    if (emptyState) emptyState.hidden = true;
    grid.insertAdjacentHTML('beforeend', catalogItems.map(renderBannerCard).join(''));
    bindBannerViewer(grid);
    tryOpenPendingBannerWork();
    window.dispatchEvent(new CustomEvent('banners-catalog-updated', { detail: { items: catalogItems } }));
    return catalogItems;
  } catch (error) {
    console.error('Banners catalog load failed:', error);
    if (emptyState) {
      emptyState.hidden = false;
      emptyState.textContent = 'Не удалось загрузить коллекцию. Проверьте, что сервер запущен.';
    }
    window.dispatchEvent(new CustomEvent('banners-catalog-updated', { detail: { items: [] } }));
    return [];
  }
}

document.addEventListener('DOMContentLoaded', loadBannersCatalog);
window.addEventListener('banners-catalog-changed', loadBannersCatalog);

window.BannersCatalog = {
  CATEGORIES: BANNER_CATEGORIES,
  load: loadBannersCatalog,
  openViewer: openBannersViewer,
  openViewerById: openBannersViewerById,
  closeViewer: closeBannersViewer,
  toggleLike: toggleWorkLike
};
