import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Key, Copy, Check, Loader2, Lock } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

const AuthorizationOverlay = ({ children }) => {
    const [machineId, setMachineId] = useState('');
    const [licenseKey, setLicenseKey] = useState(localStorage.getItem('license_key') || '');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        initAuth();
    }, []);

    const initAuth = async () => {
        try {
            const mid = await invoke('get_machine_id');
            setMachineId(mid);
            if (licenseKey) {
                const valid = await invoke('verify_license', { machineId: mid, licenseKey });
                if (valid) setIsAuthorized(true);
            }
        } catch (e) {
            console.error('Auth initialization failed:', e);
            toast.error('系统初始化失败', { description: '无法获取机器码，请检查系统环境' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const trimmedKey = licenseKey.trim();
        if (!trimmedKey) return;

        setIsVerifying(true);
        setError('');
        try {
            const valid = await invoke('verify_license', { machineId, licenseKey: trimmedKey });
            if (valid) {
                localStorage.setItem('license_key', trimmedKey);
                setIsAuthorized(true);
                toast.success('授权成功', { description: '软件已成功激活，感谢您的支持！' });
            } else {
                setError('激活码无效或与当前机器不匹配');
                toast.error('授权失败');
            }
        } catch (e) {
            setError(e.message || '系统校验异常');
        } finally {
            setIsVerifying(false);
        }
    };

    const copyMachineId = async () => {
        try {
            await navigator.clipboard.writeText(machineId);
            setIsCopied(true);
            toast.info('机器码已复制');
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            toast.error('复制失败', { description: '请手动选择并复制' });
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 z-[9999]">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-bounce">
                    <Lock size={24} />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-slate-900 font-bold tracking-wider">正在加载授权信息</p>
                    <p className="text-slate-400 text-xs font-mono animate-pulse">Checking security credentials...</p>
                </div>
            </div>
        );
    }

    if (isAuthorized) {
        return children;
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-50 overflow-hidden flex items-center justify-center p-4">
            {/* Dynamic blurred backgrounds (Light High-end theme) */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, -30, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none"
            />
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, -40, 0],
                    y: [0, 60, 0]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"
            />

            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="w-full max-w-md relative"
            >
                <div className="bg-white/80 backdrop-blur-2xl md:rounded-[48px] rounded-3xl p-10 border border-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] flex flex-col items-center text-center space-y-8">
                    {/* Icon section */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
                        <div className="relative w-24 h-24 rounded-[32px] bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                            <ShieldAlert size={48} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">软件授权</h1>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[280px] mx-auto">
                            您的系统尚未激活，请向管理员提供机器码以获取激活授权。
                        </p>
                    </div>

                    <div className="w-full space-y-6">
                        {/* Machine ID Display */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center gap-2">
                                    <Key size={12} className="text-primary" /> 机器识别码
                                </label>
                                {isCopied && <span className="text-[10px] font-bold text-emerald-600 animate-in fade-in slide-in-from-right-2">已完成复制 !</span>}
                            </div>
                            <div
                                onClick={copyMachineId}
                                className="group relative flex items-center justify-between p-1 bg-slate-50 border border-slate-200 rounded-3xl hover:bg-slate-100 transition-all cursor-pointer overflow-hidden active:scale-[0.98]"
                            >
                                <code className="flex-1 text-sm font-mono font-black text-slate-700 px-5 py-3 tracking-wider">
                                    {machineId || '........'}
                                </code>
                                <div className="p-3 bg-white rounded-2xl text-slate-400 group-hover:text-white group-hover:bg-primary transition-all mr-1 shadow-sm">
                                    {isCopied ? <Check size={18} /> : <Copy size={18} />}
                                </div>
                            </div>
                        </div>

                        {/* License Input Form */}
                        <form onSubmit={handleVerify} className="space-y-4">
                            <motion.div
                                animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                                transition={{ duration: 0.4 }}
                                className="space-y-3"
                            >
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">激活序列号</label>
                                <input
                                    type="text"
                                    spellCheck="false"
                                    value={licenseKey}
                                    onChange={(e) => {
                                        setLicenseKey(e.target.value);
                                        if (error) setError('');
                                    }}
                                    placeholder="请输入 32 位激活码"
                                    className={`w-full px-6 py-4 bg-slate-50 border rounded-3xl text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none transition-all font-mono ${error ? "border-rose-500 ring-4 ring-rose-500/10" : "border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        }`}
                                />
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="text-[10px] text-rose-500 font-bold px-4"
                                    >
                                        ⚠️ {error}
                                    </motion.p>
                                )}
                            </motion.div>

                            <button
                                type="submit"
                                disabled={isVerifying || licenseKey.trim().length < 10}
                                className="group relative w-full h-16 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:grayscale text-white rounded-3xl flex items-center justify-center transition-all premium-shadow overflow-hidden active:scale-95 shadow-lg shadow-primary/20"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                <span className="relative text-base font-black flex items-center gap-3">
                                    {isVerifying ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            正在激活验证
                                        </>
                                    ) : (
                                        "立即激活解锁系统"
                                    )}
                                </span>
                            </button>
                        </form>
                    </div>

                    <div className="pt-2 text-slate-400 font-bold flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                            <p className="text-[9px] uppercase tracking-tighter">Powered by LingXiaoYun Technology</p>
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                        </div>
                        <p className="text-[8px] opacity-60 font-mono tracking-tight">Financial System Secure Authorization Platform v2.2</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthorizationOverlay;
