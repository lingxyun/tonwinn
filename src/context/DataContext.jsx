import React, { createContext, useContext, useState, useEffect } from 'react';
import { customers as initialCustomers, transactions as initialTransactions } from '../utils/mockData';
import { toast } from 'sonner';
import { API_BASE_URL } from '../config';

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

    // --- Initial Load ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, txRes, catRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/customers`),
                    fetch(`${API_BASE_URL}/api/transactions`),
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
    }, []);

    // --- Persistence ---


    // --- Actions: Customers ---
    const addCustomer = async (customerData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...customerData,
                    balance: parseFloat(customerData.balance || 0)
                })
            });
            if (res.ok) {
                const newCustomer = await res.json();
                setCustomers((prev) => [newCustomer, ...prev]);
                toast.success('客户添加成功');
            }
        } catch (error) {
            toast.error('添加失败');
        }
    };

    const updateCustomer = async (updatedData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/customers/${updatedData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            if (res.ok) {
                const updated = await res.json();
                setCustomers((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c))
                );
                toast.success('客户信息已更新');
            }
        } catch (error) {
            toast.error('更新失败');
        }
    };

    const deleteCustomer = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/api/customers/${id}`, { method: 'DELETE' });
            setCustomers((prev) => prev.filter((c) => c.id !== id));
            toast.success('客户已删除');
        } catch (error) {
            toast.error('删除失败');
        }
    };

    // --- Actions: Categories ---
    const addCategory = async (category) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch(`${API_BASE_URL}/api/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const newTx = await res.json();
                setTransactions((prev) => [newTx, ...prev]);

                // Refresh customers to get updated balances
                const custRes = await fetch(`${API_BASE_URL}/api/customers`);
                if (custRes.ok) setCustomers(await custRes.json());

                toast.success('交易已记录');
            }
        } catch (error) {
            toast.error('交易失败');
        }
    };

    const updateTransaction = async (updatedTx) => {
        try {
            await fetch(`${API_BASE_URL}/api/transactions/${updatedTx.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTx)
            });
            setTransactions((prev) =>
                prev.map((tx) => (tx.id === updatedTx.id ? { ...tx, ...updatedTx } : tx))
            );
            toast.success('交易已更新');
        } catch {
            toast.error('更新失败');
        }
    };

    const deleteTransaction = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/api/transactions/${id}`, { method: 'DELETE' });
            setTransactions((prev) => prev.filter((tx) => tx.id !== id));
            toast.success('交易已删除');
        } catch {
            toast.error('删除失败');
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
        const headers = ['ID', '姓名', '电话', '地址', '账户余额', '状态'];
        const formatRow = (row) => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");

        const rows = customers.map(c => [
            c.id,
            c.name,
            c.phone,
            c.address || '',
            c.balance,
            c.status === 'Active' ? '活跃' : '停用'
        ]);

        const csvContent = [headers, ...rows].map(formatRow).join("\n");
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
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const lines = text.split("\n");
            // Skip header, filter empty lines
            const dataLines = lines.slice(1).filter(line => line.trim() !== "");

            let successCount = 0;
            let failCount = 0;

            for (const line of dataLines) {
                // simple split by comma, could be improved with a lib if needed
                const [id, name, phone, address, balance, status] = line.split(",").map(val => val.trim());

                if (name && phone) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/customers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
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
            const custRes = await fetch('/api/customers');
            if (custRes.ok) setCustomers(await custRes.json());

            if (successCount > 0) {
                toast.success(`成功导入 ${successCount} 个客户`, {
                    description: failCount > 0 ? `失败 ${failCount} 个` : undefined
                });
            } else if (failCount > 0) {
                toast.error('导入失败，请检查文件格式');
            }
        };
        reader.readAsText(file);
    };

    // --- Actions: System ---
    const importData = (jsonData) => {
        try {
            const data = JSON.parse(jsonData);
            if (data.customers && Array.isArray(data.customers)) {
                setCustomers(data.customers);
            }
            if (data.transactions && Array.isArray(data.transactions)) {
                setTransactions(data.transactions);
            }
            toast.success('数据恢复成功');
        } catch (error) {
            toast.error('数据格式错误，无法导入');
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
            await fetch(`${API_BASE_URL}/api/reset`, { method: 'POST' });
            setCustomers([]);
            setTransactions([]);
            toast.success('系统已重置', { description: '所有数据已清空' });
        } catch {
            toast.error('重置失败');
        }
    };

    return (
        <DataContext.Provider value={{
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
