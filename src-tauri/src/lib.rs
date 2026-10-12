//! azeTextCorrector - Native macOS French spelling & grammar checker
//!
//! This is the main library for the Tauri application.
//! Grammar checking runs in the webview (Grammalecte); Rust keeps the
//! personal dictionary and native macOS spelling suggestions.

mod commands;
mod dictionary;
mod error;
mod spelling;

use commands::AppState;
use tauri::Manager;

/// Initialize and run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            log::info!("App data dir: {:?}", app_data_dir);

            let state = AppState::new(&app_data_dir).expect("Failed to initialize app state");
            app.manage(state);

            log::info!("azeTextCorrector initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::spelling_suggestions,
            commands::get_dictionary,
            commands::add_to_dictionary,
            commands::remove_from_dictionary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
