import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { cn } from '../../lib/utils';

const TransactionForm = ({ onSubmit, onCancel, initialData }) => {
    const { customers: allEntities, categories: allCategories } = useData();
    const [entityFilter, setEntityFilter] = useState('All'); // 'All', 'Customer', 'Supplier'

    const [formData, setFormData] = useState({
        customerId: initialData?.customerId || '',
        type: initialData?.type || 'Income',
        amount: initialData?.amount || '',
        date: initialData?.date || new Date().toISOString().split('T')[0],
        description: initialData?.description || '',
        category: initialData?.category || '',
        status: initialData?.status || 'Completed'
    });

    const categories = (allCategories || [])
        .filter(c => c.type === formData.type)
        .map(c => c.name);

    // Reset category if type changes and current category is invalid for new type
    React.useEffect(() => {
        if (formData.category && !categories.includes(formData.category)) {
            setFormData(prev => ({ ...prev, category: '' }));
        }
    }, [formData.type]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Basic validation
        if (!formData.customerId || !formData.amount || !formData.description) return;

        onSubmit({
            ...formData,
            amount: parseFloat(formData.amount),
            customerId: parseInt(formData.customerId)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {formData.type === 'Income' ? '关联客户' : '关联往来单位'}
                    </label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setEntityFilter('All')}
                            className={cn("text-[10px] px-2 py-0.5 rounded border", entityFilter === 'All' ? "bg-primary text-white border-primary" : "text-slate-400 border-slate-200")}
                        >
                            全部
                        </button>
                        <button
                            type="button"
                            onClick={() => setEntityFilter('Customer')}
                            className={cn("text-[10px] px-2 py-0.5 rounded border", entityFilter === 'Customer' ? "bg-primary text-white border-primary" : "text-slate-400 border-slate-200")}
                        >
                            仅客户
                        </button>
                        <button
                            type="button"
                            onClick={() => setEntityFilter('Supplier')}
                            className={cn("text-[10px] px-2 py-0.5 rounded border", entityFilter === 'Supplier' ? "bg-primary text-white border-primary" : "text-slate-400 border-slate-200")}
                        >
                            仅供货商
                        </button>
                    </div>
                </div>
                <select
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                    value={formData.customerId}
                    onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                    required
                >
                    <option value="">选择...</option>
                    {(allEntities || [])
                        .filter(e => entityFilter === 'All' || e.role === entityFilter)
                        .map(c => (
                            <option key={c.id} value={c.id}>
                                [{c.role === 'Supplier' ? '供' : '客'}] {c.name} ({c.phone})
                            </option>
                        ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">交易类型</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            type="button"
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.type === 'Income' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            onClick={() => setFormData({ ...formData, type: 'Income' })}
                        >
                            收入
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.type === 'Expense' ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            onClick={() => setFormData({ ...formData, type: 'Expense' })}
                        >
                            支出
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">金额 (¥)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">交易类别</label>
                <select
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    required
                >
                    <option value="">选择类别...</option>
                    {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">日期</label>
                <input
                    type="date"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">描述/备注</label>
                <textarea
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-24 text-slate-900 dark:text-white"
                    placeholder="例如：系统维护费用..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    required
                />
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    取消
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
                >
                    确认提交
                </button>
            </div>
        </form>
    );
};

export default TransactionForm;
