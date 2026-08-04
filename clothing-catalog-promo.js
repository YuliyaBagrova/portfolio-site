(function initClothingCatalogPromo() {
  const promoRoot = document.getElementById('clothingCatalogPromo');
  if (!promoRoot) return;

  const card = document.getElementById('clothingCatalogPromoCard');
  const image = document.getElementById('clothingCatalogPromoImage');
  const fallback = document.getElementById('clothingCatalogPromoFallback');
  const sticker = document.getElementById('clothingCatalogPromoSticker');
  const titleEl = document.getElementById('clothingCatalogPromoTitle');
  const subtitleEl = document.getElementById('clothingCatalogPromoSubtitle');
  const overlay = document.getElementById('clothingCatalogPromoOverlay');

  function applyPromo(promo) {
    if (!promo) return;

    const label = promo.promo_label || 'Горячие предложения';
    const title = promo.promo_title || '';
    const subtitle = promo.promo_subtitle || '';
    const link = promo.promo_link || '';
    const imageUrl = promo.image ? promo.image.split('?')[0] : '';

    if (sticker) {
      sticker.textContent = label;
      sticker.hidden = !label;
    }

    if (titleEl) {
      titleEl.textContent = title;
      titleEl.hidden = !title;
    }

    if (subtitleEl) {
      subtitleEl.textContent = subtitle;
      subtitleEl.hidden = !subtitle;
    }

    if (overlay) {
      overlay.hidden = !title && !subtitle;
    }

    if (image && fallback) {
      if (imageUrl) {
        image.src = `${imageUrl}?v=${Date.now()}`;
        image.hidden = false;
        fallback.hidden = true;
        promoRoot.classList.add('has-image');
      } else {
        image.removeAttribute('src');
        image.hidden = true;
        fallback.hidden = false;
        promoRoot.classList.remove('has-image');
      }
    }

    if (card) {
      if (link) {
        card.href = link;
        card.target = link.startsWith('http') ? '_blank' : '_self';
        card.rel = link.startsWith('http') ? 'noopener noreferrer' : '';
        card.classList.add('is-clickable');
      } else {
        card.removeAttribute('href');
        card.removeAttribute('target');
        card.removeAttribute('rel');
        card.classList.remove('is-clickable');
      }
    }
  }

  async function loadClothingCatalogPromo() {
    try {
      const response = await fetch('/api/clothing-catalog-promo');
      if (!response.ok) return;

      const payload = await response.json();
      applyPromo(payload.promo);
    } catch {
      // Оставляем дефолтную разметку при ошибке сети
    }
  }

  if (card) {
    card.addEventListener('click', (event) => {
      if (!card.classList.contains('is-clickable')) {
        event.preventDefault();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', loadClothingCatalogPromo);
  window.addEventListener('clothing-catalog-promo-changed', loadClothingCatalogPromo);
  window.loadClothingCatalogPromo = loadClothingCatalogPromo;
})();
