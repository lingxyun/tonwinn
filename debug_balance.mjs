
async function run() {
    const BASE_URL = 'http://localhost:3002';

    console.log('1. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: '123456' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    if (!token) {
        console.error('Login failed:', loginData);
        return;
    }
    console.log('Login success.');

    // 2. Get Transactions
    console.log('2. Fetching transactions...');
    const txRes = await fetch(`${BASE_URL}/api/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const transactions = await txRes.json();
    if (transactions.length === 0) {
        console.log('No transactions found to test.');
        return;
    }
    const tx = transactions[0];
    console.log(`Testing with Transaction ID: ${tx.id}, Amount: ${tx.amount}, Customer: ${tx.customerId}`);

    // 3. Get Customer Initial Balance
    const custRes1 = await fetch(`${BASE_URL}/api/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const customers1 = await custRes1.json();
    const customer1 = customers1.find(c => c.id === tx.customerId);
    console.log(`Initial Customer Balance: ${customer1 ? customer1.balance : 'N/A'}`);

    // 4. Update Transaction (Add 100 to amount)
    const newAmount = parseFloat(tx.amount) + 100;
    console.log(`4. Updating Transaction Amount to: ${newAmount}`);

    // Construct payload strictly matching what frontend sends
    const payload = {
        ...tx,
        amount: newAmount,
        customerId: tx.customerId // Ensure customerId is sent
    };

    const updateRes = await fetch(`${BASE_URL}/api/transactions/${tx.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    const updatedTx = await updateRes.json();
    console.log('Update response:', updatedTx);

    // 5. Check New Balance
    const custRes2 = await fetch(`${BASE_URL}/api/customers?t=${Date.now()}`, { // Simulate cache busting
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const customers2 = await custRes2.json();
    const customer2 = customers2.find(c => c.id === tx.customerId);
    console.log(`Final Customer Balance: ${customer2 ? customer2.balance : 'N/A'}`);

    const expectedDiff = tx.type === 'Income' ? 100 : -100;
    const actualDiff = customer2.balance - customer1.balance;
    console.log(`Balance Diff: ${actualDiff} (Expected: ${expectedDiff})`);
}

run().catch(console.error);
