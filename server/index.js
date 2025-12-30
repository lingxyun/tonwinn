import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Initialize Database Synchronously
const db = initDb();

// --- API Routes ---

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    try {
        const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: '密码错误' });
        }

        res.json({ id: user.id, username: user.username });
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

app.post('/api/settings', (req, res) => {
    const updates = req.body;
    try {
        const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
        const updateTransaction = db.transaction((data) => {
            for (const [key, value] of Object.entries(data)) {
                stmt.run(key, value);
            }
        });
        updateTransaction(updates);
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
app.post('/api/customers', (req, res) => {
    const { name, email, phone, address, balance, status } = req.body;
    try {
        const result = db.prepare(
            'INSERT INTO customers (name, email, phone, address, balance, status) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(name, email, phone, address, balance || 0, status || 'Active');

        const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Customer
app.put('/api/customers/:id', (req, res) => {
    const { name, email, phone, address, balance, status } = req.body;
    try {
        db.prepare(
            'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, balance = ?, status = ? WHERE id = ?'
        ).run(name, email, phone, address, balance, status, req.params.id);

        const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Customer
app.delete('/api/customers/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
        res.json({ message: 'Customer deleted' });
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
app.post('/api/transactions', (req, res) => {
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
app.put('/api/transactions/:id', (req, res) => {
    const { customerId, amount, type, category, date, description, status } = req.body;
    try {
        db.prepare(
            'UPDATE transactions SET customerId = ?, amount = ?, type = ?, category = ?, date = ?, description = ?, status = ? WHERE id = ?'
        ).run(customerId, amount, type, category, date, description, status, req.params.id);

        const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Transaction
app.delete('/api/transactions/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
        res.json({ message: 'Transaction deleted' });
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

app.post('/api/categories', (req, res) => {
    const { name, type } = req.body;
    try {
        const result = db.prepare(
            'INSERT INTO categories (name, type) VALUES (?, ?)'
        ).run(name, type);

        const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/categories/:id', (req, res) => {
    const { name, type } = req.body;
    try {
        db.prepare(
            'UPDATE categories SET name = ?, type = ? WHERE id = ?'
        ).run(name, type, req.params.id);

        const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/categories/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset Data
app.post('/api/reset', (req, res) => {
    try {
        const resetTx = db.transaction(() => {
            db.prepare('DELETE FROM customers').run();
            db.prepare('DELETE FROM transactions').run();
            db.prepare('DELETE FROM sqlite_sequence WHERE name="customers"').run();
        });
        resetTx();
        res.json({ message: 'All data reset' });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
