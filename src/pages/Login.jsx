
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const success = await login(username, password);
        if (success) {
            navigate('/');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                        <span className="text-2xl font-bold text-white">
                            {settings?.system_name ? settings.system_name.substring(0, 2).toUpperCase() : 'FS'}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        欢迎使用 {settings?.system_name || '财务管理系统'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        {settings?.system_subtitle || '请登录以访问系统'}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl dark:shadow-2xl border border-slate-100 dark:border-slate-800 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">用户名</label>
                            <div className="relative">
                                <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white transition-all"
                                    placeholder="请输入用户名"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">密码</label>
                            <div className="relative">
                                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white transition-all"
                                    placeholder="请输入密码"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? '登录中...' : '登录'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">默认账号: admin / 123456</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
