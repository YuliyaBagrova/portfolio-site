const dns = require('dns').promises;

const PROVIDERS = {
  yandex: {
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true
  },
  gmail: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true
  },
  mailru: {
    host: 'smtp.mail.ru',
    port: 465,
    secure: true
  },
  outlook: {
    host: 'smtp.office365.com',
    port: 587,
    secure: false
  }
};

let cachedTransporter = null;
let cachedConfigKey = '';

function loadNodemailer() {
  try {
    return require('nodemailer');
  } catch (error) {
    throw new Error(
      'Модуль nodemailer не установлен. Пересоберите контейнер: docker compose up --build -d'
    );
  }
}

function buildMailConfig() {
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  if (!user || !pass) {
    return {
      ok: false,
      error: 'Укажите SMTP_USER и SMTP_PASS в файле .env (пароль приложения от почты).'
    };
  }

  const provider = String(process.env.SMTP_PROVIDER || 'yandex').trim().toLowerCase();
  const preset = PROVIDERS[provider] || null;

  const host = String(process.env.SMTP_HOST || preset?.host || '').trim();
  if (!host && provider !== 'gmail') {
    return {
      ok: false,
      error: 'Укажите SMTP_HOST или SMTP_PROVIDER (yandex, gmail, mailru, outlook).'
    };
  }

  const port = Number(process.env.SMTP_PORT || preset?.port || 587);
  const secure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true'
    : Boolean(preset?.secure ?? port === 465);

  const from = String(process.env.SMTP_FROM || '').trim() || `Portfolio <${user}>`;

  const transport = provider === 'gmail'
    ? {
      service: 'gmail',
      auth: { user, pass }
    }
    : {
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        minVersion: 'TLSv1.2'
      }
    };

  return {
    ok: true,
    from,
    transport,
    configKey: provider === 'gmail'
      ? `gmail:${user}`
      : `${host}:${port}:${secure}:${user}`
  };
}

function getTransporter() {
  const config = buildMailConfig();
  if (!config.ok) {
    throw new Error(config.error);
  }

  if (!cachedTransporter || cachedConfigKey !== config.configKey) {
    const nodemailer = loadNodemailer();
    cachedTransporter = nodemailer.createTransport(config.transport);
    cachedConfigKey = config.configKey;
  }

  return { transporter: cachedTransporter, from: config.from };
}

async function verifyMailTransport() {
  if (getMailProvider() === 'brevo') {
    const sender = sanitizeEmailAddress(process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || '');
    if (!getBrevoApiKey()) {
      console.warn(
        'Почта: MAIL_PROVIDER=brevo, но BREVO_API_KEY пуст. '
        + 'Создайте ключ на brevo.com и перезапустите контейнер (см. scripts/BREVO-SETUP.md).'
      );
      return { ok: false, error: 'Укажите BREVO_API_KEY в .env (инструкция: scripts/BREVO-SETUP.md)' };
    }
    if (!sender) {
      return { ok: false, error: 'Укажите BREVO_SENDER_EMAIL в .env' };
    }
    console.log(`Почта настроена: Brevo (${sender}) — транзакционная доставка получателям`);
    return { ok: true };
  }

  if (getMailProvider() === 'gas') {
    const sender = sanitizeEmailAddress(process.env.SMTP_USER || '');
    console.log(`Почта настроена: Google Apps Script (${sender || 'Gmail'}) — письма идут получателям`);
    return { ok: true };
  }

  try {
    const { transporter } = getTransporter();
    await transporter.verify();
    const cfg = buildMailConfig();
    console.log(`Почта настроена: ${process.env.SMTP_PROVIDER || 'smtp'} (${process.env.SMTP_USER})`);
    return { ok: true };
  } catch (error) {
    const hint = String(process.env.SMTP_PROVIDER || '').toLowerCase() === 'gmail'
      ? ' Для Gmail: включите 2FA и создайте пароль приложения на myaccount.google.com/apppasswords'
      : '';
    const authHint = /Invalid login|BadCredentials|EAUTH|535/i.test(error.message)
      ? `${hint} Проверьте SMTP_PASS — нужен пароль приложения (16 символов), не обычный пароль Google.`
      : error.message;
    console.warn('Почта не настроена или SMTP недоступен:', authHint);
    return { ok: false, error: authHint };
  }
}

const CYRILLIC_EMAIL_HOMOGLYPHS = {
  '\u0430': 'a',
  '\u0435': 'e',
  '\u043e': 'o',
  '\u0440': 'p',
  '\u0441': 'c',
  '\u0443': 'y',
  '\u0445': 'x',
  '\u0456': 'i',
  '\u04cf': 'l',
  '\u0501': 'e',
  '\u051b': 't',
  '\u0410': 'a',
  '\u0415': 'e',
  '\u041e': 'o',
  '\u0420': 'p',
  '\u0421': 'c',
  '\u0423': 'y',
  '\u0425': 'x'
};

const COMMON_DOMAIN_TYPOS = {
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'yandex.tu': 'yandex.ru',
  'yndex.ru': 'yandex.ru',
  'mai.ru': 'mail.ru',
  'mail.u': 'mail.ru',
  'mail.ri': 'mail.ru'
};

function fixCommonDomainTypos(email) {
  const [local, domain] = String(email || '').split('@');
  if (!local || !domain) return email;
  const fixedDomain = COMMON_DOMAIN_TYPOS[domain] || domain;
  return `${local}@${fixedDomain}`;
}

function sanitizeEmailAddress(email) {
  let value = String(email || '').trim().normalize('NFKC');
  value = value.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
  value = value.split('').map((char) => CYRILLIC_EMAIL_HOMOGLYPHS[char] || char).join('');
  value = fixCommonDomainTypos(value.trim().toLowerCase());
  return value;
}

function validateEmailAddress(email) {
  if (!email || typeof email !== 'string') {
    return { ok: false, error: 'Укажите email' };
  }

  const raw = String(email).trim();
  const sanitized = sanitizeEmailAddress(raw);

  if (/[^\x00-\x7F]/.test(sanitized)) {
    return {
      ok: false,
      error: 'Email должен быть только латиницей. Переключите раскладку на ENG и проверьте адрес.'
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,63}$/.test(sanitized)) {
    return { ok: false, error: 'Некорректный формат email' };
  }

  if (sanitized !== raw.toLowerCase()) {
    return {
      ok: true,
      email: sanitized,
      corrected: true,
      message: `Email исправлен на ${sanitized}. Проверьте, что адрес указан верно.`
    };
  }

  return { ok: true, email: sanitized, corrected: false };
}

async function verifyEmailDomain(email) {
  const domain = String(email.split('@')[1] || '').trim().toLowerCase();
  if (!domain) {
    throw new Error('Некорректный домен email');
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords?.length) {
      return { ok: true, domain, records: mxRecords.length };
    }
  } catch (error) {
    if (!['ENOTFOUND', 'ENODATA', 'ESERVFAIL'].includes(error.code)) {
      console.warn(`[Mail] MX lookup warning for ${domain}:`, error.message);
    }
  }

  try {
    await dns.resolve4(domain);
    return { ok: true, domain, records: 0, fallback: 'A' };
  } catch {
    return {
      ok: false,
      error: `Домен «${domain}» не принимает почту. Проверьте написание email (gmail.com, mail.ru, yandex.ru).`
    };
  }
}

function normalizeRecipientEmail(email) {
  return sanitizeEmailAddress(email);
}

function buildFromAddress(smtpUser) {
  const user = String(smtpUser || '').trim().toLowerCase();
  if (!user) {
    throw new Error('SMTP_USER не задан');
  }
  return user;
}

function getMailProvider() {
  const preferred = String(process.env.MAIL_PROVIDER || 'smtp').trim().toLowerCase();
  if (preferred === 'brevo') {
    return 'brevo';
  }
  if (
    (preferred === 'gas' || preferred === 'google-script')
    && String(process.env.GOOGLE_SCRIPT_MAIL_URL || '').trim()
  ) {
    return 'gas';
  }
  if ((preferred === 'gas' || preferred === 'google-script') && !process.env.GOOGLE_SCRIPT_MAIL_URL) {
    console.warn('[Mail] MAIL_PROVIDER=gas, но GOOGLE_SCRIPT_MAIL_URL пуст — используется SMTP');
  }
  return 'smtp';
}

function getBrevoApiKey() {
  return String(process.env.BREVO_API_KEY || '').trim();
}

async function sendViaGoogleScript({ to, subject, text, html }) {
  const url = String(process.env.GOOGLE_SCRIPT_MAIL_URL || '').trim();
  const secret = String(process.env.GOOGLE_SCRIPT_MAIL_SECRET || '').trim();

  if (!url) {
    throw new Error('Укажите GOOGLE_SCRIPT_MAIL_URL в .env (см. scripts/google-apps-script-mail.gs)');
  }
  if (!secret) {
    throw new Error('Укажите GOOGLE_SCRIPT_MAIL_SECRET в .env');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    redirect: 'follow',
    body: JSON.stringify({ secret, to, subject, text, html })
  });

  const raw = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    if (/Страница не найдена|Page Not Found|не существует|404/i.test(raw)) {
      throw new Error('Неверный GOOGLE_SCRIPT_MAIL_URL. Скопируйте URL из «Управление развертываниями» (должен заканчиваться на /exec).');
    }
    throw new Error(`Google Apps Script вернул не JSON (${response.status})`);
  }

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Google Apps Script вернул ошибку ${response.status}`);
  }

  console.log(`[Mail/GAS] Код регистрации отправлен на ${to}`);
  return {
    to,
    accepted: [to],
    rejected: [],
    provider: 'gas',
    messageId: null
  };
}

function formatBrevoError(status, payload) {
  const message = String(payload?.message || payload?.error || '').trim();
  if (status === 401 || /unauthorized|invalid api key|wrong api key/i.test(message)) {
    return 'Неверный BREVO_API_KEY. Создайте новый ключ: brevo.com → SMTP & API → API Keys.';
  }
  if (/sender.*not valid|not verified|activate your sender|invalid sender/i.test(message)) {
    const sender = sanitizeEmailAddress(process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || '');
    return `Email отправителя не подтверждён в Brevo. Подтвердите ${sender || 'отправителя'}: brevo.com → Senders → Add a sender.`;
  }
  if (/credit|quota|limit|exceeded/i.test(message)) {
    return 'Исчерпан бесплатный лимит Brevo (300 писем/день). Попробуйте завтра или обновите тариф.';
  }
  return message || `Brevo вернул ошибку ${status}`;
}

async function sendViaBrevo({ to, subject, text, html }) {
  const apiKey = getBrevoApiKey();
  const senderEmail = sanitizeEmailAddress(
    process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || ''
  );
  const senderName = String(process.env.BREVO_SENDER_NAME || 'Portfolio').trim();

  if (!apiKey) {
    throw new Error('Укажите BREVO_API_KEY в .env (инструкция: scripts/BREVO-SETUP.md).');
  }
  if (!senderEmail) {
    throw new Error('Укажите BREVO_SENDER_EMAIL (подтверждённый отправитель в Brevo).');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatBrevoError(response.status, payload));
  }

  console.log(`[Mail/Brevo] Код регистрации отправлен на ${to} (${payload.messageId || 'ok'})`);
  return {
    to,
    accepted: [to],
    rejected: [],
    provider: 'brevo',
    messageId: payload.messageId || null
  };
}

async function sendViaSmtp({ recipient, subject, text, html }) {
  const config = buildMailConfig();
  if (!config.ok) {
    throw new Error(config.error);
  }

  const smtpUser = String(process.env.SMTP_USER || '').trim().toLowerCase();
  const from = buildFromAddress(smtpUser);
  const { transporter } = getTransporter();

  const mailOptions = {
    from,
    to: recipient,
    envelope: {
      from: smtpUser,
      to: recipient
    },
    subject,
    text,
    html
  };

  const sendOnce = () => transporter.sendMail(mailOptions);

  let info;
  try {
    info = await sendOnce();
  } catch (error) {
    const retryable = /timeout|ETIMEDOUT|ECONNECTION|EAI_AGAIN|Temporary|421|450|451|452/i.test(error.message);
    if (!retryable) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
    info = await sendOnce();
  }

  const accepted = Array.isArray(info.accepted)
    ? info.accepted.map((entry) => normalizeRecipientEmail(entry))
    : [];
  const rejected = Array.isArray(info.rejected)
    ? info.rejected.map((entry) => normalizeRecipientEmail(entry))
    : [];

  if (!accepted.includes(recipient)) {
    const details = [
      `запрошен ${recipient}`,
      accepted.length ? `принят ${accepted.join(', ')}` : 'получатель не принят SMTP',
      rejected.length ? `отклонён ${rejected.join(', ')}` : ''
    ].filter(Boolean).join('; ');
    throw new Error(`Почтовый сервер не подтвердил доставку на указанный адрес (${details})`);
  }

  if (accepted.includes(smtpUser) && recipient !== smtpUser) {
    throw new Error(
      'Gmail принял только адрес отправителя. Для кодов другим пользователям укажите MAIL_PROVIDER=brevo в .env.'
    );
  }

  console.log(
    `[Mail/SMTP] Код регистрации: запрошен ${recipient}, принят SMTP: ${accepted.join(', ') || '—'}`
    + `${info.messageId ? ` (${info.messageId})` : ''}`
  );

  return {
    to: recipient,
    accepted,
    rejected,
    provider: 'smtp',
    messageId: info.messageId || null
  };
}

async function sendRegistrationCodeEmail({ to, code, expiresMinutes = 15 }) {
  const validation = validateEmailAddress(to);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const recipient = validation.email;
  const domainCheck = await verifyEmailDomain(recipient);
  if (!domainCheck.ok) {
    throw new Error(domainCheck.error);
  }

  const smtpUser = sanitizeEmailAddress(process.env.SMTP_USER || '');
  if (getMailProvider() === 'smtp' && smtpUser && recipient !== smtpUser) {
    console.warn(
      `[Mail] Gmail SMTP: отправка на ${recipient}. Для доставки другим людям используйте MAIL_PROVIDER=gas (Google Apps Script).`
    );
  }

  const subject = 'Код подтверждения регистрации';
  const text = [
    `Email регистрации: ${recipient}`,
    '',
    'Здравствуйте!',
    '',
    `Ваш код подтверждения регистрации на сайте Portfolio: ${code}`,
    '',
    `Код действителен ${expiresMinutes} минут.`,
    '',
    'Если вы не запрашивали регистрацию, просто проигнорируйте это письмо.'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:520px">
      <p style="margin:0 0 16px;padding:12px;background:#f3f4f6;border-radius:8px">
        <strong>Email регистрации:</strong> ${recipient}
      </p>
      <p style="margin:0 0 12px">Здравствуйте!</p>
      <p style="margin:0 0 16px">Ваш код для завершения регистрации:</p>
      <p style="margin:0 0 20px;font-size:24px;letter-spacing:4px;font-weight:700">${code}</p>
      <p style="margin:0;color:#555;font-size:14px">Код действителен ${expiresMinutes} минут.</p>
    </div>
  `;

  const provider = getMailProvider();
  const delivery = provider === 'brevo'
    ? await sendViaBrevo({ to: recipient, subject, text, html })
    : provider === 'gas'
      ? await sendViaGoogleScript({ to: recipient, subject, text, html })
      : await sendViaSmtp({ recipient, subject, text, html });

  return {
    to: recipient,
    accepted: delivery.accepted,
    rejected: delivery.rejected || [],
    provider: delivery.provider,
    corrected: validation.corrected,
    correctionMessage: validation.message || null,
    messageId: delivery.messageId || null
  };
}

function getMailStatus() {
  const provider = getMailProvider();
  if (provider === 'brevo') {
    const senderEmail = sanitizeEmailAddress(process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || '');
    const hasKey = Boolean(getBrevoApiKey());
    return {
      configured: hasKey && Boolean(senderEmail),
      provider: 'brevo',
      deliveryMode: 'transactional',
      senderEmail,
      user: senderEmail,
      error: hasKey ? undefined : 'Укажите BREVO_API_KEY в .env (scripts/BREVO-SETUP.md)'
    };
  }

  if (provider === 'gas') {
    return {
      configured: true,
      provider: 'gas',
      deliveryMode: 'google-apps-script',
      senderEmail: sanitizeEmailAddress(process.env.SMTP_USER || ''),
      user: sanitizeEmailAddress(process.env.SMTP_USER || '')
    };
  }

  const config = buildMailConfig();
  if (!config.ok) {
    return { configured: false, error: config.error };
  }

  return {
    configured: true,
    provider: 'gmail-smtp',
    deliveryMode: 'personal-smtp',
    host: config.transport.host || process.env.SMTP_HOST || 'gmail',
    port: config.transport.port || Number(process.env.SMTP_PORT || 465),
    senderEmail: sanitizeEmailAddress(process.env.SMTP_USER || ''),
    user: process.env.SMTP_USER
  };
}

module.exports = {
  verifyMailTransport,
  sendRegistrationCodeEmail,
  getMailStatus,
  getMailProvider,
  buildMailConfig,
  sanitizeEmailAddress,
  validateEmailAddress,
  verifyEmailDomain
};
