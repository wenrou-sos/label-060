const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  try {
    console.log('开始连接 MySQL...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('MySQL 连接成功！');

    const sqlPath = path.join(__dirname, 'sql', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('正在执行初始化脚本...');
    await connection.query(sql);

    console.log('✅ 数据库初始化成功！');
    console.log('📊 已创建表: production_lines, products, users, work_orders, production_records');
    console.log('👤 主管账号: admin / 123456');
    console.log('👤 操作工账号: worker01~worker05 / 123456');

    await connection.end();
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err.message);
    console.log('\n请检查:');
    console.log('1. MySQL 服务是否已启动');
    console.log('2. server/.env 中的数据库配置是否正确');
    console.log('3. 数据库用户是否有创建数据库的权限');
    process.exit(1);
  }
}

initDatabase();
