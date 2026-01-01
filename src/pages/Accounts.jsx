
import React from 'react';
import { customers } from '../utils/mockData';
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import Customers from './Customers';
import { useData } from '../context/DataContext';

const Accounts = () => {
    // Accounts can be treated as an alias for Customers with more focus on balances, or a Ledger view.
    const { customers: localCustomers, transactions } = useData();

    // Calculate generic stats avoiding "Balance"
    // Total Volume of Transactions
    const totalVolume = transactions.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    const activeClients = localCustomers.filter(c => c.status === 'Active').length;
    const inactiveClients = localCustomers.length - activeClients;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">账目详情</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg shadow-blue-200">
                    <p className="text-blue-100 text-sm font-medium">总交易流水</p>
                    <h3 className="text-3xl font-bold mt-2">¥{totalVolume.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</h3>
                    <div className="mt-4 flex items-center text-blue-100 text-sm">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>业务往来合计</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-slate-500 text-sm font-medium">活跃客户账户</p>
                    <h3 className="text-3xl font-bold mt-2 text-emerald-600">{activeClients}</h3>
                    <p className="text-xs text-slate-400 mt-1">当前正常交易中</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-slate-500 text-sm font-medium">非活跃/停用账户</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-500">{inactiveClients}</h3>
                    <p className="text-xs text-slate-400 mt-1">暂无交易或已冻结</p>
                </div>
            </div>

            {/* Reuse Customer Table or a simplified Ledger table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">账户列表</h2>
                <Customers />
                {/* Embedded Customers Component for now as it contains the list */}
            </div>
        </div>
    );
};

export default Accounts;
