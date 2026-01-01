# 财务系统轻量化迁移方案 (Tauri)

该方案旨在通过从 Electron 迁移到 Tauri，将应用程序的可执行文件 (EXE) 体积从 100MB+ 缩减至 5MB 左右，同时保持数据在本地的完全隔离。

## 用户需求要点
- **多公司支持**：通过本地独立数据库确保数据物理隔离。
- **本地存储**：数据仅存储在用户本地，不上传云端。
- **极致减小体积**：使用 Tauri 替代体积庞大的 Electron。

## [已实施] 技术架构变更
- **核心框架**: Tauri (v2)
- **前端**: React + Vite (保持不变)
- **后端**: Rust (Tauri 命令) + Tauri SQL 插件 (SQLite)
- **数据访问方式**: 
    - 绝大部分 CRUD 操作：前端通过 `@tauri-apps/plugin-sql` 直接操作 SQL。
    - 安全/认证：使用 Rust 编写自定义命令，调用 `bcrypt` 进行密码哈希和验证。
- **数据库存储**: SQLite (`financial.db`) 存储在用户的 `AppData/Roaming/[应用名称]` 目录下。

## 迁移路线图
1. [x] **初始化 Tauri**: 完成 `tauri init` 及环境配置。
2. [x] **数据库架构**: 将 SQLite 架构迁移至 Rust 端的自动迁移逻辑 (`db.rs`)。
3. [x] **认证迁移**: 在 Rust 中实现 `verify_password` 和 `hash_password` 命令。
4. [x] **前端重构**:
    - [x] 创建 `tauriDb.js` 工具类。
    - [x] 重构 `AuthContext.jsx` 以支持本地登录。
    - [x] 重构 `DataContext.jsx` 移除所有 HTTP API 调用。
    - [x] 重构 `SettingsContext.jsx` 支持本地系统设置。
5. [x] **清理冗余**: 已删除 `server/` (Node.js) 和 `electron/` 目录。
6. [x] **打包验证**: 已在开发环境下完整构建并验证数据隔离与读写功能。

## 验证计划
### 自动化测试
- 运行 `npm run tauri dev` 验证功能完整性。
### 手动验证
- 检查新装 EXE 后 `AppData` 目录下是否自动生成数据库。
- 验证在断网状态下（无 Node.js 服务器）系统是否能完整操作。
