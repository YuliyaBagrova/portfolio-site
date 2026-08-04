(function initSectionIcons() {
  const SECTIONS = ['supplements', 'banners', 'clothing'];

  function getTrigger(img) {
    return img.closest('[data-section-icon-trigger]');
  }

  function isStatTrigger(trigger) {
    return Boolean(trigger?.classList.contains('stat-icon'));
  }

  function setIconVisible(img, visible) {
    const trigger = getTrigger(img);

    if (visible) {
      img.hidden = false;
      if (trigger) {
        trigger.hidden = false;
        trigger.classList.remove('is-icon-hidden', 'is-stat-icon-empty');
        trigger.removeAttribute('disabled');
      }
      return;
    }

    img.removeAttribute('src');
    img.hidden = true;

    if (!trigger) return;

    trigger.dataset.lightboxSrc = '';

    if (isStatTrigger(trigger)) {
      trigger.classList.add('is-stat-icon-empty');
      trigger.classList.remove('is-icon-hidden');
      trigger.hidden = false;
      trigger.setAttribute('disabled', '');
      return;
    }

    trigger.hidden = true;
    trigger.classList.add('is-icon-hidden');
    trigger.classList.remove('is-stat-icon-empty');
  }

  function applyIcon(sectionId, iconData, { forceHide = false } = {}) {
    const customUrl = iconData?.image ? iconData.image.split('?')[0] : '';

    document.querySelectorAll(`[data-section-icon-img="${sectionId}"]`).forEach((img) => {
      const trigger = getTrigger(img);

      if (customUrl) {
        img.src = `${customUrl}?v=${Date.now()}`;
        setIconVisible(img, true);
        if (trigger) trigger.dataset.lightboxSrc = customUrl;
        return;
      }

      if (forceHide) {
        setIconVisible(img, false);
      }
    });
  }

  async function loadSectionIcons(forceApplyAll = false) {
    try {
      const response = await fetch('/api/section-icons');
      if (!response.ok) return;

      const payload = await response.json();
      SECTIONS.forEach((sectionId) => {
        const data = payload.icons?.[sectionId];
        if (data?.image) {
          applyIcon(sectionId, data);
        } else if (forceApplyAll) {
          applyIcon(sectionId, data, { forceHide: true });
        }
      });
    } catch {
      // Оставляем иконки по умолчанию из HTML
    }
  }

  document.addEventListener('DOMContentLoaded', () => loadSectionIcons(false));
  window.addEventListener('section-icons-changed', () => loadSectionIcons(true));
  window.loadSectionIcons = loadSectionIcons;
})();
