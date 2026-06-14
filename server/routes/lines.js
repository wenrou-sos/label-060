const router = require('express').Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM production_lines WHERE status = 1 ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { line_name, line_code } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO production_lines (line_name, line_code) VALUES (?, ?)',
      [line_name, line_code]
    );
    res.json({ success: true, data: { id: result.insertId, line_name, line_code } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { line_name, line_code, status } = req.body;
  try {
    await pool.query(
      'UPDATE production_lines SET line_name = ?, line_code = ?, status = ? WHERE id = ?',
      [line_name, line_code, status, id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE production_lines SET status = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: '已停用' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
