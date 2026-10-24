const pool = require('./db');

async function initDb() {
  try {
    // Drop existing records table to recreate with correct schema
    await pool.query(`DROP TABLE IF EXISTS records CASCADE;`);

    // Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create records table matching recordRouter.js columns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[NOVA DB] Connected to PostgreSQL instance');
    console.log('✅ Success: "records" and "users" tables initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Initialization Error:', err.message);
    process.exit(1);
  }
}

initDb();