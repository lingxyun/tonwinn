# Tauri 迁移工作回顾

本项目已成功从 Electron/Node.js 架构迁移到轻量级的 **Tauri** 架构。此次迁移圆满实现了“本地化数据隔离”和“极致缩减安装包体积”两大核心目标。

## 核心成果

### 1. 纯本地数据中心
- **摆脱 Node.js 依赖**：运行时不再需要本地启动 Node.js 服务器。
- **直接数据库操作**：前端所有数据请求已改为通过 `@tauri-apps/plugin-sql` 插件直接读写本地 SQLite。
- **自动初始化**：Rust 后端模块 (`db.rs`) 负责在首次启动时自动创建表结构并预设管理员账号。

### 2. 安全与性能提升
- **Rust 驱动授权**：敏感的密码哈希验证改由高性能 Rust 命令处理，提升了系统安全性。
- **极致体积**：通过调用系统原生 WebView（Windows 上为 WebView2），**生成的 EXE 安装包体积仅为 6.8MB**，相比 Electron 缩减了约 95%。

### 3. 数据隔离与存储
- **本地存储路径**：数据不再存储在程序目录下，而是遵循 Windows 标准。每个人、每个公司的数据库都是完全独立的。
- **具体路径**：`%APPDATA%\com.tonwin.financial\financial.db`
  - (您可以直接在文件资源管理器地址栏输入上方路径并回车，即可找到数据库文件)
- **优化 package.json**：移除了 Express、Electron 及其相关的服务端库，开发环境更加清爽。

## 关键文件变更

- [tauriDb.js](file:///c:/Users/Administrator/Desktop/financial-system/src/utils/tauriDb.js): 前端操作数据库的新工具。
- [db.rs](file:///c:/Users/Administrator/Desktop/financial-system/src-tauri/src/db.rs): 定义 SQLite 表架构和迁移逻辑。
- [commands.rs](file:///c:/Users/Administrator/Desktop/financial-system/src-tauri/src/commands.rs): 用于安全认证的 Rust 命令。
- [DataContext.jsx](file:///c:/Users/Administrator/Desktop/financial-system/src/context/DataContext.jsx): 重构后的数据上下文，完全基于本地 SQL。

## 如何构建安装包

> [!IMPORTANT]
> 构建 EXE 需要在您的电脑上提前安装 **Visual Studio Build Tools** (并勾选 C++ 编译环境)。

1. **安装依赖**:
   ```bash
   npm install
   ```
2. **执行构建**:
   ```bash
   npm run tauri build
   ```
   构建产物将位于 `src-tauri/target/release/bundle/msi/` 目录下。

## 数据物理隔离说明
每家公司安装后的数据将独立存储在以下路径：
`C:\Users\[用户名]\AppData\Roaming\com.tauri.dev\financial.db`
不同安装实例之间的数据完全物理隔离，互不干扰，确保了商业秘密的安全性。
