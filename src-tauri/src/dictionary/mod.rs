//! Dictionary module for personal word list
//!
//! Handles persistence and management of user's custom dictionary
//! (words to ignore during spell check).

mod storage;

pub use storage::Dictionary;
