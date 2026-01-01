
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, MoreHorizontal, Phone, MapPin, Trash2, Edit, Download, Upload, FileSpreadsheet, FileText, ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';

import { useData } from '../context/DataContext';

const Customers = () => {
    const {
        customers: customerList,
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
    const [editingCustomer, setEditingCustomer] = useState(null);
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

    const filteredCustomers = customerList.filter(c =>
        c.name.includes(searchTerm) ||
        (c.address && c.address.includes(searchTerm)) ||
        c.phone.includes(searchTerm)
    );

    const handleAddOrUpdateCustomer = (data) => {
        if (editingCustomer) {
            updateCustomer({ ...data, id: editingCustomer.id });
        } else {
            addCustomer(data);
        }
        closeModal();
    };

    const handleDeleteCustomer = (id, name) => {
        if (window.confirm(`确定要删除客户 "${name}" 吗？此操作不可恢复。`)) {
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
                                    onClick={() => { exportCustomersToCSV(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4 text-blue-500" /> 导出客户名录
                                </button>
                                <button
                                    onClick={() => { exportTransactionDetailsToCSV(); setIsDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> 导出交易全量明细
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
                            if (e.target.files?.[0]) {
                                importCustomersFromCSV(e.target.files[0]);
                                e.target.value = ''; // Reset
                            }
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
            </div>

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
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-visible">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">客户信息</th>
                                <th className="px-6 py-4">联系方式</th>
                                <th className="px-6 py-4">共计总成交金额</th>
                                <th className="px-6 py-4">状态</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group relative"
                                >
                                    <td className="px-6 py-4" onClick={() => toast.message(`查看客户 ${customer.name} 详情`)}>
                                        <div className="flex items-center gap-3 cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold shrink-0">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-white">{customer.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">ID: #{customer.id.toString().padStart(4, '0')}</div>
                                            </div>
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
                                    <td className="px-6 py-4 text-right relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === customer.id ? null : customer.id);
                                            }}
                                            className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                activeMenuId === customer.id ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {activeMenuId === customer.id && (
                                            <div
                                                ref={menuRef}
                                                className="absolute right-8 top-10 w-32 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-100 dark:border-slate-800 z-10 py-1"
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(customer); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                >
                                                    <Edit className="w-4 h-4" /> 编辑
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id, customer.name); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-4 h-4" /> 删除
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCustomers.map((customer) => (
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
                                        <div className="text-base font-bold text-slate-900 dark:text-white">{customer.name}</div>
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
                />
            </Modal>
        </div>
    );
};

export default Customers;
