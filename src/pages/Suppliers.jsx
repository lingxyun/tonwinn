
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MoreHorizontal, Phone, MapPin, Trash2, Edit, Download, Upload, FileSpreadsheet, FileText, ChevronDown, RotateCcw, Users, ArrowLeft, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { ask } from '@tauri-apps/plugin-dialog';
import Modal from '../components/ui/Modal';
import TiltCard from '../components/ui/TiltCard';
import CustomerForm from '../components/customers/CustomerForm';

import { useData } from '../context/DataContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/formatCurrency';

const Suppliers = () => {
    const navigate = useNavigate();
    const { isPrivacyMode } = usePrivacy();
    const {
        customers: entityList,
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
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [detailPage, setDetailPage] = useState(1);
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const dataMenuRef = useRef(null);
    const fileInputRef = useRef(null);

    // Reset detail pagination when supplier changes
    useEffect(() => {
        setDetailPage(1);
    }, [selectedSupplier]);

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

    const supplierList = entityList.filter(e => e.role === 'Supplier');

    const filteredSuppliers = supplierList.filter(s => {
        const matchesSearch = s.name.includes(searchTerm) ||
            (s.address && s.address.includes(searchTerm)) ||
            s.phone.includes(searchTerm);

        const matchesCategory = selectedCategory === 'all' ||
            (selectedCategory === 'none'
                ? (!s.categoryIds || (() => {
                    try {
                        const p = JSON.parse(s.categoryIds);
                        return Array.isArray(p) ? p.length === 0 : !p;
                    } catch { return true; }
                })()) && !s.categoryId
                : (s.categoryIds
                    ? (() => {
                        try {
                            const p = JSON.parse(s.categoryIds || '[]');
                            return Array.isArray(p) ? p.includes(parseInt(selectedCategory)) : p == parseInt(selectedCategory);
                        } catch { return false; }
                    })()
                    : s.categoryId === parseInt(selectedCategory))
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
    const currentItems = filteredSuppliers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleAddOrUpdateSupplier = (data) => {
        if (editingSupplier) {
            updateCustomer({ ...data, id: editingSupplier.id });
        } else {
            addCustomer(data, 'Supplier');
        }
        closeModal();
    };

    const handleDeleteSupplier = async (id, name) => {
        const confirmed = await ask(`确定要删除供货商 "${name}" 吗？此操作不可恢复。`, {
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

    const openEditModal = (supplier) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    // Detail View
    if (selectedSupplier) {
        // Stats logic
        const supplierTx = transactions.filter(t => t.customerId === selectedSupplier.id) // Note: Using customerId field for supplier ID as per data model
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Pagination for Detail View
        const detailItemsPerPage = 10;
        const indexOfLastDetail = detailPage * detailItemsPerPage;
        const indexOfFirstDetail = indexOfLastDetail - detailItemsPerPage;
        const currentDetailTx = supplierTx.slice(indexOfFirstDetail, indexOfLastDetail);
        const totalDetailPages = Math.ceil(supplierTx.length / detailItemsPerPage);

        const paginateDetail = (pageNumber) => setDetailPage(pageNumber);

        return (
            <div className="space-y-6">
                {/* Header & Back Button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedSupplier(null)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            {selectedSupplier.name}
                            {(() => {
                                let ids = [];
                                try {
                                    const parsed = selectedSupplier.categoryIds ? JSON.parse(selectedSupplier.categoryIds) : (selectedSupplier.categoryId ? [selectedSupplier.categoryId] : []);
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
                            ID: #{selectedSupplier.id.toString().padStart(4, '0')} · {selectedSupplier.phone}
                        </p>
                    </div>
                </div>

                {/* Info Cards - Supplier Profile */}
                {(() => {
                    const now = new Date();
                    const lastTx = supplierTx[0];
                    const lastTxDate = lastTx ? new Date(lastTx.date) : null;
                    const daysSinceLast = lastTxDate ? Math.floor((now - lastTxDate) / (1000 * 60 * 60 * 24)) : -1;

                    // Filter for Expenses (Money OUT)
                    const expenseTx = supplierTx.filter(t => t.type === 'Expense');
                    const totalSpent = expenseTx.reduce((sum, t) => sum + t.amount, 0);
                    const txCount = expenseTx.length;
                    const aov = txCount > 0 ? totalSpent / txCount : 0;

                    // Calculate Top Category (What do we buy most?)
                    const catMap = {};
                    expenseTx.forEach(t => {
                        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
                    });
                    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Card 1: Balance (Payables) */}
                            <TiltCard className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-rose-50 dark:bg-rose-900/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-rose-100 dark:group-hover:bg-rose-900/20 transition-colors duration-500"></div>
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2 relative z-10">账户余额</div>
                                <div className={cn(
                                    "text-2xl font-black font-mono flex items-baseline gap-1 relative z-10 group-hover:scale-105 transition-transform origin-left",
                                    selectedSupplier.balance < 0 ? "text-rose-600" : "text-emerald-600"
                                )}>
                                    {formatCurrency(parseFloat(selectedSupplier.balance), isPrivacyMode)}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 relative z-10">
                                    {selectedSupplier.balance < 0 ? '需支付货款' : '预付款结余'}
                                </div>
                            </TiltCard>

                            {/* Card 2: Activity */}
                            <TiltCard className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-75 fill-mode-backwards group">
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2">最近采购</div>
                                <div className="flex items-end justify-between">
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white group-hover:scale-105 transition-transform origin-left">
                                        {daysSinceLast === -1 ? '无记录' : daysSinceLast === 0 ? '今天' : `${daysSinceLast}天前`}
                                    </div>
                                    {daysSinceLast > 60 && (
                                        <div className="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold rounded flex items-center gap-1">
                                            💤 沉睡
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    上次交易: {lastTx ? lastTx.date : '—'}
                                </div>
                            </TiltCard>

                            {/* Card 3: Volume (Total Expense) */}
                            <TiltCard className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-150 fill-mode-backwards group">
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2">采购总额</div>
                                <div className="flex flex-col group-hover:scale-105 transition-transform origin-left">
                                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                                        <span className="text-sm text-slate-400 font-sans font-normal mr-1">共</span>{formatCurrency(totalSpent, isPrivacyMode)}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        笔均采购: {formatCurrency(aov, isPrivacyMode)}
                                    </div>
                                </div>
                            </TiltCard>

                            {/* Card 4: Top Category */}
                            <TiltCard className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-200 fill-mode-backwards group">
                                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2">主要采购</div>
                                {topCategory ? (
                                    <div className="group-hover:scale-105 transition-transform origin-left">
                                        <div className="text-xl font-bold text-slate-900 dark:text-white truncate" title={topCategory[0]}>
                                            {topCategory[0]}
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                            <div
                                                className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${Math.min((topCategory[1] / totalSpent) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 text-right">
                                            占采购额 {((topCategory[1] / totalSpent) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-slate-400 text-sm italic py-2">暂无数据</div>
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
                            往来记录
                        </h3>
                        <button
                            onClick={() => exportTransactionDetailsToCSV(selectedSupplier.id, 'Expense')}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="导出此供货商全量支出明细"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>

                    {supplierTx.length > 0 ? (
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
                                            <td className="px-6 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={tx.description}>{tx.description}</td>
                                            <td className="px-6 py-3">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-xs font-bold",
                                                    tx.type === 'Income' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30" : "bg-rose-50 text-rose-600 dark:bg-rose-900/10 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30"
                                                )}>
                                                    {tx.type === 'Income' ? '收入' : '支出'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-slate-600 dark:text-slate-400 text-xs">
                                                {tx.category || '-'}
                                            </td>
                                            <td className={cn(
                                                "px-6 py-3 text-right font-bold font-mono text-base",
                                                tx.type === 'Income' ? "text-emerald-600" : "text-slate-900 dark:text-slate-100"
                                            )}>
                                                {tx.type === 'Income' ? '+' : '-'} {formatCurrency(tx.amount, isPrivacyMode)}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={cn(
                                                    "inline-flex items-center text-xs px-2.5 py-1 rounded-full border font-bold",
                                                    tx.status === 'Completed' ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400" : "bg-amber-50 text-amber-700 border-amber-100"
                                                )}>
                                                    <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5",
                                                        tx.status === 'Completed' ? "bg-green-500" : "bg-amber-500"
                                                    )} />
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
                            该供货商暂无交易记录
                        </div>
                    )}

                    {/* Detail Pagination Controls */}
                    {supplierTx.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                显示 {indexOfFirstDetail + 1} - {Math.min(indexOfLastDetail, supplierTx.length)} / 共 {supplierTx.length}
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
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">供货商管理</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">管理供货厂家信息与往来账目</p>
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
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-200">
                                <button
                                    onClick={() => { exportCustomersToCSV('Supplier'); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4 text-emerald-500" /> 导出供货商名单 (CSV)
                                </button>
                                <button
                                    onClick={() => { exportTransactionDetailsToCSV(null, 'Expense'); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-blue-500" /> 导出全量支出明细
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                <button
                                    onClick={() => { downloadCustomerTemplate(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4 text-slate-400" /> 下载导入模板
                                </button>
                                <button
                                    onClick={() => { fileInputRef.current?.click(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4 text-amber-500" /> 导入供货商数据
                                </button>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                importCustomersFromCSV(e.target.files[0], 'Supplier');
                                e.target.value = '';
                            }
                        }}
                        className="hidden"
                        accept=".csv"
                    />

                    <button
                        onClick={refreshData}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                        title="刷新数据"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
                    >
                        <Plus className="w-4 h-4" />
                        添加供货商
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜索名称、电话或地址..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                            <option value="all">所有支出类别</option>
                            <option value="none">未分类供货商</option>
                            {categories.filter(cat => cat.type === 'Expense').map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {currentItems.map((supplier) => (
                        <div
                            key={supplier.id}
                            className="p-4 space-y-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-black text-lg">
                                        {supplier.name.charAt(0)}
                                    </div>
                                    <div onClick={() => setSelectedSupplier(supplier)} className="cursor-pointer">
                                        <div className="text-lg font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                                            {supplier.name}
                                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-normal">
                                                {transactions?.filter(t => t.customerId === supplier.id).length || 0} 往来
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">ID: {supplier.id}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className={cn(
                                        "text-sm font-black font-mono",
                                        supplier.balance < 0 ? "text-rose-600" : "text-emerald-600"
                                    )}>
                                        {formatCurrency(parseFloat(supplier.balance), isPrivacyMode)}
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                        supplier.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                    )}>
                                        {supplier.status === 'Active' ? '活跃' : '停用'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5" />
                                    {supplier.phone}
                                </div>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{supplier.address || '无地址'}</span>
                                </div>
                            </div>

                            {/* Mobile Categories */}
                            <div className="flex flex-wrap gap-1">
                                {(() => {
                                    let ids = [];
                                    try {
                                        const parsed = supplier.categoryIds
                                            ? JSON.parse(supplier.categoryIds || '[]')
                                            : (supplier.categoryId ? [supplier.categoryId] : []);
                                        ids = Array.isArray(parsed) ? parsed : [parsed];
                                    } catch (e) { ids = []; }

                                    if (ids.length === 0) return null;

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

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                                <button
                                    onClick={() => openEditModal(supplier)}
                                    className="flex-1 py-1.5 flex items-center justify-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium active:scale-95 transition-transform"
                                >
                                    <Edit className="w-3.5 h-3.5" /> 编辑
                                </button>
                                <button
                                    onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                                    className="flex-1 py-1.5 flex items-center justify-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-medium active:scale-95 transition-transform"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> 删除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">姓名/名称</th>
                                <th className="px-6 py-4">所属分类</th>
                                <th className="px-6 py-4">联系电话</th>
                                <th className="px-6 py-4">地址</th>
                                <th className="px-6 py-4">账户余额</th>
                                <th className="px-6 py-4">状态</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {currentItems.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 cursor-pointer group/name" onClick={() => setSelectedSupplier(supplier)}>
                                        <div className="text-lg font-medium text-slate-900 dark:text-slate-100 group-hover/name:text-primary transition-colors flex items-center gap-2">
                                            {supplier.name}
                                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-normal">
                                                {transactions?.filter(t => t.customerId === supplier.id).length || 0} 往来
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400">ID: {supplier.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(() => {
                                                let ids = [];
                                                try {
                                                    const parsed = supplier.categoryIds
                                                        ? JSON.parse(supplier.categoryIds || '[]')
                                                        : (supplier.categoryId ? [supplier.categoryId] : []);
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
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            {supplier.phone}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate max-w-[200px]">{supplier.address || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={cn(
                                            "text-sm font-bold",
                                            supplier.balance < 0 ? "text-rose-600" : "text-emerald-600"
                                        )}>
                                            {formatCurrency(parseFloat(supplier.balance), isPrivacyMode)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider",
                                            supplier.status === 'Active' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                        )}>
                                            {supplier.status === 'Active' ? '活跃' : '停用'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => openEditModal(supplier)}
                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all text-slate-500 hover:text-primary"
                                                title="编辑"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
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

                {filteredSuppliers.length === 0 && (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">暂无供货商</h3>
                        <p className="text-slate-500 mt-1">您可以点击右上方按钮添加第一位供货合作伙伴。</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredSuppliers.length > 0 && (
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        显示第 <span className="font-bold text-slate-900 dark:text-white">{indexOfFirstItem + 1}</span> 到 <span className="font-bold text-slate-900 dark:text-white">{Math.min(indexOfLastItem, filteredSuppliers.length)}</span> 条，共 <span className="font-bold text-slate-900 dark:text-white">{filteredSuppliers.length}</span> 条
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
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingSupplier ? "编辑供货商" : "添加供货商"}
            >
                <CustomerForm
                    onSubmit={handleAddOrUpdateSupplier}
                    onCancel={closeModal}
                    initialData={editingSupplier}
                    isSupplier={true}
                    categories={categories}
                />
            </Modal>
        </div>
    );
};

export default Suppliers;
