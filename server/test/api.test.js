const assert = require('assert');
const http = require('http');

const BASE = 'http://localhost:3002/api';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch (e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function test(name, fn) {
  return fn()
    .then(() => { console.log('  ✅ PASS', name); return true; })
    .catch((e) => { console.log('  ❌ FAIL', name, '\n     ', e.message); return false; });
}

async function run() {
  console.log('\n=== 后端 API 测试用例 ===\n');

  let pass = 0, fail = 0;

  const t1 = await test('健康检查 /health 返回 200', async () => {
    const r = await request('GET', '/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'ok');
  });
  t1 ? pass++ : fail++;

  const t2 = await test('用户登录 admin/123456 成功', async () => {
    const r = await request('POST', '/users/login', { username: 'admin', password: '123456' });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.success);
    assert.strictEqual(r.body.data.username, 'admin');
    assert.strictEqual(r.body.data.role, 1);
  });
  t2 ? pass++ : fail++;

  const t3 = await test('用户登录 错误密码 返回 401', async () => {
    const r = await request('POST', '/users/login', { username: 'admin', password: 'wrong' });
    assert.strictEqual(r.status, 401);
    assert.strictEqual(r.body.success, false);
  });
  t3 ? pass++ : fail++;

  const t4 = await test('产线列表 返回启用产线 >=5 且均为数字 id', async () => {
    const r = await request('GET', '/lines');
    assert.ok(r.body.success);
    assert.ok(Array.isArray(r.body.data));
    assert.ok(r.body.data.length >= 5);
    r.body.data.forEach(l => {
      assert.strictEqual(typeof l.id, 'number');
      assert.ok(l.line_name);
    });
  });
  t4 ? pass++ : fail++;

  const t5 = await test('统计 /overview 关键字段均为 Number 类型', async () => {
    const r = await request('GET', '/stats/overview');
    assert.ok(r.body.success);
    const d = r.body.data;
    ['total_orders', 'pending_orders', 'in_progress_orders', 'completed_orders',
     'total_plan_qty', 'total_completed_qty', 'total_defect_qty',
     'total_completion_rate', 'total_defect_rate'].forEach(k => {
      assert.strictEqual(typeof d[k], 'number', `${k} 应为 number 类型，实际为 ${typeof d[k]} = ${d[k]}`);
    });
    assert.ok(d.total_orders >= 5, `总工单数应 >=5，实际 ${d.total_orders}`);
    assert.ok(d.total_defect_rate > 0 && d.total_defect_rate < 100,
      `不良率应合理 (0,100)，实际 ${d.total_defect_rate}`);
    assert.strictEqual(Math.round(d.total_defect_rate * 100) / 100, 2.33,
      `不良率计算应为 100/(4200+100)*100=2.33%，实际 ${d.total_defect_rate}`);
  });
  t5 ? pass++ : fail++;

  const t6 = await test('统计 /by-line 每条产线的 completion_rate/defect_rate 为数字且范围合理', async () => {
    const r = await request('GET', '/stats/by-line');
    assert.ok(r.body.success);
    assert.ok(r.body.data.length >= 5);
    r.body.data.forEach(l => {
      assert.strictEqual(typeof l.completion_rate, 'number');
      assert.strictEqual(typeof l.defect_rate, 'number');
      assert.ok(l.completion_rate >= 0 && l.completion_rate <= 100, `${l.line_name} 完成率异常: ${l.completion_rate}`);
      assert.ok(l.defect_rate >= 0 && l.defect_rate <= 100, `${l.line_name} 不良率异常: ${l.defect_rate}`);
    });
  });
  t6 ? pass++ : fail++;

  const t7 = await test('统计 /orders-rank 按完成率降序排列', async () => {
    const r = await request('GET', '/stats/orders-rank?limit=8');
    assert.ok(r.body.success);
    assert.ok(r.body.data.length >= 2);
    for (let i = 1; i < r.body.data.length; i++) {
      assert.ok(r.body.data[i - 1].completion_rate >= r.body.data[i].completion_rate,
        `排序错误：${r.body.data[i - 1].completion_rate} 应 >= ${r.body.data[i].completion_rate}`);
    }
  });
  t7 ? pass++ : fail++;

  const t8 = await test('统计 /recent-records 返回结构正确 数值字段为 Number', async () => {
    const r = await request('GET', '/stats/recent-records?limit=5');
    assert.ok(r.body.success);
    assert.ok(Array.isArray(r.body.data));
    r.body.data.forEach(rec => {
      assert.strictEqual(typeof rec.completed_qty, 'number');
      assert.strictEqual(typeof rec.defect_qty, 'number');
      assert.strictEqual(typeof rec.work_hours, 'number');
      assert.ok(rec.order_no);
      assert.ok(rec.user_name);
    });
  });
  t8 ? pass++ : fail++;

  let newOrderId = null;
  const t9 = await test('工单 创建 成功 返回新工单ID', async () => {
    const loginR = await request('POST', '/users/login', { username: 'admin', password: '123456' });
    const r = await request('POST', '/workorders', {
      line_id: 1, product_id: 1, plan_qty: 200, assigned_by: loginR.body.data.id, remark: 'API测试工单'
    });
    assert.ok(r.body.success);
    assert.ok(r.body.data.id > 0);
    assert.ok(/^WO\d+/.test(r.body.data.order_no));
    newOrderId = r.body.data.id;
  });
  t9 ? pass++ : fail++;

  const t10 = await test('工单 创建后 GET /:id 返回正确数值类型', async () => {
    if (!newOrderId) throw new Error('跳过：上一步创建工单失败');
    const r = await request('GET', `/workorders/${newOrderId}`);
    assert.ok(r.body.success);
    const d = r.body.data;
    assert.strictEqual(typeof d.plan_qty, 'number');
    assert.strictEqual(typeof d.completed_qty, 'number');
    assert.strictEqual(typeof d.defect_qty, 'number');
    assert.strictEqual(typeof d.completion_rate, 'number');
    assert.strictEqual(typeof d.defect_rate, 'number');
    assert.strictEqual(d.plan_qty, 200);
    assert.strictEqual(d.completion_rate, 0);
  });
  t10 ? pass++ : fail++;

  const t11 = await test('工单 上报生产记录 事务更新完成数量与不良率计算正确', async () => {
    if (!newOrderId) throw new Error('跳过：无工单可上报');
    const loginR = await request('POST', '/users/login', { username: 'worker01', password: '123456' });
    const r = await request('POST', '/records', {
      order_id: newOrderId, user_id: loginR.body.data.id,
      completed_qty: 100, defect_qty: 5, work_hours: 4,
      defect_reason: '测试不良原因', remark: '测试'
    });
    assert.ok(r.body.success, r.body.message);
    assert.ok(r.body.data.id > 0);

    const detail = await request('GET', `/workorders/${newOrderId}`);
    const d = detail.body.data;
    assert.strictEqual(d.completed_qty, 100, `完成数应为 100，实际 ${d.completed_qty}`);
    assert.strictEqual(d.defect_qty, 5, `不良数应为 5，实际 ${d.defect_qty}`);
    assert.strictEqual(d.completion_rate, 50, `完成率应为 50%，实际 ${d.completion_rate}`);
    const expectedDefect = +((5 / (100 + 5)) * 100).toFixed(2);
    assert.strictEqual(d.defect_rate, expectedDefect, `不良率应为 ${expectedDefect}%，实际 ${d.defect_rate}`);
  });
  t11 ? pass++ : fail++;

  const t12 = await test('工单列表 GET /workorders 返回 completion_rate/defect_rate 字段类型正确', async () => {
    const r = await request('GET', '/workorders');
    assert.ok(r.body.success);
    assert.ok(r.body.data.length >= 1);
    r.body.data.forEach(o => {
      assert.strictEqual(typeof o.completion_rate, 'number', `工单 ${o.order_no} completion_rate 不是 number`);
      assert.strictEqual(typeof o.defect_rate, 'number', `工单 ${o.order_no} defect_rate 不是 number`);
    });
  });
  t12 ? pass++ : fail++;

  const t13 = await test('生产记录 GET /records 返回 total 为 number 且记录数值字段为 number', async () => {
    const r = await request('GET', '/records?pageSize=5');
    assert.ok(r.body.success);
    assert.strictEqual(typeof r.total, 'undefined', '应该返回顶层 total 字段');
    assert.strictEqual(typeof r.body.total, 'number');
    r.body.data.forEach(rec => {
      assert.strictEqual(typeof rec.completed_qty, 'number');
      assert.strictEqual(typeof rec.defect_qty, 'number');
    });
  });
  t13 ? pass++ : fail++;

  let alertOrderId = null;
  const t14 = await test('【告警】工单创建默认 defect_threshold=5.00，defect_alert=false', async () => {
    const loginR = await request('POST', '/users/login', { username: 'admin', password: '123456' });
    const r = await request('POST', '/workorders', {
      line_id: 2, product_id: 2, plan_qty: 100, assigned_by: loginR.body.data.id, remark: '告警测试工单'
    });
    assert.ok(r.body.success);
    alertOrderId = r.body.data.id;
    const detail = await request('GET', `/workorders/${alertOrderId}`);
    const d = detail.body.data;
    assert.strictEqual(typeof d.defect_threshold, 'number', `defect_threshold 应为 number，实际 ${typeof d.defect_threshold} = ${d.defect_threshold}`);
    assert.strictEqual(d.defect_threshold, 5.00, `默认阈值应为 5.00，实际 ${d.defect_threshold}`);
    assert.strictEqual(d.defect_alert, false, `初始 defect_alert 应为 false`);
  });
  t14 ? pass++ : fail++;

  const t15 = await test('【告警】上报不良率超阈值 => 返回 warning=true 和 defect_alert=true', async () => {
    if (!alertOrderId) throw new Error('跳过：告警工单未创建');
    const loginR = await request('POST', '/users/login', { username: 'worker02', password: '123456' });
    const r = await request('POST', '/records', {
      order_id: alertOrderId, user_id: loginR.body.data.id,
      completed_qty: 80, defect_qty: 10, work_hours: 2
    });
    assert.ok(r.body.success, r.body.message);
    assert.strictEqual(r.body.warning, true, `返回 warning 应为 true，实际 ${r.body.warning}`);
    assert.strictEqual(typeof r.body.data.final_defect_rate, 'number', `final_defect_rate 应为 number`);
    const expectedRate = +((10 / (80 + 10)) * 100).toFixed(2);
    assert.strictEqual(r.body.data.final_defect_rate, expectedRate,
      `final_defect_rate 应为 ${expectedRate}%，实际 ${r.body.data.final_defect_rate}`);
    assert.strictEqual(r.body.data.defect_alert, true, `data.defect_alert 应为 true`);
    assert.ok(/超过阈值/.test(r.body.message), `message 应包含"超过阈值"，实际 ${r.body.message}`);

    const detail = await request('GET', `/workorders/${alertOrderId}`);
    assert.strictEqual(detail.body.data.defect_alert, true, `工单详情 defect_alert 应为 true`);
  });
  t15 ? pass++ : fail++;

  let lowThresholdOrderId = null;
  const t16 = await test('【告警】创建工单自定义阈值 + PUT 更新阈值', async () => {
    const loginR = await request('POST', '/users/login', { username: 'admin', password: '123456' });
    const r = await request('POST', '/workorders', {
      line_id: 3, product_id: 3, plan_qty: 200, defect_threshold: 2.5,
      assigned_by: loginR.body.data.id, remark: '自定义阈值工单'
    });
    assert.ok(r.body.success);
    lowThresholdOrderId = r.body.data.id;
    let detail = await request('GET', `/workorders/${lowThresholdOrderId}`);
    assert.strictEqual(detail.body.data.defect_threshold, 2.5,
      `自定义阈值应为 2.5，实际 ${detail.body.data.defect_threshold}`);

    const updateR = await request('PUT', `/workorders/${lowThresholdOrderId}`, { defect_threshold: 3.8 });
    assert.ok(updateR.body.success);
    detail = await request('GET', `/workorders/${lowThresholdOrderId}`);
    assert.strictEqual(detail.body.data.defect_threshold, 3.8,
      `更新阈值应为 3.8，实际 ${detail.body.data.defect_threshold}`);
  });
  t16 ? pass++ : fail++;

  const t17 = await test('【告警】统计 /orders-rank 返回 defect_threshold + defect_alert 字段', async () => {
    const r = await request('GET', '/stats/orders-rank?limit=10');
    assert.ok(r.body.success);
    assert.ok(r.body.data.length >= 1);
    r.body.data.forEach(o => {
      assert.strictEqual(typeof o.defect_threshold, 'number',
        `工单 ${o.order_no} defect_threshold 应为 number，实际 ${typeof o.defect_threshold}`);
      assert.strictEqual(typeof o.defect_alert, 'boolean',
        `工单 ${o.order_no} defect_alert 应为 boolean，实际 ${typeof o.defect_alert}`);
    });
  });
  t17 ? pass++ : fail++;

  await test('清理：删除测试工单', async () => {
    if (newOrderId) await request('DELETE', `/workorders/${newOrderId}`);
    if (alertOrderId) await request('DELETE', `/workorders/${alertOrderId}`);
    if (lowThresholdOrderId) await request('DELETE', `/workorders/${lowThresholdOrderId}`);
    return true;
  });

  console.log(`\n=== 测试结果: ${pass} 通过, ${fail} 失败 ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('测试框架异常:', e); process.exit(1); });
