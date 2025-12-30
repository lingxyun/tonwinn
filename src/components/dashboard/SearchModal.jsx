import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, FileText, Settings, X, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';

const SearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const { customers, transactions } = useData();

    useEffect(() => {
        if (isOpen) setQuery('');
    }, [isOpen]);

    const results = query.trim() === '' ? [] : [
        ...customers.filter(c => c.name.includes(query) || c.phone.includes(query)).map(c => ({
            type: 'customer',
            id: c.id,
            title: c.name,
            subtitle: `客户 | ${c.phone}`,
            icon: Users,
            path: '/customers'
        })),
        ...transactions.filter(t => t.id.toString().includes(query) || (t.description || '').includes(query)).map(t => ({
            type: 'transaction',
            id: t.id,
            title: `订单 #${t.id}`,
            subtitle: `交易 | ¥${t.amount}`,
            icon: FileText,
            path: '/orders'
        })),
        {
            type: 'action',
            id: 'settings',
            title: '系统设置',
            subtitle: '跳转至全局系统设置',
            icon: Settings,
            path: '/settings'
        }
    ].slice(0, 8);

    const handleSelect = (path) => {
        navigate(path);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/20 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="relative w-full max-w-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800/20 overflow-hidden"
                    >
                        <div className="flex items-center p-6 gap-4 border-b border-slate-100 dark:border-slate-800/50">
                            <Search className="w-6 h-6 text-slate-400" />
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="全局搜索客户、订单、功能..."
                                className="flex-1 bg-transparent border-none focus:outline-none text-lg text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] text-slate-500 font-bold">
                                <Command size={10} /> Esc
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto p-3 custom-scrollbar">
                            {results.length > 0 ? (
                                <div className="space-y-1">
                                    {results.map((item) => (
                                        <button
                                            key={`${item.type}-${item.id}`}
                                            onClick={() => handleSelect(item.path)}
                                            className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-primary/10 dark:hover:bg-primary/20 transition-all group group-hover:translate-x-1"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                                                <item.icon size={20} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                                                <p className="text-xs text-slate-500">{item.subtitle}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : query.trim() !== '' ? (
                                <div className="py-12 text-center text-slate-500">
                                    未找到匹配结果
                                </div>
                            ) : (
                                <div className="py-12 text-center text-slate-400 text-sm">
                                    输入关键字开始搜索...
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                            <p className="text-[10px] text-slate-400">
                                支持搜索姓名、手机号、订单 ID
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SearchModal;
