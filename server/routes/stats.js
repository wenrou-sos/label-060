const router = require('express').Router();
const pool = require('../config/db');

const num = (v) => (v === null || v === undefined) ? 0 : Number(v);

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
    const raw = result[0];
    const data = {
      total_orders: num(raw.total_orders),
      pending_orders: num(raw.pending_orders),
      in_progress_orders: num(raw.in_progress_orders),
      completed_orders: num(raw.completed_orders),
      total_plan_qty: num(raw.total_plan_qty),
      total_completed_qty: num(raw.total_completed_qty),
      total_defect_qty: num(raw.total_defect_qty),
      total_work_hours: num(raw.total_work_hours)
    };
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
    const data = rows.map(r => {
      const plan_qty = num(r.plan_qty);
      const completed_qty = num(r.completed_qty);
      const defect_qty = num(r.defect_qty);
      const completion_rate = plan_qty > 0 ? +((completed_qty / plan_qty) * 100).toFixed(2) : 0;
      const total = completed_qty + defect_qty;
      const defect_rate = total > 0 ? +((defect_qty / total) * 100).toFixed(2) : 0;
      return {
        line_id: num(r.line_id),
        line_name: r.line_name,
        line_code: r.line_code,
        order_count: num(r.order_count),
        plan_qty, completed_qty, defect_qty,
        work_hours: num(r.work_hours),
        completion_rate, defect_rate
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/orders-rank', async (req, res) => {
  const { limit = 10 } = req.query;
  try {
    const [rows] = await pool.query(`
      SELECT
        w.id, w.order_no, w.plan_qty, w.completed_qty, w.defect_qty, w.status, w.defect_threshold,
        l.line_name,
        p.product_name, p.product_model
      FROM work_orders w
      LEFT JOIN production_lines l ON w.line_id = l.id
      LEFT JOIN products p ON w.product_id = p.id
      ORDER BY w.completed_qty / NULLIF(w.plan_qty, 0) DESC
      LIMIT ?
    `, [parseInt(limit)]);
    const data = rows.map(r => {
      const plan_qty = num(r.plan_qty);
      const completed_qty = num(r.completed_qty);
      const defect_qty = num(r.defect_qty);
      const defect_threshold = r.defect_threshold === null || r.defect_threshold === undefined ? 5 : num(r.defect_threshold);
      const completion_rate = plan_qty > 0 ? +((completed_qty / plan_qty) * 100).toFixed(2) : 0;
      const total = completed_qty + defect_qty;
      const defect_rate = total > 0 ? +((defect_qty / total) * 100).toFixed(2) : 0;
      return {
        id: num(r.id),
        order_no: r.order_no,
        line_name: r.line_name,
        product_name: r.product_name,
        product_model: r.product_model,
        plan_qty, completed_qty, defect_qty,
        completion_rate, defect_rate, defect_threshold,
        defect_alert: total > 0 && defect_rate > defect_threshold,
        status: num(r.status)
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/recent-records', async (req, res) => {
  const { limit = 20 } = req.query;
  try {
    const [rows] = await pool.query(`
      SELECT
        r.id, r.order_id, r.user_id, r.completed_qty, r.defect_qty, r.work_hours, r.defect_reason, r.remark, r.created_at,
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
      line_name: r.line_name,
      product_name: r.product_name,
      product_model: r.product_model,
      user_name: r.user_name
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
