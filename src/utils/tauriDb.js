import Database from '@tauri-apps/plugin-sql';

let db = null;

export const getDb = async () => {
    if (db) return db;
    db = await Database.load("sqlite:financial.db");
    return db;
};

export const execute = async (query, bindValues = []) => {
    const database = await getDb();
    return await database.execute(query, bindValues);
};

export const select = async (query, bindValues = []) => {
    const database = await getDb();
    return await database.select(query, bindValues);
};
