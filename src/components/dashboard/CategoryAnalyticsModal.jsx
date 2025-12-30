import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../../lib/utils';
import { useData } from '../../context/DataContext';

const CategoryAnalyticsModal = ({ category, onClose }) => {
    const { transactions } = useData();
    const [timeRange, setTimeRange] = useState('month'); // day, month, year

    // Process data based on time range
    const chartData = useMemo(() => {
        if (!category) return [];

        // Filter transactions for this category
        const relevantTxs = transactions.filter(t => t.category === category.name && t.status !== 'Cancelled');

        const groupedData = {};

        relevantTxs.forEach(tx => {
            const date = new Date(tx.date);
            let key;
            let label;
            let sortKey; // ISO string for sorting

            if (timeRange === 'day') {
                // Last 30 days
                key = tx.date; // YYYY-MM-DD
                label = `${date.getMonth() + 1}/${date.getDate()}`;
                sortKey = key;
            } else if (timeRange === 'month') {
                // All months present
                key = `${date.getFullYear()}-${date.getMonth()}`;
                label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
                sortKey = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
            } else {
                // Year
                key = `${date.getFullYear()}`;
                label = `${date.getFullYear()}年`;
                sortKey = key;
            }

            if (!groupedData[key]) {
                groupedData[key] = { name: label, value: 0, sortKey };
            }
            groupedData[key].value += tx.amount;
        });

        // Convert to array and sort
        let result = Object.values(groupedData).sort((a, b) => {
            return a.sortKey.localeCompare(b.sortKey);
        });

        // If no data, showing distinct placeholders might be better, but for now empty is fine
        // Or if 'day' view, maybe fill in missing days? Let's keep it simple first.

        return result;
    }, [category, transactions, timeRange]);

    const totalAmount = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.value, 0);
    }, [chartData]);

    if (!category) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            category.type === 'Income'
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                        )}>
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{category.name}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {category.type === 'Income' ? '收入趋势分析' : '支出趋势分析'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Controls & Summary */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            {['day', 'month', 'year'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTimeRange(t)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                        timeRange === t
                                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    {t === 'day' ? '按日' : t === 'month' ? '按月' : '按年'}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-900/20">
                            <TrendingUp size={18} />
                            <span className="text-sm font-medium">累计金额:</span>
                            <span className="text-lg font-bold">¥{totalAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-[300px] w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={activeTheme === 'dark' ? '#334155' : '#e2e8f0'} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        tickFormatter={(value) => `¥${value}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: activeTheme === 'dark' ? '#1e293b' : '#f1f5f9' }}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1000}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={category.type === 'Income' ? '#10b981' : '#f43f5e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <Calendar size={48} className="mb-4 opacity-50" />
                                <p>该时间范围内暂无交易数据</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Helper hook to detect theme for chart colors (simplified)
const activeTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

export default CategoryAnalyticsModal;
