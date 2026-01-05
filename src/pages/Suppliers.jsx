
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MoreHorizontal, Phone, MapPin, Trash2, Edit, Download, Upload, FileSpreadsheet, FileText, ChevronDown, RotateCcw, Users, ArrowLeft, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { ask } from '@tauri-apps/plugin-dialog';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';

import { useData } from '../context/DataContext';

const Suppliers = () => {
    const navigate = useNavigate();
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
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const dataMenuRef = useRef(null);
    const fileInputRef = useRef(null);

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
                ? (!s.categoryIds || JSON.parse(s.categoryIds || '[]').length === 0) && !s.categoryId
                : (s.categoryIds
                    ? JSON.parse(s.categoryIds || '[]').includes(parseInt(selectedCategory))
                    : s.categoryId === parseInt(selectedCategory))
            );

        return matchesSearch && matchesCategory;
    });

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
        const supplierTx = transactions.filter(t => t.customerId === selectedSupplier.id).sort((a, b) => new Date(b.date) - new Date(a.date));

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
                                const ids = selectedSupplier.categoryIds ? JSON.parse(selectedSupplier.categoryIds) : (selectedSupplier.categoryId ? [selectedSupplier.categoryId] : []);
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

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2">账户余额</div>
                        <div className={cn(
                            "text-2xl font-black font-mono",
                            selectedSupplier.balance < 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                            ¥{parseFloat(selectedSupplier.balance).toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2">往来笔数</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {supplierTx.length} <span className="text-sm font-normal text-slate-500">笔</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase mb-2">地址信息</div>
                        <div className="text-slate-900 dark:text-white text-sm">
                            {selectedSupplier.address || <span className="text-slate-400 italic">未录入地址</span>}
                        </div>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                            往来记录
                        </h3>
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
                                        <th className="px-6 py-3 text-right">金额</th>
                                        <th className="px-6 py-3">状态</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {supplierTx.map(tx => (
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
                            该供货商暂无往来记录
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
                                    onClick={() => { exportCustomersToCSV(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4 text-emerald-500" /> 导出供货商名单 (CSV)
                                </button>
                                <button
                                    onClick={() => { exportTransactionDetailsToCSV(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-blue-500" /> 导出往来明细
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

                <div className="overflow-x-auto">
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
                            {filteredSuppliers.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 cursor-pointer group/name" onClick={() => setSelectedSupplier(supplier)}>
                                        <div className="font-medium text-slate-900 dark:text-slate-100 group-hover/name:text-primary transition-colors flex items-center gap-2">
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
                                                const ids = supplier.categoryIds
                                                    ? JSON.parse(supplier.categoryIds || '[]')
                                                    : (supplier.categoryId ? [supplier.categoryId] : []);

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
                                            ¥{parseFloat(supplier.balance).toFixed(2)}
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
