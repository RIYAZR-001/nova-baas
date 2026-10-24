const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./db');
const recordRouter = require('./recordRouter');
const apiKeyRouter = require('./apiKeyRouter');
const storageRouter = require('./storageRouter');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretnova_key_2026';

// 1. CORS Configuration
app.use(cors({
  origin: ['http://localhost', 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// 2. Security Headers via Helmet
app.use(helmet({ contentSecurityPolicy: false }));

// 3. Rate Limiting Guards
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { status: 'error', message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { status: 'error', message: 'Too many authentication attempts. Please try again later.' }
});

app.use('/api', globalApiLimiter);
app.use('/api/auth', authLimiter);

// Auto-create users and records tables on server startup with automatic retries
const initializeDatabase = async (retries = 5, delay = 3000) => {
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'developer',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[NOVA DB] "users" table verified/created successfully.');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS records (
          id SERIAL PRIMARY KEY,
          entity_type VARCHAR(100),
          entity_name VARCHAR(100) NOT NULL,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[NOVA DB] "records" table verified/created successfully.');
      return;
    } catch (err) {
      retries -= 1;
      console.warn(`[NOVA DB WARNING] Database not ready yet (${err.message}). Retrying in ${delay / 1000}s... (${retries} retries left)`);
      if (retries === 0) {
        console.error('[NOVA DB ERROR] Failed to initialize database tables after multiple retries.');
      } else {
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
};

initializeDatabase();

// Serve uploaded media files publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Interactive Swagger Docs UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'success',
      message: 'NOVA BaaS Engine & Database are online',
      dbTime: dbResult.rows[0].now,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Auth: Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  const name = req.body.name || req.body.username;
  const { email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userRole = role || 'developer';

    const newUser = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [name, email, hashedPassword, userRole]
    );

    return res.status(201).json({
      status: 'success',
      user: newUser.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Username or Email already exists' });
    }
    return res.status(500).json({ message: err.message || 'Database error during registration' });
  }
});

// Auth: Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const passwordHash = user.password || user.password_hash;
    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const tokenRole = user.role || 'developer';

    const token = jwt.sign(
      { id: user.id, userId: user.id, username: user.username, role: tokenRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      status: 'success',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: tokenRole }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
});

// Dynamic Records Router
app.use('/api/records', recordRouter);

// API Key Management Router
app.use('/api/keys', apiKeyRouter);

// Storage & File Upload Router
app.use('/api/storage', storageRouter);

app.listen(PORT, () => {
  console.log(`[NOVA] Hardened Server running on http://localhost:${PORT}`);
  console.log(`[NOVA] Swagger API Docs running on http://localhost:${PORT}/api-docs`);
});