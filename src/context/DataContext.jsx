import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../config';
import Papa from 'papaparse';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    // --- Customers State ---
    // --- State ---
    const [customers, setCustomers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Use user and token from AuthContext instead of local state
    const { user, token } = useAuth();

    // Helper for fetch with token
    const fetchWithAuth = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return fetch(url, { ...options, headers });
    };

    // --- Initial Load ---
    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                // Initial load with cache busting
                const [custRes, txRes, catRes] = await Promise.all([
                    fetchWithAuth(`${API_BASE_URL}/api/customers?t=${Date.now()}`),
                    fetchWithAuth(`${API_BASE_URL}/api/transactions?t=${Date.now()}`),
                    fetch(`${API_BASE_URL}/api/categories`)
                ]);

                if (custRes.ok && txRes.ok && catRes.ok) {
                    const custData = await custRes.json();
                    const txData = await txRes.json();
                    const catData = await catRes.json();
                    setCustomers(custData);
                    setTransactions(txData);
                    setCategories(catData);
                }
            } catch (error) {
                console.error('Failed to fetching data:', error);
                toast.error('无法连接到服务器，请确保后台已启动');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]); // Re-fetch when token changes

    // --- Persistence ---


    // --- Actions: Customers ---
    const addCustomer = async (customerData, role = 'Customer') => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/customers`, {
                method: 'POST',
                body: JSON.stringify({
                    ...customerData,
                    role,
                    balance: parseFloat(customerData.balance || 0)
                })
            });
            if (res.ok) {
                const newCustomer = await res.json();
                setCustomers((prev) => [newCustomer, ...prev]);
                toast.success(`${role === 'Supplier' ? '供货商' : '客户'}添加成功`);
            }
        } catch (error) {
            toast.error('添加失败');
        }
    };

    const updateCustomer = async (updatedData) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/customers/${updatedData.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedData)
            });
            if (res.ok) {
                const updated = await res.json();
                setCustomers((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c))
                );
                toast.success(`${updated.role === 'Supplier' ? '供货商' : '客户'}信息已更新`);
            }
        } catch (error) {
            toast.error('更新失败');
        }
    };

    const deleteCustomer = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/customers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                const customer = customers.find(c => c.id === id);
                const role = customer?.role || 'Customer';
                setCustomers((prev) => prev.filter((c) => c.id !== id));
                toast.success(`${role === 'Supplier' ? '供货商' : '客户'}已删除`);
            } else {
                const err = await res.json();
                toast.error('删除失败', { description: err.error || '服务器拒绝了请求，请检查权限' });
            }
        } catch (error) {
            toast.error('删除失败', { description: '网络连接异常' });
        }
    };

    // --- Actions: Categories ---
    const addCategory = async (category) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/categories`, {
                method: 'POST',
                body: JSON.stringify(category)
            });
            if (res.ok) {
                const newCat = await res.json();
                setCategories((prev) => [newCat, ...prev]);
                toast.success('类别添加成功');
            }
        } catch {
            toast.error('添加失败');
        }
    };

    const updateCategory = async (updatedCat) => {
        try {
            await fetch(`${API_BASE_URL}/api/categories/${updatedCat.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCat)
            });
            setCategories((prev) =>
                prev.map((c) => (c.id === updatedCat.id ? updatedCat : c))
            );
            toast.success('类别已更新');
        } catch {
            toast.error('更新失败');
        }
    };

    const deleteCategory = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/api/categories/${id}`, { method: 'DELETE' });
            setCategories((prev) => prev.filter((c) => c.id !== id));
            toast.success('类别已删除');
        } catch {
            toast.error('删除失败');
        }
    };

    // --- Actions: Transactions ---
    const addTransaction = async (txData) => {
        const newTxId = `ORD-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`;
        const payload = {
            id: newTxId,
            ...txData,
            amount: parseFloat(txData.amount || 0)
        };

        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/transactions`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const newTx = await res.json();
                setTransactions((prev) => [newTx, ...prev]);

                // Refresh customers to get updated balances
                // Refresh customers to get updated balances
                const custRes = await fetchWithAuth(`${API_BASE_URL}/api/customers?t=${Date.now()}`);
                if (custRes.ok) setCustomers(await custRes.json());

                toast.success('交易已记录');
            }
        } catch (error) {
            toast.error('交易失败');
        }
    };

    const updateTransaction = async (updatedTx) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/transactions/${updatedTx.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedTx)
            });

            if (res.ok) {
                setTransactions((prev) =>
                    prev.map((tx) => (tx.id === updatedTx.id ? { ...tx, ...updatedTx } : tx))
                );
                // Refresh customers to get updated balances
                // Refresh customers to get updated balances
                const custRes = await fetchWithAuth(`${API_BASE_URL}/api/customers?t=${Date.now()}`);
                if (custRes.ok) setCustomers(await custRes.json());

                toast.success('交易已更新，余额已同步');
            } else {
                toast.error('更新失败');
            }
        } catch {
            toast.error('更新失败');
        }
    };

    const deleteTransaction = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/transactions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTransactions((prev) => prev.filter((tx) => tx.id !== id));
                // Refresh customers to get updated balances
                // Refresh customers to get updated balances
                const custRes = await fetchWithAuth(`${API_BASE_URL}/api/customers?t=${Date.now()}`);
                if (custRes.ok) setCustomers(await custRes.json());
                toast.success('交易已删除');
            } else {
                const err = await res.json();
                toast.error('删除失败', { description: err.error || '无法执行删除' });
            }
        } catch {
            toast.error('删除失败', { description: '网络连接异常' });
        }
    };

    // --- Actions: CSV Export/Import ---
    const downloadCSV = (csvContent, fileName) => {
        const BOM = '\uFEFF'; // Add BOM for Excel Chinese support
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportCustomersToCSV = () => {
        const headers = ['ID', '姓名', '电话', '地址', '账户余额', '状态', '类型'];
        const rows = customers.map(c => ({
            'ID': c.id,
            '姓名': c.name,
            '电话': c.phone,
            '地址': c.address || '',
            '账户余额': c.balance,
            '状态': c.status === 'Active' ? '活跃' : '停用',
            '类型': c.role === 'Supplier' ? '供货商' : '客户'
        }));

        const csvContent = Papa.unparse({ headers, data: rows });
        downloadCSV(csvContent, `往来单位名录_${new Date().toLocaleDateString()}.csv`);
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
        const headers = ['ID', '姓名', '电话', '地址', '账户余额', '状态', '类型'];
        const exampleRow = ['', '张三', '13800138000', '上海市浦东新区', '500.00', '活跃', '客户'];
        const formatRow = (row) => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
        const csvContent = [headers, exampleRow].map(formatRow).join("\n");
        downloadCSV(csvContent, '导入模板.csv');
    };

    const importCustomersFromCSV = async (file, defaultRole = 'Customer') => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data;
                let successCount = 0;
                let failCount = 0;

                for (const item of data) {
                    const name = item['姓名'] || item['Name'] || item['name'];
                    const phone = item['电话'] || item['Phone'] || item['phone'];
                    const address = item['地址'] || item['Address'] || item['address'];
                    const balance = item['账户余额'] || item['Balance'] || 0;
                    const statusText = item['状态'] || item['Status'];
                    const roleText = item['类型'] || item['Role'] || defaultRole;

                    const role = (roleText === '供货商' || roleText === 'Supplier') ? 'Supplier' : 'Customer';

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
                                    status: statusText === '活跃' || statusText === 'Active' ? 'Active' : 'Inactive',
                                    role
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
                const custRes = await fetchWithAuth(`${API_BASE_URL}/api/customers`);
                if (custRes.ok) setCustomers(await custRes.json());

                if (successCount > 0) {
                    toast.success(`成功导入 ${successCount} 条记录`, {
                        description: failCount > 0 ? `失败 ${failCount} 条` : undefined
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

            if (!data.customers || !Array.isArray(data.customers) || !data.transactions || !Array.isArray(data.transactions)) {
                toast.error('无效的备份文件格式');
                return;
            }

            const res = await fetchWithAuth(`${API_BASE_URL}/api/import`, {
                method: 'POST',
                body: JSON.stringify({
                    customers: data.customers,
                    transactions: data.transactions
                })
            });

            if (res.ok) {
                // Re-fetch data from server to ensure synchronization
                const [custRes, txRes] = await Promise.all([
                    fetchWithAuth(`${API_BASE_URL}/api/customers?t=${Date.now()}`),
                    fetchWithAuth(`${API_BASE_URL}/api/transactions?t=${Date.now()}`)
                ]);

                if (custRes.ok && txRes.ok) {
                    setCustomers(await custRes.json());
                    setTransactions(await txRes.json());
                    toast.success('数据恢复成功', { description: '系统数据已还原至备份状态' });
                }
            } else {
                const err = await res.json();
                toast.error('恢复失败', { description: err.error || '服务器拒绝了请求' });
            }
        } catch (error) {
            console.error('Import error:', error);
            toast.error('导入失败', { description: '文件解析错误或网络异常' });
        }
    };

    // --- Stats ---
    const getStats = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const lastYear = currentYear - 1;
        const currentMonth = now.getMonth();
        const currentMonthYear = now.getFullYear();

        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentMonthYear - 1 : currentMonthYear;

        // 1. Annual Revenue (YoY)
        const getRevenueForYear = (year) => {
            return transactions
                .filter(t => t.type === 'Income' && t.status === 'Completed' && new Date(t.date).getFullYear() === year)
                .reduce((acc, curr) => acc + curr.amount, 0);
        };

        const thisYearRevenue = getRevenueForYear(currentYear);
        const lastYearRevenue = getRevenueForYear(lastYear);

        let revGrowthRate = 0;
        if (lastYearRevenue > 0) revGrowthRate = ((thisYearRevenue - lastYearRevenue) / lastYearRevenue) * 100;
        else if (thisYearRevenue > 0) revGrowthRate = 100;
        const revenueGrowth = (revGrowthRate >= 0 ? "+" : "") + revGrowthRate.toFixed(1) + "%";

        // 2. Transaction Count (MoM)
        const getOrdersForMonth = (month, year) => {
            return transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === month && d.getFullYear() === year;
            }).length;
        };

        const thisMonthOrders = getOrdersForMonth(currentMonth, currentMonthYear);
        const lastMonthOrders = getOrdersForMonth(lastMonth, lastMonthYear);

        let ordGrowthRate = 0;
        if (lastMonthOrders > 0) ordGrowthRate = ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;
        else if (thisMonthOrders > 0) ordGrowthRate = 100;
        const orderGrowth = (ordGrowthRate >= 0 ? "+" : "") + ordGrowthRate.toFixed(1) + "%";

        // 3. Asset Balance (MoM Trend)
        // Here we compare net profit of this month vs last month
        const getNetProfitForMonth = (month, year) => {
            return transactions
                .filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === month && d.getFullYear() === year && t.status === 'Completed';
                })
                .reduce((acc, curr) => curr.type === 'Income' ? acc + curr.amount : acc - curr.amount, 0);
        };

        const thisMonthNet = getNetProfitForMonth(currentMonth, currentMonthYear);
        const lastMonthNet = getNetProfitForMonth(lastMonth, lastMonthYear);

        let balGrowthRate = 0;
        if (lastMonthNet !== 0) balGrowthRate = ((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100;
        else if (thisMonthNet !== 0) balGrowthRate = 100;
        const balanceGrowth = (balGrowthRate >= 0 ? "+" : "") + balGrowthRate.toFixed(1) + "%";

        // 4. Active Customers (MoM)
        const activeCusts = customers.filter(c => c.status === 'Active' && c.role !== 'Supplier');
        const getNewActiveCustsForMonth = (month, year) => {
            return activeCusts.filter(c => {
                const d = new Date(c.created_at);
                return d.getMonth() === month && d.getFullYear() === year;
            }).length;
        };

        const thisMonthNewCusts = getNewActiveCustsForMonth(currentMonth, currentMonthYear);
        const lastMonthNewCusts = getNewActiveCustsForMonth(lastMonth, lastMonthYear);
        const customerGrowth = (thisMonthNewCusts >= lastMonthNewCusts ? "+" : "") + (thisMonthNewCusts - lastMonthNewCusts);

        return {
            totalRevenue: thisYearRevenue,
            revenueGrowth,
            totalOrders: transactions.length,
            orderGrowth,
            activeCustomers: activeCusts.length,
            customerGrowth,
            balanceGrowth,
            netProfit: transactions.reduce((acc, curr) => curr.type === 'Income' ? acc + curr.amount : acc - curr.amount, 0)
        };
    };

    const resetData = async () => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/reset`, { method: 'POST' });
            if (res.ok) {
                setCustomers([]);
                setTransactions([]);
                toast.success('系统已重置', { description: '所有数据已清空' });
            } else {
                const err = await res.json();
                toast.error('重置失败', { description: err.error || '无法执行重置，请确认管理员权限' });
            }
        } catch {
            toast.error('重置失败', { description: '网络连接异常' });
        }
    };

    return (
        <DataContext.Provider value={{
            user,
            token,
            setToken: (t) => {
                localStorage.setItem('token', t);
                setToken(t);
            },
            logout: () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
                setUser(null);
            },
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
