
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Plus, Edit, Trash2, Calendar, FileText } from 'lucide-react';
import Modal from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';
import InvoiceModal from '../components/transactions/InvoiceModal';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

import { useData } from '../context/DataContext';

const Orders = () => {
    const { setIsTxModalOpen } = useOutletContext();
    const { transactions: txList, customers, deleteTransaction, updateTransaction } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [selectedInvoiceTx, setSelectedInvoiceTx] = useState(null);

    // Filter States
    const [filterType, setFilterType] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterCustomer, setFilterCustomer] = useState('All');
    const [filterAmount, setFilterAmount] = useState({ min: '', max: '' });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const filteredTx = txList.filter(tx => {
        const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || tx.type === filterType;
        const matchesCategory = filterCategory === 'All' || tx.category === filterCategory;
        const matchesCustomer = filterCustomer === 'All' || tx.customerId === parseInt(filterCustomer);

        let matchesAmount = true;
        if (filterAmount.min) matchesAmount = matchesAmount && tx.amount >= parseFloat(filterAmount.min);
        if (filterAmount.max) matchesAmount = matchesAmount && tx.amount <= parseFloat(filterAmount.max);

        let matchesDate = true;
        if (dateRange.start) matchesDate = matchesDate && tx.date >= dateRange.start;
        if (dateRange.end) matchesDate = matchesDate && tx.date <= dateRange.end;

        return matchesSearch && matchesType && matchesCategory && matchesCustomer && matchesAmount && matchesDate;
    });

    // Unique Categories for Filter Dropdown
    const categories = Array.from(new Set(txList.map(tx => tx.category).filter(Boolean)));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">订单管理</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">查看和管理所有交易记录</p>
                </div>
                <button
                    onClick={() => setIsTxModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    新建交易
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                {/* Filters */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜索订单号或描述..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="All">所有类型</option>
                            <option value="Income">收入</option>
                            <option value="Expense">支出</option>
                        </select>

                        <select
                            className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="All">所有类别</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select
                            className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary max-w-[140px]"
                            value={filterCustomer}
                            onChange={(e) => setFilterCustomer(e.target.value)}
                        >
                            <option value="All">所有客户</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2">
                            <span className="text-xs text-slate-400">¥</span>
                            <input
                                type="number"
                                placeholder="Min"
                                className="px-1 py-2 text-sm focus:outline-none bg-transparent w-16 text-slate-900 dark:text-white"
                                value={filterAmount.min}
                                onChange={(e) => setFilterAmount({ ...filterAmount, min: e.target.value })}
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                className="px-1 py-2 text-sm focus:outline-none bg-transparent w-16 text-slate-900 dark:text-white"
                                value={filterAmount.max}
                                onChange={(e) => setFilterAmount({ ...filterAmount, max: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                className="px-2 py-2 text-sm focus:outline-none bg-transparent w-32 text-slate-900 dark:text-white"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="date"
                                className="px-2 py-2 text-sm focus:outline-none bg-transparent w-32 text-slate-900 dark:text-white"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">订单号</th>
                                <th className="px-6 py-4">描述</th>
                                <th className="px-6 py-4">客户</th>
                                <th className="px-6 py-4">类型</th>
                                <th className="px-6 py-4">类别</th>
                                <th className="px-6 py-4">日期</th>
                                <th className="px-6 py-4 text-right">金额</th>
                                <th className="px-6 py-4">状态</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredTx.map((tx) => {
                                const customer = customers.find(c => c.id === tx.customerId);
                                return (
                                    <tr
                                        key={tx.id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                        onClick={() => toast.info(`交易详情: ${tx.id} `, { description: tx.description })}
                                    >
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{tx.id}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{tx.description}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {customer?.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                tx.type === 'Income' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                            )}>
                                                {tx.type === 'Income' ? '收入' : '支出'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{tx.category || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{tx.date}</td>
                                        <td className={cn(
                                            "px-6 py-4 text-sm font-medium text-right",
                                            tx.type === 'Income' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"
                                        )}>
                                            {tx.type === 'Income' ? '+' : '-'} ¥{tx.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                tx.status === 'Completed' ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30" :
                                                    tx.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30" :
                                                        "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                                    tx.status === 'Completed' ? "bg-green-500" :
                                                        tx.status === 'Pending' ? "bg-amber-500" : "bg-slate-400"
                                                )} />
                                                {tx.status === 'Completed' ? '已完成' : '处理中'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingTx(tx);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="编辑"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedInvoiceTx(tx);
                                                    setIsInvoiceModalOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="生成收据"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('确定要删除这条交易记录吗？')) {
                                                        deleteTransaction(tx.id);
                                                    }
                                                }}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="编辑交易"
            >
                <TransactionForm
                    initialData={editingTx}
                    onSubmit={(data) => {
                        updateTransaction({ ...data, id: editingTx.id });
                        setIsEditModalOpen(false);
                    }}
                    onCancel={() => setIsEditModalOpen(false)}
                />
            </Modal>

            {/* Invoice Modal */}
            <InvoiceModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                transaction={selectedInvoiceTx}
                customer={selectedInvoiceTx ? customers.find(c => c.id === selectedInvoiceTx.customerId) : null}
            />
        </div>
    );
};

export default Orders;
