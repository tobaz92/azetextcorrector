//! Error types for azeTextCorrector
//!
//! This module defines all error types used throughout the application.
//! Uses thiserror for ergonomic error handling.

use serde::Serialize;
use thiserror::Error;

/// Main application error type
#[derive(Error, Debug)]
pub enum AppError {
    /// LanguageTool related errors
    #[error("LanguageTool: {0}")]
    LanguageTool(String),

    /// Dictionary related errors
    #[error("Dictionary: {0}")]
    Dictionary(String),

    /// HTTP/Network errors
    #[error("HTTP: {0}")]
    Http(#[from] reqwest::Error),

    /// IO errors (file operations)
    #[error("IO: {0}")]
    Io(#[from] std::io::Error),

    /// JSON serialization/deserialization errors
    #[error("JSON: {0}")]
    Json(#[from] serde_json::Error),

    /// Process spawn errors
    #[error("Process: {0}")]
    Process(String),

    /// Timeout errors
    #[error("Timeout: {0}")]
    Timeout(String),
}

/// Serializable error for Tauri commands
/// Tauri requires errors to implement Serialize
#[derive(Debug, Serialize)]
pub struct CommandError {
    pub message: String,
    pub code: ErrorCode,
}

/// Error codes for frontend handling
#[derive(Debug, Serialize, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    /// LanguageTool server not running or unreachable
    LtNotRunning,
    /// LanguageTool failed to start
    LtStartFailed,
    /// Request timeout
    Timeout,
    /// Text too long
    TextTooLong,
    /// Dictionary operation failed
    DictionaryError,
    /// Generic internal error
    InternalError,
    /// IO/File error
    IoError,
}

impl From<AppError> for CommandError {
    fn from(err: AppError) -> Self {
        let (message, code) = match &err {
            AppError::LanguageTool(msg) => {
                let code = if msg.contains("not running") || msg.contains("unreachable") {
                    ErrorCode::LtNotRunning
                } else if msg.contains("start") || msg.contains("spawn") {
                    ErrorCode::LtStartFailed
                } else if msg.contains("trop long") || msg.contains("too long") {
                    ErrorCode::TextTooLong
                } else {
                    ErrorCode::InternalError
                };
                (msg.clone(), code)
            }
            AppError::Dictionary(msg) => (msg.clone(), ErrorCode::DictionaryError),
            AppError::Http(e) => {
                if e.is_timeout() {
                    (format!("Request timeout: {}", e), ErrorCode::Timeout)
                } else if e.is_connect() {
                    ("LanguageTool not reachable".to_string(), ErrorCode::LtNotRunning)
                } else {
                    (e.to_string(), ErrorCode::InternalError)
                }
            }
            AppError::Io(e) => (e.to_string(), ErrorCode::IoError),
            AppError::Json(e) => (e.to_string(), ErrorCode::InternalError),
            AppError::Process(msg) => (msg.clone(), ErrorCode::LtStartFailed),
            AppError::Timeout(msg) => (msg.clone(), ErrorCode::Timeout),
        };

        CommandError { message, code }
    }
}

// Implement IntoResponse for Tauri commands
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let cmd_err: CommandError = self.into();
        cmd_err.serialize(serializer)
    }
}

impl From<&AppError> for CommandError {
    fn from(err: &AppError) -> Self {
        let (message, code) = match err {
            AppError::LanguageTool(msg) => {
                let code = if msg.contains("not running") || msg.contains("unreachable") {
                    ErrorCode::LtNotRunning
                } else if msg.contains("start") || msg.contains("spawn") {
                    ErrorCode::LtStartFailed
                } else if msg.contains("trop long") || msg.contains("too long") {
                    ErrorCode::TextTooLong
                } else {
                    ErrorCode::InternalError
                };
                (msg.clone(), code)
            }
            AppError::Dictionary(msg) => (msg.clone(), ErrorCode::DictionaryError),
            AppError::Http(e) => {
                if e.is_timeout() {
                    (format!("Request timeout: {}", e), ErrorCode::Timeout)
                } else if e.is_connect() {
                    ("LanguageTool not reachable".to_string(), ErrorCode::LtNotRunning)
                } else {
                    (e.to_string(), ErrorCode::InternalError)
                }
            }
            AppError::Io(e) => (e.to_string(), ErrorCode::IoError),
            AppError::Json(e) => (e.to_string(), ErrorCode::InternalError),
            AppError::Process(msg) => (msg.clone(), ErrorCode::LtStartFailed),
            AppError::Timeout(msg) => (msg.clone(), ErrorCode::Timeout),
        };

        CommandError { message, code }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        let err = AppError::LanguageTool("not running".to_string());
        let cmd_err: CommandError = err.into();
        assert!(matches!(cmd_err.code, ErrorCode::LtNotRunning));

        let err = AppError::Dictionary("test".to_string());
        let cmd_err: CommandError = err.into();
        assert!(matches!(cmd_err.code, ErrorCode::DictionaryError));
    }
}
