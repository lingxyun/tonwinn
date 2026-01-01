
const sqlite3 = require('better-sqlite3');
const db = new sqlite3('financial.db');

console.log('--- Starting Balance Repair ---');

const customers = db.prepare('SELECT id, name, balance FROM customers').all();
let updates = 0;

const updateStmt = db.prepare('UPDATE customers SET balance = ? WHERE id = ?');

customers.forEach(cust => {
    const txs = db.prepare('SELECT amount, type FROM transactions WHERE customerId = ?').all(cust.id);
    let realBalance = 0;
    txs.forEach(tx => {
        if (tx.type === 'Income') realBalance += tx.amount;
        else realBalance -= tx.amount;
    });

    if (Math.abs(realBalance - cust.balance) > 0.01) {
        console.log(`Mismatch for Customer ${cust.name} (ID: ${cust.id}): Stored ${cust.balance} != Real ${realBalance}. Fixing...`);
        updateStmt.run(realBalance, cust.id);
        updates++;
    }
});

console.log(`--- Repair Complete. Fixed ${updates} customers. ---`);
