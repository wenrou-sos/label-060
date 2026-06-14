const router = require('express').Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { product_name, product_model, specification, unit } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO products (product_name, product_model, specification, unit) VALUES (?, ?, ?, ?)',
      [product_name, product_model, specification || '', unit || '件']
    );
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { product_name, product_model, specification, unit } = req.body;
  try {
    await pool.query(
      'UPDATE products SET product_name = ?, product_model = ?, specification = ?, unit = ? WHERE id = ?',
      [product_name, product_model, specification, unit, id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
