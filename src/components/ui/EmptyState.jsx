import React from 'react';
import { motion } from 'framer-motion';
import { FileSearch } from 'lucide-react';

const EmptyState = ({ title = "暂无数据", description = "这里目前空空如也，尝试添加一些内容吧。", action }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center p-12 text-center"
        >
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl premium-shadow flex items-center justify-center text-primary">
                    <FileSearch size={40} />
                </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-slate-500 max-w-xs mx-auto mb-8">{description}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold premium-shadow hover:bg-blue-600 active:scale-95 transition-all"
                >
                    {action.label}
                </button>
            )}
        </motion.div>
    );
};

export default EmptyState;
