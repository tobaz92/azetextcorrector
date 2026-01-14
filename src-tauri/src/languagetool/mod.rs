//! LanguageTool integration module
//!
//! This module handles:
//! - Starting/stopping the embedded LanguageTool server
//! - Communication with the LT HTTP API
//! - Lazy loading (LT starts on first correction)

mod client;
mod process;
mod types;

pub use client::LtClient;
pub use process::LtProcess;
pub use types::*;
