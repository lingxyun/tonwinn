
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { motion } from 'framer-motion';
import Modal from '../ui/Modal';
import TransactionForm from '../transactions/TransactionForm';
import { useData } from '../../context/DataContext';

const Layout = () => {
    const { addTransaction } = useData();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const [isDarkMode, setIsDarkMode] = React.useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    React.useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    const handleCreateTransaction = (data) => {
        addTransaction(data);
        setIsTxModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
            {/* Desktop Sidebar - Hidden on mobile */}
            <div className="hidden md:block">
                <Sidebar
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                />
            </div>

            {/* Main Content */}
            <motion.main
                animate={{
                    marginLeft: isMobile ? 0 : (isCollapsed ? 80 : 256)
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-4 md:p-8 min-h-screen pb-24 md:pb-8"
            >
                <Outlet context={{ setIsTxModalOpen }} />
            </motion.main>

            {/* Mobile Bottom Nav - Hidden on desktop */}
            <BottomNav onAddClick={() => setIsTxModalOpen(true)} />

            {/* Global Transaction Modal */}
            <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title="新增数据记录">
                <TransactionForm onSubmit={handleCreateTransaction} onCancel={() => setIsTxModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Layout;
