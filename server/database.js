import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
export function initDb() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'financial.db');
    console.log('Opening database at:', dbPath);

    const db = new Database(dbPath, { verbose: console.log });
    db.pragma('journal_mode = WAL');

    console.log('Connected to SQLite database (better-sqlite3).');

    // Create Customers Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS customers(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        address TEXT,
        phone TEXT NOT NULL,
        balance REAL DEFAULT 0,
        status TEXT DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
        `).run();

    // Migration for address column
    try {
        db.prepare("ALTER TABLE customers ADD COLUMN address TEXT").run();
    } catch (error) {
        // Column likely already exists
    }

    // Create Transactions Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS transactions(
            id TEXT PRIMARY KEY,
            customerId INTEGER,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT,
            date TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'Completed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customerId) REFERENCES customers(id)
        )
        `).run();

    // Create Users Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'User',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        `).run();

    // Seed Admin User
    const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (!admin) {
        const hashedPassword = bcrypt.hashSync('123456', 10);
        db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('admin', hashedPassword, 'Admin');
        console.log("Seeded default admin user with hashed password and Admin role.");
    }

    // Create Settings Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS settings(
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
        `).run();

    // Seed Default Settings
    const settings = db.prepare("SELECT * FROM settings").all();
    if (settings.length === 0) {
        const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
        insertSetting.run('system_name', '财务通');
        insertSetting.run('system_subtitle', '企业财务管理系统');
        insertSetting.run('page_title', '财务通 - 专业财务管理');
        console.log("Seeded default settings.");
    }

    // Create Categories Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS categories(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL, -- 'Income' or 'Expense'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        `).run();

    // Seed Default Categories
    const categoriesCount = db.prepare("SELECT COUNT(*) as count FROM categories").get();
    if (categoriesCount.count === 0) {
        const defaultIncome = ['产品销售', '服务咨询', '投资收益', '其他收入'];
        const defaultExpense = ['采购成本', '办公费用', '员工工资', '营销推广', '房租水电', '其他支出'];

        const insertCat = db.prepare("INSERT INTO categories (name, type) VALUES (?, ?)");
        for (const name of defaultIncome) {
            insertCat.run(name, 'Income');
        }
        for (const name of defaultExpense) {
            insertCat.run(name, 'Expense');
        }
        console.log("Seeded default categories.");
    }

    // Create Audit Logs Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS audit_logs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `).run();

    return db;
}
