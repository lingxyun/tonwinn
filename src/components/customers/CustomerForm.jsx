
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

const CustomerForm = ({ onSubmit, onCancel, initialData = null, isSupplier = false, categories = [] }) => {
    const [formData, setFormData] = useState(initialData ? {
        ...initialData,
        // Normalize categoryIds: if array, use it; if string, parse it; if old ID, wrap it; else empty
        categoryIds: Array.isArray(initialData.categoryIds)
            ? initialData.categoryIds
            : (typeof initialData.categoryIds === 'string'
                ? JSON.parse(initialData.categoryIds || '[]')
                : (initialData.categoryId ? [initialData.categoryId] : []))
    } : {
        name: '',
        address: '',
        phone: '',
        balance: '0',
        status: 'Active',
        role: isSupplier ? 'Supplier' : 'Customer',
        categoryIds: []
    });

    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const categoryRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryRef.current && !categoryRef.current.contains(event.target)) {
                setIsCategoryOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCategories = categories.filter(cat =>
        isSupplier ? cat.type === 'Expense' : cat.type === 'Income'
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            balance: parseFloat(formData.balance)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{isSupplier ? '供货商名称' : '客户姓名'}</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder={isSupplier ? "请输入工厂或供货商名称" : "请输入客户姓名"}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">联系电话</label>
                <input
                    type="tel"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="13800000000"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{isSupplier ? '经营/发货地址' : '收货地址'}</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder={isSupplier ? "请输入供货商地址" : "请输入客户地址"}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                    {initialData ? '当前余额 (人工校准)' : '共计总成交金额'} (¥)
                </label>
                <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.balance}
                    onChange={e => setFormData({ ...formData, balance: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                    {initialData
                        ? '注意：直接修改此数值将覆盖由交易自动计算的余额。'
                        : isSupplier ? '正数表示我方欠款，负数表示预付款（或溢缴款）。' : '正数表示预存款，负数表示客户欠款。'}
                </p>
            </div>

            <div className="space-y-2" ref={categoryRef}>
                <label className="text-sm font-medium text-slate-700">所属类别 (多选)</label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-left flex justify-between items-center"
                    >
                        <span className={formData.categoryIds.length === 0 ? "text-slate-400" : "text-slate-900"}>
                            {formData.categoryIds.length === 0
                                ? "-- 请选择类别 --"
                                : `${formData.categoryIds.length} 个已选择`
                            }
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    </button>

                    {isCategoryOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto p-1">
                            {filteredCategories.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-slate-400 text-center">暂无可用类别</div>
                            ) : (
                                filteredCategories.map(cat => {
                                    const isSelected = formData.categoryIds.includes(cat.id);
                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => {
                                                const newIds = isSelected
                                                    ? formData.categoryIds.filter(id => id !== cat.id)
                                                    : [...formData.categoryIds, cat.id];
                                                setFormData({ ...formData, categoryIds: newIds });
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-sm"
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary text-white" : "border-slate-300 bg-white"}`}>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                            <span className={isSelected ? "text-slate-900 font-medium" : "text-slate-600"}>{cat.name}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Selected Tags Display */}
                {formData.categoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {formData.categoryIds.map(id => {
                            const cat = categories.find(c => c.id === id);
                            if (!cat) return null;
                            return (
                                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600 border border-slate-200">
                                    {cat.name}
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, categoryIds: prev.categoryIds.filter(cid => cid !== id) }))}
                                        className="hover:text-rose-500"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                )}
                <p className="text-xs text-slate-500">可为{isSupplier ? '供货商' : '客户'}关联多个类别，便于交叉管理。</p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">状态</label>
                <select
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                    <option value="Active">活跃</option>
                    <option value="Inactive">未激活</option>
                    <option value="Suspended">已停用</option>
                </select>
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                    取消
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
                >
                    {initialData ? (isSupplier ? '更新供货商' : '更新客户') : (isSupplier ? '保存供货商' : '保存客户')}
                </button>
            </div>
        </form>
    );
};

export default CustomerForm;
