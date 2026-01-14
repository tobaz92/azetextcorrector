//! Dictionary storage implementation
//!
//! Persists the personal dictionary as a JSON file in the app data directory.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppError;

/// Maximum number of words in the dictionary
const MAX_WORDS: usize = 10_000;
/// Maximum length of a single word (in characters)
const MAX_WORD_LENGTH: usize = 100;

/// Personal dictionary for ignored words
#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Dictionary {
    /// Schema version for future migrations
    version: u32,
    /// List of words to ignore
    words: Vec<String>,
    /// Last update timestamp (Unix seconds)
    updated_at: i64,
    /// File path (not serialized)
    #[serde(skip)]
    file_path: PathBuf,
}

impl Dictionary {
    /// Load dictionary from the app data directory
    ///
    /// If the file doesn't exist or is corrupted, creates a new empty dictionary.
    pub fn load(app_data_dir: &Path) -> Result<Self, AppError> {
        let file_path = app_data_dir.join("dictionary.json");

        if file_path.exists() {
            let content = fs::read_to_string(&file_path)?;

            match serde_json::from_str::<Dictionary>(&content) {
                Ok(mut dict) => {
                    dict.file_path = file_path;
                    dict.sanitize();
                    log::info!("Dictionary loaded: {} words", dict.words.len());
                    Ok(dict)
                }
                Err(e) => {
                    log::warn!("Dictionary corrupted: {}, creating backup", e);
                    Self::backup_corrupted(&file_path)?;
                    Ok(Self::new(file_path))
                }
            }
        } else {
            // Create parent directory if needed
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent)?;
            }
            log::info!("Dictionary created: new empty dictionary");
            Ok(Self::new(file_path))
        }
    }

    /// Create a new empty dictionary
    fn new(file_path: PathBuf) -> Self {
        Self {
            version: 1,
            words: Vec::new(),
            updated_at: Self::now(),
            file_path,
        }
    }

    /// Save dictionary to disk
    pub fn save(&mut self) -> Result<(), AppError> {
        self.updated_at = Self::now();
        let content = serde_json::to_string_pretty(&self)?;
        fs::write(&self.file_path, content)?;
        log::debug!("Dictionary saved: {} words", self.words.len());
        Ok(())
    }

    /// Add a word to the dictionary (without saving)
    pub fn add_word(&mut self, word: &str) -> Result<(), AppError> {
        let word = word.trim().to_string();

        // Validate
        if word.is_empty() {
            return Err(AppError::Dictionary("Le mot ne peut pas être vide".into()));
        }

        if word.chars().count() > MAX_WORD_LENGTH {
            return Err(AppError::Dictionary(format!(
                "Mot trop long ({} caractères, max {})",
                word.chars().count(),
                MAX_WORD_LENGTH
            )));
        }

        if word.chars().any(|c| c.is_control()) {
            return Err(AppError::Dictionary(
                "Le mot contient des caractères invalides".into(),
            ));
        }

        if self.words.len() >= MAX_WORDS {
            return Err(AppError::Dictionary(format!(
                "Limite du dictionnaire atteinte ({} mots)",
                MAX_WORDS
            )));
        }

        // Check for duplicates (case-insensitive)
        if !self.contains(&word) {
            self.words.push(word);
            self.words
                .sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
        }

        Ok(())
    }

    /// Add a word and save atomically (with rollback on failure)
    pub fn add_word_and_save(&mut self, word: &str) -> Result<(), AppError> {
        let word_trimmed = word.trim().to_string();

        self.add_word(&word_trimmed)?;

        if let Err(e) = self.save() {
            // Rollback: remove the word we just added
            let _ = self.remove_word(&word_trimmed);
            return Err(e);
        }

        log::info!("Word added to dictionary: {}", word_trimmed);
        Ok(())
    }

    /// Remove a word from the dictionary (without saving)
    pub fn remove_word(&mut self, word: &str) -> Result<(), AppError> {
        let word_lower = word.to_lowercase();
        let initial_len = self.words.len();
        self.words.retain(|w| w.to_lowercase() != word_lower);

        if self.words.len() == initial_len {
            return Err(AppError::Dictionary("Mot non trouvé".into()));
        }

        Ok(())
    }

    /// Remove a word and save atomically (with rollback on failure)
    pub fn remove_word_and_save(&mut self, word: &str) -> Result<(), AppError> {
        let word_lower = word.to_lowercase();

        // Find original word for potential rollback
        let original_word = self
            .words
            .iter()
            .find(|w| w.to_lowercase() == word_lower)
            .cloned();

        self.remove_word(word)?;

        if let Err(e) = self.save() {
            // Rollback: add the word back
            if let Some(w) = original_word {
                self.words.push(w);
                self.words
                    .sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
            }
            return Err(e);
        }

        log::info!("Word removed from dictionary: {}", word);
        Ok(())
    }

    /// Check if a word is in the dictionary (case-insensitive)
    pub fn contains(&self, word: &str) -> bool {
        let word_lower = word.to_lowercase();
        self.words.iter().any(|w| w.to_lowercase() == word_lower)
    }

    /// Get all words in the dictionary
    pub fn words(&self) -> &[String] {
        &self.words
    }

    /// Sanitize dictionary data (remove invalid entries)
    fn sanitize(&mut self) {
        // Remove invalid words
        self.words.retain(|w| {
            !w.trim().is_empty()
                && w.chars().count() <= MAX_WORD_LENGTH
                && !w.chars().any(|c| c.is_control())
        });

        // Remove duplicates (case-insensitive)
        let mut seen = HashSet::new();
        self.words.retain(|w| {
            let lower = w.to_lowercase();
            seen.insert(lower)
        });

        // Sort
        self.words
            .sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    }

    /// Create a backup of a corrupted dictionary file
    fn backup_corrupted(path: &Path) -> Result<(), AppError> {
        let backup_name = format!("dictionary.corrupted.{}.json", Self::now());
        let backup_path = path
            .parent()
            .map(|p| p.join(&backup_name))
            .unwrap_or_else(|| PathBuf::from(&backup_name));

        fs::rename(path, &backup_path)?;
        log::info!("Corrupted dictionary backed up to {:?}", backup_path);
        Ok(())
    }

    /// Get current Unix timestamp
    fn now() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
    }
}

#[cfg(test)]
mod tests {
    use super::*;


    #[test]
    fn test_add_word() {
        let mut dict = Dictionary::new(PathBuf::from("/tmp/test.json"));
        assert!(dict.add_word("test").is_ok());
        assert!(dict.contains("test"));
        assert!(dict.contains("TEST")); // case-insensitive
    }

    #[test]
    fn test_add_empty_word() {
        let mut dict = Dictionary::new(PathBuf::from("/tmp/test.json"));
        assert!(dict.add_word("").is_err());
        assert!(dict.add_word("   ").is_err());
    }

    #[test]
    fn test_remove_word() {
        let mut dict = Dictionary::new(PathBuf::from("/tmp/test.json"));
        dict.add_word("test").unwrap();
        assert!(dict.remove_word("TEST").is_ok()); // case-insensitive
        assert!(!dict.contains("test"));
    }

    #[test]
    fn test_sanitize() {
        let mut dict = Dictionary::new(PathBuf::from("/tmp/test.json"));
        dict.words = vec![
            "valid".to_string(),
            "".to_string(),
            "   ".to_string(),
            "Valid".to_string(), // duplicate
            "has\nnewline".to_string(),
        ];
        dict.sanitize();
        assert_eq!(dict.words.len(), 1);
        assert_eq!(dict.words[0], "valid");
    }
}
