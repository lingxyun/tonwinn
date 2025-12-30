import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

const AIInsightsCard = ({ transactions, customers }) => {
    const insights = useMemo(() => {
        if (!transactions.length) return null;

        // 获取日期对象
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        // 分类计算月度营收
        const monthlyData = transactions.reduce((acc, tx) => {
            const date = new Date(tx.date);
            const m = date.getMonth();
            const y = date.getFullYear();
            const key = `${y}-${m}`;

            if (!acc[key]) acc[key] = { income: 0, expense: 0 };
            if (tx.type === 'Income') acc[key].income += tx.amount;
            else acc[key].expense += tx.amount;

            return acc;
        }, {});

        const currentKey = `${thisYear}-${thisMonth}`;
        const lastKey = `${lastMonthYear}-${lastMonth}`;

        const current = monthlyData[currentKey] || { income: 0, expense: 0 };
        const past = monthlyData[lastKey] || { income: 0, expense: 0 };

        // 1. 营收增长分析
        const incomeGrowth = past.income === 0 ? 0 : ((current.income - past.income) / past.income) * 100;

        // 2. 支出占比最高分类
        const categoryWise = transactions
            .filter(tx => new Date(tx.date).getMonth() === thisMonth)
            .reduce((acc, tx) => {
                if (tx.type === 'Expense') {
                    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
                }
                return acc;
            }, {});

        const topExpense = Object.entries(categoryWise)
            .sort(([, a], [, b]) => b - a)[0];

        // 3. 逾期风险及健康分
        const overdueCustomers = customers.filter(c => c.balance < 0);
        const healthScore = Math.max(0, Math.min(100, (current.income > current.expense ? 85 : 40) - (overdueCustomers.length * 5)));

        // 生成建议
        let primaryMessage = "";
        if (incomeGrowth > 10) primaryMessage = `本月营收环比大幅增长 ${incomeGrowth.toFixed(1)}%，表现强劲！`;
        else if (incomeGrowth < -10) primaryMessage = `本月营收环比下降 ${Math.abs(incomeGrowth).toFixed(1)}%，建议关注大客户维护。`;
        else primaryMessage = "本月财务运作平稳，建议优化非核心支出。";

        return {
            incomeGrowth,
            topExpense: topExpense ? { name: topExpense[0], amount: topExpense[1] } : null,
            overdueCount: overdueCustomers.length,
            healthScore,
            primaryMessage
        };
    }, [transactions, customers]);

    if (!insights) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-3xl p-6 h-full border-primary/10 relative overflow-hidden"
        >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />

            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Sparkles size={18} className="animate-pulse" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI 智能简报</h2>
                <div className="ml-auto flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold">
                    <Zap size={10} /> 实时分析
                </div>
            </div>

            <div className="space-y-5">
                {/* Score */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                    <div className="space-y-1">
                        <p className="text-xs text-slate-500">财务健康分</p>
                        <div className="flex items-end gap-1">
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{insights.healthScore}</span>
                            <span className="text-[10px] text-slate-400 mb-1">/ 100</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-primary" />
                    </div>
                </div>

                {/* Primary Message */}
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {insights.primaryMessage}
                </p>

                {/* Micro Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <TrendingUp size={12} />
                            <span className="text-[10px]">营收趋势</span>
                        </div>
                        <p className={cn(
                            "text-sm font-bold",
                            insights.incomeGrowth >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {insights.incomeGrowth >= 0 ? '+' : ''}{insights.incomeGrowth.toFixed(1)}%
                        </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <AlertTriangle size={12} />
                            <span className="text-[10px]">风险客户</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {insights.overdueCount} 位
                        </p>
                    </div>
                </div>

                {/* Suggestion Tag */}
                {insights.topExpense && (
                    <div className="pt-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/10">
                            <span className="text-[10px] text-primary font-bold">建议</span>
                            <p className="text-[10px] text-slate-500">
                                本月 <span className="text-slate-900 dark:text-slate-200 font-semibold">{insights.topExpense.name}</span> 支出较高，建议审核项。
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default AIInsightsCard;
