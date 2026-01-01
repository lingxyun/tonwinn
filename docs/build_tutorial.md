# Tauri 项目环境配置与打包全攻略

由于本项目已从 Electron 迁移至 Tauri 架构，您需要配置一套全新的开发环境。本指南将带您从零开始，在电脑上成功运行并打包。

---

## 第一步：准备运行环境 (必须)

Tauri 依赖 Rust 指令集和 C++ 编译器来生成极小的 EXE 文件。

### 1. 安装 Rust 编译器
1.  访问 [rustup.rs](https://rustup.rs/)。
2.  下载并运行 `rustup-init.exe`。
3.  在出现的命令行窗口中，**直接按回车 (Enter)** 选择默认安装 (Option 1)。

### 2. 安装 C++ 编译工具 (关键)
Tauri 在 Windows 上必须使用 **Microsoft C++ 生成工具**。
1.  下载 [Visual Studio 生成工具 (Build Tools)](https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/)。
2.  运行安装程序，在“工作负荷”选项卡中，**勾选“使用 C++ 的桌面开发”**。
3.  确保右侧安装详细信息中包含：
    -   MSVC v143 - VS 2022 C++ x64/x86 生成工具
    -   Windows 11 SDK (或 Windows 10 SDK)
4.  点击安装并等待完成（约 2GB-4GB，取决于具体选项）。

---

## 第二步：初始化项目代码

在具备上述环境后，进入项目根目录：

1.  **清理旧缓存** (推荐):
    ```powershell
    # 删除 node_modules 重新安装以确保依赖干净
    Remove-Item -Path "node_modules" -Recurse -Force
    ```
2.  **安装 Node 依赖**:
    ```bash
    npm install
    ```

---

## 第三步：开发与运行

### 1. 启动开发环境
这会启动一个带有热更新的开发窗口，方便您调试界面。
```bash
npm run tauri dev
```
> [!NOTE]
> 首次运行会进行长时间的 Rust 依赖编译（约 3-5 分钟），后续启动会非常快。

---

## 第四步：打包成极小 EXE

当您准备发布给其他公司使用时，执行：

```bash
npm run tauri build
```

### 打包结果说明：
-   **安装包路径**: `src-tauri\target\release\bundle\msi\financial-system_0.1.0_x64_zh-CN.msi`
-   **单文件 EXE 路径**: `src-tauri\target\release\bundle\exe\financial-system.exe`

---

## 第五步：常见问题排除

### 1. 报错：`link.exe` not found
-   **原因**: 未安装 C++ 生成工具或环境变量未生效。
-   **解决**: 重新运行 Visual Studio Build Tools 安装程序，确认“使用 C++ 的桌面开发”已勾选，并重启电脑。

### 2. 数据保存在哪里？
-   **路径**: `%APPDATA%\com.tauri.dev\financial.db`
-   **多公司隔离**: 每一台安装此软件的电脑都会在这个私有路径生成自己的数据库。您可以手动备份此文件。

### 3. 如何更改应用图标？
-   替换 `src-tauri/icons/` 目录下的图标文件。
-   运行 `npx tauri icon [你的图标路径].png` 自动生成全套图标。

---

祝您使用愉快！如果有任何报错，请截屏反馈给我。
