const crypto = require('crypto');
const { sendRegistrationCodeEmail, getMailStatus, validateEmailAddress } = require('./mail');

const PASSWORD_MIN_LENGTH = 8;
const CUSTOMER_AUTH_CODE = 'admin';
const CODE_TTL_MINUTES = 15;

function isRegisterDemoMode() {
  const flag = String(process.env.REGISTER_DEMO_MODE ?? '1').trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

function isRegisterShowCodeOnScreen() {
  if (isRegisterDemoMode()) return true;
  const flag = String(process.env.REGISTER_SHOW_CODE ?? '1').trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

function getDeveloperRegisterEmail() {
  const raw = String(process.env.REGISTER_DEVELOPER_EMAIL || process.env.SMTP_USER || '').trim();
  if (!raw) return '';
  const result = validateEmailAddress(raw);
  return result.ok ? result.email : '';
}

function isDeveloperRegisterEmail(email) {
  const developer = getDeveloperRegisterEmail();
  if (!developer) return false;
  const result = validateEmailAddress(email);
  return result.ok && result.email === developer;
}

const memoryPending = new Map();

function hashPassword(password) {
  const salt = process.env.ADMIN_REGISTER_SALT || 'portfolio-demo-register';
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function validateEmail(email) {
  const result = validateEmailAddress(email);
  return result.ok ? null : result.error;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { ok: false, error: 'Укажите пароль', checks: getPasswordChecks('') };
  }

  const checks = getPasswordChecks(password);
  if (!checks.allPassed) {
    return {
      ok: false,
      error: 'Пароль не соответствует требованиям безопасности',
      checks
    };
  }

  return { ok: true, checks };
}

function getPasswordChecks(password) {
  const value = String(password || '');
  const hasMinLength = value.length >= PASSWORD_MIN_LENGTH;
  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const englishOnly = value.length === 0 || /^[\x21-\x7E]+$/.test(value);
  const latinLettersOnly = value.length === 0 || !/[А-Яа-яЁё]/.test(value);

  const checks = {
    minLength: hasMinLength,
    upper: hasUpper,
    lower: hasLower,
    digit: hasDigit,
    english: englishOnly && latinLettersOnly
  };

  checks.allPassed = Object.values(checks).every(Boolean);
  return checks;
}

function validateCredentials(name, emailRaw, password, confirmPassword) {
  const emailResult = validateEmailAddress(emailRaw);
  if (!emailResult.ok) {
    return { ok: false, error: emailResult.error };
  }

  if (!String(name || '').trim()) {
    return { ok: false, error: 'Укажите имя' };
  }

  const passwordResult = validatePassword(password);
  if (!passwordResult.ok) {
    return { ok: false, error: passwordResult.error, checks: passwordResult.checks };
  }

  if (password !== confirmPassword) {
    return { ok: false, error: 'Пароли не совпадают' };
  }

  return {
    ok: true,
    email: emailResult.email,
    emailCorrected: emailResult.corrected,
    emailCorrectionMessage: emailResult.message || null,
    name: String(name).trim()
  };
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function savePendingInMemory(email, payload) {
  memoryPending.set(email, {
    ...payload,
    expiresAt: Date.now() + CODE_TTL_MINUTES * 60 * 1000
  });
}

function getPendingFromMemory(email) {
  const pending = memoryPending.get(email);
  if (!pending) return null;
  if (pending.expiresAt < Date.now()) {
    memoryPending.delete(email);
    return null;
  }
  return pending;
}

async function ensureVerificationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_verification_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(16) NOT NULL,
      name VARCHAR(128),
      password_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_verify_email (email),
      INDEX idx_admin_verify_expires (expires_at)
    )
  `);
}

async function savePendingRegistration(pool, email, data) {
  savePendingInMemory(email, data);

  if (!pool) return { storage: 'memory' };

  try {
    await ensureVerificationTable(pool);
    await pool.query('DELETE FROM admin_verification_codes WHERE email = ?', [email]);
    await pool.query(
      `INSERT INTO admin_verification_codes (email, code, name, password_hash, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [email, data.code, data.name, data.passwordHash, CODE_TTL_MINUTES]
    );
    return { storage: 'database' };
  } catch (error) {
    console.warn('Не удалось сохранить код в БД, используется память сервера:', error.message);
    return { storage: 'memory', warning: error.message };
  }
}

async function loadPendingRegistration(pool, email) {
  const memoryRecord = getPendingFromMemory(email);
  if (memoryRecord) {
    return {
      code: memoryRecord.code,
      name: memoryRecord.name,
      password_hash: memoryRecord.passwordHash,
      expires_at: new Date(memoryRecord.expiresAt)
    };
  }

  if (!pool) return null;

  try {
    await ensureVerificationTable(pool);
    const [rows] = await pool.query(
      `SELECT code, name, password_hash, expires_at
       FROM admin_verification_codes
       WHERE email = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  } catch (error) {
    console.warn('Не удалось прочитать код из БД:', error.message);
    return null;
  }
}

async function clearPendingRegistration(pool, email) {
  memoryPending.delete(email);
  if (!pool) return;

  try {
    await pool.query('DELETE FROM admin_verification_codes WHERE email = ?', [email]);
  } catch (error) {
    console.warn('Не удалось удалить код из БД:', error.message);
  }
}

async function persistAdminUser(pool, name, email, passwordHash) {
  if (!pool) {
    throw new Error('База данных недоступна. Запустите Docker: docker compose up -d');
  }

  const existing = await findAdminUserByEmail(pool, email);
  if (existing) {
    const error = new Error('Такой пользователь уже зарегистрирован. Войдите по email и паролю.');
    error.code = 'USER_ALREADY_EXISTS';
    throw error;
  }

  const [result] = await pool.query(
    `INSERT INTO admin_users (name, email, password_hash)
     VALUES (?, ?, ?)`,
    [name, String(email).trim().toLowerCase(), passwordHash]
  );
  return { id: result.insertId, storage: 'database' };
}

async function findAdminUserByEmail(pool, email) {
  if (!pool) {
    return null;
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  await ensureAdminUsersProfileColumns(pool);

  const [rows] = await pool.query(
    `SELECT id, name, email, password_hash, created_at, avatar_data, location, phone
     FROM admin_users
     WHERE LOWER(TRIM(email)) = ?
     LIMIT 1`,
    [normalizedEmail]
  );
  return rows[0] || null;
}

async function adminUserExists(pool, email) {
  const user = await findAdminUserByEmail(pool, email);
  return Boolean(user);
}

async function ensureAdminUsersProfileColumns(pool) {
  if (!pool) return;
  if (!(await columnExists(pool, 'admin_users', 'avatar_data'))) {
    await pool.query('ALTER TABLE admin_users ADD COLUMN avatar_data MEDIUMTEXT NULL');
  }
  if (!(await columnExists(pool, 'admin_users', 'location'))) {
    await pool.query('ALTER TABLE admin_users ADD COLUMN location VARCHAR(128) NULL');
  }
  if (!(await columnExists(pool, 'admin_users', 'phone'))) {
    await pool.query('ALTER TABLE admin_users ADD COLUMN phone VARCHAR(32) NULL');
  }
}

async function columnExists(pool, tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].cnt > 0;
}

const ENTRY_LABELS = {
  login: 'Вход по аккаунту',
  register: 'Регистрация',
  preview: 'Предварительный просмотр',
  auth: 'Демо-код'
};

function getAvatarInitials(name, email) {
  const value = String(name || email || 'U').trim();
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  const local = String(email || value).split('@')[0] || value;
  return local.slice(0, 2).toUpperCase();
}

function formatUserProfile(row, entryType = 'login') {
  const name = String(row.name || '').trim() || String(row.email || '').split('@')[0];
  return {
    isDemo: false,
    id: row.id,
    name,
    email: row.email,
    role: 'Администратор',
    entryType,
    entryLabel: ENTRY_LABELS[entryType] || ENTRY_LABELS.login,
    registeredAt: row.created_at || null,
    lastLogin: new Date().toISOString(),
    avatarInitials: getAvatarInitials(name, row.email),
    avatarUrl: row.avatar_data || null,
    status: 'active',
    emailVerified: true,
    location: row.location || null,
    phone: row.phone || null,
    bio: 'Зарегистрированный администратор сайта Portfolio.'
  };
}

function formatMailDeliveryError(error) {
  const message = String(error?.message || 'Не удалось отправить письмо');
  if (/BREVO_API_KEY|Brevo|brevo\.com/i.test(message)) {
    return message;
  }
  if (/Invalid login|BadCredentials|EAUTH|535/i.test(message)) {
    return 'Ошибка SMTP: проверьте SMTP_PASS (пароль приложения Gmail, 16 символов без пробелов).';
  }
  if (/ECONNECTION|ETIMEDOUT|EAI_AGAIN|timeout|getaddrinfo/i.test(message)) {
    return 'Не удалось подключиться к почтовому серверу. Проверьте интернет и настройки SMTP.';
  }
  if (/550|553|554|recipient|RCPT|Mailbox|not found|не найден/i.test(message)) {
    return 'Адрес не найден. Проверьте email: только латиница (ENG), без опечаток в gmail.com / mail.ru / yandex.ru. Такой аккаунт может не существовать.';
  }
  return message;
}

async function deliverVerificationCode(email, code) {
  const showOnScreen = isRegisterShowCodeOnScreen();

  if (isRegisterDemoMode()) {
    console.log(`[Demo Register] Код для ${email}: ${code}`);

    if (isDeveloperRegisterEmail(email)) {
      try {
        const delivery = await sendRegistrationCodeEmail({
          to: email,
          code,
          expiresMinutes: CODE_TTL_MINUTES
        });
        return {
          demoMode: true,
          showCodeOnScreen: true,
          demoCode: code,
          sentTo: delivery.to,
          mailSent: true,
          mailProvider: delivery.provider || 'smtp',
          developerMail: true,
          message: `Демо-режим: код на экране. Письмо также отправлено на ${delivery.to}.`
        };
      } catch (error) {
        console.warn(`[Demo Register] Письмо разработчику не отправлено: ${error.message}`);
        return {
          demoMode: true,
          showCodeOnScreen: true,
          demoCode: code,
          sentTo: email,
          mailSent: false,
          mailError: formatMailDeliveryError(error),
          developerMail: true,
          message: `Демо-режим: код на экране. Письмо не отправилось (${formatMailDeliveryError(error)}).`
        };
      }
    }

    return {
      demoMode: true,
      showCodeOnScreen: true,
      demoCode: code,
      mailSent: false,
      message: 'Демо-режим: код показан на экране. Письмо не отправляется.'
    };
  }

  let delivery = null;
  let mailError = null;

  try {
    delivery = await sendRegistrationCodeEmail({
      to: email,
      code,
      expiresMinutes: CODE_TTL_MINUTES
    });
  } catch (error) {
    mailError = error;
    if (!showOnScreen) {
      throw error;
    }
    console.warn(`[Register] Письмо на ${email} не отправлено, код показан на экране: ${error.message}`);
  }

  if (mailError && showOnScreen) {
    return {
      demoMode: false,
      showCodeOnScreen: true,
      demoCode: code,
      sentTo: email,
      mailSent: false,
      mailError: formatMailDeliveryError(mailError),
      message: `Письмо не доставлено (${formatMailDeliveryError(mailError)}). Код показан на экране — регистрацию можно завершить.`
    };
  }

  const baseMessage = delivery.correctionMessage
    ? `${delivery.correctionMessage} Код отправлен на ${delivery.to}.`
    : `Код отправлен на ${delivery.to}.`;

  return {
    demoMode: false,
    showCodeOnScreen: showOnScreen,
    demoCode: showOnScreen ? code : undefined,
    sentTo: delivery.to,
    acceptedRecipients: delivery.accepted,
    mailProvider: delivery.provider || 'smtp',
    mailSent: true,
    emailCorrected: delivery.corrected,
    messageId: delivery.messageId,
    message: showOnScreen
      ? `${baseMessage} Код также показан на экране — регистрация возможна без письма.`
      : baseMessage
  };
}

function getPoolSafe(getPool) {
  try {
    return getPool();
  } catch {
    return null;
  }
}

function registerAdminRegisterRoutes(app, getPool) {
  app.get('/api/admin/register/mail-status', (_req, res) => {
    const developerEmail = getDeveloperRegisterEmail();
    res.json({
      ...getMailStatus(),
      demoMode: isRegisterDemoMode(),
      showCodeOnScreen: isRegisterShowCodeOnScreen(),
      developerEmail,
      developerMailInDemo: isRegisterDemoMode() && Boolean(developerEmail)
    });
  });

  app.post('/api/admin/register/test-mail', async (req, res) => {
    const to = String(req.body?.email || process.env.SMTP_USER || '').trim();
    if (!to) {
      return res.status(400).json({ error: 'Укажите email для тестового письма' });
    }

    try {
      await sendRegistrationCodeEmail({
        to,
        code: '123456',
        expiresMinutes: CODE_TTL_MINUTES
      });
      res.json({ ok: true, message: `Тестовое письмо отправлено на ${to}` });
    } catch (error) {
      res.status(503).json({ error: error.message || 'Не удалось отправить тестовое письмо' });
    }
  });

  app.post('/api/admin/register/send-code', async (req, res) => {
    const authCode = String(req.body?.authCode || '').trim();
    if (!authCode) {
      return res.status(400).json({ error: 'Укажите код аутентификации' });
    }
    if (authCode !== CUSTOMER_AUTH_CODE) {
      return res.status(400).json({ error: 'Неверный код аутентификации' });
    }

    const validation = validateCredentials(
      req.body?.name,
      req.body?.email,
      req.body?.password,
      req.body?.confirmPassword
    );

    if (!validation.ok) {
      return res.status(400).json({
        error: validation.error,
        checks: validation.checks
      });
    }

    const { email, name } = validation;
    const password = String(req.body?.password || '');
    const code = generateVerificationCode();
    const passwordHash = hashPassword(password);

    try {
      const pool = getPoolSafe(getPool);
      if (!pool) {
        return res.status(503).json({ error: 'База данных недоступна. Запустите Docker: docker compose up -d' });
      }

      if (await adminUserExists(pool, email)) {
        return res.status(409).json({
          error: 'Такой пользователь уже зарегистрирован. Войдите по email и паролю.'
        });
      }

      await savePendingRegistration(pool, email, {
        code,
        name,
        passwordHash
      });

      const delivery = await deliverVerificationCode(email, code);

      res.json({
        ok: true,
        message: delivery.message,
        demoMode: delivery.demoMode,
        showCodeOnScreen: delivery.showCodeOnScreen,
        demoCode: delivery.demoCode,
        mailSent: delivery.mailSent,
        mailError: delivery.mailError || null,
        sentTo: delivery.sentTo || email,
        acceptedRecipients: delivery.acceptedRecipients || [],
        mailProvider: delivery.mailProvider || delivery.provider || 'smtp',
        senderAccount: getMailStatus().senderEmail || null,
        emailCorrected: validation.emailCorrected || delivery.emailCorrected || false,
        expiresInMinutes: CODE_TTL_MINUTES,
        email
      });
    } catch (error) {
      console.error(`[Register] Не удалось отправить код на ${email}:`, error.message);
      res.status(503).json({
        error: formatMailDeliveryError(error)
      });
    }
  });

  app.post('/api/admin/register/login', async (req, res) => {
    const authCode = String(req.body?.authCode || '').trim();
    const emailResult = validateEmailAddress(req.body?.email);
    const password = String(req.body?.password || '');

    if (!authCode) {
      return res.status(400).json({ error: 'Укажите код аутентификации' });
    }

    if (authCode !== CUSTOMER_AUTH_CODE) {
      return res.status(401).json({ error: 'Неверный код аутентификации' });
    }

    if (!emailResult.ok) {
      return res.status(400).json({ error: emailResult.error });
    }

    if (!password) {
      return res.status(400).json({ error: 'Укажите пароль' });
    }

    try {
      const pool = getPoolSafe(getPool);
      if (!pool) {
        return res.status(503).json({ error: 'База данных недоступна. Запустите Docker: docker compose up -d' });
      }

      const user = await findAdminUserByEmail(pool, emailResult.email);
      if (!user) {
        return res.status(404).json({ error: 'Такого аккаунта нет. Сначала зарегистрируйтесь.' });
      }

      const passwordHash = hashPassword(password);
      if (user.password_hash !== passwordHash) {
        return res.status(401).json({ error: 'Неверный пароль' });
      }

      res.json({
        ok: true,
        mode: 'account',
        message: `Добро пожаловать, ${user.name || user.email}!`,
        user: formatUserProfile(user, 'login')
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Не удалось выполнить вход' });
    }
  });

  app.post('/api/admin/register/complete', async (req, res) => {
    const authCode = String(req.body?.authCode || '').trim();
    const validation = validateCredentials(
      req.body?.name,
      req.body?.email,
      req.body?.password,
      req.body?.confirmPassword
    );

    if (!validation.ok) {
      return res.status(400).json({
        error: validation.error,
        checks: validation.checks
      });
    }

    if (authCode !== CUSTOMER_AUTH_CODE) {
      return res.status(400).json({ error: 'Неверный код аутентификации' });
    }

    const { email, name } = validation;
    const passwordHash = hashPassword(String(req.body?.password || ''));

    try {
      const pool = getPoolSafe(getPool);
      if (!pool) {
        return res.status(503).json({ error: 'База данных недоступна. Запустите Docker: docker compose up -d' });
      }

      if (await adminUserExists(pool, email)) {
        return res.status(409).json({
          error: 'Такой пользователь уже зарегистрирован. Войдите по email и паролю.'
        });
      }

      const saved = await persistAdminUser(pool, name, email, passwordHash);
      await clearPendingRegistration(pool, email);

      res.status(201).json({
        ok: true,
        id: saved.id,
        message: 'Регистрация подтверждена кодом аутентификации',
        verifiedWith: 'customer-auth',
        storage: saved.storage
      });
    } catch (error) {
      if (error.code === 'USER_ALREADY_EXISTS') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'Не удалось завершить регистрацию' });
    }
  });

  app.post('/api/admin/register/verify', async (req, res) => {
    const emailRaw = String(req.body?.email || '').trim();
    const emailCode = String(req.body?.emailCode || '').trim();
    const authCode = String(req.body?.authCode || '').trim();

    const emailResult = validateEmailAddress(emailRaw);
    if (!emailResult.ok) {
      return res.status(400).json({ error: emailResult.error });
    }

    const email = emailResult.email;

    if (authCode !== CUSTOMER_AUTH_CODE) {
      return res.status(400).json({ error: 'Неверный код аутентификации' });
    }

    if (!/^\d{6}$/.test(emailCode)) {
      return res.status(400).json({ error: 'Введите 6-значный код из email' });
    }

    try {
      const pool = getPoolSafe(getPool);
      const pending = await loadPendingRegistration(pool, email);

      if (!pending) {
        return res.status(400).json({ error: 'Сначала нажмите «Получить код» на шаге регистрации' });
      }

      if (pending.code !== emailCode) {
        return res.status(400).json({ error: 'Неверный код из email' });
      }

      if (new Date(pending.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Срок действия кода истёк. Запросите новый.' });
      }

      if (await adminUserExists(pool, email)) {
        await clearPendingRegistration(pool, email);
        return res.status(409).json({
          error: 'Такой пользователь уже зарегистрирован. Войдите по email и паролю.'
        });
      }

      const saved = await persistAdminUser(pool, pending.name, email, pending.password_hash);
      await clearPendingRegistration(pool, email);
      const storedUser = await findAdminUserByEmail(pool, email);
      const profileRow = storedUser || {
        id: saved.id,
        name: pending.name,
        email,
        created_at: new Date().toISOString(),
        avatar_data: null
      };

      res.status(201).json({
        ok: true,
        id: saved.id,
        message: 'Регистрация завершена. Теперь можно войти по email и паролю.',
        verifiedWith: 'email-code',
        storage: saved.storage,
        user: formatUserProfile(profileRow, 'register')
      });
    } catch (error) {
      if (error.code === 'USER_ALREADY_EXISTS') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'Не удалось подтвердить регистрацию' });
    }
  });

  app.get('/api/admin/register/profile', async (req, res) => {
    const emailResult = validateEmailAddress(req.query?.email);
    if (!emailResult.ok) {
      return res.status(400).json({ error: emailResult.error });
    }

    try {
      const pool = getPoolSafe(getPool);
      if (!pool) {
        return res.status(503).json({ error: 'База данных недоступна' });
      }

      const user = await findAdminUserByEmail(pool, emailResult.email);
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const entryType = String(req.query?.entryType || 'login').trim();
      res.json({ user: formatUserProfile(user, entryType) });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Не удалось загрузить профиль' });
    }
  });

  app.post('/api/admin/register/profile/avatar', async (req, res) => {
    const emailResult = validateEmailAddress(req.body?.email);
    if (!emailResult.ok) {
      return res.status(400).json({ error: emailResult.error });
    }

    const avatarData = req.body?.avatarData;
    const shouldDelete = avatarData === null || avatarData === '';

    if (!shouldDelete) {
      const avatarValue = String(avatarData || '').trim();
      if (!avatarValue.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Загрузите изображение в формате JPG, PNG или WebP' });
      }
      if (avatarValue.length > 600000) {
        return res.status(400).json({ error: 'Изображение слишком большое. Выберите файл до 500 КБ.' });
      }
    }

    try {
      const pool = getPoolSafe(getPool);
      if (!pool) {
        return res.status(503).json({ error: 'База данных недоступна' });
      }

      await ensureAdminUsersProfileColumns(pool);
      const user = await findAdminUserByEmail(pool, emailResult.email);
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      await pool.query(
        'UPDATE admin_users SET avatar_data = ? WHERE email = ?',
        [shouldDelete ? null : String(avatarData).trim(), emailResult.email]
      );

      const updatedUser = await findAdminUserByEmail(pool, emailResult.email);
      const entryType = String(req.body?.entryType || 'login').trim();
      res.json({
        ok: true,
        message: shouldDelete ? 'Фото профиля удалено' : 'Аватар обновлён',
        user: formatUserProfile(updatedUser, entryType)
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Не удалось сохранить аватар' });
    }
  });

  app.post('/api/admin/register/profile/contact', async (req, res) => {
    const emailResult = validateEmailAddress(req.body?.email);
    if (!emailResult.ok) {
      return res.status(400).json({ error: emailResult.error });
    }

    const location = String(req.body?.location || '').trim().slice(0, 128) || null;
    const phone = String(req.body?.phone || '').trim().slice(0, 32) || null;

    try {
      const pool = getPoolSafe(getPool);
      if (!pool) {
        return res.status(503).json({ error: 'База данных недоступна' });
      }

      await ensureAdminUsersProfileColumns(pool);
      const user = await findAdminUserByEmail(pool, emailResult.email);
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      await pool.query(
        'UPDATE admin_users SET location = ?, phone = ? WHERE email = ?',
        [location, phone, emailResult.email]
      );

      const updatedUser = await findAdminUserByEmail(pool, emailResult.email);
      const entryType = String(req.body?.entryType || 'login').trim();
      res.json({
        ok: true,
        message: 'Контактная информация изменена и сохранена в системе',
        user: formatUserProfile(updatedUser, entryType)
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Не удалось сохранить контакты' });
    }
  });

  app.post('/api/admin/register', async (_req, res) => {
    res.status(400).json({
      error: 'Используйте /api/admin/register/send-code, /api/admin/register/complete или /api/admin/register/verify'
    });
  });
}

module.exports = {
  registerAdminRegisterRoutes,
  validatePassword,
  getPasswordChecks,
  isRegisterDemoMode,
  isRegisterShowCodeOnScreen,
  getDeveloperRegisterEmail,
  isDeveloperRegisterEmail,
  CUSTOMER_AUTH_CODE,
  PASSWORD_MIN_LENGTH
};
