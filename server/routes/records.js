const router = require('express').Router();
const pool = require('../config/db');

const num = (v) => (v === null || v === undefined) ? 0 : Number(v);

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
    const data = rows.map(r => ({
      id: num(r.id),
      order_id: num(r.order_id),
      user_id: num(r.user_id),
      completed_qty: num(r.completed_qty),
      defect_qty: num(r.defect_qty),
      work_hours: num(r.work_hours),
      defect_reason: r.defect_reason,
      remark: r.remark,
      created_at: r.created_at,
      order_no: r.order_no,
      user_name: r.user_name
    }));
    res.json({
      success: true,
      data,
      total: num(countResult[0].total),
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { order_id, user_id, completed_qty, defect_qty, work_hours, defect_reason, remark } = req.body;
  const addCompleted = num(completed_qty);
  const addDefect = num(defect_qty);
  const addHours = num(work_hours);

  try {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      'SELECT completed_qty, defect_qty, defect_threshold FROM work_orders WHERE id = ? FOR UPDATE',
      [order_id]
    );
    if (orderRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: '工单不存在' });
    }
    const cur = orderRows[0];
    const beforeCompleted = num(cur.completed_qty);
    const beforeDefect = num(cur.defect_qty);
    const threshold = cur.defect_threshold === null || cur.defect_threshold === undefined ? 5 : num(cur.defect_threshold);

    const finalCompleted = beforeCompleted + addCompleted;
    const finalDefect = beforeDefect + addDefect;
    const finalTotal = finalCompleted + finalDefect;
    const finalDefectRate = finalTotal > 0 ? +((finalDefect / finalTotal) * 100).toFixed(2) : 0;
    const defect_alert = finalTotal > 0 && finalDefectRate > threshold;

    const [result] = await conn.query(
      `INSERT INTO production_records 
       (order_id, user_id, completed_qty, defect_qty, work_hours, defect_reason, remark) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [order_id, user_id, addCompleted, addDefect, addHours, defect_reason || null, remark || null]
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
      [addCompleted, addDefect, addHours, order_id]
    );

    await conn.commit();
    conn.release();

    const message = defect_alert
      ? `上报成功，但当前工单不良率 ${finalDefectRate}% 已超过阈值 ${threshold}%，请关注！`
      : '上报成功';

    res.json({
      success: true,
      warning: defect_alert,
      message,
      data: {
        id: result.insertId,
        final_defect_rate: finalDefectRate,
        final_completed_qty: finalCompleted,
        final_defect_qty: finalDefect,
        defect_threshold: threshold,
        defect_alert
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
