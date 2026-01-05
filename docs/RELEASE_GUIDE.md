# 🚀 自动化发布与更新指南

本指南将帮助您使用脚本一键完成“构建 -> 签名 -> 发布配置”的全流程，实现让用户自动更新。

## 📋 准备工作

确保项目根目录下存在以下文件（您目前都已经有了）：
1. `sec.key`：私钥文件（用于签名）。
2. `scripts/publish_update.ps1`：自动化发布脚本。

## 🛠️ 如何发布新版本

每次需要发布新版本时，请按照以下步骤操作：

### 第一步：修改版本号
手动修改以下三个文件中的版本号（例如从 0.1.3 改为 0.1.4）：
1. `package.json`
2. `src-tauri/tauri.conf.json`
3. `src-tauri/Cargo.toml`

### 第二步：获取 Gitee 令牌 (Token) - 仅首次需要
为了让脚本能自动上传文件，您需要一个 Gitee 的访问令牌：
1. 访问：[https://gitee.com/profile/personal_access_tokens](https://gitee.com/profile/personal_access_tokens)
2. 点击“生成新令牌”。
3. 权限勾选：`projects` (管理项目) 和 `emails` (邮箱)。
4. 复制生成的 Token (一串像密码一样的字符) 并保存好。

### 第三步：运行自动化脚本
**方式 A：使用 PowerShell (推荐)**
```powershell
./scripts/publish_update.ps1
```

**方式 B：使用 Git Bash (Sh 脚本)**
```bash
./scripts/publish_update.sh
```

脚本启动后会依次提示：
1. **Enter sec.key Password**: 输入您的私钥密码 `123`。
2. **Enter Gitee Token**: 输入您刚才获取的 Gitee Token (如果脚本里没写死的话)。

脚本会自动执行：
- 🏗️ **构建** 项目。
- 🔐 **签名** exe 文件。
- ☁️ **创建 Release**：在 Gitee 上创建一个新版本。
- 📤 **上传 exe**：自动把安装包上传到该版本中。
- 📝 **更新配置**：`update.json` 会自动指向刚才上传的云端文件地址。
- ⬆️ **推送代码**：同步所有更改。

🎉 **流程结束后，您什么都不用做，用户可以直接更新！** (不再需要手动上传)

---

## ✅ 用户端如何更新
完成上述步骤后，用户打开软件点击“检查更新”，系统就会：
1. 读取 Gitee 上的 `update.json`。
2. 发现新版本号 + 验证签名匹配。
3. 自动下载您上传的 `.exe` 并覆盖安装。
