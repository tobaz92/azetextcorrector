//! Tauri commands
//!
//! These are the functions exposed to the frontend via invoke().

use std::path::Path;
use std::sync::{Mutex, MutexGuard};

use serde::Serialize;
use tauri::{Manager, State};

use crate::dictionary::Dictionary;
use crate::error::AppError;
use crate::spelling;

/// Upper bound on distinct unknown words per correction (frontend payload).
const MAX_SPELLING_WORDS: usize = 5_000;
/// Longest word sent to the native spell checker, in characters.
const MAX_SPELLING_WORD_LENGTH: usize = 100;

/// Application state shared across commands
pub struct AppState {
    /// Personal dictionary
    pub dictionary: Mutex<Dictionary>,
}

impl AppState {
    pub fn new(app_data_dir: &Path) -> Result<Self, AppError> {
        Ok(Self {
            dictionary: Mutex::new(Dictionary::load(app_data_dir)?),
        })
    }

    fn dictionary(&self) -> Result<MutexGuard<'_, Dictionary>, AppError> {
        self.dictionary
            .lock()
            .map_err(|_| AppError::Dictionary("Dictionnaire verrouillé après une erreur interne".into()))
    }
}

/// What macOS knows about an unknown word.
#[derive(Debug, Default, Serialize)]
pub struct SpellingInfo {
    pub guesses: Vec<String>,
    /// Valid English word: likely jargon, must not be replaced blindly.
    pub english: bool,
}

/// Native macOS information for each unknown word, in the same order.
///
/// Synchronous on purpose: Tauri runs sync commands on the main thread,
/// which is where AppKit expects NSSpellChecker to be used.
#[tauri::command]
pub fn spelling_suggestions(words: Vec<String>) -> Result<Vec<SpellingInfo>, AppError> {
    if words.len() > MAX_SPELLING_WORDS {
        return Err(AppError::InvalidInput(format!(
            "Trop de mots inconnus ({}, max {})",
            words.len(),
            MAX_SPELLING_WORDS
        )));
    }

    Ok(words
        .iter()
        .map(|word| {
            if word.chars().count() > MAX_SPELLING_WORD_LENGTH {
                SpellingInfo::default()
            } else {
                SpellingInfo {
                    guesses: spelling::guesses(word),
                    english: spelling::is_english(word),
                }
            }
        })
        .collect())
}

/// Get the list of words in the personal dictionary
#[tauri::command]
pub fn get_dictionary(state: State<'_, AppState>) -> Result<Vec<String>, AppError> {
    Ok(state.dictionary()?.words().to_vec())
}

/// Add a word to the personal dictionary
#[tauri::command]
pub fn add_to_dictionary(word: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state.dictionary()?.add_word_and_save(&word)
}

/// Remove a word from the personal dictionary
#[tauri::command]
pub fn remove_from_dictionary(word: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state.dictionary()?.remove_word_and_save(&word)
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
