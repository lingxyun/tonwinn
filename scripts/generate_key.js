import crypto from 'node:crypto';

/**
 * 鱼跃CRM 授权码生成工具
 * 使用方法: node generate_key.js <机器码>
 */

const SECRET_SALT = "tonwin-financial-2026-secure";

function generateKey(machineId) {
    if (!machineId) {
        console.error("❌ 错误: 请提供机器码");
        process.exit(1);
    }

    const mid = machineId.trim().toUpperCase();
    const combined = mid + SECRET_SALT;
    const key = crypto.createHash('md5').update(combined).digest('hex');

    console.log("\n" + "=".repeat(40));
    console.log("🛡️  鱼跃CRM 授权生成系统");
    console.log("=".repeat(40));
    console.log(`💻 机器识别码: ${mid}`);
    console.log(`🔑 激活序列号: ${key}`);
    console.log("=".repeat(40));
    console.log("💡 请将激活序列号发送给用户进行解锁。\n");
}

const inputId = process.argv[2];
generateKey(inputId);
