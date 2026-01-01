import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as db from '../utils/tauriDb';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    const login = async (username, password) => {
        try {
            // 1. Find user in local DB
            const results = await db.select("SELECT * FROM users WHERE username = ?", [username]);

            if (results.length === 0) {
                toast.error('登录失败', { description: '用户不存在' });
                return false;
            }

            const userData = results[0];

            // 2. Verify password via Rust command
            const isValid = await invoke('verify_password', {
                password,
                hash: userData.password
            });

            if (isValid) {
                const { password: _, ...userWithoutPass } = userData;
                setUser(userWithoutPass);
                localStorage.setItem('user', JSON.stringify(userWithoutPass));
                // Local app doesn't strictly need JWT token, but we can set a dummy one if needed
                localStorage.setItem('token', 'local-session-token');

                toast.success('登录成功', { description: `欢迎回来, ${userData.username}` });
                return true;
            } else {
                toast.error('登录失败', { description: '密码错误' });
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('系统异常', { description: error.message });
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        toast.info('您已退出登录');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};
