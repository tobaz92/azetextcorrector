//! Tauri commands
//!
//! These are the functions exposed to the frontend via invoke().

use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Manager, State};
use tokio::sync::RwLock;

use crate::dictionary::Dictionary;
use crate::error::AppError;
use crate::languagetool::{CorrectionResult, LtClient, LtProcess};

/// Application state shared across commands
pub struct AppState {
    /// LanguageTool process manager
    pub lt_process: Arc<RwLock<LtProcess>>,
    /// LanguageTool HTTP client
    pub lt_client: Arc<RwLock<LtClient>>,
    /// Personal dictionary
    pub dictionary: Arc<RwLock<Dictionary>>,
    /// Resources directory path (kept for potential future use)
    pub _resources_dir: PathBuf,
}

impl AppState {
    /// Create a new application state
    pub fn new(resources_dir: PathBuf, app_data_dir: PathBuf) -> Result<Self, AppError> {
        let lt_process = LtProcess::new(&resources_dir)?;
        let lt_client = LtClient::new(lt_process.port())?;
        let dictionary = Dictionary::load(&app_data_dir)?;

        Ok(Self {
            lt_process: Arc::new(RwLock::new(lt_process)),
            lt_client: Arc::new(RwLock::new(lt_client)),
            dictionary: Arc::new(RwLock::new(dictionary)),
            _resources_dir: resources_dir,
        })
    }
}

/// Correct text using LanguageTool
///
/// This is the main correction command. It:
/// 1. Starts LT if not already running (lazy loading)
/// 2. Sends the text to LT for checking
/// 3. Filters out words from the personal dictionary
/// 4. Returns the corrections
#[tauri::command]
pub async fn correct_text(
    text: String,
    state: State<'_, AppState>,
) -> Result<CorrectionResult, AppError> {
    // Start LT if needed (lazy loading)
    let mut lt_process = state.lt_process.write().await;
    let was_first_start = lt_process.is_first_start();

    if !lt_process.is_running() {
        let port = lt_process.start().await?;

        // Update client with new port
        let mut client = state.lt_client.write().await;
        client.set_port(port);
    }
    drop(lt_process); // Release lock

    // Get ignored words from dictionary
    let dictionary = state.dictionary.read().await;
    let ignored_words: Vec<String> = dictionary.words().to_vec();
    drop(dictionary); // Release lock

    // Perform correction
    let client = state.lt_client.read().await;
    client.check(&text, &ignored_words, was_first_start).await
}

/// Get the list of words in the personal dictionary
#[tauri::command]
pub async fn get_dictionary(state: State<'_, AppState>) -> Result<Vec<String>, AppError> {
    let dictionary = state.dictionary.read().await;
    Ok(dictionary.words().to_vec())
}

/// Add a word to the personal dictionary
#[tauri::command]
pub async fn add_to_dictionary(word: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let mut dictionary = state.dictionary.write().await;
    dictionary.add_word_and_save(&word)
}

/// Remove a word from the personal dictionary
#[tauri::command]
pub async fn remove_from_dictionary(
    word: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let mut dictionary = state.dictionary.write().await;
    dictionary.remove_word_and_save(&word)
}

/// Get the log file path
#[tauri::command]
pub async fn get_log_path(app: tauri::AppHandle) -> Result<String, AppError> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| AppError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, e)))?;

    Ok(log_dir.to_string_lossy().to_string())
}

/// Export logs to a zip file
#[tauri::command]
pub async fn export_logs(app: tauri::AppHandle) -> Result<String, AppError> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| AppError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, e)))?;

    // For now, just return the log directory path
    // A more complete implementation would create a zip file
    Ok(log_dir.to_string_lossy().to_string())
}

/// Check if LanguageTool is running
#[tauri::command]
pub async fn is_lt_running(state: State<'_, AppState>) -> Result<bool, AppError> {
    let mut lt_process = state.lt_process.write().await;
    Ok(lt_process.is_running())
}

/// Preload LanguageTool in background (called on app startup for faster first correction)
#[tauri::command]
pub async fn preload_lt(state: State<'_, AppState>) -> Result<bool, AppError> {
    let mut lt_process = state.lt_process.write().await;

    if lt_process.is_running() {
        log::debug!("LT already running, skipping preload");
        return Ok(false);
    }

    log::info!("Preloading LanguageTool in background...");
    let port = lt_process.start().await?;

    // Update client with new port
    let mut client = state.lt_client.write().await;
    client.set_port(port);

    log::info!("LanguageTool preloaded and ready");
    Ok(true)
}

/// Stop LanguageTool (called on app exit)
#[tauri::command]
pub async fn stop_lt(state: State<'_, AppState>) -> Result<(), AppError> {
    let mut lt_process = state.lt_process.write().await;
    lt_process.stop().await
}
