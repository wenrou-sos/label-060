const router = require('express').Router();
const pool = require('../config/db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT u.*, l.line_name FROM users u 
       LEFT JOIN production_lines l ON u.line_id = l.id 
       WHERE u.username = ? AND u.password = ? AND u.status = 1`,
      [username, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    const user = rows[0];
    delete user.password;
    res.json({ success: true, data: user, message: '登录成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', async (req, res) => {
  const { role } = req.query;
  let sql = `SELECT u.*, l.line_name FROM users u LEFT JOIN production_lines l ON u.line_id = l.id`;
  const params = [];
  if (role) {
    sql += ' WHERE u.role = ?';
    params.push(role);
  }
  sql += ' ORDER BY u.id';
  try {
    const [rows] = await pool.query(sql, params);
    rows.forEach(r => delete r.password);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.*, l.line_name FROM users u LEFT JOIN production_lines l ON u.line_id = l.id WHERE u.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    delete rows[0].password;
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
