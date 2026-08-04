const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'portfolio',
  password: process.env.DB_PASSWORD || 'portfoliopass',
  database: process.env.DB_NAME || 'portfolio',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
};

let pool;

async function waitForDatabase(maxAttempts = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      pool = mysql.createPool(config);
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      return pool;
    } catch (error) {
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }

      if (attempt === maxAttempts) {
        throw error;
      }

      console.log(`Ожидание MySQL (${config.host}:${config.port})... попытка ${attempt}/${maxAttempts}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('База данных ещё не инициализирована');
  }
  return pool;
}

module.exports = {
  waitForDatabase,
  getPool
};
