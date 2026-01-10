
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c', '#d0ed57', '#a4c8e0'];

const CategoryPieChart = ({ transactions }) => {
    const [hiddenCategories, setHiddenCategories] = useState(new Set());
    const [page, setPage] = useState(0);
    const [mounted, setMounted] = useState(false);
    const ITEMS_PER_PAGE = 6;

    // Fast-track mount to avoid layout-shift issues with Recharts
    React.useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const data = React.useMemo(() => {
        if (!transactions || transactions.length === 0) return [];
        const categoryMap = {};

        // Use a traditional loop for performance if transactions is large
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            if (tx.status === 'Cancelled') continue;

            const amount = parseFloat(tx.amount);
            if (!amount || isNaN(amount)) continue;

            const category = tx.category || '未分类';
            categoryMap[category] = (categoryMap[category] || 0) + Math.abs(amount);
        }

        const sortedData = Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return sortedData.map((item, index) => ({
            ...item,
            color: COLORS[index % COLORS.length]
        }));
    }, [transactions]);

    // Legend Logic...
    const activeData = React.useMemo(() =>
        data.filter(item => !hiddenCategories.has(item.name)),
        [data, hiddenCategories]);

    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const legendItems = data.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

    const toggleCategory = (name) => {
        setHiddenCategories(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    if (!mounted || data.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-100 dark:border-slate-800 border-t-primary animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">加载中...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-1 w-full min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={activeData}
                            cx="50%"
                            cy="50%"
                            innerRadius="65%"
                            outerRadius="90%"
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                            isAnimationActive={false}
                        >
                            {activeData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            formatter={(value) => `¥${parseFloat(value).toLocaleString()}`}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Custom Interactive Legend */}
            <div className="mt-2 h-14 relative flex items-center justify-center">
                {totalPages > 1 && (
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="absolute left-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </button>
                )}

                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-8 max-w-full overflow-hidden">
                    {legendItems.map((item) => {
                        const isHidden = hiddenCategories.has(item.name);
                        return (
                            <button
                                key={item.name}
                                onClick={() => toggleCategory(item.name)}
                                className={cn(
                                    "flex items-center gap-1.5 text-xs transition-all duration-200",
                                    isHidden ? "opacity-40 grayscale" : "hover:scale-105"
                                )}
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-[2px]"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className={cn(
                                    "font-medium truncate max-w-[80px]",
                                    isHidden ? "text-slate-400" : "text-slate-700 dark:text-slate-300"
                                )}>
                                    {item.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {totalPages > 1 && (
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className="absolute right-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                )}
            </div>

            {/* Pagination Dots (Optional, if needed for multiple pages visualization) */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-1 mt-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-1 h-1 rounded-full transition-colors",
                                page === i ? "bg-slate-400" : "bg-slate-200 dark:bg-slate-700"
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryPieChart;
