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

use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
pub struct LicenseStatus {
    valid: bool,
    kind: String, // "permanent", "trial", "none"
    message: String,
    expiration: Option<i64>,
}

#[tauri::command]
pub fn verify_license(machine_id: &str, license_key: &str) -> LicenseStatus {
    let key = license_key.trim();
    if key.is_empty() {
        return LicenseStatus {
            valid: false,
            kind: "none".to_string(),
            message: "未输入激活码".to_string(),
            expiration: None,
        };
    }

    // 1. Check Permanent License
    // MD5(machine_id + SECRET_SALT)
    let combined = format!("{}{}", machine_id, SECRET_SALT);
    let expected_permanent = format!("{:x}", md5::compute(combined));
    
    if key.to_lowercase() == expected_permanent.to_lowercase() {
        return LicenseStatus {
            valid: true,
            kind: "permanent".to_string(),
            message: "永久授权".to_string(),
            expiration: None,
        };
    }

    // 2. Check Trial License
    // Format: TR-<HexTimestamp>-<Signature>
    if key.starts_with("TR-") {
        let parts: Vec<&str> = key.split('-').collect();
        if parts.len() == 3 {
            let hex_ts = parts[1];
            let signature = parts[2];

            // Verify Signature: MD5(machine_id + hex_ts + SECRET_SALT)
            let trial_combined = format!("{}{}{}", machine_id, hex_ts, SECRET_SALT);
            let expected_sig = format!("{:x}", md5::compute(trial_combined));

            if signature.to_lowercase() == expected_sig.to_lowercase() {
                // Verify Expiration
                if let Ok(ts) = i64::from_str_radix(hex_ts, 16) {
                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as i64;

                    if now < ts {
                         return LicenseStatus {
                            valid: true,
                            kind: "trial".to_string(),
                            message: "试用授权".to_string(),
                            expiration: Some(ts),
                        };
                    } else {
                        return LicenseStatus {
                            valid: false,
                            kind: "trial".to_string(),
                            message: "试用期已结束".to_string(),
                            expiration: Some(ts),
                        };
                    }
                }
            }
        }
    }

    LicenseStatus {
        valid: false,
        kind: "none".to_string(),
        message: "激活码无效".to_string(),
        expiration: None,
    }
}
