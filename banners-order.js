const BANNER_CATEGORY_VALUES = new Set(['preview', 'illustrations', 'logos', 'pictures']);

function setFormStatus(el, message, isError) {
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || '';
  el.classList.toggle('is-error', Boolean(isError));
  el.classList.toggle('is-success', Boolean(message && !isError));
}

function applyCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  if (!category || !BANNER_CATEGORY_VALUES.has(category)) return;

  const input = document.querySelector(`input[name="category"][value="${category}"]`);
  if (input) input.checked = true;
}

function initBannerOrderForm() {
  const form = document.getElementById('bannerOrderForm');
  const status = document.getElementById('bannerOrderStatus');
  if (!form) return;

  applyCategoryFromUrl();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitBtn = form.querySelector('[type="submit"]');
    const formData = new FormData(form);
    const category = formData.get('category');

    const confirmed = await confirmOrderSubmission({
      theme: 'banners',
      title: 'Проверьте данные заявки',
      description: 'Убедитесь, что контакты и описание работы указаны верно, прежде чем отправить заявку.',
      fields: buildBannerOrderFields(formData)
    });

    if (!confirmed) return;

    submitBtn.disabled = true;
    setFormStatus(status, 'Отправка заявки…', false);

    try {
      const response = await fetch('/api/banner-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.get('customer_name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          category: category || null,
          message: formData.get('message')
        })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не удалось отправить заявку');

      setFormStatus(status, payload.message, false);
      form.reset();
      const emptyCategory = form.querySelector('input[name="category"][value=""]');
      if (emptyCategory) emptyCategory.checked = true;
    } catch (error) {
      setFormStatus(status, error.message, true);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', initBannerOrderForm);
