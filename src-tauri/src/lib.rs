mod commands;
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:financial.db", db::get_migrations())
                .build(),
        )
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|_app| Ok(()))
        .invoke_handler(tauri::generate_handler![
            commands::verify_password,
            commands::hash_password,
            commands::export_database,
            commands::restore_database,
            commands::open_data_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
