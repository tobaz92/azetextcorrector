//! LanguageTool API types
//!
//! These types match the LanguageTool HTTP API response format.

use serde::{Deserialize, Serialize};

/// Response from /v2/check endpoint
#[derive(Debug, Deserialize, Serialize)]
pub struct CheckResponse {
    /// Detected language
    pub language: Language,
    /// List of matches (corrections)
    pub matches: Vec<Match>,
}

/// Detected language info
#[derive(Debug, Deserialize, Serialize)]
pub struct Language {
    /// Language name (e.g., "French")
    pub name: String,
    /// Language code (e.g., "fr")
    pub code: String,
    /// Detected language info
    #[serde(rename = "detectedLanguage")]
    pub detected_language: Option<DetectedLanguage>,
}

/// Detected language details
#[derive(Debug, Deserialize, Serialize)]
pub struct DetectedLanguage {
    /// Language name
    pub name: String,
    /// Language code
    pub code: String,
    /// Confidence score (0-1)
    pub confidence: Option<f64>,
}

/// A single match (correction suggestion)
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Match {
    /// Error message
    pub message: String,
    /// Short message (optional)
    #[serde(rename = "shortMessage")]
    pub short_message: Option<String>,
    /// Character offset in the original text
    pub offset: usize,
    /// Length of the error in characters
    pub length: usize,
    /// Replacement suggestions
    pub replacements: Vec<Replacement>,
    /// Context around the error
    pub context: Context,
    /// Rule that triggered this match
    pub rule: Rule,
}

/// Replacement suggestion
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Replacement {
    /// Suggested replacement value
    pub value: String,
}

/// Context around the error
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Context {
    /// Text around the error
    pub text: String,
    /// Offset within context
    pub offset: usize,
    /// Length within context
    pub length: usize,
}

/// Rule information
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Rule {
    /// Rule ID
    pub id: String,
    /// Rule description
    pub description: String,
    /// Issue type
    #[serde(rename = "issueType")]
    pub issue_type: Option<String>,
    /// Category
    pub category: Category,
}

/// Rule category
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Category {
    /// Category ID
    pub id: String,
    /// Category name
    pub name: String,
}

/// A simplified correction for the frontend
#[derive(Debug, Clone, Serialize)]
pub struct Correction {
    /// Character offset in the original text
    pub offset: usize,
    /// Length of the error in characters
    pub length: usize,
    /// Original text (the error)
    pub original: String,
    /// Suggested replacement
    pub replacement: String,
    /// Error message
    pub message: String,
    /// Rule ID that triggered this correction
    pub rule_id: String,
}

/// Correction result sent to frontend
#[derive(Debug, Serialize)]
pub struct CorrectionResult {
    /// List of corrections (simplified for frontend)
    pub corrections: Vec<Correction>,
    /// The corrected text (with all corrections applied)
    pub corrected_text: String,
    /// Whether LT was just started (first correction)
    pub lt_started: bool,
    /// Processing time in milliseconds
    pub duration_ms: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_match() {
        let json = r#"{
            "message": "Erreur d'orthographe",
            "offset": 0,
            "length": 5,
            "replacements": [{"value": "test"}],
            "context": {"text": "test context", "offset": 0, "length": 5},
            "rule": {
                "id": "MORFOLOGIK_RULE_FR",
                "description": "Règle morphologique",
                "category": {"id": "TYPOS", "name": "Orthographe"}
            }
        }"#;

        let m: Match = serde_json::from_str(json).unwrap();
        assert_eq!(m.offset, 0);
        assert_eq!(m.length, 5);
        assert_eq!(m.replacements.len(), 1);
    }
}
