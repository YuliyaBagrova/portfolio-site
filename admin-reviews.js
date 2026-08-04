(function initAdminReviewsPanel() {
  const listEl = document.getElementById('adminReviewsList');
  const emptyEl = document.getElementById('adminReviewsEmpty');
  const loadingEl = document.getElementById('adminReviewsLoading');
  const refreshBtn = document.getElementById('adminReviewsRefresh');
  const showAllBtn = document.getElementById('adminReviewsShowAll');
  const replyPlaceholder = document.getElementById('adminReviewsReplyPlaceholder');
  const replyContent = document.getElementById('adminReviewsReplyContent');

  if (!listEl || !replyContent) return;

  const VISIBLE_LIMIT = 4;
  const NEW_PRIORITY_LIMIT = 3;
  const NEW_REVIEW_MAX_DAYS = 3;
  const NEW_REVIEW_MAX_MS = NEW_REVIEW_MAX_DAYS * 24 * 60 * 60 * 1000;

  let reviews = [];
  let selectedId = null;
  let isLoading = false;
  let showAllReviews = false;

  const SECTION_STYLES = {
    supplements: {
      label: 'Фитнес-индустрия',
      eyebrow: 'Sports Nutrition',
      badge: 'Добавки'
    },
    banners: {
      label: 'Мои Баннеры',
      eyebrow: 'Visual Collection',
      badge: 'Баннер'
    },
    clothing: {
      label: 'Одежда',
      eyebrow: 'Fashion Portfolio',
      badge: 'Одежда'
    }
  };

  function getSectionKey(sectionId) {
    return sectionId && SECTION_STYLES[sectionId] ? sectionId : 'supplements';
  }

  function getSectionMeta(sectionId) {
    return SECTION_STYLES[sectionId] || { label: 'Раздел', eyebrow: 'Portfolio' };
  }

  function renderSectionTitle(sectionKey, meta) {
    if (sectionKey === 'banners') {
      return `
        <span class="admin-review-section-brand-title">
          <span class="admin-review-section-brand-title-line">Мои</span>
          <span class="admin-review-section-brand-title-accent">Баннеры</span>
        </span>
      `;
    }

    return `<span class="admin-review-section-brand-title">${escapeHtml(meta.label)}</span>`;
  }

  function renderSectionBrand(sectionId, { compact = false } = {}) {
    const sectionKey = getSectionKey(sectionId);
    const meta = getSectionMeta(sectionKey);
    const modifier = compact ? ' is-compact' : '';

    return `
      <span class="admin-review-section-brand admin-review-section-brand--${escapeHtml(sectionKey)}${modifier}">
        <span class="admin-review-section-brand-eyebrow">${escapeHtml(meta.eyebrow)}</span>
        ${renderSectionTitle(sectionKey, meta)}
      </span>
    `;
  }

  function getWorkPublicUrl(review) {
    const sectionId = review.section_id || 'supplements';
    if (sectionId === 'banners') {
      return `/?work=${review.work_id}#banners`;
    }
    if (sectionId === 'clothing') {
      return `/clothing-product.html?id=${review.work_id}`;
    }
    return `/product.html?id=${review.work_id}`;
  }

  function renderReviewBadge(review) {
    if (review.rating) return renderStars(review.rating);
    return '<span class="admin-review-comment-badge">Отзыв</span>';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatShortDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function renderStars(rating) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    let html = '';
    for (let i = 1; i <= 5; i += 1) {
      html += `<span class="admin-review-star${i <= value ? ' is-filled' : ''}" aria-hidden="true">★</span>`;
    }
    return `<span class="admin-review-stars" aria-label="Оценка ${value} из 5">${html}</span>`;
  }

  function getSelectedReview() {
    return reviews.find((review) => review.id === selectedId) || null;
  }

  function isReviewNew(review) {
    if (!review || review.admin_reply) return false;
    if (!review.created_at) return false;

    const ageMs = Date.now() - new Date(review.created_at).getTime();
    return ageMs >= 0 && ageMs <= NEW_REVIEW_MAX_MS;
  }

  function renderReviewListStatus(review) {
    if (review.admin_reply) {
      return '<span class="admin-reviews-item-status is-answered">Ответ</span> · ';
    }

    if (isReviewNew(review)) {
      return '<span class="admin-reviews-item-status is-new">Новый</span> · ';
    }

    return '';
  }

  function setLoading(state) {
    isLoading = state;
    if (loadingEl) loadingEl.hidden = !state;
    if (refreshBtn) refreshBtn.disabled = state;
  }

  function pickDefaultReview() {
    if (!reviews.length) {
      selectedId = null;
      return;
    }

    const unansweredNew = reviews.find((review) => isReviewNew(review));
    const unanswered = reviews.find((review) => !review.admin_reply);
    selectedId = (unansweredNew || unanswered || reviews[0]).id;
  }

  function getVisibleReviews() {
    if (showAllReviews || reviews.length <= VISIBLE_LIMIT) {
      return reviews;
    }

    const visible = [];
    const visibleIds = new Set();

    const addReview = (review) => {
      if (!review || visibleIds.has(review.id)) return;
      visible.push(review);
      visibleIds.add(review.id);
    };

    reviews
      .filter((review) => isReviewNew(review))
      .slice(0, NEW_PRIORITY_LIMIT)
      .forEach(addReview);

    for (const review of reviews) {
      if (visible.length >= VISIBLE_LIMIT) break;
      addReview(review);
    }

    if (selectedId && !visibleIds.has(selectedId)) {
      const selected = reviews.find((review) => review.id === selectedId);
      if (selected) {
        if (visible.length >= VISIBLE_LIMIT) {
          const removed = visible.pop();
          visibleIds.delete(removed.id);
        }
        addReview(selected);
      }
    }

    return visible;
  }

  function updateShowAllButton() {
    if (!showAllBtn) return;

    const hasMore = reviews.length > VISIBLE_LIMIT;
    showAllBtn.hidden = !hasMore;

    if (!hasMore) {
      showAllReviews = false;
      return;
    }

    showAllBtn.textContent = showAllReviews ? 'Свернуть' : 'Все отзывы';
  }

  function renderReplyPanel() {
    const review = getSelectedReview();

    if (!review) {
      replyPlaceholder.hidden = false;
      replyContent.hidden = true;
      replyContent.innerHTML = '';
      return;
    }

    replyPlaceholder.hidden = true;
    replyContent.hidden = false;
    replyContent.innerHTML = `
      <div class="admin-reviews-reply-meta">
        <a href="${getWorkPublicUrl(review)}" target="_blank" rel="noopener noreferrer" class="admin-review-product">
          ${escapeHtml(review.work_title || `Работа #${review.work_id}`)}
        </a>
        <span class="admin-review-section-brand-wrap">${renderSectionBrand(review.section_id)}</span>
        <div class="admin-review-author-row">
          <strong>${escapeHtml(review.author_name)}</strong>
          ${renderReviewBadge(review)}
          <time datetime="${review.created_at}">${formatDate(review.created_at)}</time>
        </div>
      </div>

      ${review.review_text
        ? `<p class="admin-review-text">${escapeHtml(review.review_text)}</p>`
        : '<p class="admin-review-text admin-review-text--empty">Без текста</p>'}

      ${review.admin_reply ? `
        <div class="admin-review-reply-display">
          <span class="admin-review-reply-label">Текущий ответ</span>
          <p>${escapeHtml(review.admin_reply)}</p>
          ${review.admin_reply_at ? `<time datetime="${review.admin_reply_at}">${formatDate(review.admin_reply_at)}</time>` : ''}
        </div>
      ` : ''}

      <form class="admin-review-reply-form">
        <label class="admin-field">
          <span>${review.admin_reply ? 'Изменить ответ' : 'Ответ администратора'}</span>
          <textarea name="admin_reply" rows="4" maxlength="1000" placeholder="Напишите ответ покупателю…">${escapeHtml(review.admin_reply || '')}</textarea>
        </label>
        <div class="admin-review-reply-actions">
          <button type="submit" class="btn btn-primary">Сохранить ответ</button>
          ${review.admin_reply ? '<button type="button" class="btn btn-ghost admin-review-clear-reply">Удалить ответ</button>' : ''}
        </div>
        <p class="admin-review-form-status" hidden></p>
      </form>
    `;

    const form = replyContent.querySelector('.admin-review-reply-form');
    const statusEl = replyContent.querySelector('.admin-review-form-status');
    const submitBtn = form.querySelector('[type="submit"]');
    const clearBtn = form.querySelector('.admin-review-clear-reply');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await saveReply(review.id, form.elements.admin_reply.value, statusEl, submitBtn);
    });

    clearBtn?.addEventListener('click', async () => {
      form.elements.admin_reply.value = '';
      await saveReply(review.id, '', statusEl, submitBtn);
    });
  }

  function renderReviewsList() {
    listEl.innerHTML = '';

    if (!reviews.length) {
      emptyEl.hidden = false;
      renderReplyPanel();
      return;
    }

    emptyEl.hidden = true;
    updateShowAllButton();

    const visibleReviews = getVisibleReviews();

    listEl.innerHTML = visibleReviews.map((review) => {
      const preview = review.review_text
        ? escapeHtml(review.review_text.slice(0, 72) + (review.review_text.length > 72 ? '…' : ''))
        : 'Без текста';
      const isActive = review.id === selectedId;
      const sectionKey = getSectionKey(review.section_id);
      const sectionMeta = getSectionMeta(sectionKey);
      const statusPrefix = renderReviewListStatus(review);

      return `
        <li>
          <button type="button" class="admin-reviews-item${isActive ? ' is-active' : ''}" data-review-id="${review.id}">
            <span class="recent-badge ${sectionKey}">${escapeHtml(sectionMeta.badge)}</span>
            <span class="admin-reviews-item-body">
              <span class="recent-title">
                ${statusPrefix}${escapeHtml(review.author_name)} · ${escapeHtml(review.work_title || 'Работа')}
              </span>
              <span class="admin-reviews-item-preview">${preview}</span>
            </span>
            <span class="recent-date">${formatShortDate(review.created_at)}</span>
          </button>
        </li>
      `;
    }).join('');

    listEl.querySelectorAll('.admin-reviews-item').forEach((button) => {
      button.addEventListener('click', () => {
        selectedId = Number(button.dataset.reviewId);
        renderReviewsList();
        renderReplyPanel();
      });
    });

    renderReplyPanel();
  }

  async function saveReply(reviewId, replyText, statusEl, submitBtn) {
    if (!reviewId) return;

    submitBtn.disabled = true;
    statusEl.hidden = false;
    statusEl.textContent = 'Сохранение…';
    statusEl.className = 'admin-review-form-status';

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_reply: replyText })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось сохранить ответ');

      const index = reviews.findIndex((item) => item.id === reviewId);
      if (index >= 0) reviews[index] = payload;

      selectedId = reviewId;
      renderReviewsList();
    } catch (error) {
      statusEl.textContent = error.message;
      statusEl.className = 'admin-review-form-status is-error';
      submitBtn.disabled = false;
    }
  }

  async function loadReviews() {
    if (isLoading) return;

    setLoading(true);
    emptyEl.hidden = true;

    try {
      const response = await fetch('/api/admin/reviews');
      if (!response.ok) throw new Error('Не удалось загрузить отзывы');
      reviews = await response.json();
      showAllReviews = false;
      pickDefaultReview();
      renderReviewsList();
    } catch (error) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.textContent = error.message;
      selectedId = null;
      renderReplyPanel();
    } finally {
      setLoading(false);
    }
  }

  refreshBtn?.addEventListener('click', loadReviews);

  showAllBtn?.addEventListener('click', () => {
    showAllReviews = !showAllReviews;
    renderReviewsList();
  });

  window.loadAdminReviews = loadReviews;
})();
