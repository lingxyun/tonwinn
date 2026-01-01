
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import * as db from '../utils/tauriDb';

const SettingsContext = createContext();

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

const defaultSettings = {
    system_name: '财务通',
    system_subtitle: '企业财务管理系统',
    page_title: '财务通 - 专业财务管理'
};


export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(defaultSettings);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const results = await db.select('SELECT key, value FROM settings');
            if (results.length > 0) {
                const settingsObj = {};
                results.forEach(row => {
                    settingsObj[row.key] = row.value;
                });
                setSettings({ ...defaultSettings, ...settingsObj });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (settings?.page_title) {
            document.title = settings.page_title;
        }
    }, [settings?.page_title]);

    const updateSettings = async (newSettings) => {
        try {
            for (const [key, value] of Object.entries(newSettings)) {
                await db.execute(
                    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                    [key, value.toString()]
                );
            }
            setSettings(prev => ({ ...prev, ...newSettings }));
            toast.success('系统设置已更新');
            return true;
        } catch (error) {
            console.error('Update settings failed:', error);
            toast.error('设置更新失败');
            return false;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
};
