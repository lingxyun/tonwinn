
const sqlite3 = require('better-sqlite3');
const db = new sqlite3('financial.db');

const customerId = 1; // ID #0001 from screenshot

console.log(`--- Transactions for Customer ID ${customerId} ---`);

const txs = db.prepare('SELECT * FROM transactions WHERE customerId = ? ORDER BY date DESC').all(customerId);
const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

console.log('Customer Details:', customer);
console.log(`Total Stored Balance: ${customer.balance}`);

console.log('\nTransaction List:');
let calcBalance = 0;
txs.forEach(tx => {
    console.log(`[${tx.date}] ${tx.type} - Amount: ${tx.amount} (ID: ${tx.id})`);
    if (tx.type === 'Income') calcBalance += tx.amount;
    else calcBalance -= tx.amount;
});

console.log(`\nCalculated Balance from History: ${calcBalance}`);
