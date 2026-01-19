use bcrypt::verify;
use std::fs;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn verify_password(password: &str, hash: &str) -> bool {
    verify(password, hash).unwrap_or(false)
}

#[tauri::command]
pub fn hash_password(password: &str) -> String {
    bcrypt::hash(password, bcrypt::DEFAULT_COST).unwrap_or_default()
}

#[tauri::command]
pub async fn export_database(app: AppHandle, dest_path: String) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = data_dir.join("financial.db");
    
    if !db_path.exists() {
        return Err("数据库文件不存在".to_string());
    }

    fs::copy(db_path, dest_path).map_err(|e| format!("备份失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn restore_database(app: AppHandle, src_path: String) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = data_dir.join("financial.db");

    // Important: Remove WAL and SHM files. 
    // These files contain pending writes or session state that can conflict 
    // with the restored database file, leading to empty data on the first restart.
    let wal_path = data_dir.join("financial.db-wal");
    let shm_path = data_dir.join("financial.db-shm");

    if wal_path.exists() {
        let _ = fs::remove_file(wal_path);
    }
    if shm_path.exists() {
        let _ = fs::remove_file(shm_path);
    }

    fs::copy(src_path, db_path).map_err(|e| format!("还原失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn open_data_folder(app: AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(data_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(data_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(data_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

const SECRET_SALT: &str = "tonwin-financial-2026-secure";

#[tauri::command]
pub fn get_machine_id() -> Result<String, String> {
    let uid = machine_uid::get().map_err(|e| e.to_string())?;
    // 为保持简洁，取 md5 的前 16 位大写作为机器识别码
    let machine_id = format!("{:x}", md5::compute(uid))[..16].to_uppercase();
    Ok(machine_id)
}

#[tauri::command]
pub fn verify_license(machine_id: &str, license_key: &str) -> bool {
    if license_key.is_empty() { return false; }
    // 算法：MD5(machine_id + SECRET_SALT)
    let combined = format!("{}{}", machine_id, SECRET_SALT);
    let expected = format!("{:x}", md5::compute(combined));
    license_key.trim().to_lowercase() == expected.to_lowercase()
}
