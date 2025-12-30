
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c'];

const CategoryPieChart = ({ transactions }) => {
    // Process data: Group by category and sum amounts (Absolute value for expenses)
    const data = React.useMemo(() => {
        const categoryMap = {};

        transactions.forEach(tx => {
            if (tx.status !== 'Completed') return;
            // Focus on expenses or income separately, or all flow?
            // "Value: See where money went". Usually implies Expenses.
            // But user might want to see Income sources too.
            // Let's create a combined view or maybe just "Composition".
            // User request: "See where money is spent, which business is most profitable"
            // Implications: Two charts or one chart with toggle.
            // Let's do two charts side-by-side or combined.
            // For now, let's categorize by 'category' regardless of type, but typically categories are unique to type.

            const category = tx.category || '未分类';
            if (!categoryMap[category]) {
                categoryMap[category] = 0;
            }
            categoryMap[category] += Math.abs(tx.amount);
        });

        return Object.keys(categoryMap).map((name, index) => ({
            name,
            value: categoryMap[name],
            color: COLORS[index % COLORS.length]
        })).sort((a, b) => b.value - a.value); // Sort by value desc
    }, [transactions]);

    if (data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                暂无数据
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderColor: 'var(--tooltip-border, #e2e8f0)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--tooltip-text, #1e293b)' }}
                        formatter={(value) => `¥${value.toFixed(2)}`}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CategoryPieChart;
