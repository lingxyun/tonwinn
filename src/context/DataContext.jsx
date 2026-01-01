import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as db from '../utils/tauriDb';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const DataContext = createContext();

// --- Constants ---
const DB_READY_DELAY = 100;

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

    const refreshData = async () => {
        setLoading(true);
        try {
            const [custData, txData, catData] = await Promise.all([
                db.select('SELECT * FROM customers ORDER BY created_at DESC'),
                db.select('SELECT * FROM transactions ORDER BY date DESC'),
                db.select('SELECT * FROM categories ORDER BY created_at DESC')
            ]);
            setCustomers(custData);
            setTransactions(txData);
            setCategories(catData);
            return true;
        } catch (error) {
            console.error('Refresh failed:', error);
            return false;
        } finally {
            setLoading(false);
        }
    };

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
            toast.error('导出失败: ' + (error?.message || error || '未知错误'));
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
        const csvContent = Papa.unparse({ fields: headers, data: [exampleRow] });
        downloadCSV(csvContent, '客户导入模板.csv');
    };

    const importTransactionsFromCSV = async (file) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data;
                let successCount = 0;
                let failCount = 0;

                for (const item of data) {
                    const date = item['日期'];
                    const customerName = item['客户名称'];
                    const amount = parseFloat(item['金额'] || 0);
                    const type = item['类型'] === '收入' ? 'Income' : 'Expense';
                    const category = item['分类'];
                    const description = item['备注'];
                    const txId = item['交易ID'] || `ORD-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

                    if (date && amount) {
                        try {
                            // Find customer by name
                            const customer = customers.find(c => c.name === customerName);
                            const customerId = customer ? customer.id : null;

                            await db.execute(
                                'INSERT INTO transactions (id, customerId, amount, type, category, date, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                [txId, customerId, amount, type, category || 'Uncategorized', date, description || '', 'Completed']
                            );
                            successCount++;
                        } catch (err) {
                            console.error('Transaction import failed for:', item, err);
                            failCount++;
                        }
                    }
                }

                const updatedTxs = await db.select('SELECT * FROM transactions ORDER BY date DESC');
                setTransactions(updatedTxs);

                if (successCount > 0) {
                    toast.success(`成功导入 ${successCount} 条交易记录`, {
                        description: failCount > 0 ? `失败 ${failCount} 条` : undefined
                    });
                } else if (failCount > 0) {
                    toast.error('导入失败，请检查文件格式');
                }
            }
        });
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
                    const balance = parseFloat(item['账户余额'] || 0);
                    const statusText = item['状态'];

                    if (name && phone) {
                        try {
                            await db.execute(
                                'INSERT INTO customers (name, phone, address, email, balance, status) VALUES (?, ?, ?, ?, ?, ?)',
                                [name, phone, address || '', '', balance, statusText === '活跃' ? 'Active' : 'Inactive']
                            );
                            successCount++;
                        } catch (err) {
                            console.error('Customer import failed for:', item, err);
                            failCount++;
                        }
                    }
                }

                // Refresh data from local DB
                const updatedCusts = await db.select('SELECT * FROM customers ORDER BY created_at DESC');
                setCustomers(updatedCusts);

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
            console.log('Starting data import...');
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            if (!data.customers || !data.transactions) {
                toast.error('无效的备份文件格式');
                return;
            }

            // 1. Clear existing
            await db.execute('DELETE FROM transactions');
            await db.execute('DELETE FROM customers');

            // 2. Insert Customers
            console.log(`Importing ${data.customers.length} customers...`);
            for (const cust of data.customers) {
                await db.execute(
                    'INSERT INTO customers (id, name, email, phone, address, balance, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [cust.id, cust.name, cust.email || '', cust.phone, cust.address || '', cust.balance || 0, cust.status || 'Active', cust.created_at || new Date().toISOString()]
                );
            }

            // 3. Insert Transactions
            console.log(`Importing ${data.transactions.length} transactions...`);
            for (const tx of data.transactions) {
                await db.execute(
                    'INSERT INTO transactions (id, customerId, amount, type, category, date, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [tx.id, tx.customerId, tx.amount, tx.type, tx.category || 'Uncategorized', tx.date, tx.description || '', tx.status || 'Completed', tx.created_at || new Date().toISOString()]
                );
            }

            // 4. Refresh State
            const [custs, txs] = await Promise.all([
                db.select('SELECT * FROM customers ORDER BY created_at DESC'),
                db.select('SELECT * FROM transactions ORDER BY date DESC')
            ]);
            setCustomers(custs);
            setTransactions(txs);

            toast.success('数据恢复成功');
            console.log('Data import completed successfully');
        } catch (error) {
            console.error('Import error:', error);
            toast.error('导入失败: ' + error.message);
        }
    };

    // --- Stats ---
    const getStats = () => {
        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1; // 1-12

            let lastMonth = currentMonth - 1;
            let lastMonthYear = currentYear;
            if (lastMonth === 0) {
                lastMonth = 12;
                lastMonthYear = currentYear - 1;
            }

            const safeTransactions = transactions || [];

            // Helper to parse date consistently
            const parseDateParts = (dateStr) => {
                if (!dateStr) return null;
                if (dateStr instanceof Date) {
                    return {
                        year: dateStr.getFullYear(),
                        month: dateStr.getMonth() + 1,
                        day: dateStr.getDate()
                    };
                }
                const separator = ['-', '/', '.'].find(s => dateStr.includes(s));
                if (!separator) return null;
                const parts = dateStr.split(separator);
                return {
                    year: parseInt(parts[0]),
                    month: parseInt(parts[1]),
                    day: parseInt(parts[2])
                };
            };

            // --- Yearly Revenue Calculation ---
            const getRevenueForYear = (year) => {
                return safeTransactions
                    .filter(t => {
                        const parts = parseDateParts(t.date);
                        return parts && t.type === 'Income' && t.status === 'Completed' && parts.year === year;
                    })
                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
            };

            const thisYearRevenue = getRevenueForYear(currentYear);
            const lastYearRevenue = getRevenueForYear(currentYear - 1);

            let yearGrowthRate = 0;
            if (lastYearRevenue > 0) {
                yearGrowthRate = ((thisYearRevenue - lastYearRevenue) / lastYearRevenue) * 100;
            } else if (thisYearRevenue > 0) {
                yearGrowthRate = 100;
            }

            // --- MoM Calculations ---
            const getMonthlyMetrics = (year, month) => {
                const monthlyTxs = safeTransactions.filter(t => {
                    const parts = parseDateParts(t.date);
                    return parts && parts.year === year && parts.month === month;
                });

                const income = monthlyTxs
                    .filter(t => t.type === 'Income' && t.status === 'Completed')
                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

                const expense = monthlyTxs
                    .filter(t => t.type === 'Expense' && t.status === 'Completed')
                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

                const profit = income - expense;
                const orderCount = monthlyTxs.length;
                const activeCustomerCount = new Set(monthlyTxs.map(t => t.customerId).filter(Boolean)).size;

                return { profit, orderCount, activeCustomerCount, year, month };
            };

            const thisMonthMetrics = getMonthlyMetrics(currentYear, currentMonth);
            const lastMonthMetrics = getMonthlyMetrics(lastMonthYear, lastMonth);

            console.log('Stats Debug:', {
                current: { year: currentYear, month: currentMonth, count: thisMonthMetrics.orderCount, profit: thisMonthMetrics.profit },
                previous: { year: lastMonthYear, month: lastMonth, count: lastMonthMetrics.orderCount, profit: lastMonthMetrics.profit },
                totalTxs: safeTransactions.length
            });

            const calcGrowth = (curr, prev, isPercentage = true) => {
                if (isPercentage) {
                    if (prev === 0) {
                        return curr === 0 ? "+0%" : (curr > 0 ? "+100%" : "-100%");
                    }
                    const rate = ((curr - prev) / Math.abs(prev)) * 100;
                    return (rate >= 0 ? "+" : "") + rate.toFixed(1) + "%";
                } else {
                    const diff = curr - prev;
                    return (diff >= 0 ? "+" : "") + diff;
                }
            };

            const results = {
                totalRevenue: thisYearRevenue,
                totalOrders: safeTransactions.length,
                activeCustomers: (customers || []).filter(c => c.status === 'Active').length,
                growth: (yearGrowthRate >= 0 ? "+" : "") + yearGrowthRate.toFixed(1) + "%",
                profitMoM: calcGrowth(thisMonthMetrics.profit, lastMonthMetrics.profit, true),
                profitTrend: thisMonthMetrics.profit >= lastMonthMetrics.profit ? 'up' : 'down',
                orderMoM: calcGrowth(thisMonthMetrics.orderCount, lastMonthMetrics.orderCount, true),
                orderTrend: thisMonthMetrics.orderCount >= lastMonthMetrics.orderCount ? 'up' : 'down',
                customerMoM: calcGrowth(thisMonthMetrics.activeCustomerCount, lastMonthMetrics.activeCustomerCount, false),
                customerTrend: thisMonthMetrics.activeCustomerCount >= lastMonthMetrics.activeCustomerCount ? 'up' : 'down'
            };

            // Console log for help with user troubleshooting
            console.log('Dashboard Stats Calculated:', results);
            return results;
        } catch (err) {
            console.error('Error calculating stats:', err);
            return {
                totalRevenue: 0,
                totalOrders: 0,
                activeCustomers: 0,
                growth: "+0%",
                profitMoM: "+0%",
                profitTrend: 'up',
                orderMoM: "+0%",
                orderTrend: 'up',
                customerMoM: "+0",
                customerTrend: 'up'
            };
        }
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
            setCustomers,
            setTransactions,
            setCategories,
            setLoading,
            importTransactionsFromCSV,
            refreshData,
            stats: getStats()
        }}>
            {children}
        </DataContext.Provider>
    );
};
