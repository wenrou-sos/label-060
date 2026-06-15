const router = require('express').Router();
const pool = require('../config/db');

const num = (v) => (v === null || v === undefined) ? 0 : Number(v);

function generateOrderNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `WO${y}${m}${day}${rand}`;
}

function calcRates(r) {
  const plan_qty = num(r.plan_qty);
  const completed_qty = num(r.completed_qty);
  const defect_qty = num(r.defect_qty);
  const defect_threshold = r.defect_threshold === null || r.defect_threshold === undefined ? 5 : num(r.defect_threshold);
  r.plan_qty = plan_qty;
  r.completed_qty = completed_qty;
  r.defect_qty = defect_qty;
  r.total_work_hours = num(r.total_work_hours);
  r.defect_threshold = defect_threshold;
  r.completion_rate = plan_qty > 0 ? +((completed_qty / plan_qty) * 100).toFixed(2) : 0;
  const totalQty = completed_qty + defect_qty;
  r.defect_rate = totalQty > 0 ? +((defect_qty / totalQty) * 100).toFixed(2) : 0;
  r.defect_alert = totalQty > 0 && r.defect_rate > defect_threshold;
  r.id = num(r.id);
  r.line_id = num(r.line_id);
  r.product_id = num(r.product_id);
  r.status = num(r.status);
  r.assigned_by = num(r.assigned_by);
  return r;
}

router.get('/', async (req, res) => {
  const { status, line_id } = req.query;
  let sql = `
    SELECT w.*, l.line_name, l.line_code, 
           p.product_name, p.product_model, p.unit,
           u.real_name as assigned_by_name
    FROM work_orders w
    LEFT JOIN production_lines l ON w.line_id = l.id
    LEFT JOIN products p ON w.product_id = p.id
    LEFT JOIN users u ON w.assigned_by = u.id
  `;
  const conditions = [];
  const params = [];
  if (status !== undefined && status !== '' && status !== null) {
    conditions.push('w.status = ?');
    params.push(status);
  }
  if (line_id) {
    conditions.push('w.line_id = ?');
    params.push(line_id);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY w.created_at DESC';

  try {
    const [rows] = await pool.query(sql, params);
    rows.forEach(calcRates);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.*, l.line_name, l.line_code, 
              p.product_name, p.product_model, p.unit,
              u.real_name as assigned_by_name
       FROM work_orders w
       LEFT JOIN production_lines l ON w.line_id = l.id
       LEFT JOIN products p ON w.product_id = p.id
       LEFT JOIN users u ON w.assigned_by = u.id
       WHERE w.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '工单不存在' });
    }
    calcRates(rows[0]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { line_id, product_id, plan_qty, assigned_by, remark, defect_threshold } = req.body;
  const order_no = generateOrderNo();
  try {
    const [result] = await pool.query(
      `INSERT INTO work_orders 
       (order_no, line_id, product_id, plan_qty, assigned_by, remark, defect_threshold) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [order_no, line_id, product_id, plan_qty, assigned_by, remark || null,
       defect_threshold !== undefined && defect_threshold !== null ? num(defect_threshold) : 5.00]
    );
    res.json({ success: true, data: { id: result.insertId, order_no }, message: '工单创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, line_id, product_id, plan_qty, remark, defect_threshold } = req.body;

  try {
    const conn = await pool.getConnection();
    let fields = [];
    let params = [];

    if (line_id !== undefined) { fields.push('line_id = ?'); params.push(line_id); }
    if (product_id !== undefined) { fields.push('product_id = ?'); params.push(product_id); }
    if (plan_qty !== undefined) { fields.push('plan_qty = ?'); params.push(plan_qty); }
    if (remark !== undefined) { fields.push('remark = ?'); params.push(remark); }
    if (defect_threshold !== undefined && defect_threshold !== null) {
      fields.push('defect_threshold = ?'); params.push(num(defect_threshold));
    }
    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status);
      if (status == 1) {
        fields.push('start_time = IF(start_time IS NULL, NOW(), start_time)');
      } else if (status == 2) {
        fields.push('end_time = NOW()');
      }
    }

    if (fields.length === 0) {
      conn.release();
      return res.json({ success: true, message: '无更新内容' });
    }

    params.push(id);
    const sql = `UPDATE work_orders SET ${fields.join(', ')} WHERE id = ?`;
    await conn.query(sql, params);
    conn.release();

    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM work_orders WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
