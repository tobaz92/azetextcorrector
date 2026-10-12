//! Error types for azeTextCorrector

use serde::Serialize;
use thiserror::Error;

/// Main application error type
#[derive(Error, Debug)]
pub enum AppError {
    /// Dictionary related errors
    #[error("Dictionary: {0}")]
    Dictionary(String),

    /// Invalid payload received from the frontend
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// IO errors (file operations)
    #[error("IO: {0}")]
    Io(#[from] std::io::Error),

    /// JSON serialization/deserialization errors
    #[error("JSON: {0}")]
    Json(#[from] serde_json::Error),
}

/// Error codes for frontend handling
#[derive(Debug, Serialize, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    DictionaryError,
    InvalidInput,
    IoError,
    InternalError,
}

/// Serializable error for Tauri commands
#[derive(Debug, Serialize)]
pub struct CommandError {
    pub message: String,
    pub code: ErrorCode,
}

impl From<&AppError> for CommandError {
    fn from(err: &AppError) -> Self {
        let (message, code) = match err {
            AppError::Dictionary(msg) => (msg.clone(), ErrorCode::DictionaryError),
            AppError::InvalidInput(msg) => (msg.clone(), ErrorCode::InvalidInput),
            AppError::Io(e) => (e.to_string(), ErrorCode::IoError),
            AppError::Json(e) => (e.to_string(), ErrorCode::InternalError),
        };
        CommandError { message, code }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        CommandError::from(self).serialize(serializer)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        let cmd_err = CommandError::from(&AppError::Dictionary("test".to_string()));
        assert!(matches!(cmd_err.code, ErrorCode::DictionaryError));

        let cmd_err = CommandError::from(&AppError::InvalidInput("test".to_string()));
        assert!(matches!(cmd_err.code, ErrorCode::InvalidInput));
    }
}
