
export const customers = [
    { id: 1, name: "张三", email: "zhangsan@example.com", phone: "13800138000", balance: 5000.00, status: "Active" },
    { id: 2, name: "李四", email: "lisi@example.com", phone: "13900139000", balance: 1200.00, status: "Active" },
    { id: 3, name: "王五", email: "wangwu@example.com", phone: "13700137000", balance: 0.00, status: "Inactive" },
    { id: 4, name: "赵六", email: "zhaoliu@example.com", phone: "15000150000", balance: 850.50, status: "Active" },
    { id: 5, name: "孙七", email: "sunqi@example.com", phone: "15100151000", balance: -200.00, status: "Suspended" },
];

export const transactions = [
    { id: "ORD-001", customerId: 1, date: "2023-10-25", amount: 1500.00, type: "Income", status: "Completed", description: "咨询服务费" },
    { id: "ORD-002", customerId: 2, date: "2023-10-26", amount: 300.00, type: "Expense", status: "Completed", description: "退款" },
    { id: "ORD-003", customerId: 1, date: "2023-10-27", amount: 2000.00, type: "Income", status: "Pending", description: "项目预付款" },
    { id: "ORD-004", customerId: 4, date: "2023-10-27", amount: 850.50, type: "Income", status: "Completed", description: "产品销售" },
    { id: "ORD-005", customerId: 5, date: "2023-10-28", amount: 200.00, type: "Expense", status: "Completed", description: "违约金" },
];

export const stats = {
    totalRevenue: 23150.50,
    totalOrders: 152,
    activeCustomers: 45,
    growth: "+12.5%"
};
