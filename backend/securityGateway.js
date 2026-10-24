const jwt = require('jsonwebtoken');
const pool = require('./db');

exports.authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const apiKey = req.headers['x-api-key'];

  // Option A: API Key Authentication
  if (apiKey) {
    try {
      const keyQuery = await pool.query(
        'SELECT k.user_id, u.role FROM api_keys k JOIN users u ON k.user_id = u.id WHERE k.key_value = $1',
        [apiKey]
      );

      if (keyQuery.rows.length === 0) {
        return res.status(403).json({ error: 'Invalid or revoked API Key.' });
      }

      req.user = { id: keyQuery.rows[0].user_id, role: keyQuery.rows[0].role };
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'API Key verification failed.' });
    }
  }

  // Option B: JWT Authentication
  if (!token) {
    return res.status(401).json({ error: 'Access token or API key required.' });
  }

  // Fixed fallback key to match server.js
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecretnova_key_2026';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired JWT token.' });
    }
    req.user = user;
    next();
  });
};