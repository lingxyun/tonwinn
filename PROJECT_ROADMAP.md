# 项目开发规划路线图 (Project Roadmap)

## 第一阶段：安全与数据稳定性 (Phase 1: Security & Data Stability)
- [x] 安装核心依赖 (`bcryptjs`, `jsonwebtoken`, `node-cron`, `papaparse`)。 <!-- id: 14 -->
- [x] 在 `server/database.js` 中实现用户密码的 Bcrypt 哈希加密存储。 <!-- id: 15 -->
- [x] 在 `/api/login` 接口实现 JWT 身份认证及校验中间件。 <!-- id: 16 -->
- [x] 实现后台数据库每日自动备份工具。 <!-- id: 17 -->

## 第二阶段：数据逻辑与可靠性 (Phase 2: Data Logic & Reliability)
- [x] 使用 `PapaParse` 重构 `src/context/DataContext.jsx` 中的 CSV 导入/导出功能。 <!-- id: 18 -->
- [x] 添加基础操作审计日志 (Audit Logging)，记录关键操作到数据库。 <!-- id: 19 -->

## 第三阶段：功能完善与界面美化 (Phase 3: Functional & UI Excellence)
- [x] 使用 `jspdf` 和 `html2canvas` 实现"生成电子收据" (PDF/图片) 功能。 <!-- id: 20 -->
- [x] 增强仪表盘 (Dashboard)，添加高级图表 (营收趋势、分类饼图)。 <!-- id: 21 -->
- [x] 搭建基础的基于角色的访问控制 (RBAC) 框架。 <!-- id: 22 -->
- [x] 为每周营收分布图添加"星期几"的标签。 <!-- id: 26 -->
- [x] 移除仪表盘图表在点击时出现的黑色聚焦边框。 <!-- id: 27 -->

## 第四阶段：调试与维护 (Phase 4: Debugging & Maintenance)
- [x] 修复客户删除后无法持久化(刷新恢复)的问题。 <!-- id: 23 -->
- [x] 修复数据重置时的 "no such column" 数据库错误。 <!-- id: 24 -->
- [x] 实现交易删除功能，并包含自动回滚客户余额的逻辑。 <!-- id: 25 -->

## 第五阶段：移动端用户体验优化 (Phase 5: Mobile User Experience)
- [x] 优化"订单管理"页面适配手机端 (采用卡片式布局)。 <!-- id: 28 -->
- [x] 优化"客户管理"页面适配手机端 (采用卡片式布局)。 <!-- id: 29 -->
- [x] 优化"电子收据预览"适配手机端 (实现响应式智能缩放)。 <!-- id: 31 -->
- [x] 调整全局布局和样式以适配移动设备触控操作。 <!-- id: 30 -->

## 第六阶段：云端协同与生产环境部署 (Phase 6: Cloud & Production Deployment)
- [ ] **🌐 中央云服务器模式 (Centralized Cloud Architecture)**: 
    - 实现从本地 SQLite 到云端 MySQL/RDS 的平滑迁移。
    - 部署独立后端 API (Node.js/Rust) 实现多地、多人同时在线操作。
    - 支持 Docker 容器化一键部署到阿里云/腾讯云。
- [ ] **🛡️ 每日自动备份 (Daily Auto-Backup)**: 程序启动时检测并自动备份数据库，防止数据误删或损坏。
- [ ] **📅 账目周历/月历 (Financial Calendar)**: 全新的日历统计视角，直观查看每日盈亏盈余。
- [ ] **🌓 金额隐私遮罩 (Privacy Toggle)**: 一键模糊全站金额，在公共场合使用更安心。
- [ ] **📋 订单批量操作 (Batch Actions)**: 支持多选勾选，实现批量更改分类、状态或一键归档。
- [ ] **⌨️ 全局极速录入 (Global Rapid Entry)**: 支持全局快捷键呼出记账窗口，极速录账不中断工作。

## 第七阶段：未来愿景 (Phase 7: Future Vision)
- [ ] **库存管理系统 (Inventory Management)**: 增加商品/零部件库存追踪，支持入库、出库及库存预警。
- [ ] **高级权限控制 (Advanced RBAC)**: 实现精细化的多用户权限管理（如：普通员工仅录入，财务经理可审核）。
- [ ] **微信小程序适配 (WeChat Mini Program)**: 开发原生微信小程序版本，方便无需安装App即可使用。
