
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, MoreHorizontal, Phone, MapPin, Trash2, Edit, Download, Upload, FileSpreadsheet, FileText, ChevronDown, RotateCcw, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { ask } from '@tauri-apps/plugin-dialog';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';

import { useData } from '../context/DataContext';

const Suppliers = () => {
    const {
        customers: entityList,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        exportCustomersToCSV,
        exportTransactionDetailsToCSV,
        downloadCustomerTemplate,
        importCustomersFromCSV,
        refreshData
    } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
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

    const filteredSuppliers = supplierList.filter(s =>
        s.name.includes(searchTerm) ||
        (s.address && s.address.includes(searchTerm)) ||
        s.phone.includes(searchTerm)
    );

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
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜索名称、电话或地址..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">姓名/名称</th>
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
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900 dark:text-slate-100">{supplier.name}</div>
                                        <div className="text-xs text-slate-400">ID: {supplier.id}</div>
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
                                    <td className="px-6 py-4 text-right relative">
                                        <button
                                            onClick={() => setActiveMenuId(activeMenuId === supplier.id ? null : supplier.id)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>

                                        {activeMenuId === supplier.id && (
                                            <div
                                                ref={menuRef}
                                                className="absolute right-0 bottom-full mb-2 w-32 bg-white dark:bg-slate-950 rounded-lg shadow-xl border border-slate-100 dark:border-slate-800 z-50 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
                                            >
                                                <button
                                                    onClick={() => openEditModal(supplier)}
                                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                >
                                                    <Edit className="w-3.5 h-3.5" /> 编辑
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                                                    className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> 删除
                                                </button>
                                            </div>
                                        )}
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
                />
            </Modal>
        </div>
    );
};

export default Suppliers;
