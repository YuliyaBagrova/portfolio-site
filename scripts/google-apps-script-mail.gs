/**
 * Отправка писем через Gmail (Google Apps Script)
 * Скопируйте ВЕСЬ файл в https://script.google.com → Новый проект
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('MAIL_SECRET');

    if (!secret || data.secret !== secret) {
      return jsonResponse({ ok: false, error: 'Неверный секрет' });
    }

    const to = String(data.to || '').trim();
    const subject = String(data.subject || '').trim();
    const text = String(data.text || '');
    const html = data.html ? String(data.html) : '';

    if (!to || !subject) {
      return jsonResponse({ ok: false, error: 'Укажите to и subject' });
    }

    GmailApp.sendEmail(to, subject, text, {
      htmlBody: html || undefined,
      name: 'Portfolio'
    });

    return jsonResponse({ ok: true, to });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/** ШАГ 1 — запустите первой (появится в списке после сохранения) */
function authorizeMail() {
  const email = Session.getActiveUser().getEmail();
  GmailApp.sendEmail(
    email,
    'Portfolio — тест отправки',
    'Если вы видите это письмо, Google Apps Script настроен правильно.'
  );
}

/** ШАГ 2 — запустите после authorizeMail */
function setMailSecret() {
  PropertiesService.getScriptProperties().setProperty('MAIL_SECRET', 'portfolio-mail-2026');
}
