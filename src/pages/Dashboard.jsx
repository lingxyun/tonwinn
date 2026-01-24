
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Users, DollarSign, ShoppingBag, Activity, Trash2, Download, Upload, Plus, Database, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import CategoryPieChart from '../components/dashboard/CategoryPieChart';
import AIInsightsCard from '../components/dashboard/AIInsightsCard';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/formatCurrency';
import { save, ask } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const CountUp = ({ value, prefix = "", suffix = "" }) => {
    const [displayValue, setDisplayValue] = useState(0);

    React.useEffect(() => {
        let start = 0;
        const end = parseFloat(value) || 0;
        if (start === end) return;
        let totalDuration = 1000;
        let increment = end / (totalDuration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(start);
            }
        }, 16);
        return () => clearInterval(timer);
    }, [value]);

    return <span>{prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: typeof value === 'number' && !Number.isInteger(value) ? 2 : 0, maximumFractionDigits: 2 })}{suffix}</span>;
};

const StatCard = ({ title, value, change, icon: Icon, trend, index, label = "较上月", isPrivacyMode }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ y: -5 }}
        className="glass-card p-6 rounded-2xl relative overflow-hidden group"
    >
        <div className="absolute top-0 right-0 p-8 -mr-8 -mt-8 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h3 className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">
                    {typeof value === 'string' && value.startsWith('¥') ? (
                        isPrivacyMode ? '¥***.**' : <CountUp value={value.replace('¥', '').replace(/,/g, '')} prefix="¥" />
                    ) : (
                        isPrivacyMode ? '***' : <CountUp value={value} />
                    )}
                </h3>
            </div>
            <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-xl text-primary premium-shadow">
                <Icon className="w-5 h-5" />
            </div>
        </div>
        <div className="flex items-center mt-4 relative z-10">
            <div className={cn(
                "flex items-center text-xs font-bold px-2 py-1 rounded-lg",
                trend === 'up' ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
            )}>
                {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {isPrivacyMode ? '**%' : change}
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">{label}</span>
        </div>
    </motion.div>
);

const Dashboard = () => {
    const {
        customers,
        transactions: localTransactions,
        addCustomer,
        resetData,
        importData,
        stats: contextStats,
        exportFullBackup,
        restoreFullBackup,
        openDataFolder
    } = useData();

    const { setIsTxModalOpen } = useOutletContext();
    const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    const netProfit = (localTransactions || []).reduce((acc, curr) => {
        const amount = parseFloat(curr.amount) || 0;
        return curr.type === 'Income' ? acc + amount : acc - amount;
    }, 0);

    const chartData = React.useMemo(() => {
        const last6Months = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toLocaleString('zh-CN', { month: 'short' });
            last6Months[key] = { revenue: 0, expense: 0 };
        }
        localTransactions.forEach(tx => {
            if (tx.status === 'Completed') {
                const date = new Date(tx.date);
                const monthName = date.toLocaleString('zh-CN', { month: 'short' });
                const amount = parseFloat(tx.amount) || 0;
                if (last6Months.hasOwnProperty(monthName)) {
                    if (tx.type === 'Income') last6Months[monthName].revenue += amount;
                    else last6Months[monthName].expense += amount;
                }
            }
        });
        return Object.keys(last6Months).map(month => ({
            name: month,
            revenue: last6Months[month].revenue,
            expense: last6Months[month].expense
        }));
    }, [localTransactions]);

    const weeklyData = React.useMemo(() => {
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const data = days.map(day => ({ name: day, amount: 0 }));

        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
        startOfWeek.setHours(0, 0, 0, 0);

        localTransactions.forEach(tx => {
            const txDate = new Date(tx.date);
            const amount = parseFloat(tx.amount) || 0;
            if (txDate >= startOfWeek && tx.type === 'Income') {
                const dayIndex = (txDate.getDay() + 6) % 7;
                data[dayIndex].amount += amount;
            }
        });
        return data;
    }, [localTransactions]);

    const handleExport = async () => {
        try {
            const fileName = `financial_backup_${new Date().toISOString().split('T')[0]}.json`;
            const filePath = await save({
                filters: [{
                    name: 'JSON备份文件',
                    extensions: ['json']
                }],
                defaultPath: fileName
            });

            if (filePath) {
                const backup = {
                    version: "1.0",
                    timestamp: new Date().toISOString(),
                    customers: customers || [],
                    transactions: localTransactions || []
                };
                const jsonContent = JSON.stringify(backup, null, 2);
                await writeTextFile(filePath, jsonContent);
                toast.success('数据备份已导出');
            }
        } catch (error) {
            console.error('Backup export failed:', error);
            toast.error('导出失败: ' + (error?.message || error || '未知错误'));
        }
    };

    const handleAddCustomer = (data) => {
        addCustomer(data);
        setIsCustomerModalOpen(false);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => importData(event.target.result);
            reader.readAsText(file);
        }
    };

    return (
        <div className="flex flex-col gap-10 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">工作概览</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">欢迎回来，这是您的实时经营数据摘要。</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={async () => {
                            const confirmed = await ask('确定要清空所有数据吗？此操作不可恢复。', {
                                title: '清空系统数据',
                                kind: 'warning',
                                okLabel: '确定删除',
                                cancelLabel: '取消'
                            });
                            if (confirmed) resetData();
                        }}
                        className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-rose-500 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all premium-shadow"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={togglePrivacyMode}
                        className={cn(
                            "p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl transition-all premium-shadow",
                            isPrivacyMode
                                ? "text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
                        )}
                        title={isPrivacyMode ? "显示金额" : "隐藏金额"}
                    >
                        {isPrivacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <div className="flex bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 premium-shadow">
                        <button onClick={exportFullBackup} className="px-5 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors flex items-center gap-2.5" title="导出 1:1 数据库副本（推荐）">
                            <Database className="w-4 h-4" /> 系统全量备份
                        </button>
                        <div className="w-px bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />
                        <button onClick={restoreFullBackup} className="px-5 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors flex items-center gap-2.5" title="从 .db 文件恢复系统">
                            <RefreshCw className="w-4 h-4" /> 还原
                        </button>
                        <div className="w-px bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />
                        <button onClick={openDataFolder} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2.5" title="打开本地数据文件夹">
                            <Plus className="w-4 h-4 rotate-45" /> 数据目录
                        </button>
                    </div>

                    <button onClick={() => setIsTxModalOpen(true)} className="px-7 py-3 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary/90 transition-all premium-shadow active:scale-95 flex items-center gap-3">
                        <Plus className="w-5 h-5" /> 新建交易
                    </button>

                </div>
            </div>

            {/* Metrics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard index={0} title="年度总营收" value={`¥${contextStats?.totalRevenue || 0} `} change={contextStats?.growth || "+0%"} icon={DollarSign} trend="up" label="较去年" isPrivacyMode={isPrivacyMode} />
                <StatCard index={1} title="预计资产结余" value={netProfit} change={contextStats?.profitMoM || "+0%"} icon={Activity} trend={contextStats?.profitTrend || (netProfit >= 0 ? "up" : "down")} isPrivacyMode={isPrivacyMode} />
                <StatCard index={2} title="累计单据总数" value={contextStats?.totalOrders || 0} change={contextStats?.orderMoM || "+0%"} icon={ShoppingBag} trend={contextStats?.orderTrend || "up"} isPrivacyMode={isPrivacyMode} />
                <StatCard index={3} title="当前活跃客户" value={contextStats?.activeCustomers || 0} change={contextStats?.customerMoM || "+0"} icon={Users} trend={contextStats?.customerTrend || "up"} isPrivacyMode={isPrivacyMode} />
            </div>

            {/* Analysis Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                {/* Left Column: Chart & Transactions */}
                <div className="lg:col-span-2 flex flex-col gap-10">
                    {/* Main Chart Card */}
                    <div className="glass-card rounded-[2rem] p-8 min-h-[480px] flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">收支利润全景</h2>
                                <p className="text-slate-500 mt-1 text-sm font-medium">半年内收入与支出的对比透视</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">营收</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">支出</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[320px] w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#E2E8F0" strokeOpacity={0.3} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} width={60} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="revenue" name="营收" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={45} />
                                    <Bar dataKey="expense" name="支出" fill="#64748b" radius={[4, 4, 0, 0]} barSize={45} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Transactions Card - Now in Left Column */}
                    <div className="glass-card rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">近期流水明细</h2>
                                <p className="text-slate-500 mt-1 text-sm font-medium">实时同步的最新 5 笔交易快照</p>
                            </div>
                            <a href="/orders" className="px-6 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-primary hover:text-white transition-all">
                                查看完整大盘
                            </a>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">
                                        <th className="px-8 py-5">单号</th>
                                        <th className="px-8 py-5">关联客户</th>
                                        <th className="px-8 py-5">性质</th>
                                        <th className="px-8 py-5">时间</th>
                                        <th className="px-8 py-5 text-right">金额</th>
                                        <th className="px-8 py-5">状态</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {(localTransactions || []).slice(0, 5).map((tx) => {
                                        const customer = (customers || []).find(c => c.id === tx.customerId);
                                        return (
                                            <tr key={tx.id} className="hover:bg-primary/[0.04] transition-all cursor-pointer group">
                                                <td className="px-8 py-6 font-mono text-xs text-slate-400 group-hover:text-primary">#{tx.id}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center font-black text-slate-500 text-xs text-uppercase">
                                                            {customer?.name?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm text-slate-900 dark:text-white">{customer?.name || '未知实体'}</p>
                                                            <p className="text-[10px] text-slate-400">ID: {tx.customerId}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase",
                                                        tx.type === 'Income' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                                    )}>
                                                        {tx.type === 'Income' ? '入账' : '支出'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-xs font-bold text-slate-500">{tx.date}</td>
                                                <td className={cn(
                                                    "px-8 py-6 text-lg font-black text-right tracking-tighter",
                                                    tx.type === 'Income' ? "text-emerald-600" : "text-slate-900 dark:text-white"
                                                )}>
                                                    {tx.type === 'Income' ? '+' : '-'} {formatCurrency(tx.amount || 0, isPrivacyMode)}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black border uppercase tracking-widest",
                                                        tx.status === 'Completed' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                    )}>
                                                        <div className="w-1.5 h-1.5 rounded-full" />
                                                        {tx.status === 'Completed' ? '已收' : '处理'}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Cards Area - Spans 1 col */}
                <div className="flex flex-col gap-10">
                    {/* 1. Weekly Performance */}
                    <div className="glass-card rounded-[2rem] p-8 flex flex-col">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">本周营收分布</h2>
                        <p className="text-xs text-slate-500 mb-6 font-medium">从周一到周日的入账统计</p>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyData} margin={{ top: 10, right: 30, left: 30, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorWeekly" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                        dy={10}
                                        interval={0}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fill="url(#colorWeekly)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. AI Insights */}
                    <AIInsightsCard transactions={localTransactions} customers={customers} />

                    {/* 3. Category Distribution */}
                    <div className="glass-card rounded-[2rem] p-8 min-h-[480px] flex flex-col">
                        <div className="flex justify-between items-start mb-10">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">分类构成透视</h2>
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div className="h-[340px] mt-4">
                            <CategoryPieChart transactions={localTransactions} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="建立客户档案">
                <CustomerForm onSubmit={handleAddCustomer} onCancel={() => setIsCustomerModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Dashboard;
