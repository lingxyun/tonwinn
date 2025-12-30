
import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { toast } from 'sonner';

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
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                // Merge with defaults to ensure all keys exist
                setSettings({ ...defaultSettings, ...data });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            // Fallback to defaults
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
            const res = await fetch(`${API_BASE_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });

            if (res.ok) {
                setSettings(prev => ({ ...prev, ...newSettings }));
                toast.success('系统设置已更新');
                return true;
            } else {
                throw new Error('Failed to update');
            }
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
