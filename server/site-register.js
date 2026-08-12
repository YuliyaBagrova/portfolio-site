const crypto = require('crypto');
const {
  validatePassword,
  getPasswordChecks,
  isRegisterDemoMode,
  isRegisterShowCodeOnScreen,
  getDeveloperRegisterEmail,
  isDeveloperRegisterEmail
} = require('./admin-register');
const { sendRegistrationCodeEmail, getMailStatus, validateEmailAddress } = require('./mail');

const CODE_TTL_MINUTES = 15;
const memoryPending = new Map();

function hashPassword(password) {
  const salt = process.env.SITE_REGISTER_SALT || process.env.ADMIN_REGISTER_SALT || 'portfolio-demo-register';
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
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
    CREATE TABLE IF NOT EXISTS site_verification_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(16) NOT NULL,
      name VARCHAR(128),
      password_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_site_verify_email (email),
      INDEX idx_site_verify_expires (expires_at)
    )
  `);
}

async function ensureSiteUsersTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(128),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      avatar_data MEDIUMTEXT NULL,
      location VARCHAR(128) NULL,
      phone VARCHAR(32) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function savePendingRegistration(pool, email, data) {
  savePendingInMemory(email, data);
  if (!pool) return { storage: 'memory' };

  try {
    await ensureVerificationTable(pool);
    await pool.query('DELETE FROM site_verification_codes WHERE email = ?', [email]);
    await pool.query(
      `INSERT INTO site_verification_codes (email, code, name, password_hash, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [email, data.code, data.name, data.passwordHash, CODE_TTL_MINUTES]
    );
    return { storage: 'database' };
  } catch (error) {
    console.warn('[Site Register] Не удалось сохранить код в БД:', error.message);
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
       FROM site_verification_codes
       WHERE email = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  } catch (error) {
    console.warn('[Site Register] Не удалось прочитать код из БД:', error.message);
    return null;
  }
}

async function clearPendingRegistration(pool, email) {
  memoryPending.delete(email);
  if (!pool) return;
  try {
    await pool.query('DELETE FROM site_verification_codes WHERE email = ?', [email]);
  } catch (error) {
    console.warn('[Site Register] Не удалось удалить код из БД:', error.message);
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

async function ensureSiteUsersProfileColumns(pool) {
  if (!pool) return;
  await ensureSiteUsersTable(pool);
  if (!(await columnExists(pool, 'site_users', 'avatar_data'))) {
    await pool.query('ALTER TABLE site_users ADD COLUMN avatar_data MEDIUMTEXT NULL');
  }
  if (!(await columnExists(pool, 'site_users', 'location'))) {
    await pool.query('ALTER TABLE site_users ADD COLUMN location VARCHAR(128) NULL');
  }
  if (!(await columnExists(pool, 'site_users', 'phone'))) {
    await pool.query('ALTER TABLE site_users ADD COLUMN phone VARCHAR(32) NULL');
  }
}

async function findSiteUserByEmail(pool, email) {
  if (!pool) return null;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  await ensureSiteUsersProfileColumns(pool);
  const [rows] = await pool.query(
    `SELECT id, name, email, password_hash, created_at, avatar_data, location, phone
     FROM site_users
     WHERE LOWER(TRIM(email)) = ?
     LIMIT 1`,
    [normalizedEmail]
  );
  return rows[0] || null;
}

async function siteUserExists(pool, email) {
  return Boolean(await findSiteUserByEmail(pool, email));
}

async function persistSiteUser(pool, name, email, passwordHash) {
  if (!pool) {
    throw new Error('База данных недоступна. Запустите Docker: docker compose up -d');
  }

  const existing = await findSiteUserByEmail(pool, email);
  if (existing) {
    const error = new Error('Такой пользователь уже зарегистрирован.');
    error.code = 'USER_ALREADY_EXISTS';
    throw error;
  }

  const [result] = await pool.query(
    `INSERT INTO site_users (name, email, password_hash)
     VALUES (?, ?, ?)`,
    [name, String(email).trim().toLowerCase(), passwordHash]
  );
  return { id: result.insertId, storage: 'database' };
}

const ENTRY_LABELS = {
  login: 'Вход по аккаунту',
  register: 'Регистрация',
  preview: 'Предварительный просмотр'
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

function formatSiteUserProfile(row, entryType = 'register') {
  const name = String(row.name || '').trim() || String(row.email || '').split('@')[0];
  return {
    isDemo: false,
    id: row.id,
    name,
    email: row.email,
    role: 'Клиент',
    entryType,
    entryLabel: ENTRY_LABELS[entryType] || ENTRY_LABELS.register,
    registeredAt: row.created_at || null,
    lastLogin: new Date().toISOString(),
    avatarInitials: getAvatarInitials(name, row.email),
    avatarUrl: row.avatar_data || null,
    status: 'active',
    emailVerified: true,
    location: row.location || null,
    phone: row.phone || null,
    bio: 'Зарегистрированный клиент сайта Portfolio.'
  };
}

async function deliverVerificationCode(email, code) {
  const showOnScreen = isRegisterShowCodeOnScreen();

  if (isRegisterDemoMode()) {
    console.log(`[Site Demo Register] Код для ${email}: ${code}`);

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
          message: `Демо-режим: код на экране. Письмо также отправлено на ${delivery.to}.`
        };
      } catch (error) {
        return {
          demoMode: true,
          showCodeOnScreen: true,
          demoCode: code,
          sentTo: email,
          mailSent: false,
          message: `Демо-режим: код показан на экране.`
        };
      }
    }

    return {
      demoMode: true,
      showCodeOnScreen: true,
      demoCode: code,
      mailSent: false,
      message: 'Демо-режим: код показан на экране.'
    };
  }

  try {
    const delivery = await sendRegistrationCodeEmail({
      to: email,
      code,
      expiresMinutes: CODE_TTL_MINUTES
    });
    return {
      demoMode: false,
      showCodeOnScreen: showOnScreen,
      demoCode: showOnScreen ? code : undefined,
      sentTo: delivery.to,
      mailSent: true,
      message: showOnScreen
        ? `Код отправлен на ${delivery.to}. Код также показан на экране.`
        : `Код отправлен на ${delivery.to}.`
    };
  } catch (error) {
    if (!showOnScreen) throw error;
    return {
      demoMode: false,
      showCodeOnScreen: true,
      demoCode: code,
      sentTo: email,
      mailSent: false,
      message: `Письмо не доставлено. Код показан на экране.`
    };
  }
}

function getPoolSafe(getPool) {
  try {
    return getPool();
  } catch {
    return null;
  }
}

function registerSiteRegisterRoutes(app, getPool) {
  app.post('/api/site/register/send-code', async (req, res) => {
    const validation = validateCredentials(
      req.body?.name,
      req.body?.email,
      req.body?.password,
      req.body?.confirmPassword
    );

    if (!validation.ok) {
      return res.status(400).json({ error: validation.error, checks: validation.checks });
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

      if (await siteUserExists(pool, email)) {
        return res.status(409).json({ error: 'Такой пользователь уже зарегистрирован.' });
      }

      await savePendingRegistration(pool, email, { code, name, passwordHash });
      const delivery = await deliverVerificationCode(email, code);

      res.json({
        ok: true,
        message: delivery.message,
        demoMode: delivery.demoMode,
        showCodeOnScreen: delivery.showCodeOnScreen,
        demoCode: delivery.demoCode,
        mailSent: delivery.mailSent,
        sentTo: delivery.sentTo || email,
        email
      });
    } catch (error) {
      res.status(503).json({ error: error.message || 'Не удалось отправить код' });
    }
  });

  app.post('/api/site/register/verify', async (req, res) => {
    const emailResult = validateEmailAddress(String(req.body?.email || '').trim());
    const emailCode = String(req.body?.emailCode || '').trim();

    if (!emailResult.ok) {
      return res.status(400).json({ error: emailResult.error });
    }

    if (!/^\d{6}$/.test(emailCode)) {
      return res.status(400).json({ error: 'Введите 6-значный код из email' });
    }

    const email = emailResult.email;

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

      if (await siteUserExists(pool, email)) {
        await clearPendingRegistration(pool, email);
        return res.status(409).json({ error: 'Такой пользователь уже зарегистрирован.' });
      }

      await persistSiteUser(pool, pending.name, email, pending.password_hash);
      await clearPendingRegistration(pool, email);
      const storedUser = await findSiteUserByEmail(pool, email);

      res.status(201).json({
        ok: true,
        message: 'Регистрация завершена. Добро пожаловать на сайт!',
        user: formatSiteUserProfile(storedUser, 'register')
      });
    } catch (error) {
      if (error.code === 'USER_ALREADY_EXISTS') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'Не удалось подтвердить регистрацию' });
    }
  });

  app.post('/api/site/register/login', async (req, res) => {
    const emailResult = validateEmailAddress(req.body?.email);
    const password = String(req.body?.password || '');

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

      const user = await findSiteUserByEmail(pool, emailResult.email);
      if (!user) {
        return res.status(404).json({ error: 'Такого аккаунта нет. Сначала зарегистрируйтесь.' });
      }

      const passwordHash = hashPassword(password);
      if (user.password_hash !== passwordHash) {
        return res.status(401).json({ error: 'Неверный пароль' });
      }

      res.json({
        ok: true,
        message: `Добро пожаловать, ${user.name || user.email}!`,
        user: formatSiteUserProfile(user, 'login')
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Не удалось выполнить вход' });
    }
  });

  app.get('/api/site/register/profile', async (req, res) => {
    const emailResult = validateEmailAddress(req.query?.email);
    if (!emailResult.ok) {
      return res.status(400).json({ error: emailResult.error });
    }

    try {
      const pool = getPoolSafe(getPool);
      if (!pool) {
        return res.status(503).json({ error: 'База данных недоступна' });
      }

      const user = await findSiteUserByEmail(pool, emailResult.email);
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const entryType = String(req.query?.entryType || 'login').trim();
      res.json({ user: formatSiteUserProfile(user, entryType) });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Не удалось загрузить профиль' });
    }
  });

  app.post('/api/site/register/profile/contact', async (req, res) => {
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

      await ensureSiteUsersProfileColumns(pool);
      const user = await findSiteUserByEmail(pool, emailResult.email);
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      await pool.query(
        'UPDATE site_users SET location = ?, phone = ? WHERE email = ?',
        [location, phone, emailResult.email]
      );

      const updatedUser = await findSiteUserByEmail(pool, emailResult.email);
      const entryType = String(req.body?.entryType || 'login').trim();
      res.json({
        ok: true,
        message: 'Контактная информация сохранена',
        user: formatSiteUserProfile(updatedUser, entryType)
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Не удалось сохранить контакты' });
    }
  });

  app.post('/api/site/register/profile/avatar', async (req, res) => {
    const emailResult = validateEmailAddress(req.body?.email);
    if (!emailResult.ok) {
      return res.status(400).json({ error: emailResult.error });
    }

    const avatarData = req.body?.avatarData;
    const shouldDelete = avatarData === null || avatarData === '';

    if (!shouldDelete) {
      const avatarValue = String(avatarData || '').trim();
      if (!avatarValue.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Загрузите изображение JPG, PNG или WebP' });
      }
      if (avatarValue.length > 600000) {
        return res.status(400).json({ error: 'Изображение слишком большое' });
      }
    }

    try {
      const pool = getPoolSafe(getPool);
      if (!pool) {
        return res.status(503).json({ error: 'База данных недоступна' });
      }

      await ensureSiteUsersProfileColumns(pool);
      const user = await findSiteUserByEmail(pool, emailResult.email);
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      await pool.query(
        'UPDATE site_users SET avatar_data = ? WHERE email = ?',
        [shouldDelete ? null : String(avatarData).trim(), emailResult.email]
      );

      const updatedUser = await findSiteUserByEmail(pool, emailResult.email);
      const entryType = String(req.body?.entryType || 'login').trim();
      res.json({
        ok: true,
        message: shouldDelete ? 'Фото профиля удалено' : 'Аватар обновлён',
        user: formatSiteUserProfile(updatedUser, entryType)
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Не удалось сохранить аватар' });
    }
  });
}

module.exports = {
  registerSiteRegisterRoutes,
  formatSiteUserProfile
};
