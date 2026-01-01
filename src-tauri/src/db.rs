use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: "
                CREATE TABLE IF NOT EXISTS customers(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT,
                    address TEXT,
                    phone TEXT NOT NULL,
                    balance REAL DEFAULT 0,
                    status TEXT DEFAULT 'Active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

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
                );

                CREATE TABLE IF NOT EXISTS users(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'User',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS settings(
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS categories(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS audit_logs(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    details TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed default data",
            sql: "
                -- Seed default admin if not exists
                INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', '$2b$10$1MuHZBw4IPrbmU7AzqtE8.N8X2uIB.GkJGsUqRl5tcrjzDXa9uFmq', 'Admin');
                
                INSERT OR IGNORE INTO settings (key, value) VALUES ('system_name', '财务通');
                INSERT OR IGNORE INTO settings (key, value) VALUES ('system_subtitle', '企业财务管理系统');
                INSERT OR IGNORE INTO settings (key, value) VALUES ('page_title', '财务通 - 专业财务管理');

                INSERT OR IGNORE INTO categories (name, type) VALUES ('产品销售', 'Income');
                INSERT OR IGNORE INTO categories (name, type) VALUES ('服务咨询', 'Income');
                INSERT OR IGNORE INTO categories (name, type) VALUES ('采购成本', 'Expense');
                INSERT OR IGNORE INTO categories (name, type) VALUES ('房租水电', 'Expense');
            ",
            kind: MigrationKind::Up,
        }
    ]
}
