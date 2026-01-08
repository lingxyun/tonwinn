import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import * as db from '../utils/tauriDb';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Image } from '@tauri-apps/api/image';

const SettingsContext = createContext();

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

const defaultSettings = {
    system_name: '鱼跃CRM',
    system_subtitle: '鱼跃客户关系管理系统',
    page_title: '鱼跃CRM - 专业管理系统',
    app_icon: ''
};

const applyBranding = async (settings) => {
    try {
        const appWindow = getCurrentWindow();
        if (settings.system_name) {
            await appWindow.setTitle(settings.system_name);
        }
        if (settings.app_icon && settings.app_icon.includes('base64,')) {
            const base64Data = settings.app_icon.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const icon = await Image.fromBytes(byteArray);
            await appWindow.setIcon(icon);
        }
    } catch (error) {
        console.error('Failed to apply branding:', error);
    }
};

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(defaultSettings);
    const [feishuConfig, setFeishuConfig] = useState(() => {
        const saved = localStorage.getItem('feishuConfig');
        return saved ? JSON.parse(saved) : { appId: '', appSecret: '', baseToken: '' };
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        localStorage.setItem('feishuConfig', JSON.stringify(feishuConfig));
    }, [feishuConfig]);

    const updateFeishuConfig = (newConfig) => {
        setFeishuConfig(prev => ({ ...prev, ...newConfig }));
    };

    const fetchSettings = async () => {
        try {
            const results = await db.select('SELECT key, value FROM settings');
            if (results.length > 0) {
                const settingsObj = {};
                results.forEach(row => {
                    settingsObj[row.key] = row.value;
                });
                const mergedSettings = { ...defaultSettings, ...settingsObj };
                setSettings(mergedSettings);
                applyBranding(mergedSettings);
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
                if (value !== undefined && value !== null) {
                    await db.execute(
                        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                        [key, value.toString()]
                    );
                }
            }
            const updated = { ...settings, ...newSettings };
            setSettings(updated);
            applyBranding(updated);
            toast.success('系统设置已更新');
            return true;
        } catch (error) {
            console.error('Update settings failed:', error);
            toast.error('设置更新失败');
            return false;
        }
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettings,
            loading,
            feishuConfig,
            updateFeishuConfig
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
