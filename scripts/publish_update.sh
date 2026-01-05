#!/bin/bash

# 自动化发布脚本 (Bash 版)
# 适用于 Git Bash (Windows) 或 Linux/Mac 环境

# ---------------- 配置区域 ----------------
GITEE_USER="wx_3a9051a7ee"
GITEE_REPO="tonwinn"
# ----------------------------------------

set -e # 遇到错误立即停止

# 自动切换到项目根目录 (解决从 scripts 目录运行找不到文件的问题)
cd "$(dirname "$0")/.." || exit 1

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 开始自动化发布流程 (Bash版)...${NC}"

# 1. 参数获取
PASSWORD="$1"
TOKEN="$2"

if [ ! -f "sec.key" ]; then
    echo -e "${RED}❌ 未找到 sec.key 私钥文件！${NC}"
    exit 1
fi

# 获取当前版本 (使用 node 读取)
VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}📦 检测到版本: v$VERSION${NC}"

# 检查 Token
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}🔑 请输入您的 Gitee 个人访问令牌 (Token)${NC}"
    echo -e "${CYAN}   (输入后回车，输入内容不会显示)${NC}"
    read TOKEN
fi
if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 必须提供 Token 才能继续！${NC}"
    exit 1
fi

# 2. 构建项目
echo -e "${CYAN}🔨 正在构建项目...${NC}"
npm run tauri build

# 3. 定位 Exe
EXE_PATH="src-tauri/target/release/bundle/nsis/鱼跃CRM_${VERSION}_x64-setup.exe"
if [ ! -f "$EXE_PATH" ]; then
    echo -e "${RED}❌ 未找到 Exe 文件: $EXE_PATH${NC}"
    exit 1
fi

# 4. 签名
echo -e "${CYAN}🔐 正在签名...${NC}"
if [ -z "$PASSWORD" ]; then
    echo -e "${YELLOW}🔑 请输入 sec.key 私钥密码: ${NC}"
    read PASSWORD
fi

# 读取并清理私钥 (去掉 Windows 可能的 \r)
RAW_KEY=$(cat sec.key | tr -d '\r')
export TAURI_SIGNING_PRIVATE_KEY="$RAW_KEY"

# debug output (masked)
echo "Debug: Key length is ${#TAURI_SIGNING_PRIVATE_KEY}"

# 临时关闭错误立即退出，以便捕获签名错误
set +e
echo -e "${CYAN}正在执行签名命令...${NC}"

# 尝试直接运行 npx (显式通过 -k 传递私钥，比环境变量更稳)
# 注意：这里使用 "$RAW_KEY" 确保换行符被正确传递
SIG_OUTPUT=$(npx tauri signer sign -k "$RAW_KEY" -p "$PASSWORD" "$EXE_PATH" 2>&1)
EXIT_CODE=$?

# 恢复错误立即退出
set -e

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ 签名失败！详细错误信息如下：${NC}"
    echo "$SIG_OUTPUT"
    echo -e "${YELLOW}提示：如果密码正确但仍失败，请尝试直接带参数运行脚本： ./scripts/publish_update.sh 123${NC}"
    exit 1
fi

# 提取签名 (使用 node 处理字符串更稳健)
SIGNATURE=$(node -e "
    const output = \`$SIG_OUTPUT\`;
    const match = output.match(/dW50cnVzdGVkIGNvbW1lbnQ6On[a-zA-Z0-9+/=\n\r]+/);
    if (match) console.log(match[0].trim());
    else {
        // 尝试读取 .sig 文件
        const fs = require('fs');
        const sigPath = '$EXE_PATH.sig';
        if (fs.existsSync(sigPath)) console.log(fs.readFileSync(sigPath, 'utf8').trim());
        else process.exit(1);
    }
")

if [ $? -ne 0 ] || [ -z "$SIGNATURE" ]; then
    echo -e "${RED}❌ 无法提取签名内容${NC}"
    echo "$SIG_OUTPUT"
    exit 1
fi
echo -e "${GREEN}✅ 签名已生成${NC}"

# 5. 在 Gitee 创建发行版
echo -e "${CYAN}☁️ 正在创建 Gitee 发行版 v$VERSION...${NC}"

# 检查 Release 是否存在
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET --header "Content-Type: application/json" "https://gitee.com/api/v5/repos/$GITEE_USER/$GITEE_REPO/releases/tags/v$VERSION?access_token=$TOKEN")

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${YELLOW}⚠️ 版本 v$VERSION 已存在，将跳过创建，尝试上传文件...${NC}"
    # 获取现有 Release ID
    RELEASE_RESP=$(curl -s -X GET "https://gitee.com/api/v5/repos/$GITEE_USER/$GITEE_REPO/releases/tags/v$VERSION?access_token=$TOKEN")
    
    # Debug response
    echo "Debug: Gitee API Response: $RELEASE_RESP"
    
    RELEASE_ID=$(echo "$RELEASE_RESP" | node -p "const json = JSON.parse(require('fs').readFileSync(0, 'utf-8')); json ? json.id : 'null'")
else
    # 创建新 Release
    CREATE_RES=$(curl -s -X POST --header "Content-Type: application/json" \
        -d "{
            \"access_token\": \"$TOKEN\",
            \"tag_name\": \"v$VERSION\",
            \"name\": \"Release v$VERSION\",
            \"body\": \"自动发布版本 v$VERSION\",
            \"prerelease\": false
        }" \
        "https://gitee.com/api/v5/repos/$GITEE_USER/$GITEE_REPO/releases")
    
    RELEASE_ID=$(echo "$CREATE_RES" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf-8')).id")
fi

if [ -z "$RELEASE_ID" ] || [ "$RELEASE_ID" == "undefined" ]; then
    echo -e "${RED}❌ 获取 Release ID 失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 发行版 ID: $RELEASE_ID${NC}"

# 6. 上传 Exe
echo -e "${CYAN}📤 正在上传 .exe 到 Gitee...${NC}"
UPLOAD_URL="https://gitee.com/api/v5/repos/$GITEE_USER/$GITEE_REPO/releases/$RELEASE_ID/attach_files"

# 捕获并打印上传响应
UPLOAD_RESP=$(curl -s -X POST "$UPLOAD_URL" \
    -F "access_token=$TOKEN" \
    -F "file=@$EXE_PATH")

echo "Debug: Upload Response: $UPLOAD_RESP"

if [[ "$UPLOAD_RESP" != *"browser_download_url"* ]]; then
    echo -e "${RED}❌ 上传似乎失败了 (未返回下载链接)。请检查上面的错误信息。${NC}"
    # 不退出，继续下面的步骤允许更新 json (方便手动挽回)
else
    echo -e "\n${GREEN}✅ 上传完成${NC}"
fi

# 7. 更新 update.json
echo -e "${CYAN}📝 正在更新 update.json...${NC}"
DOWNLOAD_URL="https://gitee.com/$GITEE_USER/$GITEE_REPO/releases/download/v$VERSION/$(basename "$EXE_PATH")"

# 使用 node 更新 json，避免不同平台 sed/awk 的差异
node -e "
    const fs = require('fs');
    const path = 'update.json';
    const json = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    json.version = '$VERSION';
    json.pub_date = new Date().toISOString();
    json.platforms['windows-x86_64'].signature = process.argv[1];
    json.platforms['windows-x86_64'].url = '$DOWNLOAD_URL';
    
    fs.writeFileSync(path, JSON.stringify(json, null, 2));
" "$SIGNATURE"

echo -e "${GREEN}✅ update.json 已更新${NC}"

# 8. 推送代码
echo -e "${CYAN}⬆️ 正在推送配置代码...${NC}"
git add update.json
git commit -m "build: release v$VERSION (auto-upload)" || echo "No changes to commit"
git push gitee main-tauri
git push origin main-tauri

echo -e "${GREEN}🎉 全部完成！无需手动上传。${NC}"
