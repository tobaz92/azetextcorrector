//! LanguageTool HTTP client
//!
//! Handles communication with the LT server via HTTP API.

use std::time::Duration;
use reqwest::Client;

use super::types::{CheckResponse, Correction, CorrectionResult, Match};
use crate::error::AppError;

/// Maximum text length in characters
const MAX_TEXT_LENGTH: usize = 100_000;
/// HTTP request timeout
const HTTP_TIMEOUT: Duration = Duration::from_secs(30);

/// LanguageTool HTTP client
pub struct LtClient {
    client: Client,
    port: u16,
}

impl LtClient {
    /// Create a new client for the given port
    pub fn new(port: u16) -> Result<Self, AppError> {
        let client = Client::builder()
            .timeout(HTTP_TIMEOUT)
            .pool_max_idle_per_host(2)
            .tcp_keepalive(Duration::from_secs(60))
            .build()
            .map_err(AppError::Http)?;

        Ok(Self { client, port })
    }

    /// Update the port (if LT was restarted on a different port)
    pub fn set_port(&mut self, port: u16) {
        self.port = port;
    }

    /// Check text for errors
    ///
    /// # Arguments
    /// * `text` - Text to check
    /// * `ignored_words` - Words to ignore (from personal dictionary)
    /// * `lt_just_started` - Whether LT was just started (for frontend feedback)
    pub async fn check(
        &self,
        text: &str,
        ignored_words: &[String],
        lt_just_started: bool,
    ) -> Result<CorrectionResult, AppError> {
        let start = std::time::Instant::now();

        // Validate text length (count characters, not bytes)
        let char_count = text.chars().count();
        if char_count > MAX_TEXT_LENGTH {
            return Err(AppError::LanguageTool(format!(
                "Texte trop long ({} caractères, max {})",
                char_count, MAX_TEXT_LENGTH
            )));
        }

        let url = format!("http://127.0.0.1:{}/v2/check", self.port);

        // Force French language and disable auto-detection for speed
        let response = self
            .client
            .post(&url)
            .form(&[
                ("language", "fr"),
                ("text", text),
                ("disabledRules", "WHITESPACE_RULE"), // Disable slow whitespace rule
            ])
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::LanguageTool(format!(
                "LT returned {}: {}",
                status, body
            )));
        }

        let check_response: CheckResponse = response.json().await?;

        // Filter out ignored words
        let filtered_matches = self.filter_ignored_words(check_response.matches, ignored_words, text);

        // Convert matches to corrections and compute corrected text
        let (corrections, corrected_text) = self.process_matches(text, &filtered_matches);

        let duration_ms = start.elapsed().as_millis() as u64;

        log::info!(
            "CORRECTION chars={} corrections={} duration_ms={}",
            char_count,
            corrections.len(),
            duration_ms
        );

        Ok(CorrectionResult {
            corrections,
            corrected_text,
            lt_started: lt_just_started,
            duration_ms,
        })
    }

    /// Filter out matches for words in the ignore list
    fn filter_ignored_words(
        &self,
        matches: Vec<Match>,
        ignored_words: &[String],
        original_text: &str,
    ) -> Vec<Match> {
        if ignored_words.is_empty() {
            return matches;
        }

        matches
            .into_iter()
            .filter(|m| {
                // Get the word from the original text using offset and length
                let chars: Vec<char> = original_text.chars().collect();
                if m.offset + m.length > chars.len() {
                    return true; // Keep if we can't extract
                }
                let word: String = chars[m.offset..m.offset + m.length].iter().collect();
                let word_lower = word.to_lowercase();

                // Check if word is in the ignore list (case-insensitive)
                !ignored_words
                    .iter()
                    .any(|ignored| ignored.to_lowercase() == word_lower)
            })
            .collect()
    }

    /// Process matches into corrections and compute the corrected text
    fn process_matches(&self, original_text: &str, matches: &[Match]) -> (Vec<Correction>, String) {
        let mut corrections = Vec::new();
        let chars: Vec<char> = original_text.chars().collect();

        for m in matches {
            // Extract original word from text
            if m.offset + m.length > chars.len() {
                continue;
            }
            let original: String = chars[m.offset..m.offset + m.length].iter().collect();

            // Get the first replacement, or empty string if none
            let replacement = m
                .replacements
                .first()
                .map(|r| r.value.clone())
                .unwrap_or_default();

            // Only include if there's a replacement
            if !replacement.is_empty() {
                corrections.push(Correction {
                    offset: m.offset,
                    length: m.length,
                    original,
                    replacement,
                    message: m.message.clone(),
                    rule_id: m.rule.id.clone(),
                });
            }
        }

        // Sort by offset (descending) to apply from end to start
        let mut sorted_corrections = corrections.clone();
        sorted_corrections.sort_by(|a, b| b.offset.cmp(&a.offset));

        // Apply corrections to get corrected text
        let mut corrected = original_text.to_string();
        for c in &sorted_corrections {
            // Convert char offset to byte offset
            let byte_offset = original_text
                .char_indices()
                .nth(c.offset)
                .map(|(i, _)| i)
                .unwrap_or(0);
            let byte_end = original_text
                .char_indices()
                .nth(c.offset + c.length)
                .map(|(i, _)| i)
                .unwrap_or(corrected.len());

            corrected = format!(
                "{}{}{}",
                &corrected[..byte_offset],
                c.replacement,
                &corrected[byte_end..]
            );
        }

        (corrections, corrected)
    }

}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_max_text_length() {
        assert_eq!(MAX_TEXT_LENGTH, 100_000);
    }

    #[test]
    fn test_filter_ignored_words() {
        let client = LtClient {
            client: Client::new(),
            port: 8081,
        };

        let original_text = "Tauri test";
        let matches = vec![
            Match {
                message: "test".to_string(),
                short_message: None,
                offset: 0,
                length: 5,
                replacements: vec![],
                context: super::super::types::Context {
                    text: "Tauri test".to_string(),
                    offset: 0,
                    length: 5,
                },
                rule: super::super::types::Rule {
                    id: "TEST".to_string(),
                    description: "Test".to_string(),
                    issue_type: None,
                    category: super::super::types::Category {
                        id: "TEST".to_string(),
                        name: "Test".to_string(),
                    },
                },
            },
        ];

        let ignored = vec!["Tauri".to_string()];
        let filtered = client.filter_ignored_words(matches, &ignored, original_text);
        assert_eq!(filtered.len(), 0);
    }

    #[test]
    fn test_process_matches() {
        let client = LtClient {
            client: Client::new(),
            port: 8081,
        };

        let original_text = "Je suis contant de vous voir.";
        let matches = vec![
            Match {
                message: "Erreur d'orthographe".to_string(),
                short_message: None,
                offset: 8,
                length: 7,
                replacements: vec![super::super::types::Replacement {
                    value: "content".to_string(),
                }],
                context: super::super::types::Context {
                    text: original_text.to_string(),
                    offset: 8,
                    length: 7,
                },
                rule: super::super::types::Rule {
                    id: "MORFOLOGIK_RULE_FR".to_string(),
                    description: "Règle morphologique".to_string(),
                    issue_type: None,
                    category: super::super::types::Category {
                        id: "TYPOS".to_string(),
                        name: "Orthographe".to_string(),
                    },
                },
            },
        ];

        let (corrections, corrected) = client.process_matches(original_text, &matches);
        assert_eq!(corrections.len(), 1);
        assert_eq!(corrections[0].original, "contant");
        assert_eq!(corrections[0].replacement, "content");
        assert_eq!(corrected, "Je suis content de vous voir.");
    }
}
