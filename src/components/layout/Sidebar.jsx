import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, CreditCard, Sun, Moon, LogOut, ChevronLeft, ChevronRight, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isDarkMode, toggleTheme, isCollapsed, setIsCollapsed }) => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();

    const [openMenus, setOpenMenus] = useState({ 'orders': true });
    // The diff also implies these states, but they are not directly related to the instruction's core task of filtering navItems.
    // Keeping the original `openMenus` state as it's directly used.
    // const [isOrdersOpen, setIsOrdersOpen] = useState(true); // Not used in the original code, nor directly implied by the diff's usage.
    // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Not used in the original code, nor directly implied by the diff's usage.

    const navItems = [
        { icon: LayoutDashboard, label: '概览', to: '/' },
        { icon: Users, label: '客户管理', to: '/customers' },
        {
            icon: FileText,
            label: '订单管理',
            id: 'orders',
            children: [
                { label: '订单列表', to: '/orders' },
                { label: '交易类别', to: '/orders/categories' }
            ]
        },
        { icon: CreditCard, label: '账目详情', to: '/accounts' },
        { icon: Settings, label: '系统设置', to: '/settings' },
    ];

    // RBAC: Filter navigation items
    const filteredNavItems = navItems.filter(item => {
        if (item.label === '系统设置' && user?.role !== 'Admin') return false;
        return true;
    });

    const toggleMenu = (id) => {
        if (isCollapsed) setIsCollapsed(false);
        setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <motion.div
            initial={false}
            animate={{ width: isCollapsed ? 80 : 256 }}
            className="h-screen glass fixed left-0 top-0 z-40 flex flex-col transition-all duration-300 ease-in-out"
        >
            <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} overflow-hidden border-b border-slate-100 dark:border-white/5`}>
                {settings?.app_icon && (
                    <img src={settings.app_icon} alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm shrink-0 bg-white" />
                )}
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="whitespace-nowrap flex-1 overflow-hidden"
                        >
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent text-glow truncate">
                                {settings?.system_name || '财务通'}
                            </h1>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                {settings?.system_subtitle || '企业财务管理系统'}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>
            {isCollapsed && (
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-20 p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-primary transition-all border border-slate-200 dark:border-slate-700 shadow-sm z-50"
                >
                    <ChevronRight size={12} />
                </button>
            )}

            <nav className="flex-1 px-4 space-y-2 py-6 overflow-y-auto custom-scrollbar">
                {filteredNavItems.map((item) => {
                    if (item.children) {
                        return (
                            <div key={item.id} className="space-y-1">
                                <button
                                    onClick={() => toggleMenu(item.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110")} />
                                    {!isCollapsed && (
                                        <>
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="font-medium whitespace-nowrap flex-1 text-left"
                                            >
                                                {item.label}
                                            </motion.span>
                                            <ChevronRight
                                                size={14}
                                                className={cn("transition-transform duration-200", openMenus[item.id] ? "rotate-90" : "")}
                                            />
                                        </>
                                    )}
                                </button>
                                <AnimatePresence>
                                    {!isCollapsed && openMenus[item.id] && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden pl-4 space-y-1"
                                        >
                                            {item.children.map(child => (
                                                <NavLink
                                                    key={child.to}
                                                    to={child.to}
                                                    end
                                                    className={({ isActive }) =>
                                                        cn(
                                                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm relative",
                                                            isActive
                                                                ? "text-primary font-medium bg-blue-50 dark:bg-blue-900/10"
                                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                                        )
                                                    }
                                                >
                                                    {({ isActive }) => (
                                                        <>
                                                            <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-primary" : "bg-slate-300 dark:bg-slate-600")} />
                                                            <span>{child.label}</span>
                                                        </>
                                                    )}
                                                </NavLink>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative",
                                    isActive
                                        ? "bg-primary text-primary-foreground premium-shadow"
                                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110")} />
                                    {!isCollapsed && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="font-medium whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                    {isActive && !isCollapsed && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                    {!isCollapsed && <span className="font-medium whitespace-nowrap">{isDarkMode ? '高亮模式' : '深色模式'}</span>}
                </button>

                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                        <span className="text-xs font-black text-white uppercase">
                            {user?.username?.substring(0, 2) || 'AD'}
                        </span>
                    </div>
                    {!isCollapsed && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-black truncate dark:text-white uppercase tracking-tight">
                                    {user?.username || '管理员'}
                                </p>
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded uppercase tracking-widest border border-primary/20">
                                    {user?.role || 'Admin'}
                                </span>
                            </div>
                            <button onClick={logout} className="text-[10px] text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 font-bold mt-1">
                                <LogOut size={10} strokeWidth={3} />
                                退出系统
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default Sidebar;
