
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'financial.db');

const db = new Database(dbPath);
const hash = bcrypt.hashSync('123456', 10);

console.log('Targeting DB at:', dbPath);

// 1. Check and Add 'role' column if missing
try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasRole = tableInfo.some(col => col.name === 'role');

    if (!hasRole) {
        console.log("Adding missing 'role' column...");
        db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'User'").run();
    } else {
        console.log("'role' column already exists.");
    }
} catch (err) {
    console.error("Schema check failed:", err.message);
}

// 2. Update admin password and role
console.log("Updating admin password...");
try {
    const result = db.prepare("UPDATE users SET password = ?, role = 'Admin' WHERE username = 'admin'").run(hash);
    console.log(`Updated ${result.changes} rows.`);
} catch (err) {
    // Fallback if update fails (e.g. if fix_admin.js logic is still problematic, though alter table should fix it)
    console.error("Update failed:", err.message);
}

const user = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
console.log('Admin user status:', user ? 'Verified' : 'Not Found');
if (user) console.log('User Role:', user.role);

db.close();
