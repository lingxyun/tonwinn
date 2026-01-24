import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../lib/utils';
import { Save, Settings as SettingsIcon, Upload, X, RefreshCw, Info, ExternalLink, ArrowRight, User, Cloud, Key, ShieldCheck, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { feishuService } from '../services/feishuService';
import { check } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';
import { invoke } from '@tauri-apps/api/core';
import ChangelogModal from '../components/settings/ChangelogModal';

const Settings = () => {
    const { settings, updateSettings, feishuConfig, updateFeishuConfig } = useSettings();
    const [formData, setFormData] = useState({
        system_name: '',
        system_subtitle: '',
        page_title: '',
        app_icon: ''
    });
    const [feishuForm, setFeishuForm] = useState({
        appId: '',
        appSecret: '',
        appToken: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [appVersion, setAppVersion] = useState('');
    const [machineId, setMachineId] = useState('');
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);

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
        if (feishuConfig) {
            setFeishuForm(feishuConfig);
        }
    }, [feishuConfig]);

    useEffect(() => {
        getVersion().then(setAppVersion);
        invoke('get_machine_id').then(setMachineId).catch(console.error);
    }, []);

    const handleResetAuth = () => {
        if (window.confirm('确定要注销当前系统的授权吗？注销后软件将重新进入锁定状态，需要重新激活。')) {
            localStorage.removeItem('license_key');
            window.location.reload();
        }
    };

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

    const handleFeishuSave = () => {
        updateFeishuConfig(feishuForm);
        toast.success('飞书配置已保存');
    };

    const handleTestConnection = async () => {
        if (!feishuForm.appId || !feishuForm.appSecret) {
            toast.error('请填写 App ID 和 App Secret');
            return;
        }
        try {
            const success = await feishuService.testConnection(feishuForm);
            if (success) {
                toast.success('连接成功！');
            } else {
                toast.error('连接失败，请检查凭证');
            }
        } catch (e) {
            console.error(e);
            const msg = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
            toast.error('连接错误: ' + msg);
        }
    };

    const handleInitializeTables = async () => {
        if (!feishuForm.appId || !feishuForm.appSecret || !feishuForm.appToken) {
            toast.error('请填写完整配置（ID, Secret, Token）');
            return;
        }

        setIsInitializing(true);
        const toastId = toast.loading('正在检查并创建飞书表格结构...');
        try {
            await feishuService.createTables(feishuForm);
            toast.success('表格检查/创建成功！字段已修复', { id: toastId });
        } catch (e) {
            console.error(e);
            let msg = e.message;
            if (!msg && typeof e === 'object') msg = JSON.stringify(e);
            if (!msg) msg = String(e);

            toast.error('创建失败: ' + msg, { id: toastId });
        } finally {
            setIsInitializing(false);
        }
    };

    const handlePushData = async () => {
        if (!feishuForm.appId || !feishuForm.appSecret || !feishuForm.appToken) {
            toast.error('配置不完整');
            return;
        }

        setIsInitializing(true); // Re-use loading state
        const toastId = toast.loading('正在将本地数据上传到飞书...');
        try {
            const stats = await feishuService.pushData(feishuForm);
            toast.success(`上传成功！新增 ${stats.addedContacts} 个客户`, { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error('上传失败: ' + e.message, { id: toastId });
        } finally {
            setIsInitializing(false);
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

            {/* Feishu Config Section */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">多端同步配置 (飞书 / Lark)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            App ID (企业自建应用)
                        </label>
                        <input
                            type="text"
                            value={feishuForm.appId}
                            onChange={(e) => setFeishuForm({ ...feishuForm, appId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="cli_..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            App Secret
                        </label>
                        <input
                            type="password"
                            value={feishuForm.appSecret}
                            onChange={(e) => setFeishuForm({ ...feishuForm, appSecret: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="*************"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            应用 Token (App Token / Base Token)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">多维表格链接中 "base" 开头的一串字符</p>
                        <input
                            type="text"
                            value={feishuForm.appToken}
                            onChange={(e) => setFeishuForm({ ...feishuForm, appToken: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="bascn............"
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={handleFeishuSave}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold shadow-sm border border-blue-600 active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                        保存配置
                    </button>
                    <button
                        onClick={handleTestConnection}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-bold shadow-sm active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4 text-primary" />
                        测试连接
                    </button>

                    <button
                        onClick={handleInitializeTables}
                        disabled={isInitializing}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition font-bold shadow-sm active:scale-95"
                    >
                        <RefreshCw className={cn("w-4 h-4", isInitializing && "animate-spin")} />
                        {isInitializing ? '创建中...' : '一键初始化表格'}
                    </button>

                    <button
                        onClick={handlePushData}
                        disabled={isInitializing}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition font-bold shadow-sm active:scale-95"
                    >
                        <Upload className={cn("w-4 h-4", isInitializing && "animate-spin")} />
                        上传本地数据
                    </button>
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

                        <button
                            onClick={() => setIsChangelogOpen(true)}
                            className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group text-left w-full"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                                    <FileText size={18} />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">更新日志</span>
                            </div>
                            <ArrowRight size={14} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </button>

                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                                    <ShieldCheck size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">系统授权状态</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-emerald-500 font-bold uppercase">已激活 (正式版)</span>
                                        <button
                                            onClick={handleResetAuth}
                                            className="text-[9px] text-slate-400 hover:text-rose-500 underline underline-offset-2 transition-colors font-bold"
                                        >
                                            [注销激活]
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                    <Key size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">机器识别码</span>
                                    <span className="text-[10px] text-blue-500 font-mono font-bold">{machineId || '获取中...'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 col-span-1 md:col-span-2">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">鱼跃开发者：凌小云😊</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">无论是一片坦途的光明，还是绝望寂静的黑暗，人总是不断向前走。你想到达明天，那么此刻就不要停下脚步。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ChangelogModal
                isOpen={isChangelogOpen}
                onClose={() => setIsChangelogOpen(false)}
            />
        </div >
    );
};

export default Settings;
