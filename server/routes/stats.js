const router = require('express').Router();
const pool = require('../config/db');

router.get('/overview', async (req, res) => {
  try {
    const [result] = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as in_progress_orders,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed_orders,
        COALESCE(SUM(plan_qty), 0) as total_plan_qty,
        COALESCE(SUM(completed_qty), 0) as total_completed_qty,
        COALESCE(SUM(defect_qty), 0) as total_defect_qty,
        COALESCE(SUM(total_work_hours), 0) as total_work_hours
      FROM work_orders
    `);
    const data = result[0];
    data.total_completion_rate = data.total_plan_qty > 0
      ? +((data.total_completed_qty / data.total_plan_qty) * 100).toFixed(2)
      : 0;
    const totalQty = data.total_completed_qty + data.total_defect_qty;
    data.total_defect_rate = totalQty > 0
      ? +((data.total_defect_qty / totalQty) * 100).toFixed(2)
      : 0;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/by-line', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        l.id as line_id,
        l.line_name,
        l.line_code,
        COUNT(w.id) as order_count,
        COALESCE(SUM(w.plan_qty), 0) as plan_qty,
        COALESCE(SUM(w.completed_qty), 0) as completed_qty,
        COALESCE(SUM(w.defect_qty), 0) as defect_qty,
        COALESCE(SUM(w.total_work_hours), 0) as work_hours
      FROM production_lines l
      LEFT JOIN work_orders w ON l.id = w.line_id
      WHERE l.status = 1
      GROUP BY l.id, l.line_name, l.line_code
      ORDER BY l.id
    `);
    rows.forEach(r => {
      r.completion_rate = r.plan_qty > 0 ? +((r.completed_qty / r.plan_qty) * 100).toFixed(2) : 0;
      const total = r.completed_qty + r.defect_qty;
      r.defect_rate = total > 0 ? +((r.defect_qty / total) * 100).toFixed(2) : 0;
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/orders-rank', async (req, res) => {
  const { limit = 10 } = req.query;
  try {
    const [rows] = await pool.query(`
      SELECT
        w.id, w.order_no,
        l.line_name,
        p.product_name, p.product_model,
        w.plan_qty, w.completed_qty, w.defect_qty,
        ROUND(CASE WHEN w.plan_qty > 0 THEN (w.completed_qty / w.plan_qty) * 100 ELSE 0 END, 2) as completion_rate,
        ROUND(CASE WHEN (w.completed_qty + w.defect_qty) > 0
          THEN (w.defect_qty / (w.completed_qty + w.defect_qty)) * 100 ELSE 0 END, 2) as defect_rate,
        w.status
      FROM work_orders w
      LEFT JOIN production_lines l ON w.line_id = l.id
      LEFT JOIN products p ON w.product_id = p.id
      ORDER BY completion_rate DESC
      LIMIT ?
    `, [parseInt(limit)]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/recent-records', async (req, res) => {
  const { limit = 20 } = req.query;
  try {
    const [rows] = await pool.query(`
      SELECT
        r.*,
        w.order_no,
        l.line_name,
        p.product_name, p.product_model,
        u.real_name as user_name
      FROM production_records r
      LEFT JOIN work_orders w ON r.order_id = w.id
      LEFT JOIN production_lines l ON w.line_id = l.id
      LEFT JOIN products p ON w.product_id = p.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
