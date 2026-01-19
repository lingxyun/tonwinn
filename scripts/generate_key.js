import crypto from 'node:crypto';

/**
 * 鱼跃CRM 授权码生成工具
 * 使用方法: 
 *   永久授权: node generate_key.js <机器码>
 *   试用授权: node generate_key.js <机器码> <小时数>
 */

const SECRET_SALT = "tonwin-financial-2026-secure";

function generateKey(machineId, hours) {
    if (!machineId) {
        console.error("❌ 错误: 请提供机器码");
        console.log("用法: node generate_key.js <机器码> [有效期小时数]");
        process.exit(1);
    }

    const mid = machineId.trim().toUpperCase();

    console.log("\n" + "=".repeat(40));
    console.log("🛡️  鱼跃CRM 授权生成系统");
    console.log("=".repeat(40));
    console.log(`💻 机器识别码: ${mid}`);

    if (hours) {
        // Generate Trial Key
        const durationHours = parseFloat(hours);
        if (isNaN(durationHours) || durationHours <= 0) {
            console.error("❌ 错误: 有效期必须是正数");
            process.exit(1);
        }

        const now = Math.floor(Date.now() / 1000);
        const expireTime = now + Math.floor(durationHours * 3600);
        const hexTs = expireTime.toString(16);

        // Match Rust: MD5(machine_id + hex_ts + SECRET_SALT)
        const combined = mid + hexTs + SECRET_SALT;
        const signature = crypto.createHash('md5').update(combined).digest('hex');
        const key = `TR-${hexTs}-${signature}`;

        const expireDate = new Date(expireTime * 1000).toLocaleString();

        console.log(`⏱️  授权类型: 试用授权 (${durationHours}小时)`);
        console.log(`📅 过期时间: ${expireDate}`);
        console.log(`🔑 激活序列号: ${key}`);
    } else {
        // Generate Permanent Key
        // Match Rust: MD5(machine_id + SECRET_SALT)
        const combined = mid + SECRET_SALT;
        const key = crypto.createHash('md5').update(combined).digest('hex');

        console.log(`♾️  授权类型: 永久授权`);
        console.log(`🔑 激活序列号: ${key}`);
    }

    console.log("=".repeat(40));
    console.log("💡 请将激活序列号发送给用户进行解锁。\n");
}

const inputId = process.argv[2];
const inputHours = process.argv[3];
generateKey(inputId, inputHours);
