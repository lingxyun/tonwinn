import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Save, Settings as SettingsIcon, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
    const { settings, updateSettings } = useSettings();
    const [formData, setFormData] = useState({
        system_name: '',
        system_subtitle: '',
        page_title: '',
        app_icon: ''
    });
    const [isSaving, setIsSaving] = useState(false);

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
        </div>
    );
};

export default Settings;
