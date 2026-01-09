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
            customerTable: items.find(t => t.name.includes("客户列表") || t.name.includes("Customer")),
            supplierTable: items.find(t => t.name.includes("供货商列表") || t.name.includes("Supplier")),
            txTable: items.find(t => t.name.includes("收支记录") || t.name.includes("Transactions"))
        };
    },

    // Sync: PUSH local data to Feishu
    pushData: async (config) => {
        const appId = config.appId?.trim();
        const appSecret = config.appSecret?.trim();
        const appToken = config.appToken?.trim();
        const accessToken = await feishuService.getTenantAccessToken(appId, appSecret);
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

        // 0. Ensure Schema & Get Types
        const schemas = await feishuService.createTables(config);

        // 1. Get Feishu Tables
        const { customerTable, supplierTable, txTable } = await feishuService.findTableIds(appToken, accessToken);
        if (!customerTable || !supplierTable || !txTable) throw new Error("Cloud tables not found. Please click 'Initialize Tables' first.");

        // 2. Get Local Data
        const localCustomers = await db.select("SELECT * FROM customers");
        const localTx = await db.select("SELECT * FROM transactions");
        const localCategories = await db.select("SELECT * FROM categories");

        // Helper: Ensure Select Options Exist (Auto-Add missing options)
        const ensureOptions = async (tableId, fieldName, requiredOptions) => {
            if (!requiredOptions || requiredOptions.length === 0) return;

            try {
                const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, { headers });
                const data = await res.json();
                // Robust lookup: try trimmed match first
                const field = (data.data?.items || []).find(f => f.field_name && f.field_name.trim() === fieldName.trim());

                // Only update if Select (3) or MultiSelect (4)
                if (!field || (field.type !== 3 && field.type !== 4)) return;

                const existingOptions = field.property?.options || [];
                const existingNames = new Set(existingOptions.map(o => (o.name || "").trim()));

                const newOptions = requiredOptions.filter(opt => opt && !existingNames.has(String(opt).trim()));
                if (newOptions.length === 0) return;

                console.log(`Auto-adding options to [${fieldName}]:`, newOptions);
                const updatedOptions = [...existingOptions, ...newOptions.map(name => ({ name: String(name).trim() }))];

                const patchRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields/${field.field_id}`, {
                    method: 'PUT', headers,
                    body: JSON.stringify({
                        field_name: field.field_name,
                        type: field.type,
                        property: { options: updatedOptions }
                    })
                });
                const patchData = await patchRes.json();
                if (patchData.code !== 0) console.warn("Field option update failed:", patchData.msg);
            } catch (e) {
                console.error("Failed to update field options:", e);
            }
        };

        const allCatNames = localCategories.map(c => c.name.trim());
        await ensureOptions(customerTable.table_id, "类别", allCatNames);
        await ensureOptions(supplierTable.table_id, "类别", allCatNames);

        // ONLY push valid categories from management list. 
        // DO NOT push raw t.category strings as they might contain person names (pollution).
        await ensureOptions(txTable.table_id, "交易类别", allCatNames);

        // Helper function to sync a list to a table
        const syncList = async (list, tableId, tableType, fieldSchema) => {
            if (!tableId) return 0;

            // Get ALL existing remote records (Pagination)
            let remoteItems = [];
            let pageToken = "";
            let hasMore = true;

            while (hasMore) {
                const query = `page_size=500${pageToken ? `&page_token=${pageToken}` : ''}`;
                const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?${query}`, { headers });
                const data = await res.json();
                if (data.data?.items) {
                    remoteItems = remoteItems.concat(data.data.items);
                }
                hasMore = data.data?.has_more;
                pageToken = data.data?.page_token;
            }

            const remoteItemsById = new Map(remoteItems.map(i => [i.record_id, i]));
            const remoteItemsByName = new Map(remoteItems.map(i => [String(i.fields["姓名"] || i.fields["名称"] || "").trim(), i]));
            const recordsToCreate = [];

            let count = 0;
            for (const c of list) {
                // Map Category IDs to Names (Robust)
                let categoryNames = [];
                let ids = [];

                try {
                    const rawIds = c.categoryIds || c.categoryId || "";
                    if (typeof rawIds === 'string' && rawIds.startsWith('[')) {
                        ids = JSON.parse(rawIds);
                    } else if (typeof rawIds === 'string' && rawIds.includes(',')) {
                        ids = rawIds.split(',').map(s => s.trim()).filter(Boolean);
                    } else if (rawIds) {
                        ids = [rawIds];
                    }
                } catch (e) {
                    if (c.categoryId) ids = [c.categoryId];
                    else if (c.categoryIds) ids = [c.categoryIds];
                }

                if (ids.length > 0) {
                    categoryNames = ids.map(id => {
                        const cat = localCategories.find(item => String(item.id) === String(id) || String(item.name).trim() === String(id).trim());
                        return cat ? cat.name.trim() : null;
                    }).filter(Boolean);
                }

                // Robust field lookup helper
                const getField = (schema, ...aliases) => {
                    const fallback = aliases[0];
                    if (!schema) return { type: 1, name: fallback };
                    for (const alias of aliases) {
                        const info = schema[alias.trim()];
                        if (info) return info;
                    }
                    return { type: 1, name: fallback };
                };

                const nameField = getField(fieldSchema, tableType === 'Supplier' ? "名称" : "姓名", "Name", "单位名称");
                const phoneField = getField(fieldSchema, "电话", "手机", "Phone", "联系电话");
                const balanceField = getField(fieldSchema, "余额", "账户余额", "Balance");
                const catField = getField(fieldSchema, "类别", "分类", "Category", "类别标签");

                const catType = catField.type;
                let finalCategoryVal = categoryNames.length > 0 ? categoryNames.join(', ') : "";

                if (catType === 4) {
                    finalCategoryVal = categoryNames; // Array for Multi
                } else if (catType === 3) {
                    finalCategoryVal = categoryNames.length > 0 ? categoryNames[0] : "";
                }

                // Use the ACTUAL Feishu field names for keys
                const payloadFields = {
                    [nameField.name]: (c.name || "").trim(),
                    [phoneField.name]: (c.phone || "").trim(),
                    [balanceField.name]: Number(c.balance || 0),
                    [catField.name]: finalCategoryVal
                };

                let targetRecordId = null;
                const cleanName = (c.name || "").trim();
                if (c.feishu_id && remoteItemsById.has(c.feishu_id)) {
                    targetRecordId = c.feishu_id;
                } else if (remoteItemsByName.has(cleanName)) {
                    targetRecordId = remoteItemsByName.get(cleanName).record_id;
                }

                if (targetRecordId) {
                    // Smart Update: Check change
                    const remoteFields = remoteItemsById.get(targetRecordId)?.fields || {};

                    const isFieldEqual = (val1, val2) => {
                        const s1 = Array.isArray(val1) ? val1.map(x => String(x).trim()).sort().join(',') : String(val1 || '').trim();
                        const s2 = Array.isArray(val2) ? val2.map(x => String(x).trim()).sort().join(',') : String(val2 || '').trim();

                        // If one is array and other is string with same content, it might look equal string-wise,
                        // but we MUST RETURN FALSE to trigger the change to proper Array format for Select fields.
                        if (Array.isArray(val1) !== Array.isArray(val2)) return false;

                        return s1 === s2;
                    };

                    const hasChanges = Object.keys(payloadFields).some(key => {
                        return !isFieldEqual(payloadFields[key], remoteFields[key]);
                    });

                    if (hasChanges) {
                        await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${targetRecordId}`, {
                            method: 'PUT', headers, body: JSON.stringify({ fields: payloadFields })
                        });
                    }
                    if (c.feishu_id !== targetRecordId) {
                        await db.execute("UPDATE customers SET feishu_id = ? WHERE id = ?", [targetRecordId, c.id]);
                    }
                } else {
                    recordsToCreate.push({ fields: payloadFields, localId: c.id });
                }
            }

            // Batch Create
            const BATCH_SIZE = 50;
            for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
                const batch = recordsToCreate.slice(i, i + BATCH_SIZE);
                const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`, {
                    method: 'POST', headers, body: JSON.stringify({ records: batch.map(b => ({ fields: b.fields })) })
                });
                const data = await res.json();
                if (data.code === 0 && data.data?.records) {
                    for (let j = 0; j < data.data.records.length; j++) {
                        const rec = data.data.records[j];
                        const localItem = batch[j];
                        await db.execute("UPDATE customers SET feishu_id = ? WHERE id = ?", [rec.record_id, localItem.localId]);
                        count++;
                    }
                }
            }
            return count;
        };

        // 3. Sync Customers and Suppliers separately
        const customersList = localCustomers.filter(c => c.role !== 'Supplier');
        const suppliersList = localCustomers.filter(c => c.role === 'Supplier');

        const addedCustomers = await syncList(customersList, customerTable.table_id, 'Customer', schemas.customerSchema);
        const addedSuppliers = await syncList(suppliersList, supplierTable.table_id, 'Supplier', schemas.supplierSchema);

        // 4. Sync Transactions (Common Table)
        // ... (Existing transaction sync logic)
        const fTxRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${txTable.table_id}/records?page_size=500`, { headers });
        const fTxData = await fTxRes.json();
        const remoteTx = fTxData.data?.items || [];
        const remoteTxById = new Map(remoteTx.map(i => [i.record_id, i]));
        const remoteTxByCompositeKey = new Map(remoteTx.map(i => {
            const f = i.fields;
            const d = new Date(f["日期"]);
            const dStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : "";
            return [`${dStr}_${f["单位名称"]}_${f["金额"]}_${f["类型"]}`, i];
        }));

        let addedTxCount = 0;
        const txToCreate = [];

        for (const t of localTx) {
            const customer = localCustomers.find(c => c.id === t.customerId);
            const cName = customer ? customer.name : "未知";
            const dateStr = t.date.split('T')[0];
            const typeStr = t.type === 'Income' ? '收入' : '支出';
            const compositeKey = `${dateStr}_${cName}_${t.amount}_${typeStr}`;

            // Helper for Transaction Schema mapping
            const getField = (schema, ...aliases) => {
                const fallback = aliases[0];
                if (!schema) return { type: 1, name: fallback };
                for (const alias of aliases) {
                    const info = schema[alias.trim()];
                    if (info) return info;
                }
                return { type: 1, name: fallback };
            };

            const dateF = getField(schemas.transactionSchema, "日期", "Date", "时间");
            const unitF = getField(schemas.transactionSchema, "单位名称", "客户名称", "Name", "姓名");
            const amountF = getField(schemas.transactionSchema, "金额", "数值", "Amount");
            const typeF = getField(schemas.transactionSchema, "类型", "Type", "收支类型");
            const txCatF = getField(schemas.transactionSchema, "交易类别", "分类", "Category", "收支类别");
            const descF = getField(schemas.transactionSchema, "备注", "Description", "说明");

            const txCatType = txCatF.type;
            let txCatVal = t.category || "";
            if (txCatType === 4 && txCatVal) {
                txCatVal = [txCatVal]; // Multi-Select expects array
            }

            const fields = {
                [dateF.name]: new Date(t.date).getTime(),
                [unitF.name]: cName,
                [amountF.name]: t.amount,
                [typeF.name]: typeStr,
                [txCatF.name]: txCatVal,
                [descF.name]: t.description || ""
            };

            let targetTxId = null;
            if (t.feishu_id && remoteTxById.has(t.feishu_id)) {
                targetTxId = t.feishu_id;
            } else if (remoteTxByCompositeKey.has(compositeKey)) {
                targetTxId = remoteTxByCompositeKey.get(compositeKey).record_id;
            }

            if (targetTxId) {
                // Smart Update for Transactions using robust comparison
                const remoteFields = remoteTxById.get(targetTxId)?.fields || {};

                const isValEqual = (v1, v2) => {
                    if (Array.isArray(v1) !== Array.isArray(v2)) return false;
                    const s1 = Array.isArray(v1) ? v1.map(x => String(x).trim()).sort().join(',') : String(v1 || '').trim();
                    const s2 = Array.isArray(v2) ? v2.map(x => String(x).trim()).sort().join(',') : String(v2 || '').trim();
                    return s1 === s2;
                };

                const hasTxChanges =
                    Math.abs(Number(fields[dateF.name]) - Number(remoteFields[dateF.name] || 0)) > 2000 || // 2s tolerance for floating point dates
                    !isValEqual(fields[unitF.name], remoteFields[unitF.name]) ||
                    Math.abs(Number(fields[amountF.name]) - Number(remoteFields[amountF.name] || 0)) > 0.01 ||
                    !isValEqual(fields[typeF.name], remoteFields[typeF.name]) ||
                    !isValEqual(fields[txCatF.name], remoteFields[txCatF.name]) ||
                    !isValEqual(fields[descF.name], remoteFields[descF.name]);

                if (hasTxChanges) {
                    await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${txTable.table_id}/records/${targetTxId}`, {
                        method: 'PUT', headers, body: JSON.stringify({ fields })
                    });
                }
                if (t.feishu_id !== targetTxId) {
                    await db.execute("UPDATE transactions SET feishu_id = ? WHERE id = ?", [targetTxId, t.id]);
                }
            } else {
                txToCreate.push({ fields, localId: t.id });
            }
        }

        // Batch Create Transactions
        for (let i = 0; i < txToCreate.length; i += 50) {
            const batch = txToCreate.slice(i, i + 50);
            const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${txTable.table_id}/records/batch_create`, {
                method: 'POST', headers, body: JSON.stringify({ records: batch.map(b => ({ fields: b.fields })) })
            });
            const data = await res.json();
            if (data.code === 0 && data.data?.records) {
                for (let j = 0; j < data.data.records.length; j++) {
                    const rec = data.data.records[j];
                    const localItem = batch[j];
                    await db.execute("UPDATE transactions SET feishu_id = ? WHERE id = ?", [rec.record_id, localItem.localId]);
                    addedTxCount++;
                }
            }
        }

        return { addedContacts: addedCustomers + addedSuppliers, addedTx: addedTxCount };
    },

    // Delete Record from Feishu
    deleteRecord: async (config, tableType, feishuId) => {
        if (!feishuId) return;
        const appId = config.appId?.trim();
        const appSecret = config.appSecret?.trim();
        const appToken = config.appToken?.trim();

        const accessToken = await feishuService.getTenantAccessToken(appId, appSecret);
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

        const { customerTable, supplierTable, txTable } = await feishuService.findTableIds(appToken, accessToken);

        let tableId = null;
        if (tableType === 'customer') tableId = customerTable?.table_id;
        else if (tableType === 'supplier') tableId = supplierTable?.table_id;
        else if (tableType === 'transaction') tableId = txTable?.table_id;

        if (!tableId) return;

        try {
            await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${feishuId}`, {
                method: 'DELETE', headers
            });
        } catch (e) {
            console.error('Delete API Error:', e);
        }
    },

    // Sync: PULL Data from Feishu (And auto-save to DB)
    // Sync: PULL Data from Feishu (And auto-save to DB)
    pullData: async (config) => {
        const appId = config.appId?.trim();
        const appSecret = config.appSecret?.trim();
        const appToken = config.appToken?.trim();

        if (!appId || !appSecret || !appToken) throw new Error("Config missing");

        const accessToken = await feishuService.getTenantAccessToken(appId, appSecret);
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

        // 0. Ensure Schema & Get Dynamic Field Mapping
        const schemas = await feishuService.createTables(config);

        // 1. Find Tables
        const { customerTable, supplierTable, txTable } = await feishuService.findTableIds(appToken, accessToken);
        if (!customerTable || !supplierTable || !txTable) throw new Error(`请先完成“一键初始化表格”`);

        // Helper: Fetch items with pagination
        const fetchItems = async (tableId) => {
            let items = [];
            let pageToken = "";
            let hasMore = true;
            while (hasMore) {
                const query = `page_size=500${pageToken ? `&page_token=${pageToken}` : ''}`;
                const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?${query}`, { headers });
                const data = await res.json();
                if (data.data?.items) items = items.concat(data.data.items);
                hasMore = data.data?.has_more;
                pageToken = data.data?.page_token;
            }
            return items;
        };

        // Helper: Robust field extraction
        const getVal = (fields, schema, ...aliases) => {
            if (!schema) return null;
            for (const alias of aliases) {
                const info = schema[alias.trim()];
                if (info && fields[info.name] !== undefined) return fields[info.name];
            }
            return null;
        };

        // 2. Fetch Customers
        const rawCustomers = await fetchItems(customerTable.table_id);
        const feishuCustomers = rawCustomers.map(item => {
            const f = item.fields;
            const name = getVal(f, schemas.customerSchema, "姓名", "Name", "单位名称");
            const phone = getVal(f, schemas.customerSchema, "电话", "手机", "Phone");
            const balance = getVal(f, schemas.customerSchema, "余额", "Balance");
            const cats = getVal(f, schemas.customerSchema, "类别", "分类", "Category") || [];

            return {
                feishu_id: item.record_id,
                name: String(name || "").trim(),
                phone: String(phone || "").trim(),
                role: "Customer",
                balance: parseFloat(balance || 0),
                categoryNames: Array.isArray(cats) ? cats : (cats ? [cats] : [])
            };
        }).filter(c => c.name);

        // 3. Fetch Suppliers
        const rawSuppliers = await fetchItems(supplierTable.table_id);
        const feishuSuppliers = rawSuppliers.map(item => {
            const f = item.fields;
            const name = getVal(f, schemas.supplierSchema, "名称", "姓名", "Name");
            const phone = getVal(f, schemas.supplierSchema, "电话", "手机", "Phone");
            const balance = getVal(f, schemas.supplierSchema, "余额", "Balance");
            const cats = getVal(f, schemas.supplierSchema, "类别", "分类", "Category") || [];

            return {
                feishu_id: item.record_id,
                name: String(name || "").trim(),
                phone: String(phone || "").trim(),
                role: "Supplier",
                balance: parseFloat(balance || 0),
                categoryNames: Array.isArray(cats) ? cats : (cats ? [cats] : [])
            };
        }).filter(c => c.name);

        // Merge Contacts
        const allContacts = [...feishuCustomers, ...feishuSuppliers];

        // 4. Fetch Transactions
        const rawTx = await fetchItems(txTable.table_id);
        const feishuTransactions = rawTx.map(item => {
            const f = item.fields;
            let dateStr = new Date().toISOString().split('T')[0];
            const dateVal = getVal(f, schemas.transactionSchema, "日期", "Date", "时间");
            if (dateVal) {
                const dateObj = new Date(typeof dateVal === 'number' ? dateVal : dateVal);
                if (!isNaN(dateObj.getTime())) dateStr = dateObj.toISOString().split('T')[0];
            }

            const cats = getVal(f, schemas.transactionSchema, "交易类别", "分类", "Category") || "默认";
            const categoryName = Array.isArray(cats) ? cats.join(', ') : String(cats);

            return {
                feishu_id: item.record_id,
                date: dateStr,
                amount: parseFloat(getVal(f, schemas.transactionSchema, "金额", "Amount") || 0),
                type: String(getVal(f, schemas.transactionSchema, "类型", "Type") || "").includes("收入") ? "Income" : "Expense",
                customerName: String(getVal(f, schemas.transactionSchema, "单位名称", "客户名称", "Name") || "Unknown"),
                description: String(getVal(f, schemas.transactionSchema, "备注", "Description") || ""),
                category: categoryName
            };
        });

        // 5. Fetch Category Options (Dropdown choices)
        const cloudCategories = new Set();
        const fetchOptionsBySchema = (schema, ...aliases) => {
            // Options are usually not in schema map but we can fetch them separately
            // Actually, we already have schemas, but property info was lost in ensureTable fieldMap.
            // Let's re-fetch field details to be safe.
        };

        const fetchFullOptions = async (tId, fName) => {
            try {
                const res = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tId}/fields`, { headers });
                const data = await res.json();
                const field = (data.data?.items || []).find(f => f.field_name && f.field_name.trim() === fName.trim());
                return field?.property?.options?.map(o => o.name) || [];
            } catch (e) { return []; }
        };

        const c1 = await fetchFullOptions(customerTable.table_id, "类别");
        const c2 = await fetchFullOptions(supplierTable.table_id, "类别");
        const c3 = await fetchFullOptions(txTable.table_id, "交易类别");

        [...c1, ...c2, ...c3].forEach(name => name && cloudCategories.add(name.trim()));

        return { contacts: allContacts, transactions: feishuTransactions, categories: Array.from(cloudCategories) };
    },

    // Auto-create Tables
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

            // Check permissions eagerly
            if (listData.code === 91403 || (listData.msg && listData.msg.includes('Forbidden'))) {
                throw new Error(`权限不足 (代码: 91403)。\n请检查：\n1. 是否已将机器人添加到表格中？\n2. 是否授予了“管理者”权限？\n(请参考教程第四步)`);
            }

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

                if (data.code === 91403 || (data.msg && data.msg.includes('Forbidden'))) {
                    throw new Error(`权限不足 (代码: 91403)。\n请检查：\n1. 是否已将机器人添加到表格中？\n2. 是否授予了“管理者”权限？\n(请参考教程第四步)`);
                }

                if (data.code === 0) {
                    tableId = data.data.table_id;
                } else if (data.code === 1254001 || data.code === 1254013) {
                    // Retry find if creation race condition or name conflict implies existence
                    const retryRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables`, { method: 'GET', headers });
                    const retryData = await retryRes.json();
                    const retryFound = (retryData.data?.items || []).find(it => it.name.includes(name));
                    if (retryFound) tableId = retryFound.table_id;
                }

                if (!tableId) throw new Error(`创建表 [${name}] 失败: ${data.msg} (代码:${data.code})`);
            }

            // 3. Ensure Fields Exist
            const fieldsRes = await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, { headers });
            const fieldsData = await fieldsRes.json();
            const existingFields = fieldsData.data?.items || [];
            const existingFieldNames = new Set(existingFields.map(f => f.field_name));

            // Build Schema Map (Trimmed keys for robust lookup)
            const fieldMap = {};
            existingFields.forEach(f => {
                if (f.field_name) {
                    fieldMap[f.field_name.trim()] = { type: f.type, name: f.field_name };
                }
            });

            for (const field of fields) {
                const cleanRequiredName = field.name.trim();
                // Check if field exists (trimmed comparison)
                if (existingFields.some(ef => ef.field_name && ef.field_name.trim() === cleanRequiredName)) continue;

                await fetch(`${FEISHU_OPEN_API}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, {
                    method: 'POST', headers,
                    body: JSON.stringify({ field_name: field.name, type: field.type, property: field.property })
                });
                // Assume default type if we created it
                fieldMap[cleanRequiredName] = { type: field.type, name: field.name };
            }
            return fieldMap;
        };

        // Execution - Create Split Tables
        // Customer Table
        const customerSchema = await ensureTable("客户列表", [
            { name: "姓名", type: 1 },
            { name: "电话", type: 1 },
            { name: "余额", type: 2 },
            { name: "类别", type: 1 },
        ]);

        // Supplier Table
        const supplierSchema = await ensureTable("供货商列表", [
            { name: "名称", type: 1 },
            { name: "电话", type: 1 },
            { name: "余额", type: 2 },
            { name: "类别", type: 1 },
        ]);

        // Transaction Table
        const transactionSchema = await ensureTable("收支记录", [
            { name: "日期", type: 5 },
            { name: "单位名称", type: 1 },
            { name: "金额", type: 2 },
            { name: "类型", type: 3, property: { options: [{ name: "收入" }, { name: "支出" }] } },
            { name: "交易类别", type: 1 },
            { name: "备注", type: 1 }
        ]);

        return { customerSchema, supplierSchema, transactionSchema };
    }
};
