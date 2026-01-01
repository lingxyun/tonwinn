
const sqlite3 = require('better-sqlite3');
const path = require('path');

const db = new sqlite3('financial.db');

function runTest() {
    console.log('--- Starting Balance Logic Test ---');

    // 1. Create a test customer
    const createCust = db.prepare('INSERT INTO customers (name, balance, status, phone) VALUES (?, ?, ?, ?)').run('Test Balance User', 0, 'Active', '1234567890');
    const custId = createCust.lastInsertRowid;
    console.log(`Created Customer ID: ${custId} with Balance: 0`);

    // 2. Create a transaction (Income 100)
    const txId = 'TEST-TX-' + Date.now();
    db.prepare('INSERT INTO transactions (id, customerId, amount, type, date, status) VALUES (?, ?, ?, ?, ?, ?)').run(txId, custId, 100, 'Income', '2023-01-01', 'Completed');

    // Update customer balance manually as the POST route usually does this, assuming POST works. 
    // But we are testing PUT, so let's set initial state correctly.
    db.prepare('UPDATE customers SET balance = balance + 100 WHERE id = ?').run(custId);

    const custAfterCreate = db.prepare('SELECT * FROM customers WHERE id = ?').get(custId);
    console.log(`Customer Balance after creation (should be 100): ${custAfterCreate.balance}`);

    // 3. Simulate PUT logic (The logic we want to test)
    // We will run the EXACT logic block I added to server/index.js

    const reqBody = {
        customerId: custId,
        amount: 300,        // Changed from 100 to 300
        type: 'Income',
        category: 'Test',
        date: '2023-01-01',
        description: 'Updated',
        status: 'Completed'
    };

    console.log('--- Executing Update Logic ---');

    const updateTx = db.transaction(() => {
        // 1. Get original
        const originalTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);

        // 2. Revert original (Income 100 -> subtract 100)
        if (originalTx.customerId) {
            const revertAmount = originalTx.type === 'Income' ? -originalTx.amount : originalTx.amount;
            console.log(`Reverting amount: ${revertAmount}`);
            db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?')
                .run(revertAmount, originalTx.customerId);
        }

        // 3. Update tx
        db.prepare(
            'UPDATE transactions SET customerId = ?, amount = ?, type = ?, category = ?, date = ?, description = ?, status = ? WHERE id = ?'
        ).run(reqBody.customerId, reqBody.amount, reqBody.type, reqBody.category, reqBody.date, reqBody.description, reqBody.status, txId);

        // 4. Apply new (Income 300 -> add 300)
        if (reqBody.customerId) {
            const newAdjustment = reqBody.type === 'Income' ? reqBody.amount : -reqBody.amount;
            console.log(`Applying new amount: ${newAdjustment}`);
            db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?')
                .run(newAdjustment, reqBody.customerId);
        }
    });

    updateTx();

    // 4. Verify Final State
    const custFinal = db.prepare('SELECT * FROM customers WHERE id = ?').get(custId);
    console.log(`Final Customer Balance (should be 300): ${custFinal.balance}`);

    if (custFinal.balance === 300) {
        console.log('SUCCESS: Logic is correct.');
    } else {
        console.error('FAILURE: Logic is incorrect.');
    }

    // Cleanup
    db.prepare('DELETE FROM transactions WHERE id = ?').run(txId);
    db.prepare('DELETE FROM customers WHERE id = ?').run(custId);
}

runTest();
