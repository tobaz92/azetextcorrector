//! azeTextCorrector - Native macOS French spelling & grammar checker
//!
//! This is the main library for the Tauri application.
//! It integrates an embedded LanguageTool server with a native UI.

mod commands;
mod dictionary;
mod error;
mod languagetool;

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
            // Get resource directory
            // In dev mode, use the project's resources directory
            // In production, use the bundled resources
            #[cfg(dev)]
            let resources_dir = {
                let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
                manifest_dir.parent().unwrap().join("resources")
            };

            #[cfg(not(dev))]
            let resources_dir = app
                .path()
                .resource_dir()
                .expect("Failed to get resource dir");

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");

            log::info!("Resources dir: {:?}", resources_dir);
            log::info!("App data dir: {:?}", app_data_dir);

            // Initialize application state
            let state = AppState::new(resources_dir, app_data_dir)
                .expect("Failed to initialize app state");

            app.manage(state);

            log::info!("azeTextCorrector initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::correct_text,
            commands::get_dictionary,
            commands::add_to_dictionary,
            commands::remove_from_dictionary,
            commands::get_log_path,
            commands::export_logs,
            commands::is_lt_running,
            commands::preload_lt,
            commands::stop_lt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
