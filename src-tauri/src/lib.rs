mod db;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
    .setup(|_app| {
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        commands::verify_password,
        commands::hash_password
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
