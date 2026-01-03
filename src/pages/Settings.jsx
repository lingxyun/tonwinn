import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../lib/utils';
import { Save, Settings as SettingsIcon, Upload, X, RefreshCw, Info, ExternalLink, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { check } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';

const Settings = () => {
    const { settings, updateSettings } = useSettings();
    const [formData, setFormData] = useState({
        system_name: '',
        system_subtitle: '',
        page_title: '',
        app_icon: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [appVersion, setAppVersion] = useState('');

    useEffect(() => {
        if (settings) {
            setFormData({
                system_name: settings.system_name || '',
                system_subtitle: settings.system_subtitle || '',
                page_title: settings.page_title || '',
                app_icon: settings.app_icon || ''
            });
        }
    }, [settings]);

    useEffect(() => {
        getVersion().then(setAppVersion);
    }, []);

    const checkForUpdates = async () => {
        setIsCheckingUpdate(true);
        try {
            const update = await check();
            if (update) {
                toast.info(`发现新版本: ${update.version}`, {
                    description: '正在为您准备更新，请稍候...',
                    duration: 5000
                });

                let downloaded = 0;
                let contentLength = 0;

                await update.downloadAndInstall((event) => {
                    switch (event.event) {
                        case 'Started':
                            contentLength = event.data.contentLength;
                            console.log(`started downloading ${event.data.contentLength} bytes`);
                            break;
                        case 'Progress':
                            downloaded += event.data.chunkLength;
                            console.log(`downloaded ${downloaded} from ${contentLength}`);
                            break;
                        case 'Finished':
                            console.log('download finished');
                            break;
                    }
                });

                toast.success('更新已完成', {
                    description: '软件即将重启以应用更新',
                    action: {
                        label: '立刻重启',
                        onClick: () => relaunch()
                    }
                });

                setTimeout(() => relaunch(), 3000);
            } else {
                toast.success('当前已是最新版本');
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error('检查更新失败', { description: error.message });
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleIconUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                toast.error('图片过大，请上传 1MB 以内的图片');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({ ...prev, app_icon: event.target.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        await updateSettings(formData);
        setIsSaving(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <SettingsIcon className="w-8 h-8 text-slate-500" />
                        系统设置
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        自定义系统的基本配置
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            应用图标
                        </label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-950 overflow-hidden">
                                {formData.app_icon ? (
                                    <img src={formData.app_icon} alt="App Icon" className="w-full h-full object-cover" />
                                ) : (
                                    <Upload className="w-6 h-6 text-slate-300" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors inline-block text-center">
                                    <input type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
                                    更换图标
                                </label>
                                {formData.app_icon && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, app_icon: '' }))}
                                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 justify-center"
                                    >
                                        <X className="w-3 h-3" /> 移除图标
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">建议使用 128x128 像素的 PNG 图片。该图标将显示在侧边栏和窗口标题栏。</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            系统名称
                        </label>
                        <input
                            type="text"
                            name="system_name"
                            value={formData.system_name}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                            placeholder="例如：财务通"
                        />
                        <p className="text-xs text-slate-500">显示在侧边栏顶部的系统主标题。</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            系统副标题
                        </label>
                        <input
                            type="text"
                            name="system_subtitle"
                            value={formData.system_subtitle}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                            placeholder="例如：企业财务管理系统"
                        />
                        <p className="text-xs text-slate-500">显示在主标题下方的小字说明。</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            浏览器网页标题
                        </label>
                        <input
                            type="text"
                            name="page_title"
                            value={formData.page_title}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                            placeholder="例如：财务通 - 专业财务管理"
                        />
                        <p className="text-xs text-slate-500">修改浏览器标签页显示的标题内容。</p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? '保存中...' : '保存更改'}
                        </button>
                    </div>
                </form>
            </div>

            {/* About Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Info className="w-5 h-5 text-slate-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">关于系统</h2>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                <SettingsIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">{formData.system_name || '鱼跃CRM'}</h3>
                                <p className="text-xs text-slate-500">版本号: v{appVersion || '0.1.2'}</p>
                            </div>
                        </div>
                        <button
                            onClick={checkForUpdates}
                            disabled={isCheckingUpdate}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={cn("w-4 h-4 text-primary", isCheckingUpdate && "animate-spin")} />
                            {isCheckingUpdate ? '正在检查...' : '检查更新'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a
                            href="https://github.com/lingxyun/tonwinn"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                                    <ExternalLink size={18} />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">开源代码仓库</span>
                            </div>
                            <ArrowRight size={14} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </a>

                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                                    <RefreshCw size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">在线更新</span>
                                    <span className="text-[10px] text-emerald-500">已开启签名校验</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
