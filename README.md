# 🏭 生产工单执行跟踪系统

一个完整的全栈生产工单管理系统，支持车间主管创建工单、操作工上报生产进度、实时查看完成率与不良率统计。

## 技术栈

- **前端**: Vue 3 + Vite + Element Plus + Vue Router + Axios
- **后端**: Node.js + Express + MySQL2
- **数据库**: MySQL 5.7 / 8.0+

## 项目结构

```
label-060/
├── server/                    # 后端服务 (Node.js + Express)
│   ├── config/
│   │   └── db.js             # MySQL 数据库连接池配置
│   ├── routes/                # API 路由
│   │   ├── lines.js          # 产线接口
│   │   ├── products.js       # 产品接口
│   │   ├── users.js          # 用户接口 (登录)
│   │   ├── workOrders.js     # 工单 CRUD 接口
│   │   ├── records.js        # 生产记录上报接口
│   │   └── stats.js          # 统计分析接口
│   ├── sql/
│   │   └── init.sql          # 数据库初始化脚本 (含测试数据)
│   ├── initDB.js             # 一键初始化数据库脚本
│   ├── app.js                # Express 应用入口
│   ├── package.json
│   └── .env                  # 数据库连接配置
├── client/                    # 前端应用 (Vue3 + Element Plus)
│   ├── src/
│   │   ├── api/              # API 请求封装
│   │   │   ├── index.js
│   │   │   └── modules.js
│   │   ├── router/           # 路由配置
│   │   │   └── index.js
│   │   ├── views/            # 页面组件
│   │   │   ├── Login.vue         # 登录页
│   │   │   ├── layout/Layout.vue # 主布局
│   │   │   ├── Dashboard.vue     # 📊 实时看板
│   │   │   ├── WorkOrders.vue    # 📋 工单管理 (主管)
│   │   │   ├── Products.vue      # 📦 产品管理 (主管)
│   │   │   ├── Report.vue        # ✏️ 生产上报 (操作工)
│   │   │   └── Records.vue       # 📜 生产记录
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json
└── README.md
```

## 功能模块

### 🔐 登录系统
- 支持主管 / 操作工两种角色
- 根据角色自动展示对应菜单

### 👔 车间主管功能
1. **📊 实时看板**
   - 全局 KPI：总工单数、计划总数、完成率、不良率、累计工时
   - 各产线完成率柱状图
   - 工单完成率排行榜
   - 最近生产记录流水
   - 每 30 秒自动刷新

2. **📋 工单管理**
   - 创建工单（指派产线、选择产品、设定计划数量、备注）
   - 编辑 / 删除待生产工单
   - 更新工单状态：待生产 / 开始生产 / 已完成 / 暂停
   - 查看工单详情（含完整生产记录流水）
   - 按状态、产线筛选；关键字搜索
   - CSV 导出工单数据

3. **📦 产品管理**
   - 产品型号 CRUD（名称、型号、规格、单位）

4. **📜 生产记录**
   - 全量查询所有上报记录
   - 按工单号、上报人筛选分页

### 👷 操作工功能
1. **📊 实时看板** - 查看全局统计
2. **✏️ 生产上报**
   - 自动展示所属产线的工单
   - 上报：本次完成数、不良数、工作工时、不良原因、备注
   - 数量超限二次确认
   - 自动累计更新工单统计
3. **📜 生产记录** - 仅查看本人上报记录

## 快速开始

### 环境要求

- Node.js >= 16.x
- MySQL >= 5.7 / 8.0+
- npm 或 yarn

---

### 步骤 1：配置数据库连接

编辑 `server/.env`，填入你的 MySQL 连接信息：

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456       # 改成你的密码
DB_NAME=production_tracking
```

### 步骤 2：初始化数据库（建表 + 测试数据）

```bash
cd server
npm install
npm run init:db
```

成功后会输出：
```
✅ 数据库初始化成功！
📊 已创建表: production_lines, products, users, work_orders, production_records
👤 主管账号: admin / 123456
👤 操作工账号: worker01~worker05 / 123456
```

### 步骤 3：启动后端服务

```bash
# 在 server 目录下
npm run dev
```

后端服务将在 http://localhost:3001 启动

健康检查：访问 http://localhost:3001/api/health

### 步骤 4：启动前端应用（新开一个终端）

```bash
cd client
npm install
npm run dev
```

前端将在 http://localhost:5173 启动（自动打开浏览器）

### 一键安装所有依赖（可选）

```bash
# 在项目根目录
npm run install:all
```

## 测试账号

| 角色 | 用户名 | 密码 | 所属产线 |
|------|--------|------|---------|
| 车间主管 | `admin` | `123456` | - |
| 车间主管 | `manager` | `123456` | - |
| 操作工 | `worker01` | `123456` | 一号组装线 |
| 操作工 | `worker02` | `123456` | 二号组装线 |
| 操作工 | `worker03` | `123456` | 三号包装线 |
| 操作工 | `worker04` | `123456` | 四号测试线 |
| 操作工 | `worker05` | `123456` | 五号SMT线 |

## 数据库设计

### 核心数据表

| 表名 | 说明 |
|------|------|
| `production_lines` | 产线表（5条预置产线） |
| `products` | 产品型号表（5款预置产品） |
| `users` | 用户表（主管+操作工） |
| `work_orders` | 工单表（含累计统计） |
| `production_records` | 生产记录表（流水） |

### 工单状态码
| 状态值 | 含义 |
|--------|------|
| 0 | 待生产 |
| 1 | 生产中 |
| 2 | 已完成 |
| 3 | 已暂停 |

## API 接口列表

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/users/login` | 用户登录 |
| GET | `/api/lines` | 产线列表 |
| GET | `/api/products` | 产品列表 |
| POST | `/api/products` | 新增产品 |
| PUT | `/api/products/:id` | 编辑产品 |
| DELETE | `/api/products/:id` | 删除产品 |
| GET | `/api/workorders` | 工单列表（支持 status / line_id 筛选） |
| GET | `/api/workorders/:id` | 工单详情 |
| POST | `/api/workorders` | 创建工单 |
| PUT | `/api/workorders/:id` | 更新工单（含状态变更） |
| DELETE | `/api/workorders/:id` | 删除工单 |
| GET | `/api/records` | 生产记录（分页） |
| POST | `/api/records` | 上报生产进度（事务更新工单） |
| GET | `/api/stats/overview` | 全局概览统计 |
| GET | `/api/stats/by-line` | 按产线统计 |
| GET | `/api/stats/orders-rank` | 工单完成率排行 |
| GET | `/api/stats/recent-records` | 最近上报记录 |

## 业务流程

```
1. 主管登录 → 工单管理 → 新建工单（选择产线、产品、计划数量）
2. 工单状态：待生产 → 点"状态"→ 开始生产 → 状态变为"生产中"
3. 操作工登录 → 生产上报 → 看到所属产线的工单
4. 点击工单卡片 → 填写本次完成数 / 不良数 / 工时 → 确认上报
5. 系统自动累加工单的完成数、不良数、工时 → 自动触发状态流转
6. 主管看板每30秒自动刷新 → 实时看到完成率、不良率变化
```

## License

MIT
