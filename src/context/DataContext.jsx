import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as db from '../utils/tauriDb';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    const [customers, setCustomers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial Load with Retry
    useEffect(() => {
        const fetchData = async (retries = 3) => {
            try {
                // Wait for the DB to be ready
                const [custData, txData, catData] = await Promise.all([
                    db.select('SELECT * FROM customers ORDER BY created_at DESC'),
                    db.select('SELECT * FROM transactions ORDER BY date DESC'),
                    db.select('SELECT * FROM categories ORDER BY created_at DESC')
                ]);

                setCustomers(custData);
                setTransactions(txData);
                setCategories(catData);
                setLoading(false);
            } catch (error) {
                console.error(`Fetch attempt failed (${retries} retries left):`, error);
                if (retries > 0) {
                    // Wait 500ms before retrying
                    setTimeout(() => fetchData(retries - 1), 500);
                } else {
                    toast.error('初始化数据库失败，请尝试重启软件');
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, []);

    // --- Persistence ---


    // --- Actions: Customers ---
    const addCustomer = async (data) => {
        try {
            await db.execute(
                'INSERT INTO customers (name, email, phone, address, balance, status) VALUES (?, ?, ?, ?, ?, ?)',
                [data.name, data.email || '', data.phone, data.address || '', data.balance || 0, data.status || 'Active']
            );
            const newCust = (await db.select('SELECT * FROM customers ORDER BY id DESC LIMIT 1'))[0];
            setCustomers((prev) => [newCust, ...prev]);
            toast.success('客户添加成功');
        } catch (error) {
            toast.error('添加失败');
        }
    };

    const updateCustomer = async (data) => {
        try {
            await db.execute(
                'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, balance = ?, status = ? WHERE id = ?',
                [data.name, data.email, data.phone, data.address, data.balance, data.status, data.id]
            );
            setCustomers((prev) =>
                prev.map((c) => (c.id === data.id ? data : c))
            );
            toast.success('客户信息已更新');
        } catch (error) {
            toast.error('更新失败');
        }
    };

    const deleteCustomer = async (id) => {
        try {
            // Transaction to delete customer and their transactions
            await db.execute('DELETE FROM transactions WHERE customerId = ?', [id]);
            await db.execute('DELETE FROM customers WHERE id = ?', [id]);
            setCustomers((prev) => prev.filter((c) => c.id !== id));
            setTransactions((prev) => prev.filter((t) => t.customerId !== id));
            toast.success('客户及相关交易已删除');
        } catch (error) {
            toast.error('删除失败');
        }
    };

    // --- Actions: Categories ---
    const addCategory = async (cat) => {
        try {
            await db.execute('INSERT INTO categories (name, type) VALUES (?, ?)', [cat.name, cat.type]);
            const newCat = (await db.select('SELECT * FROM categories ORDER BY id DESC LIMIT 1'))[0];
            setCategories((prev) => [newCat, ...prev]);
            toast.success('类别添加成功');
        } catch {
            toast.error('添加失败');
        }
    };

    const updateCategory = async (cat) => {
        try {
            await db.execute('UPDATE categories SET name = ?, type = ? WHERE id = ?', [cat.name, cat.type, cat.id]);
            setCategories((prev) =>
                prev.map((c) => (c.id === cat.id ? cat : c))
            );
            toast.success('类别已更新');
        } catch {
            toast.error('更新失败');
        }
    };

    const deleteCategory = async (id) => {
        try {
            await db.execute('DELETE FROM categories WHERE id = ?', [id]);
            setCategories((prev) => prev.filter((c) => c.id !== id));
            toast.success('类别已删除');
        } catch {
            toast.error('删除失败');
        }
    };

    // --- Actions: Transactions ---
    const addTransaction = async (txData) => {
        const newTxId = `ORD-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`;
        try {
            // 1. Insert transaction
            await db.execute(
                'INSERT INTO transactions (id, customerId, amount, type, category, date, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [newTxId, txData.customerId, txData.amount, txData.type, txData.category, txData.date, txData.description, txData.status || 'Completed']
            );

            // 2. Adjust customer balance
            if (txData.customerId) {
                const adjustment = txData.type === 'Income' ? txData.amount : -txData.amount;
                await db.execute('UPDATE customers SET balance = balance + ? WHERE id = ?', [adjustment, txData.customerId]);
            }

            // 3. Refresh state
            const [newTx] = await db.select('SELECT * FROM transactions WHERE id = ?', [newTxId]);
            setTransactions((prev) => [newTx, ...prev]);

            const updatedCustomers = await db.select('SELECT * FROM customers ORDER BY created_at DESC');
            setCustomers(updatedCustomers);

            toast.success('交易已记录');
        } catch (error) {
            console.error(error);
            toast.error('交易失败');
        }
    };

    const updateTransaction = async (updatedTx) => {
        try {
            const [originalTx] = await db.select('SELECT * FROM transactions WHERE id = ?', [updatedTx.id]);
            if (!originalTx) return;

            // 1. Revert original balance
            if (originalTx.customerId) {
                const revertAmount = originalTx.type === 'Income' ? -originalTx.amount : originalTx.amount;
                await db.execute('UPDATE customers SET balance = balance + ? WHERE id = ?', [revertAmount, originalTx.customerId]);
            }

            // 2. Update transaction
            await db.execute(
                'UPDATE transactions SET customerId = ?, amount = ?, type = ?, category = ?, date = ?, description = ?, status = ? WHERE id = ?',
                [updatedTx.customerId, updatedTx.amount, updatedTx.type, updatedTx.category, updatedTx.date, updatedTx.description, updatedTx.status, updatedTx.id]
            );

            // 3. Apply new balance
            if (updatedTx.customerId) {
                const newAdjustment = updatedTx.type === 'Income' ? updatedTx.amount : -updatedTx.amount;
                await db.execute('UPDATE customers SET balance = balance + ? WHERE id = ?', [newAdjustment, updatedTx.customerId]);
            }

            // 4. Refresh state
            setTransactions((prev) =>
                prev.map((tx) => (tx.id === updatedTx.id ? { ...tx, ...updatedTx } : tx))
            );
            const updatedCustomers = await db.select('SELECT * FROM customers ORDER BY created_at DESC');
            setCustomers(updatedCustomers);

            toast.success('交易已更新，余额已同步');
        } catch (error) {
            toast.error('更新失败');
        }
    };

    const deleteTransaction = async (id) => {
        try {
            const [tx] = await db.select('SELECT * FROM transactions WHERE id = ?', [id]);
            if (!tx) return;

            // 1. Revert balance
            if (tx.customerId) {
                const amountToRevert = tx.type === 'Income' ? -tx.amount : tx.amount;
                await db.execute('UPDATE customers SET balance = balance + ? WHERE id = ?', [amountToRevert, tx.customerId]);
            }

            // 2. Delete transaction
            await db.execute('DELETE FROM transactions WHERE id = ?', [id]);

            // 3. Refresh state
            setTransactions((prev) => prev.filter((t) => t.id !== id));
            const updatedCustomers = await db.select('SELECT * FROM customers ORDER BY created_at DESC');
            setCustomers(updatedCustomers);

            toast.success('交易已删除');
        } catch (error) {
            toast.error('删除失败');
        }
    };

    // --- Actions: CSV Export/Import ---
    const downloadCSV = async (csvContent, fileName) => {
        try {
            // Pick a path using native save dialog
            const filePath = await save({
                filters: [{
                    name: 'CSV文件',
                    extensions: ['csv']
                }],
                defaultPath: fileName
            });

            if (filePath) {
                const BOM = '\uFEFF'; // Add BOM for Excel Chinese support
                await writeTextFile(filePath, BOM + csvContent);
                toast.success('文件已保存');
            }
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('导出失败');
        }
    };

    const exportCustomersToCSV = () => {
        const headers = ['ID', '姓名', '电话', '地址', '账户余额', '状态'];
        const rows = customers.map(c => ({
            'ID': c.id,
            '姓名': c.name,
            '电话': c.phone,
            '地址': c.address || '',
            '账户余额': c.balance,
            '状态': c.status === 'Active' ? '活跃' : '停用'
        }));

        const csvContent = Papa.unparse({ fields: headers, data: rows });
        downloadCSV(csvContent, `客户名录_${new Date().toLocaleDateString()}.csv`);
    };

    const exportTransactionDetailsToCSV = () => {
        const headers = ['日期', '客户名称', '金额', '类型', '分类', '备注', '交易ID'];
        const formatRow = (row) => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");

        const rows = transactions.map(t => {
            const customer = customers.find(c => c.id === t.customerId);
            return [
                t.date,
                customer ? customer.name : '未知客户',
                t.amount,
                t.type === 'Income' ? '收入' : '支出',
                t.category,
                t.description || '-',
                t.id
            ];
        });

        const csvContent = [headers, ...rows].map(formatRow).join("\n");
        downloadCSV(csvContent, `交易全量明细_${new Date().toLocaleDateString()}.csv`);
    };

    const downloadCustomerTemplate = () => {
        const headers = ['ID', '姓名', '电话', '地址', '账户余额', '状态'];
        const exampleRow = ['', '张三', '13800138000', '上海市浦东新区', '500.00', '活跃'];
        const formatRow = (row) => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
        const csvContent = [headers, exampleRow].map(formatRow).join("\n");
        downloadCSV(csvContent, '客户导入模板.csv');
    };

    const importCustomersFromCSV = async (file) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data;
                let successCount = 0;
                let failCount = 0;

                for (const item of data) {
                    const name = item['姓名'];
                    const phone = item['电话'];
                    const address = item['地址'];
                    const balance = item['账户余额'];
                    const status = item['状态'];

                    if (name && phone) {
                        try {
                            const res = await fetchWithAuth(`${API_BASE_URL}/api/customers`, {
                                method: 'POST',
                                body: JSON.stringify({
                                    name,
                                    phone,
                                    address: address || '',
                                    email: '',
                                    balance: parseFloat(balance || 0),
                                    status: status === '活跃' ? 'Active' : 'Inactive'
                                })
                            });
                            if (res.ok) successCount++;
                            else failCount++;
                        } catch {
                            failCount++;
                        }
                    }
                }

                // Refresh data
                const custRes = await fetch(`${API_BASE_URL}/api/customers`);
                if (custRes.ok) setCustomers(await custRes.json());

                if (successCount > 0) {
                    toast.success(`成功导入 ${successCount} 个客户`, {
                        description: failCount > 0 ? `失败 ${failCount} 个` : undefined
                    });
                } else if (failCount > 0) {
                    toast.error('导入失败，请检查文件格式');
                }
            }
        });
    };

    // --- Actions: System ---
    const importData = async (jsonData) => {
        try {
            const data = JSON.parse(jsonData);

            if (!data.customers || !data.transactions) {
                toast.error('无效的备份文件格式');
                return;
            }

            // 1. Clear existing
            await db.execute('DELETE FROM transactions');
            await db.execute('DELETE FROM customers');

            // 2. Insert Customers
            for (const cust of data.customers) {
                await db.execute(
                    'INSERT INTO customers (id, name, email, phone, address, balance, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [cust.id, cust.name, cust.email || '', cust.phone, cust.address || '', cust.balance || 0, cust.status || 'Active', cust.created_at || new Date().toISOString()]
                );
            }

            // 3. Insert Transactions
            for (const tx of data.transactions) {
                await db.execute(
                    'INSERT INTO transactions (id, customerId, amount, type, category, date, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [tx.id, tx.customerId, tx.amount, tx.type, tx.category || 'Uncategorized', tx.date, tx.description || '', tx.status || 'Completed', tx.created_at || new Date().toISOString()]
                );
            }

            // 4. Refresh
            const [custs, txs] = await Promise.all([
                db.select('SELECT * FROM customers ORDER BY created_at DESC'),
                db.select('SELECT * FROM transactions ORDER BY date DESC')
            ]);
            setCustomers(custs);
            setTransactions(txs);

            toast.success('数据恢复成功');
        } catch (error) {
            console.error('Import error:', error);
            toast.error('导入失败');
        }
    };

    // --- Stats ---
    const getStats = () => {
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        const getRevenueForYear = (year) => {
            return transactions
                .filter(t => t.type === 'Income' && t.status === 'Completed' && new Date(t.date).getFullYear() === year)
                .reduce((acc, curr) => acc + curr.amount, 0);
        };

        const thisYearRevenue = getRevenueForYear(currentYear);
        const lastYearRevenue = getRevenueForYear(lastYear);

        let growthRate = 0;
        if (lastYearRevenue > 0) {
            growthRate = ((thisYearRevenue - lastYearRevenue) / lastYearRevenue) * 100;
        } else if (thisYearRevenue > 0) {
            growthRate = 100;
        }

        const growth = (growthRate > 0 ? "+" : "") + growthRate.toFixed(1) + "%";

        return {
            totalRevenue: thisYearRevenue,
            totalOrders: transactions.length,
            activeCustomers: customers.filter(c => c.status === 'Active').length,
            growth
        };
    };

    const resetData = async () => {
        try {
            await db.execute('DELETE FROM transactions');
            await db.execute('DELETE FROM customers');
            await db.execute('DELETE FROM audit_logs');
            await db.execute("DELETE FROM sqlite_sequence WHERE name='customers'");

            setCustomers([]);
            setTransactions([]);
            toast.success('系统已重置', { description: '所有数据已清空' });
        } catch {
            toast.error('重置失败');
        }
    };

    return (
        <DataContext.Provider value={{
            loading,
            customers,
            transactions,
            categories,
            addCategory,
            updateCategory,
            deleteCategory,
            addCustomer,
            updateCustomer,
            deleteCustomer,
            addTransaction,
            updateTransaction,
            deleteTransaction,
            resetData,
            importData,
            exportCustomersToCSV,
            exportTransactionDetailsToCSV,
            downloadCustomerTemplate,
            importCustomersFromCSV,
            stats: getStats()
        }}>
            {children}
        </DataContext.Provider>
    );
};
