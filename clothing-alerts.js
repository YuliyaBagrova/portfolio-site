(function initClothingAlerts() {
  const list = document.getElementById('clothingAlertsList');
  if (!list) return;

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function renderAlerts(alerts) {
    if (!alerts.length) {
      list.innerHTML = '<li class="clothing-alerts-empty">Пока нет предложений</li>';
      return;
    }

    list.innerHTML = alerts.map((alert) => {
      const typeClass = ['sale', 'new', 'drop'].includes(alert.alert_type)
        ? alert.alert_type
        : 'sale';

      return `
        <li class="clothing-alert clothing-alert--${typeClass}">
          <span class="clothing-alert-badge">${escapeHtml(alert.badge)}</span>
          <div class="clothing-alert-body">
            <strong>${escapeHtml(alert.title)}</strong>
            ${alert.description ? `<p>${escapeHtml(alert.description)}</p>` : ''}
          </div>
        </li>
      `;
    }).join('');
  }

  async function loadClothingAlerts() {
    try {
      const response = await fetch('/api/clothing-alerts');
      if (!response.ok) return;

      const payload = await response.json();
      renderAlerts(payload.alerts || []);
    } catch {
      // Оставляем текущее содержимое при ошибке сети
    }
  }

  document.addEventListener('DOMContentLoaded', loadClothingAlerts);
  window.addEventListener('clothing-alerts-changed', loadClothingAlerts);
  window.loadClothingAlerts = loadClothingAlerts;
})();
