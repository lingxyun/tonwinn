
import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Plus, Filter, Download, Upload,
    MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin,
    ChevronRight, ArrowUpRight, ArrowDownRight, Users
} from 'lucide-react';
import { useData } from '../context/DataContext';
import CustomerForm from '../components/customers/CustomerForm';

const Suppliers = () => {
    const { customers: customerList, addCustomer, updateCustomer, deleteCustomer, exportCustomersToCSV, importCustomersFromCSV, downloadCustomerTemplate } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);

    // Strictly separate suppliers from customers
    const supplierOnlyList = (customerList || []).filter(c => c.role === 'Supplier');

    const filteredSuppliers = supplierOnlyList.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.address && supplier.address.includes(searchTerm)) ||
        supplier.phone.includes(searchTerm)
    );

    const handleAddOrUpdateSupplier = async (supplierData) => {
        if (editingSupplier) {
            await updateCustomer({ ...supplierData, id: editingSupplier.id, role: 'Supplier' });
        } else {
            await addCustomer({ ...supplierData, role: 'Supplier' }, 'Supplier');
        }
        setShowAddModal(false);
        setEditingSupplier(null);
    };

    const openEditModal = (supplier) => {
        setEditingSupplier(supplier);
        setShowAddModal(true);
    };

    const handleDeleteSupplier = async (id, name) => {
        if (window.confirm(`确定要删除供货商 "${name}" 吗？此操作不可撤销，且会删除相关交易指引。`)) {
            await deleteCustomer(id);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        供货商管理
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">管理您的厂家及上游供货商信息</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                        <button
                            onClick={exportCustomersToCSV}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300"
                            title="导出"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <label className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300 cursor-pointer" title="导入">
                            <Upload className="w-4 h-4" />
                            <input
                                type="file"
                                className="hidden"
                                accept=".csv"
                                onChange={(e) => {
                                    if (e.target.files[0]) {
                                        importCustomersFromCSV(e.target.files[0], 'Supplier');
                                    }
                                }}
                            />
                        </label>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button
                            onClick={downloadCustomerTemplate}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300"
                            title="下载模板"
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => { setEditingSupplier(null); setShowAddModal(true); }}
                        className="btn-primary flex items-center gap-2 py-2.5"
                    >
                        <Plus className="w-4 h-4" />
                        新增供货商
                    </button>
                </div>
            </div>

            {/* Filter and Search */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索供货商姓名、电话或地址..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Suppliers Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-bottom border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">供货商信息</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">地址</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">应付款/预付</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">状态</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredSuppliers.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {supplier.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">{supplier.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {supplier.phone}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {supplier.address || '未填写'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-mono font-bold ${supplier.balance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            ¥{Math.abs(supplier.balance).toFixed(2)}
                                            <span className="text-[10px] ml-1 opacity-70">
                                                {supplier.balance >= 0 ? '(应付)' : '(预付)'}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${supplier.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                                                supplier.status === 'Inactive' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800' :
                                                    'bg-rose-50 text-rose-600 dark:bg-rose-900/20'
                                            }`}>
                                            {supplier.status === 'Active' ? '活跃' :
                                                supplier.status === 'Inactive' ? '未激活' : '已停用'}
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
                            {filteredSuppliers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        未找到匹配的供货商
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingSupplier ? '编辑供货商' : '新增供货商'}
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 rotate-90" />
                            </button>
                        </div>
                        <div className="p-6">
                            <CustomerForm
                                onSubmit={handleAddOrUpdateSupplier}
                                onCancel={() => setShowAddModal(false)}
                                initialData={editingSupplier ? { ...editingSupplier, role: 'Supplier' } : { role: 'Supplier', balance: 0 }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
