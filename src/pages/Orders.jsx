
import React, { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Search, Filter, Plus, Edit, Trash2, Calendar, FileText, FileSpreadsheet, Download, Upload, ChevronDown } from 'lucide-react';
import Modal from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';
import InvoiceModal from '../components/transactions/InvoiceModal';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { ask } from '@tauri-apps/plugin-dialog';

import { useData } from '../context/DataContext';

const Orders = () => {
    const { setIsTxModalOpen } = useOutletContext();
    const {
        transactions: txList,
        customers,
        deleteTransaction,
        updateTransaction,
        exportTransactionDetailsToCSV,
        importTransactionsFromCSV
    } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [selectedInvoiceTx, setSelectedInvoiceTx] = useState(null);
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
    const dataMenuRef = React.useRef(null);
    const fileInputRef = React.useRef(null);

    const [searchParams, setSearchParams] = useSearchParams();

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
                setIsDataMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter States
    const [filterType, setFilterType] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterCustomer, setFilterCustomer] = useState(searchParams.get('customerId') || 'All');

    // Update filter if URL params change
    React.useEffect(() => {
        const cid = searchParams.get('customerId');
        if (cid) {
            setFilterCustomer(cid);
        }
    }, [searchParams]);
    const [filterAmount, setFilterAmount] = useState({ min: '', max: '' });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const filteredTx = txList.filter(tx => {
        const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || tx.type === filterType;
        const matchesStatus = filterStatus === 'All' || tx.status === filterStatus;
        const matchesCategory = filterCategory === 'All' || tx.category === filterCategory;
        const matchesCustomer = filterCustomer === 'All' || tx.customerId === parseInt(filterCustomer);

        let matchesAmount = true;
        if (filterAmount.min) matchesAmount = matchesAmount && tx.amount >= parseFloat(filterAmount.min);
        if (filterAmount.max) matchesAmount = matchesAmount && tx.amount <= parseFloat(filterAmount.max);

        let matchesDate = true;
        if (dateRange.start) matchesDate = matchesDate && tx.date >= dateRange.start;
        if (dateRange.end) matchesDate = matchesDate && tx.date <= dateRange.end;

        return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesCustomer && matchesAmount && matchesDate;
    });

    // Unique Categories for Filter Dropdown
    const categories = Array.from(new Set(txList.map(tx => tx.category).filter(Boolean)));

    // Dashboard Stats Logic
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    const todayStats = {
        income: filteredTx.filter(t => t.date === todayStr && t.type === 'Income').reduce((sum, t) => sum + t.amount, 0),
        count: filteredTx.filter(t => t.date === todayStr).length
    };

    // Pending items in the current filtered view (regardless of date, or maybe restrict to current month if volume is high? 
    // User asked for "Month's Outstanding", so let's filter by current month AND pending)
    const pendingAmount = filteredTx
        .filter(t => t.date.startsWith(currentMonthStr) && t.status === 'Pending')
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">订单管理</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">查看和管理所有交易记录</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative" ref={dataMenuRef}>
                        <button
                            onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            数据操作
                            <ChevronDown className={cn("w-4 h-4 transition-transform", isDataMenuOpen && "rotate-180")} />
                        </button>

                        {isDataMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-200">
                                <button
                                    onClick={() => { exportTransactionDetailsToCSV(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4 text-emerald-500" /> 导出交易记录
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                <button
                                    onClick={() => { fileInputRef.current?.click(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4 text-amber-500" /> 导入交易记录
                                </button>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                importTransactionsFromCSV(e.target.files[0]);
                                e.target.value = '';
                            }
                        }}
                        className="hidden"
                        accept=".csv"
                    />

                    <button
                        onClick={() => setIsTxModalOpen(true)}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        新建交易
                    </button>
                </div>
            </div>

            {/* Mini Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-between">
                    <div>
                        <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">今日收款</div>
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1">
                            <span className="text-sm mr-1">¥</span>{todayStats.income.toFixed(2)}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <span className="font-bold text-lg">今</span>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20 flex items-center justify-between">
                    <div>
                        <div className="text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">本月待结清</div>
                        <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono mt-1">
                            <span className="text-sm mr-1">¥</span>{pendingAmount.toFixed(2)}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <span className="font-bold text-lg">待</span>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
                    <div>
                        <div className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">今日单量</div>
                        <div className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono mt-1">
                            {todayStats.count} <span className="text-sm font-medium text-blue-500/80">笔</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                {/* Filters */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                    <div className="relative flex-1 md:max-w-xs">
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
                            className="flex-1 md:flex-none px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="All">所有类型</option>
                            <option value="Income">收入</option>
                            <option value="Expense">支出</option>
                        </select>

                        <select
                            className="flex-1 md:flex-none px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">所有状态</option>
                            <option value="Completed">已完成</option>
                            <option value="Pending">处理中</option>
                        </select>

                        <select
                            className="flex-1 md:flex-none px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="All">所有类别</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select
                            className="flex-1 md:flex-none px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary md:max-w-[140px]"
                            value={filterCustomer}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilterCustomer(val);
                                if (val === 'All') {
                                    searchParams.delete('customerId');
                                } else {
                                    searchParams.set('customerId', val);
                                }
                                setSearchParams(searchParams);
                            }}
                        >
                            <option value="All">所有客户</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <div className="flex-1 md:flex-none flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2">
                            <span className="text-xs text-slate-400">¥</span>
                            <input
                                type="number"
                                placeholder="Min"
                                className="px-1 py-2 text-sm focus:outline-none bg-transparent w-full md:w-16 text-slate-900 dark:text-white"
                                value={filterAmount.min}
                                onChange={(e) => setFilterAmount({ ...filterAmount, min: e.target.value })}
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                className="px-1 py-2 text-sm focus:outline-none bg-transparent w-full md:w-16 text-slate-900 dark:text-white"
                                value={filterAmount.max}
                                onChange={(e) => setFilterAmount({ ...filterAmount, max: e.target.value })}
                            />
                        </div>

                        <div className="flex-1 md:flex-none flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 overflow-hidden">
                            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                                type="date"
                                className="px-2 py-2 text-sm focus:outline-none bg-transparent w-full md:w-32 text-slate-900 dark:text-white"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                            <span className="text-slate-400 shrink-0">-</span>
                            <input
                                type="date"
                                className="px-2 py-2 text-sm focus:outline-none bg-transparent w-full md:w-32 text-slate-900 dark:text-white"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
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
                                <th className="px-6 py-4 text-center">状态</th>
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
                                        onClick={() => toast.info(`交易详情: ${tx.id}`, { description: tx.description })}
                                    >
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{tx.id}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate" title={tx.description}>{tx.description}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {customer?.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-bold",
                                                tx.type === 'Income' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30" : "bg-rose-50 text-rose-600 dark:bg-rose-900/10 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30"
                                            )}>
                                                {tx.type === 'Income' ? '收入' : '支出'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{tx.category || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{tx.date}</td>
                                        <td className={cn(
                                            "px-6 py-4 text-lg font-bold font-mono text-right tracking-tight",
                                            tx.type === 'Income' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"
                                        )}>
                                            {tx.type === 'Income' ? '+' : '-'} ¥{tx.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm",
                                                tx.status === 'Completed' ? "bg-white text-green-600 border-green-200 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/30" :
                                                    tx.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/30" :
                                                        "bg-slate-50 text-slate-600 border-slate-200"
                                            )}>
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
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const confirmed = await ask('确定要删除这条交易记录吗？', {
                                                        title: '删除订单确认',
                                                        kind: 'warning',
                                                        okLabel: '确定删除',
                                                        cancelLabel: '取消'
                                                    });
                                                    if (confirmed) {
                                                        deleteTransaction(tx.id);
                                                    }
                                                }}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="删除"
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

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTx.map((tx) => {
                        const customer = customers.find(c => c.id === tx.customerId);
                        return (
                            <div
                                key={tx.id}
                                className="p-4 space-y-3 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                                onClick={() => toast.info(`交易详情: ${tx.id}`, { description: tx.description })}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">#{tx.id}</span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                tx.type === 'Income' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                            )}>
                                                {tx.type === 'Income' ? '收入' : '支出'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium">{customer?.name || '未知客户'}</div>
                                    </div>
                                    <div className={cn(
                                        "text-lg font-black tracking-tight",
                                        tx.type === 'Income' ? "text-emerald-600" : "text-slate-900 dark:text-white"
                                    )}>
                                        {tx.type === 'Income' ? '+' : '-'} ¥{tx.amount.toFixed(2)}
                                    </div>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{tx.description}</div>
                                <div className="flex justify-between items-center pt-2">
                                    <div className="text-[10px] text-slate-400 font-medium">
                                        {tx.date} · {tx.category || '未分类'}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingTx(tx);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedInvoiceTx(tx);
                                                setIsInvoiceModalOpen(true);
                                            }}
                                            className="p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const confirmed = await ask('确定要删除这条交易记录吗？', {
                                                    title: '删除订单确认',
                                                    kind: 'warning',
                                                    okLabel: '确定删除',
                                                    cancelLabel: '取消'
                                                });
                                                if (confirmed) {
                                                    deleteTransaction(tx.id);
                                                }
                                            }}
                                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
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
