import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDb } from './database.js';
import { initBackupTask } from './backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'; // In prod, use env variable

app.use(cors());
app.use(express.json());

// --- Middleware ---

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: '请先登录' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: '会话已过期，请重新登录' });
        req.user = user;
        next();
    });
};

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Initialize Database Synchronously
const db = initDb();

// Initialize Backup Task
initBackupTask();

// --- API Routes ---

// Login
app.post('/api/login', async (req, res) => {
    let { username, password } = req.body;
    username = (username || '').trim();
    password = (password || '').trim();

    try {
        const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: '密码错误' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ id: user.id, username: user.username, role: user.role, token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Settings API ---
app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});
    res.json(settingsObj);
});

app.post('/api/settings', authenticateToken, (req, res) => {
    const updates = req.body;
    try {
        const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
        const updateTransaction = db.transaction((data) => {
            for (const [key, value] of Object.entries(data)) {
                stmt.run(key, value);
            }
        });
        updateTransaction(updates);

        // Audit Log
        db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
            .run(req.user.id, 'UPDATE_SETTINGS', JSON.stringify(updates));

        res.json({ message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Customers
app.get('/api/customers', (req, res) => {
    const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
    res.json(customers);
});

// Create Customer
app.post('/api/customers', authenticateToken, (req, res) => {
    const { name, email, phone, address, balance, status } = req.body;
    try {
        const result = db.prepare(
            'INSERT INTO customers (name, email, phone, address, balance, status) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(name, email, phone, address, balance || 0, status || 'Active');

        const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);

        // Audit Log
        db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
            .run(req.user.id, 'CREATE_CUSTOMER', `Created customer: ${name} (ID: ${result.lastInsertRowid})`);

        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Customer
app.put('/api/customers/:id', authenticateToken, (req, res) => {
    const { name, email, phone, address, balance, status } = req.body;
    try {
        db.prepare(
            'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, balance = ?, status = ? WHERE id = ?'
        ).run(name, email, phone, address, balance, status, req.params.id);

        const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);

        // Audit Log
        db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
            .run(req.user.id, 'UPDATE_CUSTOMER', `Updated customer ID: ${req.params.id}`);

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Customer
app.delete('/api/customers/:id', authenticateToken, (req, res) => {
    try {
        const resetTx = db.transaction(() => {
            // Delete all transactions for this customer first
            db.prepare('DELETE FROM transactions WHERE customerId = ?').run(req.params.id);
            // Then delete the customer
            db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
        });
        resetTx();

        // Audit Log
        db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
            .run(req.user.id, 'DELETE_CUSTOMER', `Deleted customer ID: ${req.params.id} and all their transactions`);

        res.json({ message: 'Customer and their transactions deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Transactions
app.get('/api/transactions', (req, res) => {
    const transactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
    res.json(transactions);
});

// Create Transaction
app.post('/api/transactions', authenticateToken, (req, res) => {
    const { id, customerId, amount, type, category, date, description, status } = req.body;
    try {
        const insertTx = db.transaction(() => {
            db.prepare(
                'INSERT INTO transactions (id, customerId, amount, type, category, date, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(id, customerId, amount, type, category, date, description, status);

            if (customerId) {
                const adjustment = type === 'Income' ? amount : -amount;
                db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(adjustment, customerId);
            }
        });

        insertTx();

        const newTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
        res.status(201).json(newTx);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Transaction
app.put('/api/transactions/:id', authenticateToken, (req, res) => {
    const { customerId, amount, type, category, date, description, status } = req.body;
    try {
        const updateTx = db.transaction(() => {
            // 1. Get the original transaction to revert its effect
            const originalTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
            if (!originalTx) throw new Error('Transaction not found');

            // 2. Revert the original balance change
            if (originalTx.customerId) {
                const revertAmount = originalTx.type === 'Income' ? -originalTx.amount : originalTx.amount;
                db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?')
                    .run(revertAmount, originalTx.customerId);
            }

            // 3. Update the transaction record
            db.prepare(
                'UPDATE transactions SET customerId = ?, amount = ?, type = ?, category = ?, date = ?, description = ?, status = ? WHERE id = ?'
            ).run(customerId, amount, type, category, date, description, status, req.params.id);

            // 4. Apply the new balance change
            if (customerId) {
                const newAdjustment = type === 'Income' ? amount : -amount;
                db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?')
                    .run(newAdjustment, customerId);
            }

            // Audit Log
            db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
                .run(req.user.id, 'UPDATE_TRANSACTION', `Updated transaction ID: ${req.params.id} and adjusted balances`);
        });

        updateTx();

        const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Transaction
app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
    try {
        const transTx = db.transaction(() => {
            // Get transaction details first
            const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
            if (!tx) throw new Error('交易记录不存在');

            // Revert balance: if Income, subtract from customer balance; if Expense, add to customer balance
            const amountToRevert = tx.type === 'Income' ? -tx.amount : tx.amount;
            db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?')
                .run(amountToRevert, tx.customerId);

            // Delete the transaction
            db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
        });
        transTx();

        // Audit Log
        db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
            .run(req.user.id, 'DELETE_TRANSACTION', `Deleted transaction ID: ${req.params.id} and reverted customer balance`);

        res.json({ message: 'Transaction deleted and balance reverted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Categories API ---
app.get('/api/categories', (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM categories ORDER BY created_at DESC').all();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Category
app.post('/api/categories', authenticateToken, (req, res) => {
    const { name, type } = req.body;
    try {
        const result = db.prepare(
            'INSERT INTO categories (name, type) VALUES (?, ?)'
        ).run(name, type);

        const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);

        // Audit Log
        db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
            .run(req.user.id, 'CREATE_CATEGORY', `Created category: ${name} (${type})`);

        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Category
app.put('/api/categories/:id', authenticateToken, (req, res) => {
    const { name, type } = req.body;
    try {
        db.prepare(
            'UPDATE categories SET name = ?, type = ? WHERE id = ?'
        ).run(name, type, req.params.id);

        const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);

        // Audit Log
        db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
            .run(req.user.id, 'UPDATE_CATEGORY', `Updated category ID: ${req.params.id}`);

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Category
app.delete('/api/categories/:id', authenticateToken, (req, res) => {
    try {
        db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);

        // Audit Log
        db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
            .run(req.user.id, 'DELETE_CATEGORY', `Deleted category ID: ${req.params.id}`);

        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset Data
app.post('/api/reset', authenticateToken, (req, res) => {
    try {
        const resetTx = db.transaction(() => {
            db.prepare('DELETE FROM transactions').run(); // Delete transactions first
            db.prepare('DELETE FROM customers').run();
            db.prepare('DELETE FROM audit_logs').run(); // Clear logs too
            db.prepare("DELETE FROM sqlite_sequence WHERE name='customers'").run();
            db.prepare("DELETE FROM sqlite_sequence WHERE name='transactions'").run();
        });
        resetTx();

        // Audit Log (Before it's cleared or maybe keep it? Let's log it before clearing or after? Usually we clear it)
        // For audit purposes, usually we don't clear audit_logs, but here it's a full system reset.

        res.json({ message: 'All data reset' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Import/Restore Data
app.post('/api/import', authenticateToken, (req, res) => {
    const { customers, transactions } = req.body;

    if (!Array.isArray(customers) || !Array.isArray(transactions)) {
        return res.status(400).json({ error: '无效的数据格式：需要包含 customers 和 transactions 数组' });
    }

    try {
        const importTx = db.transaction(() => {
            // 1. Clear existing data
            db.prepare('DELETE FROM transactions').run();
            db.prepare('DELETE FROM customers').run();
            // Optional: db.prepare("DELETE FROM sqlite_sequence WHERE name='customers'").run(); 
            // We don't strictly need to reset sequence if we are inserting explicit IDs, but it's cleaner.

            // 2. Insert Customers
            const insertCustomer = db.prepare(`
                INSERT INTO customers (id, name, email, phone, address, balance, status, created_at)
                VALUES (@id, @name, @email, @phone, @address, @balance, @status, @created_at)
            `);

            for (const cust of customers) {
                // Handle potential missing fields or defaults
                insertCustomer.run({
                    id: cust.id,
                    name: cust.name,
                    email: cust.email || '',
                    phone: cust.phone || '',
                    address: cust.address || '',
                    balance: cust.balance || 0,
                    status: cust.status || 'Active',
                    created_at: cust.created_at || new Date().toISOString()
                });
            }

            // 3. Insert Transactions
            const insertTransaction = db.prepare(`
                INSERT INTO transactions (id, customerId, amount, type, category, date, description, status, created_at)
                VALUES (@id, @customerId, @amount, @type, @category, @date, @description, @status, @created_at)
            `);

            for (const tx of transactions) {
                insertTransaction.run({
                    id: tx.id,
                    customerId: tx.customerId,
                    amount: tx.amount,
                    type: tx.type,
                    category: tx.category || 'Uncategorized',
                    date: tx.date,
                    description: tx.description || '',
                    status: tx.status || 'Completed',
                    created_at: tx.created_at || new Date().toISOString()
                });
            }
        });

        importTx();

        // Audit Log
        db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)')
            .run(req.user.id, 'IMPORT_DATA', `Restored ${customers.length} customers and ${transactions.length} transactions`);

        res.json({ message: '数据导入成功' });
    } catch (error) {
        console.error('Import failed:', error);
        res.status(500).json({ error: '导入失败: ' + error.message });
    }
});

// --- Serve Frontend Static Files (Production) ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Handle React Router - Route all non-API requests to index.html
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.url.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        next();
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
