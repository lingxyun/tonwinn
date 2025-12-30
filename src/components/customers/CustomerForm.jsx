
import React, { useState } from 'react';

const CustomerForm = ({ onSubmit, onCancel, initialData = null }) => {
    const [formData, setFormData] = useState(initialData || {
        name: '',
        address: '',
        phone: '',
        balance: '0',
        status: 'Active'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            balance: parseFloat(formData.balance)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">客户姓名</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="请输入客户姓名"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">联系电话</label>
                <input
                    type="tel"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="13800000000"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">选择地址</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="请输入客户地址"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                    {initialData ? '当前余额 (人工校准)' : '共计总成交金额'} (¥)
                </label>
                <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.balance}
                    onChange={e => setFormData({ ...formData, balance: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                    {initialData
                        ? '注意：直接修改此数值将覆盖由交易自动计算的余额。'
                        : '正数表示预存款，负数表示欠款。'}
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">状态</label>
                <select
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                    <option value="Active">活跃</option>
                    <option value="Inactive">未激活</option>
                    <option value="Suspended">已停用</option>
                </select>
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                    取消
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
                >
                    {initialData ? '更新客户' : '保存客户'}
                </button>
            </div>
        </form>
    );
};

export default CustomerForm;
