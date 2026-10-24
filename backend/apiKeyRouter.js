// backend/apiKeyRouter.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('./db');
const { authenticateToken } = require('./securityGateway');

// 1. GENERATE NEW API KEY
router.post('/generate', authenticateToken, async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const keyName = req.body.name || 'Default Key';
  const newApiKey = `nova_${crypto.randomBytes(24).toString('hex')}`;

  try {
    const result = await pool.query(
      'INSERT INTO api_keys (user_id, key_value, name) VALUES ($1, $2, $3) RETURNING id, name, key_value, created_at',
      [userId, newApiKey, keyName]
    );

    res.status(201).json({
      status: 'success',
      apiKey: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate API Key.', details: err.message });
  }
});

// 2. LIST ALL API KEYS FOR USER
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id || req.user.userId;

  try {
    const result = await pool.query(
      'SELECT id, name, key_value, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ status: 'success', keys: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch API Keys.', details: err.message });
  }
});

// 3. REVOKE/DELETE API KEY
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API Key not found or access denied.' });
    }

    res.json({ status: 'success', message: 'API Key revoked successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke API Key.', details: err.message });
  }
});

module.exports = router;