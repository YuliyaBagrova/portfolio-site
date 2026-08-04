(function initClothingCatalogIcons() {
  const CATEGORIES = ['men', 'women', 'shirts', 'pants', 'jeans', 'accessories'];

  function applyIcon(categoryId, iconData) {
    document.querySelectorAll(`[data-catalog-icon-img="${categoryId}"]`).forEach((img) => {
      const glyph = document.querySelector(`[data-catalog-icon-glyph="${categoryId}"]`);
      const customUrl = iconData?.image ? iconData.image.split('?')[0] : '';

      if (customUrl) {
        img.src = `${customUrl}?v=${Date.now()}`;
        img.hidden = false;
        if (glyph) glyph.hidden = true;
        return;
      }

      img.removeAttribute('src');
      img.hidden = true;
      if (glyph) glyph.hidden = false;
    });
  }

  async function loadClothingCatalogIcons(forceApplyAll = false) {
    try {
      const response = await fetch('/api/clothing-catalog-icons');
      if (!response.ok) return;

      const payload = await response.json();
      CATEGORIES.forEach((categoryId) => {
        const data = payload.icons?.[categoryId];
        if (data?.image || forceApplyAll) {
          applyIcon(categoryId, data);
        }
      });
    } catch {
      // Оставляем буквенные иконки по умолчанию
    }
  }

  document.addEventListener('DOMContentLoaded', () => loadClothingCatalogIcons(false));
  window.addEventListener('clothing-catalog-icons-changed', () => loadClothingCatalogIcons(true));
  window.loadClothingCatalogIcons = loadClothingCatalogIcons;
})();
