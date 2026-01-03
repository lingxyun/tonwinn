
import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
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
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);

    const login = async (username, password) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                const { token: newToken, ...userData } = data;
                setUser(userData);
                setToken(newToken);
                localStorage.setItem('user', JSON.stringify(userData));
                if (newToken) {
                    localStorage.setItem('token', newToken);
                }
                toast.success('登录成功', { description: `欢迎回来, ${data.username}` });
                return true;
            } else {
                const err = await res.json();
                console.group('Auth Failure');
                console.error('Status:', res.status);
                console.error('Error Details:', err);
                console.groupEnd();
                toast.error('登录失败', { description: err.error || '用户名或密码错误' });
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('服务器连接失败');
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        toast.info('您已退出登录');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};
