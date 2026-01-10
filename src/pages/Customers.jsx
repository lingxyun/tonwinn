
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MoreHorizontal, Phone, MapPin, Trash2, Edit, Download, Upload, FileSpreadsheet, FileText, ChevronDown, RotateCcw, ArrowLeft, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { ask } from '@tauri-apps/plugin-dialog';
import Modal from '../components/ui/Modal';
import TiltCard from '../components/ui/TiltCard';
import CustomerForm from '../components/customers/CustomerForm';

import { useData } from '../context/DataContext';

const Customers = () => {
    const navigate = useNavigate();
    const {
        customers: customerList,
        transactions,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        exportCustomersToCSV,
        exportTransactionDetailsToCSV,
        downloadCustomerTemplate,
        importCustomersFromCSV,
        refreshData,
        categories
    } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [detailPage, setDetailPage] = useState(1);
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const dataMenuRef = useRef(null);
    const fileInputRef = useRef(null);

    // Reset detail pagination when customer changes
    useEffect(() => {
        setDetailPage(1);
    }, [selectedCustomer]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenuId(null);
            }
            if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
                setIsDataMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Strictly separate customers from suppliers
    const customerOnlyList = (customerList || []).filter(c => c.role === 'Customer' || !c.role);

    const filteredCustomers = customerOnlyList.filter(c => {
        const matchesSearch = c.name.includes(searchTerm) ||
            (c.address && c.address.includes(searchTerm)) ||
            c.phone.includes(searchTerm);

        const matchesCategory = selectedCategory === 'all' ||
            (selectedCategory === 'none'
                ? (!c.categoryIds || (() => {
                    try {
                        const p = JSON.parse(c.categoryIds);
                        return Array.isArray(p) ? p.length === 0 : !p;
                    } catch { return true; }
                })()) && !c.categoryId
                : (c.categoryIds
                    ? (() => {
                        try {
                            const p = JSON.parse(c.categoryIds || '[]');
                            return Array.isArray(p) ? p.includes(parseInt(selectedCategory)) : p == parseInt(selectedCategory);
                        } catch { return false; }
                    })()
                    : c.categoryId === parseInt(selectedCategory))
            );

        return matchesSearch && matchesCategory;
    });

    // Pagination Logic
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleAddOrUpdateCustomer = (data) => {
        if (editingCustomer) {
            updateCustomer({ ...data, id: editingCustomer.id });
        } else {
            addCustomer(data);
        }
        closeModal();
    };

    const handleDeleteCustomer = async (id, name) => {
        const confirmed = await ask(`确定要删除客户 "${name}" 吗？此操作不可恢复。`, {
            title: '删除确认',
            kind: 'warning',
            okLabel: '确定删除',
            cancelLabel: '取消'
        });
        if (confirmed) {
            deleteCustomer(id);
        }
        setActiveMenuId(null);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
    };

    // Detail View
    if (selectedCustomer) {
        // Stats logic
        const customerTx = transactions.filter(t => t.customerId === selectedCustomer.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Pagination for Detail View
        const detailItemsPerPage = 10;
        const indexOfLastDetail = detailPage * detailItemsPerPage;
        const indexOfFirstDetail = indexOfLastDetail - detailItemsPerPage;
        const currentDetailTx = customerTx.slice(indexOfFirstDetail, indexOfLastDetail);
        const totalDetailPages = Math.ceil(customerTx.length / detailItemsPerPage);

        const paginateDetail = (pageNumber) => setDetailPage(pageNumber);

        return (
            <div className="space-y-6">
                {/* Header & Back Button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedCustomer(null)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            {selectedCustomer.name}
                            {(() => {
                                let ids = [];
                                try {
                                    const parsed = selectedCustomer.categoryIds ? JSON.parse(selectedCustomer.categoryIds) : (selectedCustomer.categoryId ? [selectedCustomer.categoryId] : []);
                                    ids = Array.isArray(parsed) ? parsed : [parsed];
                                } catch (e) { ids = []; }

                                return ids.map(id => {
                                    const cat = categories.find(c => c.id === id);
                                    if (!cat) return null;
                                    return (
                                        <span key={id} className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-100 dark:border-blue-800/50">
                                            {cat.name}
                                        </span>
                                    );
                                });
                            })()}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            ID: #{selectedCustomer.id.toString().padStart(4, '0')} · {selectedCustomer.phone}
                        </p>
                    </div>
                </div>

                {/* Stats Logic */}
                {(() => {
                    const now = new Date();
                    const lastTx = customerTx[0];
                    const lastTxDate = lastTx ? new Date(lastTx.date) : null;
                    const daysSinceLast = lastTxDate ? Math.floor((now - lastTxDate) / (1000 * 60 * 60 * 24)) : -1;

                    const totalSpent = customerTx.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
                    const txCount = customerTx.filter(t => t.type === 'Income').length;
                    const aov = txCount > 0 ? totalSpent / txCount : 0;

                    // Calculate Top Category
                    const catMap = {};
                    customerTx.filter(t => t.type === 'Income').forEach(t => {
                        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
                    });
                    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Card 1: Balance */}
                            <TiltCard className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 transition-colors duration-500"></div>
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2 relative z-10">当前余额</div>
                                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-1 relative z-10 group-hover:scale-105 transition-transform origin-left">
                                    <span className="text-sm">¥</span>{selectedCustomer.balance?.toFixed(2) || '0.00'}
                                </div>
                            </TiltCard>

                            {/* Card 2: Activity */}
                            <TiltCard className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-75 fill-mode-backwards group">
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2">最近活跃</div>
                                <div className="flex items-end justify-between">
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white group-hover:scale-105 transition-transform origin-left">
                                        {daysSinceLast === -1 ? '无记录' : daysSinceLast === 0 ? '今天' : `${daysSinceLast}天前`}
                                    </div>
                                    {daysSinceLast > 30 && (
                                        <div className="px-2 py-1 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 text-[10px] font-bold rounded flex items-center gap-1 animate-pulse">
                                            ⚠️ 流失风险
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    上次交易: {lastTx ? lastTx.date : '—'}
                                </div>
                            </TiltCard>

                            {/* Card 3: Value (AOV) */}
                            <TiltCard className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-150 fill-mode-backwards group">
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2">客户价值</div>
                                <div className="flex flex-col group-hover:scale-105 transition-transform origin-left">
                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                        <span className="text-sm text-slate-400 font-sans font-normal mr-1">总</span>¥{totalSpent.toFixed(0)}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        平均客单价: ¥{aov.toFixed(2)}
                                    </div>
                                </div>
                            </TiltCard>

                            {/* Card 4: Preference */}
                            <TiltCard className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-200 fill-mode-backwards group">
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2">偏好品类</div>
                                {topCategory ? (
                                    <div className="group-hover:scale-105 transition-transform origin-left">
                                        <div className="text-xl font-bold text-slate-900 dark:text-white truncate" title={topCategory[0]}>
                                            {topCategory[0]}
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${Math.min((topCategory[1] / totalSpent) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 text-right">
                                            占总消费 {((topCategory[1] / totalSpent) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-slate-400 text-sm italic py-2">暂无偏好数据</div>
                                )}
                            </TiltCard>
                        </div>
                    );
                })()}

                {/* Transactions List */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-8 delay-300 duration-500 fill-mode-backwards">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                            交易记录
                        </h3>
                        <button
                            onClick={() => exportTransactionDetailsToCSV(selectedCustomer.id, 'Income')}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="导出此客户全量收入记录"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>

                    {customerTx.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-3">订单号</th>
                                        <th className="px-6 py-3">日期</th>
                                        <th className="px-6 py-3">描述</th>
                                        <th className="px-6 py-3">类型</th>
                                        <th className="px-6 py-3">分类</th>
                                        <th className="px-6 py-3 text-right">金额</th>
                                        <th className="px-6 py-3">状态</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {currentDetailTx.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">#{tx.id}</td>
                                            <td className="px-6 py-3 text-slate-500">{tx.date}</td>
                                            <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{tx.description}</td>
                                            <td className="px-6 py-3">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                                    tx.type === 'Income' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                                )}>
                                                    {tx.type === 'Income' ? '收入' : '支出'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-slate-600 dark:text-slate-400 text-xs">
                                                {tx.category || '-'}
                                            </td>
                                            <td className={cn(
                                                "px-6 py-3 text-right font-medium font-mono",
                                                tx.type === 'Income' ? "text-emerald-600" : "text-slate-900 dark:text-slate-100"
                                            )}>
                                                {tx.type === 'Income' ? '+' : '-'} ¥{tx.amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={cn(
                                                    "inline-flex items-center text-xs px-2 py-0.5 rounded-full border",
                                                    tx.status === 'Completed' ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400" : "bg-amber-50 text-amber-700 border-amber-100"
                                                )}>
                                                    {tx.status === 'Completed' ? '已完成' : '处理中'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    ) : (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            该客户暂无交易记录
                        </div>
                    )}

                    {/* Detail Pagination Controls */}
                    {customerTx.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                显示 {indexOfFirstDetail + 1} - {Math.min(indexOfLastDetail, customerTx.length)} / 共 {customerTx.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => paginateDetail(detailPage - 1)}
                                    disabled={detailPage === 1}
                                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                >
                                    上一页
                                </button>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                    {detailPage} / {totalDetailPages}
                                </span>
                                <button
                                    onClick={() => paginateDetail(detailPage + 1)}
                                    disabled={detailPage === totalDetailPages}
                                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                >
                                    下一页
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        );
    }
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">客户管理</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">管理客户信息和账户余额</p>
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
                                    onClick={() => { exportCustomersToCSV('Customer'); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4 text-blue-500" /> 导出客户名录
                                </button>
                                <button
                                    onClick={() => { exportTransactionDetailsToCSV(null, 'Income'); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> 导出全量收入明细
                                </button>
                                <button
                                    onClick={() => { downloadCustomerTemplate(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4 text-orange-500" /> 下载导入模板
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                <button
                                    onClick={() => { fileInputRef.current?.click(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4 text-amber-500" /> 从表格导入客户
                                </button>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                            importCustomersFromCSV(e.target.files[0], 'Customer');
                        }}
                        className="hidden"
                        accept=".csv"
                    />

                    <button
                        onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        添加客户
                    </button>
                    {/* Mobile Add Customer Button */}
                    <button
                        onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
                        className="md:hidden p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                    </button>

                    {/* Mobile Refresh Button - Temporary Debugging */}
                    <button
                        onClick={async () => {
                            const success = await refreshData();
                            if (success) toast.success('数据已强制刷新');
                            else toast.error('刷新失败');
                        }}
                        className="md:hidden p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg active:bg-slate-200"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>

                    {/* Data Action for Mobile */}
                    <button
                        onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                        className="md:hidden p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                </div>
            </div >

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜索客户姓名、地址或电话..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-48">
                        <select
                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">所有类别</option>
                            <option value="none">未分类客户</option>
                            {categories.filter(cat => cat.type === 'Income').map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-visible">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">客户信息</th>
                                <th className="px-6 py-4">所属分类</th>
                                <th className="px-6 py-4">联系方式</th>
                                <th className="px-6 py-4">共计总成交金额</th>
                                <th className="px-6 py-4">状态</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {currentItems.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group relative"
                                >
                                    <td className="px-6 py-4" onClick={() => setSelectedCustomer(customer)}>
                                        <div className="flex items-center gap-3 cursor-pointer group/name">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold shrink-0">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                    {customer.name}
                                                    <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-md">
                                                        {transactions?.filter(t => t.customerId === customer.id).length || 0} 订单
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">ID: #{customer.id.toString().padStart(4, '0')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(() => {
                                                let ids = [];
                                                try {
                                                    const parsed = customer.categoryIds
                                                        ? JSON.parse(customer.categoryIds || '[]')
                                                        : (customer.categoryId ? [customer.categoryId] : []);
                                                    ids = Array.isArray(parsed) ? parsed : [parsed];
                                                } catch (e) { ids = []; }

                                                if (ids.length === 0) {
                                                    return <span className="text-xs text-slate-400 italic">未分类</span>;
                                                }

                                                return ids.map(id => {
                                                    const cat = categories.find(c => c.id === id);
                                                    if (!cat) return null;
                                                    return (
                                                        <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                                            {cat.name}
                                                        </span>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                {customer.address || <span className="text-slate-300 italic dark:text-slate-600">未录入地址</span>}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                {customer.phone}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900 dark:text-white font-mono">
                                            ¥{customer.balance?.toFixed(2) || '0.00'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                                            customer.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30" :
                                                customer.status === 'Inactive' ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" :
                                                    "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30"
                                        )}>
                                            {customer.status === 'Active' ? '活跃' :
                                                customer.status === 'Inactive' ? '未激活' : '已停用'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => openEditModal(customer)}
                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all text-slate-500 hover:text-primary"
                                                title="编辑"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-all text-slate-400 hover:text-rose-600"
                                                title="删除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {currentItems.map((customer) => (
                        <div
                            key={customer.id}
                            className="p-4 space-y-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-black text-lg">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {customer.name}
                                            {customer.categoryId && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium border border-blue-100 dark:border-blue-800/50">
                                                    {categories.find(cat => cat.id === customer.categoryId)?.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400">ID: #{customer.id.toString().padStart(4, '0')}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                                        ¥{customer.balance?.toFixed(2) || '0.00'}
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                        customer.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30" : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                    )}>
                                        {customer.status === 'Active' ? '活跃' : '停用'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    {customer.phone}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 truncate">
                                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="truncate">{customer.address || '无地址'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setSelectedCustomer(customer)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    {transactions?.filter(t => t.customerId === customer.id).length || 0} 笔订单
                                </button>
                                <button
                                    onClick={() => openEditModal(customer)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium"
                                >
                                    <Edit className="w-4 h-4" /> 编辑
                                </button>
                                <button
                                    onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-sm font-medium"
                                >
                                    <Trash2 className="w-4 h-4" /> 删除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>


            {/* Pagination Controls */}
            {
                filteredCustomers.length > 0 && (
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            显示第 <span className="font-bold text-slate-900 dark:text-white">{indexOfFirstItem + 1}</span> 到 <span className="font-bold text-slate-900 dark:text-white">{Math.min(indexOfLastItem, filteredCustomers.length)}</span> 条，共 <span className="font-bold text-slate-900 dark:text-white">{filteredCustomers.length}</span> 条
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                上一页
                            </button>
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-bold text-primary px-2">
                                    第 {currentPage} 页 / 共 {totalPages} 页
                                </span>
                            </div>
                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                )
            }

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingCustomer ? "编辑客户信息" : "添加新客户"}
            >
                <CustomerForm
                    key={editingCustomer ? editingCustomer.id : 'new'} // Force reset form on change
                    initialData={editingCustomer}
                    onSubmit={handleAddOrUpdateCustomer}
                    onCancel={closeModal}
                    categories={categories}
                />
            </Modal>
        </div >
    );
};

export default Customers;
