import { fetch } from '@tauri-apps/plugin-http';
import * as db from '../utils/tauriDb';

// Use full URL for production (Tauri fetch bypasses CORS)
const FEISHU_OPEN_API = 'https://open.feishu.cn';

export const feishuService = {
    // Helper to get access token
    getTenantAccessToken: async (appId, appSecret) => {
        try {
            const safeId = appId?.trim();
            const safeSecret = appSecret?.trim();

            const response = await fetch(`${FEISHU_OPEN_API}/open-apis/auth/v3/tenant_access_token/internal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "app_id": safeId,
                    "app_secret": safeSecret
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Auth HTTP Error ${response.status}: ${errText}`);
            }

            const data = await response.json();

            if (data.code === 0) {
                return data.tenant_access_token;
            }
            throw new Error(`Auth failed: ${data.msg} (Code: ${data.code})`);
        } catch (error) {
            console.error('Feishu Auth Error:', error);
            throw error;
        }
    },

    // Verify connection
    testConnection: async (config) => {
        try {
            const token = await feishuService.getTenantAccessToken(config.appId, config.appSecret);
            return !!token;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    // Helper: Find tables by name
    findTableIds: async (appToken, accessToken) => {
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
        const tablesRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables`, { method: 'GET', headers });
        if (!tablesRes.ok) throw new Error(`Fetch Tables Failed: ${tablesRes.status}`);
        const tablesData = await tablesRes.json();
        const items = tablesData.data?.items || [];

        return {
            contactTable: items.find(t => t.name.includes("往来") || t.name.includes("Contacts") || t.name.includes("客户")),
            txTable: items.find(t => t.name.includes("交易") || t.name.includes("Transactions") || t.name.includes("收支"))
        };
    },

    // Sync: PUSH local data to Feishu
    pushData: async (config) => {
        const appId = config.appId?.trim();
        const appSecret = config.appSecret?.trim();
        const appToken = config.appToken?.trim();
        const accessToken = await feishuService.getTenantAccessToken(appId, appSecret);
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

        // 1. Get Feishu Tables
        const { contactTable, txTable } = await feishuService.findTableIds(appToken, accessToken);
        if (!contactTable || !txTable) throw new Error("Cloud tables not found. Please click 'Initialize Tables' first.");

        // 2. Get Local Data
        const localCustomers = await db.select("SELECT * FROM customers");
        const localTx = await db.select("SELECT * FROM transactions");

        // 3. Get Existing Feishu Data (Contacts)
        const fContactsRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${contactTable.table_id}/records?page_size=500`, { headers });
        const fContactsData = await fContactsRes.json();
        const remoteContacts = fContactsData.data?.items || [];
        const remoteContactsById = new Map(remoteContacts.map(i => [i.record_id, i]));
        const remoteContactsByName = new Map(remoteContacts.map(i => [i.fields["姓名"], i]));

        // 4. Upload/Update Customers
        let addedCount = 0;
        for (const c of localCustomers) {
            const fields = {
                "姓名": c.name,
                "电话": c.phone || "",
                "类型": c.role === "Supplier" ? "供货商" : "客户",
                "余额": c.balance || 0
            };

            let targetRecordId = null;

            // Try matching by ID first
            if (c.feishu_id && remoteContactsById.has(c.feishu_id)) {
                targetRecordId = c.feishu_id;
            }
            // Then try matching by Name
            else if (remoteContactsByName.has(c.name)) {
                targetRecordId = remoteContactsByName.get(c.name).record_id;
            }

            if (targetRecordId) {
                // UPDATE (PATCH)
                await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${contactTable.table_id}/records/${targetRecordId}`, {
                    method: 'PUT', headers, // Using PUT for full record replace or PATCH for partial
                    body: JSON.stringify({ fields })
                });
                // Link ID if not linked
                if (c.feishu_id !== targetRecordId) {
                    await db.execute("UPDATE customers SET feishu_id = ? WHERE id = ?", [targetRecordId, c.id]);
                }
            } else {
                // CREATE (POST)
                const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${contactTable.table_id}/records`, {
                    method: 'POST', headers,
                    body: JSON.stringify({ fields })
                });
                const data = await res.json();
                if (data.code === 0 && data.data?.record?.record_id) {
                    await db.execute("UPDATE customers SET feishu_id = ? WHERE id = ?", [data.data.record.record_id, c.id]);
                }
                addedCount++;
            }
        }

        // 5. Get Existing Feishu Data (Transactions)
        const fTxRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${txTable.table_id}/records?page_size=500`, { headers });
        const fTxData = await fTxRes.json();
        const remoteTx = fTxData.data?.items || [];
        const remoteTxById = new Map(remoteTx.map(i => [i.record_id, i]));
        const remoteTxByCompositeKey = new Map(remoteTx.map(i => {
            const f = i.fields;
            // Convert remote date back to YYYY-MM-DD for key matching
            const d = new Date(f["日期"]);
            const dStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : "";
            return [`${dStr}_${f["单位名称"]}_${f["金额"]}_${f["类型"]}`, i];
        }));

        // 6. Upload/Update Transactions
        let addedTxCount = 0;
        for (const t of localTx) {
            const customer = localCustomers.find(c => c.id === t.customerId);
            const cName = customer ? customer.name : "未知";
            const dateStr = t.date.split('T')[0];
            const typeStr = t.type === 'Income' ? '收入' : '支出';
            const compositeKey = `${dateStr}_${cName}_${t.amount}_${typeStr}`;

            const fields = {
                "日期": new Date(t.date).getTime(),
                "单位名称": cName,
                "金额": t.amount,
                "类型": typeStr,
                "备注": t.description || ""
            };

            let targetTxId = null;
            if (t.feishu_id && remoteTxById.has(t.feishu_id)) {
                targetTxId = t.feishu_id;
            } else if (remoteTxByCompositeKey.has(compositeKey)) {
                targetTxId = remoteTxByCompositeKey.get(compositeKey).record_id;
            }

            if (targetTxId) {
                // UPDATE (PUT)
                await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${txTable.table_id}/records/${targetTxId}`, {
                    method: 'PUT', headers,
                    body: JSON.stringify({ fields })
                });
                if (t.feishu_id !== targetTxId) {
                    await db.execute("UPDATE transactions SET feishu_id = ? WHERE id = ?", [targetTxId, t.id]);
                }
            } else {
                // CREATE (POST)
                const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${txTable.table_id}/records`, {
                    method: 'POST', headers,
                    body: JSON.stringify({ fields })
                });
                const data = await res.json();
                if (data.code === 0 && data.data?.record?.record_id) {
                    await db.execute("UPDATE transactions SET feishu_id = ? WHERE id = ?", [data.data.record.record_id, t.id]);
                }
                addedTxCount++;
            }
        }

        return { addedContacts: addedCount, addedTx: addedTxCount };
    },

    // Delete Record from Feishu
    deleteRecord: async (config, tableType, feishuId) => {
        if (!feishuId) return;
        const appId = config.appId?.trim();
        const appSecret = config.appSecret?.trim();
        const appToken = config.appToken?.trim();

        const accessToken = await feishuService.getTenantAccessToken(appId, appSecret);
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

        const { contactTable, txTable } = await feishuService.findTableIds(appToken, accessToken);
        const tableId = tableType === 'customer' ? contactTable?.table_id : txTable?.table_id;

        if (!tableId) return;

        try {
            const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${feishuId}`, {
                method: 'DELETE',
                headers
            });
            const data = await res.json();
            if (data.code !== 0) {
                console.warn(`Cloud Delete Failed for ${feishuId}:`, data.msg);
            }
        } catch (e) {
            console.error('Delete API Error:', e);
        }
    },

    // Sync: PULL Data from Feishu (And auto-save to DB)
    pullData: async (config) => {
        const appId = config.appId?.trim();
        const appSecret = config.appSecret?.trim();
        const appToken = config.appToken?.trim();

        if (!appId || !appSecret || !appToken) throw new Error("Config missing");

        const accessToken = await feishuService.getTenantAccessToken(appId, appSecret);
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

        // 1. Find Tables
        const { contactTable, txTable } = await feishuService.findTableIds(appToken, accessToken);
        if (!contactTable || !txTable) throw new Error(`请在飞书表格中创建名为“往来单位”和“收支记录”的两个数据表`);

        // 2. Fetch Contacts
        const contactsRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${contactTable.table_id}/records?page_size=500`, { method: 'GET', headers });
        const contactsData = await contactsRes.json();

        const feishuContacts = (contactsData.data?.items || []).map(item => {
            const f = item.fields;
            return {
                feishu_id: item.record_id,
                name: f["姓名"] || f["Name"],
                phone: f["电话"] || f["Phone"],
                role: (f["类型"] === "供货商") ? "Supplier" : "Customer",
                balance: parseFloat(f["余额"] || 0)
            };
        }).filter(c => c.name);

        // 3. Fetch Transactions
        const txRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${txTable.table_id}/records?page_size=500`, { method: 'GET', headers });
        const txData = await txRes.json();
        const feishuTransactions = (txData.data?.items || []).map(item => {
            const f = item.fields;
            // Handle internal dates vs display dates
            let dateStr = new Date().toISOString().split('T')[0];
            if (f["日期"]) {
                const dateVal = f["日期"];
                const dateObj = typeof dateVal === 'number' ? new Date(dateVal) : new Date(dateVal);
                if (!isNaN(dateObj.getTime())) {
                    dateStr = dateObj.toISOString().split('T')[0];
                }
            }

            return {
                feishu_id: item.record_id,
                date: dateStr,
                amount: parseFloat(f["金额"] || 0),
                type: (f["类型"] === "收入" || f["类型"] === "Income") ? "Income" : "Expense",
                customerName: f["单位名称"] || f["客户名称"] || "Unknown"
            };
        });

        return { contacts: feishuContacts, transactions: feishuTransactions };
    },

    // Auto-create Tables (Idempotent Fix)
    createTables: async (config) => {
        const appId = config.appId?.trim();
        const appSecret = config.appSecret?.trim();
        const appToken = config.appToken?.trim();

        const accessToken = await feishuService.getTenantAccessToken(appId, appSecret);
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

        // Helper to create or get table
        const ensureTable = async (name, fields) => {
            let tableId = null;

            // 1. Fetch ALL existing tables
            const listRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables`, { method: 'GET', headers });
            const listData = await listRes.json();

            if (listData.code === 0) {
                const found = (listData.data?.items || []).find(t => t.name.trim() === name.trim() || t.name.includes(name));
                if (found) tableId = found.table_id;
            }

            // 2. Create if not found
            if (!tableId) {
                const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables`, {
                    method: 'POST', headers, body: JSON.stringify({ table: { name } })
                });
                const data = await res.json();
                if (data.code === 0) {
                    tableId = data.data.table_id;
                } else if (data.code === 1254001 || data.code === 1254013) {
                    const retryRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables`, { method: 'GET', headers });
                    const retryData = await retryRes.json();
                    const retryFound = (retryData.data?.items || []).find(it => it.name.includes(name));
                    if (retryFound) tableId = retryFound.table_id;
                }
                if (!tableId) throw new Error(`创建表 [${name}] 失败: ${data.msg} (代码:${data.code})`);
            }

            // 3. Ensure Fields Exist (Strict Check)
            // First, get existing fields to avoid unnecessary noise
            const fieldsRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, { headers });
            const fieldsData = await fieldsRes.json();
            const existingFieldNames = new Set((fieldsData.data?.items || []).map(f => f.field_name));

            for (const field of fields) {
                if (existingFieldNames.has(field.name)) continue;

                const fRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, {
                    method: 'POST', headers,
                    body: JSON.stringify({ field_name: field.name, type: field.type, property: field.property })
                });
                const fData = await fRes.json();
                // 1254002 = Already exists, ignore. Others should be logged.
                if (fData.code !== 0 && fData.code !== 1254002) {
                    console.error(`Field ${field.name} creation failed:`, fData);
                    // We don't throw here to allow partial success, but maybe we should?
                }
            }
        };

        // Execution
        await ensureTable("往来单位", [
            { name: "姓名", type: 1 },
            { name: "电话", type: 1 },
            { name: "类型", type: 3, property: { options: [{ name: "客户" }, { name: "供货商" }] } },
            { name: "余额", type: 2 },
        ]);

        await ensureTable("收支记录", [
            { name: "日期", type: 5 },
            { name: "单位名称", type: 1 },
            { name: "金额", type: 2 },
            { name: "类型", type: 3, property: { options: [{ name: "收入" }, { name: "支出" }] } },
            { name: "备注", type: 1 }
        ]);

        return true;
    }
};
