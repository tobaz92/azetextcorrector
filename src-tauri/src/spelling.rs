//! Suggestions orthographiques du correcteur natif de macOS (NSSpellChecker).
//!
//! La détection des fautes est faite par Grammalecte côté front ; macOS ne sert
//! qu'à proposer de meilleures corrections pour les mots inconnus et à repérer
//! ceux qui sont anglais (jargon technique à ne pas « franciser »).

use objc2_app_kit::NSSpellChecker;
use objc2_foundation::{NSInteger, NSRange, NSString};

const LANGUAGE: &str = "fr";
const ENGLISH: &str = "en";
const MAX_GUESSES: usize = 3;

/// Corrections proposées par macOS pour un mot, les plus probables d'abord.
pub fn guesses(word: &str) -> Vec<String> {
    let checker = NSSpellChecker::sharedSpellChecker();
    let text = NSString::from_str(word);
    let language = NSString::from_str(LANGUAGE);

    // None signifie « aucune proposition », pas une erreur.
    checker
        .guessesForWordRange_inString_language_inSpellDocumentWithTag(
            NSRange::new(0, text.length()),
            &text,
            Some(&language),
            0,
        )
        .map(|list| {
            list.iter()
                .take(MAX_GUESSES)
                .map(|guess| guess.to_string())
                .collect()
        })
        .unwrap_or_default()
}

/// Le mot est-il correct pour le dictionnaire anglais de macOS ?
pub fn is_english(word: &str) -> bool {
    let checker = NSSpellChecker::sharedSpellChecker();
    let text = NSString::from_str(word);
    let language = NSString::from_str(ENGLISH);
    let mut word_count: NSInteger = 0;

    // SAFETY: word_count pointe sur une variable locale valide pendant l'appel.
    let misspelled = unsafe {
        checker.checkSpellingOfString_startingAt_language_wrap_inSpellDocumentWithTag_wordCount(
            &text,
            0,
            Some(&language),
            false,
            0,
            &mut word_count,
        )
    };
    misspelled.length == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn suggests_accented_french_word() {
        assert!(guesses("fatiqué").contains(&"fatigué".to_string()));
    }

    #[test]
    fn recognizes_english_words_only() {
        assert!(is_english("payload"));
        assert!(!is_english("fatiqué"));
    }
}
