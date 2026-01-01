import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Edit, Trash2, Tag, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { ask } from '@tauri-apps/plugin-dialog';
import CategoryAnalyticsModal from '../components/dashboard/CategoryAnalyticsModal';

const CategoryCard = ({ category, onEdit, onDelete, onAnalyze }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={() => onAnalyze(category)}
        className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 transition-all shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
    >
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
            <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                category.type === 'Income'
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
            )}>
                <Tag size={18} />
            </div>
            <div>
                <h3 className="font-medium text-slate-900 dark:text-white">{category.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {category.type === 'Income' ? '收入类别' : '支出类别'}
                </p>
            </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(category); }}
                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
                <Edit size={16} />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                title="删除"
            >
                <Trash2 size={16} />
            </button>
        </div>
    </motion.div>
);

const Categories = () => {
    const { categories, addCategory, updateCategory, deleteCategory } = useData();
    const [newCategory, setNewCategory] = useState({ name: '', type: 'Income' });
    const [editingCategory, setEditingCategory] = useState(null);
    const [analyzingCategory, setAnalyzingCategory] = useState(null);
    const [activeTab, setActiveTab] = useState('Income');

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCategory.name.trim()) return;

        // Prevent duplicates
        if (categories.some(c => c.name === newCategory.name && c.type === newCategory.type)) {
            toast.error('该类别已存在');
            return;
        }

        await addCategory(newCategory);
        setNewCategory({ ...newCategory, name: '' });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingCategory.name.trim()) return;

        await updateCategory(editingCategory);
        setEditingCategory(null);
    };

    const handleDelete = async (id) => {
        const confirmed = await ask('确定要删除这个类别吗？', {
            title: '删除分类',
            kind: 'warning',
            okLabel: '确定删除',
            cancelLabel: '取消'
        });
        if (confirmed) {
            deleteCategory(id);
        }
    };

    const filteredCategories = categories.filter(c => c.type === activeTab);

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {analyzingCategory && (
                    <CategoryAnalyticsModal
                        category={analyzingCategory}
                        onClose={() => setAnalyzingCategory(null)}
                    />
                )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">交易类别管理</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        自定义您的收入和支出分类
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
                {['Income', 'Expense'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            setNewCategory(prev => ({ ...prev, type: tab }));
                        }}
                        className={cn(
                            "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === tab
                                ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        {tab === 'Income' ? '收入类别' : '支出类别'}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List Section */}
                <div className="space-y-4">
                    <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {activeTab === 'Income' ? '现有收入类别' : '现有支出类别'}
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-xs">
                            {filteredCategories.length}
                        </span>
                    </h2>

                    <div className="grid gap-3">
                        <AnimatePresence mode="popLayout">
                            {filteredCategories.map(cat => (
                                editingCategory?.id === cat.id ? (
                                    <motion.form
                                        key={cat.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onSubmit={handleUpdate}
                                        className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex gap-3 items-center"
                                    >
                                        <input
                                            autoFocus
                                            value={editingCategory.name}
                                            onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                            className="flex-1 bg-transparent border-b border-primary/30 focus:border-primary outline-none px-2 py-1 text-slate-900 dark:text-white"
                                        />
                                        <button type="submit" className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg">
                                            <Check size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingCategory(null)}
                                            className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg"
                                        >
                                            <X size={16} />
                                        </button>
                                    </motion.form>
                                ) : (
                                    <CategoryCard
                                        key={cat.id}
                                        category={cat}
                                        onEdit={setEditingCategory}
                                        onDelete={handleDelete}
                                        onAnalyze={setAnalyzingCategory}
                                    />
                                )
                            ))}
                        </AnimatePresence>
                        {filteredCategories.length === 0 && (
                            <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                暂无类别数据
                            </div>
                        )}
                    </div>
                </div>

                {/* Add New Section */}
                <div className="md:pl-8 md:border-l border-slate-200 dark:border-slate-800">
                    <div className="sticky top-8">
                        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
                            添加新{activeTab === 'Income' ? '收入' : '支出'}类别
                        </h2>
                        <form onSubmit={handleAdd} className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    类别名称
                                </label>
                                <input
                                    type="text"
                                    value={newCategory.name}
                                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                    placeholder={activeTab === 'Income' ? "例如：理财分红" : "例如：团建费用"}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!newCategory.name.trim()}
                                className="w-full py-2 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Plus size={18} />
                                确认添加
                            </button>
                        </form>

                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-xs text-blue-600 dark:text-blue-400">
                            <h4 className="font-bold mb-1">小贴士</h4>
                            <p>合理的分类有助于生成更准确的财务报表。建议保持分类简洁明了，避免过于细碎。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Categories;
