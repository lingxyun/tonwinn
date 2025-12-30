import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const BottomNav = ({ onAddClick }) => {
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: '概览', to: '/' },
        { icon: FileText, label: '订单', to: '/orders' },
        { icon: Plus, label: '记账', isAction: true, onClick: onAddClick },
        { icon: Users, label: '客户', to: '/customers' },
        { icon: Settings, label: '我的', to: '/settings' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800" />
            <div className="relative flex items-center justify-around p-2 pb-safe">
                {navItems.map((item, index) => {
                    const isActive = location.pathname === item.to;

                    if (item.isAction) {
                        return (
                            <button
                                key={index}
                                onClick={item.onClick}
                                className="flex flex-col items-center justify-center -mt-8"
                            >
                                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 text-white active:scale-95 transition-transform">
                                    <item.icon size={28} />
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 mt-1">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <NavLink
                            key={index}
                            to={item.to}
                            className={({ isActive }) => cn(
                                "flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all active:scale-95",
                                isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                isActive && "bg-primary/10"
                            )}>
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
