
import React from 'react';

const Placeholder = ({ title }) => (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <p>正在开发中...</p>
    </div>
);

export const Customers = () => <Placeholder title="客户管理" />;
export const Orders = () => <Placeholder title="订单管理" />;
export const Accounts = () => <Placeholder title="账目详情" />;
