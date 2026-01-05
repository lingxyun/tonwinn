<#
.SYNOPSIS
    自动化发布脚本 (专业版) - 构建、签名并自动上传到 Gitee 发行版
.DESCRIPTION
    1. 构建 Tauri 应用
    2. 对 exe 文件进行签名
    3. 更新 update.json
    4. 推送代码到 Git
    5. [新功能] 自动创建 Gitee 发行版并上传 .exe 文件
.PARAMETER Password
    私钥密码
.PARAMETER Token
    Gitee 个人访问令牌 (PAT) 用于调用 API 上传文件
#>

param (
    [Parameter(Mandatory=$false)]
    [string]$Password,
    [Parameter(Mandatory=$false)]
    [string]$Token
)

# 设置控制台输出编码为 UTF-8，防止中文乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$GiteeRepo = "wx_3a9051a7ee/tonwinn" # 您的 Gitee 用户名/仓库名

# 确保进入项目根目录 (无论在哪运行脚本)
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (Test-Path "$ScriptRoot\..\package.json") {
    Set-Location "$ScriptRoot\.."
}

# 1. 环境检查
Write-Host "🚀 开始自动化发布流程 (专业版)..." -ForegroundColor Cyan

if (-not (Test-Path "sec.key")) { Write-Error "❌ 未找到 sec.key 私钥文件！" }

# 获取当前版本
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
Write-Host "📦 检测到版本: v$version" -ForegroundColor Yellow

# 检查 Gitee Token
if ([string]::IsNullOrEmpty($Token)) {
    Write-Host "🔑 请输入您的 Gitee 个人访问令牌 (Token)" -ForegroundColor Yellow
    Write-Host "   (获取地址: https://gitee.com/profile/personal_access_tokens)" -ForegroundColor Gray
    $Token = Read-Host "Token" -AsSecureString
    $Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))
}

# 2. 构建项目
Write-Host "🔨 正在构建项目 (这可能需要几分钟)..." -ForegroundColor Cyan
cmd /c "npm run tauri build"
if ($LASTEXITCODE -ne 0) { throw "构建失败" }

# 3. 定位 Exe 文件
$exePath = "src-tauri\target\release\bundle\nsis\鱼跃CRM_${version}_x64-setup.exe"
if (-not (Test-Path $exePath)) { throw "❌ 未找到 Exe 文件: $exePath" }

# 4. 签名
Write-Host "🔐 正在签名..." -ForegroundColor Cyan
if ([string]::IsNullOrEmpty($Password)) {
    $Password = Read-Host "请输入 sec.key 私钥密码" -AsSecureString
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
}

$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "sec.key" -Raw
$sigOutput = cmd /c "npx tauri signer sign -p `"$Password`" `"$exePath`"" 2>&1

$signature = $sigOutput | Select-String "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm" | Select-Object -First 1
if (-not $signature) {
    # 尝试从 .sig 文件读取
    $sigFile = "$exePath.sig"
    if (Test-Path $sigFile) {
        $signature = [System.IO.File]::ReadAllText($sigFile).Trim()
    } else {
        throw "❌ 无法提取签名内容"
    }
}
Write-Host "✅ 签名已生成" -ForegroundColor Green

# 5. 在 Gitee 创建发行版 (Release)
Write-Host "☁️ 正在创建 Gitee 发行版 v$version..." -ForegroundColor Cyan
$releaseUrl = "https://gitee.com/api/v5/repos/$GiteeRepo/releases"
$releaseBody = @{
    access_token = $Token
    tag_name = "v$version"
    name = "Release v$version"
    body = "自动发布版本 v$version"
    prerelease = $false
} | ConvertTo-Json

try {
    # 检查版本是否已存在
    $existingRelease = Invoke-RestMethod -Uri "$releaseUrl/tags/v$version" -Method Get -Body @{access_token=$Token} -ErrorAction SilentlyContinue
    if ($existingRelease) {
        Write-Host "⚠️ 版本 v$version 已存在" -ForegroundColor Yellow
        $releaseId = $existingRelease.id
    } else {
        $response = Invoke-RestMethod -Uri $releaseUrl -Method Post -Body $releaseBody -ContentType "application/json"
        $releaseId = $response.id
    }
    Write-Host "✅ 发行版准备就绪 (ID: $releaseId)" -ForegroundColor Green
} catch {
    throw "❌ 创建或查找发行版失败: $_"
}

# 6. 上传 Exe 文件
Write-Host "📤 正在上传 .exe 到 Gitee..." -ForegroundColor Cyan
$uploadUrl = "https://gitee.com/api/v5/repos/$GiteeRepo/releases/$releaseId/attach_files"
$boundary = [System.Guid]::NewGuid().ToString() 
$LF = "`r`n"
$fileBytes = [System.IO.File]::ReadAllBytes($exePath)
#为了兼容二进制上传，这里使用 ISO-8859-1 编码读取字节流作为字符串发送
$fileEnc = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"access_token`"",
    "",
    "$Token",
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"鱼跃CRM_${version}_x64-setup.exe`"",
    "Content-Type: application/octet-stream",
    "",
    "$fileEnc",
    "--$boundary--$LF"
) -join $LF

try {
    Invoke-WebRequest -Uri $uploadUrl -Method Post -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyLines
    Write-Host "✅ 上传成功！" -ForegroundColor Green
} catch {
    Write-Error "❌ 上传失败: $_"
}

# 7. 更新 update.json
Write-Host "📝 正在更新 update.json..." -ForegroundColor Cyan
$updateJsonPath = "update.json"
$jsonContent = Get-Content $updateJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

$jsonContent.version = $version
$jsonContent.pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$jsonContent.platforms.'windows-x86_64'.signature = $signature.ToString()
# 这里使用 Gitee Release 的下载链接，更加稳定
$jsonContent.platforms.'windows-x86_64'.url = "https://gitee.com/$GiteeRepo/releases/download/v$version/鱼跃CRM_${version}_x64-setup.exe"

$newJson = $jsonContent | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($updateJsonPath, $newJson, (New-Object System.Text.UTF8Encoding($false)))

# 8. 推送代码
Write-Host "⬆️ 正在推送配置代码..." -ForegroundColor Cyan
git add update.json
git commit -m "build: release v$version (auto-upload)"
git push gitee main-tauri
git push origin main-tauri

Write-Host "🎉 全部完成！无需手动上传。" -ForegroundColor Green
