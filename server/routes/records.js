const router = require('express').Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  const { order_id, user_id, page = 1, pageSize = 20 } = req.query;
  let sql = `
    SELECT r.*, w.order_no, u.real_name as user_name
    FROM production_records r
    LEFT JOIN work_orders w ON r.order_id = w.id
    LEFT JOIN users u ON r.user_id = u.id
  `;
  const conditions = [];
  const params = [];
  if (order_id) {
    conditions.push('r.order_id = ?');
    params.push(order_id);
  }
  if (user_id) {
    conditions.push('r.user_id = ?');
    params.push(user_id);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

  try {
    const [rows] = await pool.query(sql, params);
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM production_records r' +
      ((conditions.length > 0) ? ' WHERE ' + conditions.join(' AND ') : ''),
      params.slice(0, -2)
    );
    res.json({
      success: true,
      data: rows,
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { order_id, user_id, completed_qty, defect_qty, work_hours, defect_reason, remark } = req.body;

  try {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO production_records 
       (order_id, user_id, completed_qty, defect_qty, work_hours, defect_reason, remark) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [order_id, user_id, completed_qty || 0, defect_qty || 0, work_hours || 0, defect_reason || null, remark || null]
    );

    await conn.query(
      `UPDATE work_orders SET 
        completed_qty = completed_qty + ?,
        defect_qty = defect_qty + ?,
        total_work_hours = total_work_hours + ?,
        status = CASE 
          WHEN status = 0 THEN 1
          WHEN status = 2 THEN 2
          ELSE status 
        END,
        start_time = IF(start_time IS NULL, NOW(), start_time)
       WHERE id = ?`,
      [completed_qty || 0, defect_qty || 0, work_hours || 0, order_id]
    );

    await conn.commit();
    conn.release();

    res.json({ success: true, data: { id: result.insertId }, message: '上报成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
