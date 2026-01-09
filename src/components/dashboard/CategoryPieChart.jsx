
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c', '#d0ed57', '#a4c8e0'];

const CategoryPieChart = ({ transactions }) => {
    const [hiddenCategories, setHiddenCategories] = useState(new Set());
    const [page, setPage] = useState(0);
    const ITEMS_PER_PAGE = 6;

    // Process data similar to before, but keep index stable for colors
    const data = React.useMemo(() => {
        const categoryMap = {};

        transactions.forEach(tx => {
            if (tx.status !== 'Completed') return;
            const category = tx.category || '未分类';
            if (!categoryMap[category]) {
                categoryMap[category] = 0;
            }
            categoryMap[category] += Math.abs(tx.amount);
        });

        // 1. Convert to array and sort desc by value
        const sortedData = Object.keys(categoryMap)
            .map(name => ({ name, value: categoryMap[name] }))
            .sort((a, b) => b.value - a.value);

        // 2. Assign color based on sorted index PERMANENTLY (so it doesn't shift when hiding)
        return sortedData.map((item, index) => ({
            ...item,
            color: COLORS[index % COLORS.length]
        }));
    }, [transactions]);

    // Data to be rendered (filtered by hidden state)
    // We don't remove them from array to keep colors stable, we just set value to 0 or use filter for Pie
    // If we use filter, we lose the original color mapping if not careful.
    // We already assigned 'color' property in useMemo, so we can filter safely now.
    const activeData = data.filter(item => !hiddenCategories.has(item.name));

    // Legend Data (with pages)
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const legendItems = data.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

    const toggleCategory = (name) => {
        const newHidden = new Set(hiddenCategories);
        if (newHidden.has(name)) {
            newHidden.delete(name);
        } else {
            newHidden.add(name);
        }
        setHiddenCategories(newHidden); // Don't allow hiding the last one? Optionally.
    };

    if (data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                暂无数据
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={activeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {activeData.map((entry, index) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderColor: 'var(--tooltip-border, #e2e8f0)', borderRadius: '8px' }}
                            itemStyle={{ color: 'var(--tooltip-text, #1e293b)' }}
                            formatter={(value) => `¥${value.toFixed(2)}`}
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
