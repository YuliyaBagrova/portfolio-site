(function initAdminPasswordToggle() {
  function syncPasswordToggle(button, input) {
    const isHidden = input.type === 'password';

    button.classList.toggle('is-password-visible', !isHidden);
    button.setAttribute('aria-pressed', isHidden ? 'false' : 'true');
    button.setAttribute('aria-label', isHidden ? 'Показать пароль' : 'Скрыть пароль');
  }

  function bindPasswordToggle(button, input) {
    if (!button || !input) return;

    button.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      syncPasswordToggle(button, input);
    });

    input.form?.addEventListener('reset', () => {
      requestAnimationFrame(() => syncPasswordToggle(button, input));
    });

    syncPasswordToggle(button, input);
  }

  window.bindAdminPasswordToggle = bindPasswordToggle;
})();
