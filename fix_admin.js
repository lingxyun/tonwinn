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

// Update admin
db.prepare("UPDATE users SET password = ?, role = 'Admin' WHERE username = 'admin'").run(hash);

const user = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
console.log('Admin user status:', user ? 'Created' : 'Failed');
console.log('User Role:', user?.role);

db.close();
