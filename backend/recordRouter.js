const express = require('express');
const router = express.Router();
const pool = require('./db');
const { authenticateToken } = require('./securityGateway');
const checkRole = require('./rbacMiddleware');

// Helper to safely parse stringified or object JSON payloads
const parsePayload = (body) => {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (e) {
      return null;
    }
  }
  return body;
};

// 1. CREATE Record (POST /api/records/:entity) - Admin & Developer
router.post('/:entity', authenticateToken, checkRole(['admin', 'developer']), async (req, res) => {
  const { entity } = req.params;
  const payload = parsePayload(req.body);

  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'Payload body cannot be empty or invalid JSON.' });
  }

  try {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;

    const queryText = `
      INSERT INTO records (entity_type, entity_name, data, user_id)
      VALUES ($1, $1, $2, $3)
      RETURNING *;
    `;

    const result = await pool.query(queryText, [entity, JSON.stringify(payload), userId]);

    return res.status(201).json({
      status: 'success',
      entity,
      record: result.rows[0]
    });
  } catch (err) {
    console.error('[RECORD ROUTER POST ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to insert record.', details: err.message });
  }
});

// 2. READ ALL Records for Entity with Pagination & Search (GET /api/records/:entity)
router.get('/:entity', authenticateToken, checkRole(['admin', 'developer', 'viewer']), async (req, res) => {
  const { entity } = req.params;
  const userId = req.user?.id || req.user?.userId || req.user?.sub;

  // Extract query parameters for pagination, searching, and sorting
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || '';
  const order = (req.query.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  try {
    // Dynamic query construction for search filtering over JSON data
    let baseWhere = `
      WHERE (entity_type = $1 OR entity_name = $1 OR entity_type IS NULL) 
        AND (user_id = $2 OR $2 IS NULL)
    `;
    const queryParams = [entity, userId];

    if (search) {
      queryParams.push(`%${search}%`);
      baseWhere += ` AND (data::text ILIKE $${queryParams.length})`;
    }

    // 1. Get total count for metadata
    const countQuery = `SELECT COUNT(*) FROM records ${baseWhere};`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    // 2. Fetch paginated records
    queryParams.push(limit, offset);
    const dataQuery = `
      SELECT * FROM records 
      ${baseWhere}
      ORDER BY id ${order}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length};
    `;
    const result = await pool.query(dataQuery, queryParams);

    return res.json({
      status: 'success',
      entity,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      },
      data: result.rows
    });
  } catch (err) {
    console.error('[RECORD ROUTER GET ALL ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to fetch records.', details: err.message });
  }
});

// 3. READ SINGLE Record by ID (GET /api/records/:entity/:id) - Admin, Developer, Viewer
router.get('/:entity/:id', authenticateToken, checkRole(['admin', 'developer', 'viewer']), async (req, res) => {
  const { entity, id } = req.params;
  const recordId = parseInt(id, 10);

  if (isNaN(recordId)) {
    return res.status(400).json({ error: 'Invalid record ID format.' });
  }

  try {
    const queryText = `
      SELECT * FROM records 
      WHERE id = $1;
    `;

    const result = await pool.query(queryText, [recordId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    return res.json({
      status: 'success',
      entity,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('[RECORD ROUTER GET ONE ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to fetch record.', details: err.message });
  }
});

// 4. UPDATE Record by ID (PUT /api/records/:entity/:id) - Admin & Developer
router.put('/:entity/:id', authenticateToken, checkRole(['admin', 'developer']), async (req, res) => {
  const { entity, id } = req.params;
  const recordId = parseInt(id, 10);
  const payload = parsePayload(req.body);

  if (isNaN(recordId)) {
    return res.status(400).json({ error: 'Invalid record ID format.' });
  }

  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'Payload body cannot be empty or invalid JSON.' });
  }

  try {
    const queryText = `
      UPDATE records
      SET data = $1
      WHERE id = $2
      RETURNING *;
    `;

    const result = await pool.query(queryText, [
      JSON.stringify(payload),
      recordId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    return res.json({
      status: 'success',
      entity,
      record: result.rows[0]
    });
  } catch (err) {
    console.error('[RECORD ROUTER PUT ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to update record.', details: err.message });
  }
});

// 5. DELETE Record by ID (DELETE /api/records/:entity/:id) - Admin ONLY
router.delete('/:entity/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
  const { entity, id } = req.params;
  const recordId = parseInt(id, 10);

  if (isNaN(recordId)) {
    return res.status(400).json({ error: 'Invalid record ID format.' });
  }

  try {
    const queryText = `
      DELETE FROM records 
      WHERE id = $1 
      RETURNING *;
    `;

    const result = await pool.query(queryText, [recordId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found or already deleted.' });
    }

    return res.json({
      status: 'success',
      message: `Record ${recordId} deleted successfully.`,
      deletedRecord: result.rows[0]
    });
  } catch (err) {
    console.error('[RECORD ROUTER DELETE ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to delete record.', details: err.message });
  }
});

module.exports = router;