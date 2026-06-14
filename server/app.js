const express = require('express');
const cors = require('cors');
require('dotenv').config();

const lineRoutes = require('./routes/lines');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const workOrderRoutes = require('./routes/workOrders');
const recordRoutes = require('./routes/records');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/lines', lineRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workorders', workOrderRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '生产工单跟踪系统 API 服务正常运行', time: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: true, message: '服务器内部错误', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器已启动: http://localhost:${PORT}`);
  console.log(`📡 API 健康检查: http://localhost:${PORT}/api/health`);
});
