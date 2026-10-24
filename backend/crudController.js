const pool = require('./db');

// 1. GET ALL RECORDS (Filtered by dynamic entity AND logged-in user)
exports.getRecords = async (req, res) => {
  try {
    const { entity } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM records WHERE entity_name = $1 AND user_id = $2 ORDER BY created_at DESC', 
      [entity, userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('CRITICAL ERROR in getRecords:', err);
    res.status(500).json({ error: err.message });
  }
};

// 2. CREATE RECORD (Attach entity_name AND user_id)
exports.createRecord = async (req, res) => {
  try {
    const { entity } = req.params;
    const userId = req.user.id;
    const { title, content, description } = req.body;
    const recordDesc = description || content || '';

    if (!userId) {
      return res.status(401).json({ error: 'User ID missing from authenticated token.' });
    }

    const result = await pool.query(
      'INSERT INTO records (entity_name, user_id, title, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [entity, userId, title, recordDesc]
    );

    console.log('Record successfully inserted into PostgreSQL:', result.rows[0]);
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('CRITICAL ERROR in createRecord:', err);
    res.status(500).json({ error: err.message });
  }
};

// 3. UPDATE RECORD (Scoped to record id AND user_id)
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, content, description } = req.body;
    const recordDesc = description || content || '';

    const result = await pool.query(
      'UPDATE records SET title = $1, description = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [title, recordDesc, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found or access denied.' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('CRITICAL ERROR in updateRecord:', err);
    res.status(500).json({ error: err.message });
  }
};

// 4. DELETE RECORD (Scoped to record id AND user_id)
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM records WHERE id = $1 AND user_id = $2 RETURNING *', 
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found or access denied.' });
    }

    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error('CRITICAL ERROR in deleteRecord:', err);
    res.status(500).json({ error: err.message });
  }
};