# Story 02 - Intégration backend Rust/Tauri

## Statut
- [x] Implémenté (2026-01-14)

## Objectif

Intégrer la gestion du processus LanguageTool dans le backend Rust. Le serveur démarre à la première correction et reste actif jusqu'à la fermeture de l'app.

## Contexte

Architecture simple : LT démarre quand on en a besoin et reste actif. Pas de gestion de timer complexe.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (WebView)                      │
├─────────────────────────────────────────────────────────────┤
│   invoke('correct_text', { text })                          │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  LT actif ?                                         │   │
│   │     OUI → Corriger directement                      │   │
│   │     NON → Démarrer LT → Attendre ready → Corriger   │   │
│   └─────────────────────────────────────────────────────┘   │
│        │                                                     │
│        ▼                                                     │
│   Retourner les corrections                                 │
└─────────────────────────────────────────────────────────────┘
```

## Spécifications détaillées

### 1. Structure du module Rust

```
src-tauri/
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── error.rs                # Types d'erreur centralisés
│   ├── languagetool/
│   │   ├── mod.rs
│   │   ├── manager.rs          # Gestion processus
│   │   └── client.rs           # Client HTTP vers LT
│   ├── dictionary/
│   │   ├── mod.rs
│   │   └── storage.rs
│   └── commands.rs
└── Cargo.toml
```

### 2. Dépendances Cargo.toml

```toml
[dependencies]
tauri = { version = "2.9" }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
tokio = { version = "1", features = ["process", "time", "sync", "rt"] }
thiserror = "2.0"  # Note: version 2.x depuis 2024
log = "0.4"
tauri-plugin-log = "2"
tauri-plugin-shell = "2"  # Pour ouvrir dossiers/URLs (Tauri 2.x)
chrono = "0.4"  # Pour timestamps dans les logs

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

### 3. Types d'erreur (error.rs)

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("LanguageTool error: {0}")]
    LanguageTool(String),

    #[error("Dictionary error: {0}")]
    Dictionary(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
```

### 4. Module languagetool/manager.rs

```rust
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::process::{Child, Command};  // IMPORTANT: tokio::process, pas std::process
use log::{info, warn, debug};
use crate::error::AppError;

const STARTUP_TIMEOUT: Duration = Duration::from_secs(5);
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_millis(100);
const MAX_TEXT_LENGTH: usize = 100_000; // ~100K caractères (pas bytes)

pub struct LTManager {
    process: Option<Child>,
    port: u16,
    resources_path: PathBuf,
}

impl LTManager {
    pub fn new(resources_path: PathBuf, port: u16) -> Self {
        Self {
            process: None,
            port,
            resources_path,
        }
    }

    /// Vérifie si LT est en cours d'exécution
    #[must_use]
    pub fn is_running(&mut self) -> bool {
        if let Some(ref mut child) = self.process {
            // try_wait() est non-bloquant
            match child.try_wait() {
                Ok(Some(_status)) => {
                    // Processus terminé
                    self.process = None;
                    false
                }
                Ok(None) => true, // Toujours en cours
                Err(e) => {
                    warn!("Error checking process status: {}", e);
                    self.process = None;
                    false
                }
            }
        } else {
            false
        }
    }

    /// Démarre LT si pas déjà en cours (async car tokio::process::Command)
    pub async fn start(&mut self) -> Result<(), AppError> {
        if self.is_running() {
            debug!("LT already running, skipping start");
            return Ok(());
        }

        info!("Starting LanguageTool server on port {}...", self.port);

        let java_path = self.resources_path
            .join("runtime")
            .join("bin")
            .join("java");

        let lt_jar = self.resources_path
            .join("languagetool")
            .join("languagetool-server.jar");

        if !java_path.exists() {
            return Err(AppError::LanguageTool(
                format!("Java not found at {:?}", java_path)
            ));
        }
        if !lt_jar.exists() {
            return Err(AppError::LanguageTool(
                format!("LanguageTool JAR not found at {:?}", lt_jar)
            ));
        }

        debug!("Java path: {:?}", java_path);
        debug!("LT JAR path: {:?}", lt_jar);

        let lt_jar_str = lt_jar.to_str()
            .ok_or_else(|| AppError::LanguageTool("Invalid JAR path (non-UTF8)".into()))?;

        // tokio::process::Command pour ne pas bloquer le runtime async
        let child = Command::new(&java_path)
            .args([
                "-Xms128m",
                "-Xmx256m",
                "-XX:+UseSerialGC",
                "-jar",
                lt_jar_str,
                "--port",
                &self.port.to_string(),
                "--allow-origin",
                "*",
            ])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .kill_on_drop(true)  // Important: tue le process si Child est droppé
            .spawn()
            .map_err(|e| AppError::LanguageTool(format!("Failed to start: {}", e)))?;

        // child.id() peut retourner None sur certaines plateformes
        let pid = child.id().unwrap_or(0);
        self.process = Some(child);

        info!("LanguageTool started with PID {}", pid);
        Ok(())
    }

    /// Attend que le serveur soit prêt
    pub async fn wait_ready(&self) -> Result<(), AppError> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/v2/languages", self.port);
        let start = Instant::now();

        while start.elapsed() < STARTUP_TIMEOUT {
            match client.get(&url).send().await {
                Ok(resp) if resp.status().is_success() => {
                    info!("LanguageTool ready in {:?}", start.elapsed());
                    return Ok(());
                }
                _ => {
                    tokio::time::sleep(HEALTH_CHECK_INTERVAL).await;
                }
            }
        }

        Err(AppError::LanguageTool(format!(
            "Server not ready after {:?}",
            STARTUP_TIMEOUT
        )))
    }

    /// Arrête le serveur proprement (async)
    pub async fn stop(&mut self) {
        if let Some(mut child) = self.process.take() {
            info!("Stopping LanguageTool server...");
            // kill() est async avec tokio::process
            if let Err(e) = child.kill().await {
                warn!("Failed to kill LT process: {}", e);
            }
            info!("LanguageTool stopped");
        }
    }

    /// Démarre LT si nécessaire, attend qu'il soit prêt
    pub async fn ensure_ready(&mut self) -> Result<bool, AppError> {
        let was_running = self.is_running();

        if !was_running {
            self.start().await?;
            self.wait_ready().await?;
        }

        Ok(!was_running)
    }

    #[must_use]
    pub fn port(&self) -> u16 {
        self.port
    }
}

// Note: Pas de Drop personnalisé car kill_on_drop(true) gère le cleanup.
// Si un shutdown explicite est nécessaire, appeler stop() dans le lifecycle Tauri.
```

### 5. Module languagetool/client.rs

```rust
use std::time::Duration;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use log::debug;
use crate::error::AppError;

const HTTP_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LTMatch {
    pub offset: usize,   // Offset en caractères Unicode (pas bytes)
    pub length: usize,   // Longueur en caractères Unicode (pas bytes)
    pub message: String,
    pub replacements: Vec<Replacement>,
    #[serde(default)]
    pub rule: Option<Rule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Replacement {
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckResponse {
    pub matches: Vec<LTMatch>,
}

pub struct LTClient {
    client: Client,
    base_url: String,
}

impl LTClient {
    pub fn new(port: u16) -> Result<Self, AppError> {
        // Client avec timeout pour éviter les blocages
        let client = Client::builder()
            .timeout(HTTP_TIMEOUT)
            .build()
            .map_err(|e| AppError::Http(e))?;

        Ok(Self {
            client,
            base_url: format!("http://127.0.0.1:{}", port),
        })
    }

    pub async fn check(
        &self,
        text: &str,
        language: &str,
    ) -> Result<Vec<LTMatch>, AppError> {
        let url = format!("{}/v2/check", self.base_url);

        debug!("Sending check request: {} chars, lang={}", text.chars().count(), language);
        let start = std::time::Instant::now();

        let params = [
            ("text", text),
            ("language", language),
        ];

        let response = self.client
            .post(&url)
            .form(&params)
            .send()
            .await?;

        debug!("LT response: {} in {:?}", response.status(), start.elapsed());

        if !response.status().is_success() {
            return Err(AppError::LanguageTool(format!(
                "API returned status {}",
                response.status()
            )));
        }

        let data: CheckResponse = response.json().await?;
        Ok(data.matches)
    }
}
```

### 6. Module languagetool/mod.rs

```rust
mod manager;
mod client;

pub use manager::LTManager;
pub use client::{LTClient, LTMatch, Replacement, Rule};
```

### 7. Commandes Tauri (commands.rs)

```rust
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;
use serde::Serialize;

use crate::error::AppError;
use crate::languagetool::{LTManager, LTClient, LTMatch};
use crate::dictionary::Dictionary;

pub struct AppState {
    pub lt_manager: Arc<RwLock<LTManager>>,
    pub lt_client: LTClient,
    pub dictionary: Arc<RwLock<Dictionary>>,
}

#[derive(Serialize)]
pub struct CorrectionResult {
    pub matches: Vec<LTMatch>,
    pub lt_started: bool,
}

#[tauri::command]
pub async fn correct_text(
    text: String,
    state: State<'_, AppState>,
) -> Result<CorrectionResult, AppError> {
    // Démarrer LT si nécessaire
    let lt_started = {
        let mut manager = state.lt_manager.write().await;
        manager.ensure_ready().await?
    };

    // Faire la correction
    let matches = state.lt_client.check(&text, "fr").await?;

    // Filtrer les mots du dictionnaire
    // Note: LT retourne des offsets en caractères, pas en bytes
    let filtered_matches = {
        let dictionary = state.dictionary.read().await;
        let chars: Vec<char> = text.chars().collect();

        matches
            .into_iter()
            .filter(|m| {
                // Extraire le mot en utilisant les indices de caractères
                if m.offset + m.length <= chars.len() {
                    let word: String = chars[m.offset..m.offset + m.length]
                        .iter()
                        .collect();
                    !dictionary.contains(&word)
                } else {
                    true // Garder si indices invalides
                }
            })
            .collect()
    };

    Ok(CorrectionResult {
        matches: filtered_matches,
        lt_started,
    })
}

#[tauri::command]
pub async fn get_lt_status(
    state: State<'_, AppState>,
) -> Result<bool, AppError> {
    let mut manager = state.lt_manager.write().await;
    Ok(manager.is_running())
}

#[tauri::command]
pub async fn add_to_dictionary(
    word: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let mut dictionary = state.dictionary.write().await;
    // Utilise la méthode atomique avec rollback automatique si save() échoue
    dictionary.add_word_and_save(&word)
}

#[tauri::command]
pub async fn remove_from_dictionary(
    word: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let mut dictionary = state.dictionary.write().await;
    // Utilise la méthode atomique avec rollback automatique si save() échoue
    dictionary.remove_word_and_save(&word)
}

#[tauri::command]
pub async fn get_dictionary(
    state: State<'_, AppState>,
) -> Result<Vec<String>, AppError> {
    let dictionary = state.dictionary.read().await;
    Ok(dictionary.words().to_vec())
}
```

### 8. Initialisation dans lib.rs

```rust
mod error;
mod languagetool;
mod dictionary;
mod commands;

use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::Manager;

use languagetool::{LTManager, LTClient};
use dictionary::Dictionary;
use commands::AppState;

const LT_PORT: u16 = 8081;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(setup_logging().build())
        .plugin(tauri_plugin_shell::init())  // Tauri 2.x : plugin shell séparé
        .setup(|app| {
            let resource_path = app.path()
                .resource_dir()
                .expect("Failed to get resource dir");

            // Manager LT (NE démarre PAS au lancement)
            let lt_manager = Arc::new(RwLock::new(
                LTManager::new(resource_path, LT_PORT)
            ));

            // Client HTTP (avec timeout)
            let lt_client = LTClient::new(LT_PORT)
                .expect("Failed to create HTTP client");

            // Dictionnaire
            let app_data = app.path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            let dictionary = Arc::new(RwLock::new(
                Dictionary::load(&app_data).unwrap_or_default()
            ));

            app.manage(AppState {
                lt_manager,
                lt_client,
                dictionary,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::correct_text,
            commands::get_lt_status,
            commands::add_to_dictionary,
            commands::remove_from_dictionary,
            commands::get_dictionary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running application");
}
```

### 9. Validation du texte et gestion d'erreurs

```rust
// Dans commands.rs, ajouter la validation
const MAX_TEXT_LENGTH: usize = 100_000; // 100K caractères Unicode

#[tauri::command]
pub async fn correct_text(
    text: String,
    state: State<'_, AppState>,
) -> Result<CorrectionResult, AppError> {
    // IMPORTANT: Compter les caractères Unicode, pas les bytes
    // "é" = 1 caractère mais 2 bytes en UTF-8
    let char_count = text.chars().count();

    // Validation de la taille
    if char_count > MAX_TEXT_LENGTH {
        return Err(AppError::LanguageTool(
            format!("Texte trop long ({} caractères, max {})", char_count, MAX_TEXT_LENGTH)
        ));
    }

    if text.trim().is_empty() {
        return Ok(CorrectionResult {
            matches: vec![],
            lt_started: false,
        });
    }

    // ... reste du code
}
```

**Note importante sur Unicode** : LanguageTool retourne des offsets en **caractères Unicode**, pas en bytes. Le frontend JavaScript utilise `[...text].length` qui compte aussi les caractères. Côté Rust, utiliser `text.chars().count()` et `text.chars().collect::<Vec<_>>()` pour indexer.

### 10. Messages d'erreur (côté Rust)

| Situation | Message | Action UI |
|-----------|---------|-----------|
| Texte trop long | `"Texte trop long (X caractères, max 100000)"` | Afficher erreur, pas de correction |
| LT ne démarre pas | `"LanguageTool n'a pas démarré après 5s"` | Proposer de réessayer |
| LT crash pendant correction | `"LanguageTool a crashé, redémarrage..."` | Relancer automatiquement 1x |
| Java introuvable | `"Java not found at [path]"` | Erreur fatale, vérifier installation |
| JAR introuvable | `"LanguageTool JAR not found at [path]"` | Erreur fatale, vérifier bundle |
| Port occupé | `"Port 8081 déjà utilisé"` | Essayer port suivant |
| HTTP timeout | `"API LanguageTool ne répond pas"` | Réessayer après 2s |

### 11. Récupération automatique si LT crash

```rust
// Dans commands.rs - correction avec retry
pub async fn correct_text(
    text: String,
    state: State<'_, AppState>,
) -> Result<CorrectionResult, AppError> {
    // Validation...

    // Première tentative
    match try_correct(&text, &state).await {
        Ok(result) => Ok(result),
        Err(e) => {
            // Si erreur HTTP, LT a peut-être crashé
            if matches!(e, AppError::Http(_)) {
                log::warn!("LT may have crashed, restarting...");

                // Forcer redémarrage (toutes les méthodes sont async maintenant)
                {
                    let mut manager = state.lt_manager.write().await;
                    manager.stop().await;
                    manager.start().await?;
                    manager.wait_ready().await?;
                }

                // Retry une fois
                try_correct(&text, &state).await
            } else {
                Err(e)
            }
        }
    }
}

async fn try_correct(text: &str, state: &State<'_, AppState>) -> Result<CorrectionResult, AppError> {
    let lt_started = {
        let mut manager = state.lt_manager.write().await;
        manager.ensure_ready().await?
    };

    let matches = state.lt_client.check(text, "fr").await?;
    // ... filtrage dictionnaire
    Ok(CorrectionResult { matches: filtered_matches, lt_started })
}
```

### 12. Système de Logging (Debug)

#### 12.1 Configuration avancée (tauri-plugin-log)

**Configuration complète dans lib.rs** :
```rust
use tauri_plugin_log::{Builder as LogBuilder, Target, TargetKind, TimezoneStrategy, RotationStrategy};
use log::LevelFilter;

fn setup_logging() -> tauri_plugin_log::Builder {
    LogBuilder::new()
        // Cibles de log (API v2 : utiliser .targets([...]))
        .targets([
            // Fichier principal
            Target::new(TargetKind::LogDir {
                file_name: Some("app.log".into())
            }),
            // Console (stdout) pour dev
            Target::new(TargetKind::Stdout),
            // WebView console (pour voir dans DevTools)
            Target::new(TargetKind::Webview),
        ])
        // Timezone local pour lisibilité
        .timezone_strategy(TimezoneStrategy::UseLocal)
        // Niveau global (ajuster si mode debug)
        .level(if is_debug_mode() { LevelFilter::Debug } else { LevelFilter::Info })
        // Niveaux par module (debug granulaire)
        .level_for("azetextcorrector::languagetool", LevelFilter::Debug)
        .level_for("azetextcorrector::dictionary", LevelFilter::Debug)
        .level_for("reqwest", LevelFilter::Warn)  // Réduire le bruit HTTP
        .level_for("hyper", LevelFilter::Warn)
        // Rotation des logs (max fichiers de 2MB)
        .max_file_size(2_000_000)  // 2MB
        .rotation_strategy(RotationStrategy::KeepAll)
}

fn is_debug_mode() -> bool {
    std::env::var("AZETEXTCORRECTOR_DEBUG").is_ok()
        || cfg!(debug_assertions)
}

// Dans run()
.plugin(setup_logging().build())
```

**Note** : tauri-plugin-log 2.x utilise `.targets([...])` au lieu de chaîner `.target()`. Le format de log par défaut inclut déjà timestamp, niveau et module.

#### 12.2 Emplacement des logs

| OS | Chemin | Commande pour ouvrir |
|----|--------|---------------------|
| macOS | `~/Library/Logs/com.azetextcorrector.app/` | `open ~/Library/Logs/com.azetextcorrector.app/` |
| Windows | `%LOCALAPPDATA%\com.azetextcorrector.app\logs\` | `explorer %LOCALAPPDATA%\com.azetextcorrector.app\logs` |
| Linux | `~/.local/share/com.azetextcorrector.app/logs/` | `xdg-open ~/.local/share/com.azetextcorrector.app/logs/` |

**Structure des fichiers** :
```
logs/
├── app.log          # Log courant
├── app.log.1        # Rotation précédente
├── app.log.2
└── ...
```

#### 12.3 Niveaux de log et quand les utiliser

| Niveau | Usage | Exemple |
|--------|-------|---------|
| `ERROR` | Erreur bloquante, action impossible | `LT failed to start`, `Dictionary corrupted` |
| `WARN` | Problème récupérable | `LT crashed, restarting...`, `Port occupied, trying next` |
| `INFO` | Événements importants | `LT started`, `Dictionary loaded (42 words)` |
| `DEBUG` | Détails pour debug | `HTTP request to LT`, `Filtering word: "Tauri"` |
| `TRACE` | Très verbeux (rarement) | `Entering function X`, `Loop iteration Y` |

#### 12.4 Macros de logging dans le code

```rust
use log::{error, warn, info, debug, trace};

// Dans languagetool/manager.rs
pub fn start(&mut self) -> Result<(), AppError> {
    info!("Starting LanguageTool on port {}...", self.port);
    debug!("Java path: {:?}", java_path);
    debug!("LT JAR path: {:?}", lt_jar);

    match Command::new(&java_path).args([...]).spawn() {
        Ok(child) => {
            info!("LT started with PID {} in {:?}", child.id(), start.elapsed());
            Ok(())
        }
        Err(e) => {
            error!("Failed to start LT: {}", e);
            error!("Java path was: {:?}", java_path);
            Err(AppError::LanguageTool(format!("Failed to start: {}", e)))
        }
    }
}

// Dans languagetool/client.rs
pub async fn check(&self, text: &str, language: &str) -> Result<Vec<LTMatch>, AppError> {
    debug!("Sending check request: {} chars, lang={}", text.len(), language);
    let start = std::time::Instant::now();

    let response = self.client.post(&url).form(&params).send().await?;

    debug!("LT response: {} in {:?}", response.status(), start.elapsed());

    if !response.status().is_success() {
        warn!("LT API error: {}", response.status());
        // ...
    }

    let data: CheckResponse = response.json().await?;
    info!("Found {} corrections", data.matches.len());

    Ok(data.matches)
}

// Dans dictionary/storage.rs
pub fn load(app_data_dir: &Path) -> Result<Self, AppError> {
    info!("Loading dictionary from {:?}", app_data_dir);

    if file_path.exists() {
        match serde_json::from_str::<Dictionary>(&content) {
            Ok(dict) => {
                info!("Dictionary loaded: {} words", dict.words.len());
                Ok(dict)
            }
            Err(e) => {
                warn!("Dictionary corrupted: {}, creating backup", e);
                // ...
            }
        }
    } else {
        debug!("No dictionary file, creating new one");
        Ok(Self::new(file_path))
    }
}

pub fn add_word(&mut self, word: &str) -> Result<(), AppError> {
    debug!("Adding word to dictionary: {:?}", word);
    // ... validation
    info!("Word added: {:?} (total: {} words)", word, self.words.len());
    Ok(())
}
```

#### 12.5 Mode Debug (variable d'environnement)

La fonction `is_debug_mode()` est déjà définie dans la section 12.1 et intégrée à la configuration du logger.

**Lancer en mode debug** :
```bash
# macOS/Linux
AZETEXTCORRECTOR_DEBUG=1 ./azeTextCorrector.app/Contents/MacOS/azeTextCorrector

# Windows
set AZETEXTCORRECTOR_DEBUG=1 && azeTextCorrector.exe
```

#### 12.6 Logs structurés pour analyse

Pour faciliter le parsing des logs (grep, analyse) :

```rust
// Format structuré pour les événements clés
info!(target: "metrics", "LT_START duration_ms={} pid={}", duration.as_millis(), pid);
info!(target: "metrics", "CORRECTION chars={} matches={} duration_ms={}",
    text.len(), matches.len(), duration.as_millis());
info!(target: "metrics", "DICTIONARY_LOAD words={} duration_ms={}",
    count, duration.as_millis());
```

**Analyser les métriques** :
```bash
# Temps de démarrage LT
grep "LT_START" app.log | awk -F'duration_ms=' '{print $2}' | awk '{print $1}'

# Temps moyen de correction
grep "CORRECTION" app.log | awk -F'duration_ms=' '{print $2}'
```

#### 12.7 Commande Tauri pour exporter les logs

```rust
// Dans commands.rs
use log::info;

#[tauri::command]
pub async fn get_log_path(app: tauri::AppHandle) -> Result<String, AppError> {
    // Tauri 2.x : app_log_dir() retourne Result<PathBuf, tauri::Error>
    // La conversion vers AppError est automatique grâce à #[from] tauri::Error
    let log_dir = app.path().app_log_dir()?;
    Ok(log_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn export_logs(app: tauri::AppHandle) -> Result<String, AppError> {
    let log_dir = app.path().app_log_dir()?;
    let download_dir = app.path().download_dir()?;
    let export_path = download_dir.join(format!(
        "azetextcorrector-logs-{}.txt",
        chrono::Local::now().format("%Y%m%d-%H%M%S")
    ));

    // Concatener tous les logs
    let mut content = String::new();
    for entry in std::fs::read_dir(&log_dir)? {
        let path = entry?.path();
        if path.extension().map_or(false, |e| e == "log") {
            content.push_str(&format!("\n=== {} ===\n", path.display()));
            content.push_str(&std::fs::read_to_string(&path)?);
        }
    }

    std::fs::write(&export_path, &content)?;
    info!("Logs exported to {:?}", export_path);

    Ok(export_path.to_string_lossy().to_string())
}
```

#### 12.8 Tableau récapitulatif des logs

| Module | Événement | Niveau | Message |
|--------|-----------|--------|---------|
| `languagetool::manager` | Démarrage LT | INFO | `Starting LanguageTool on port 8081...` |
| `languagetool::manager` | LT prêt | INFO | `LT started with PID 12345 in 2.3s` |
| `languagetool::manager` | LT crash | WARN | `LT process exited, restarting...` |
| `languagetool::manager` | Échec démarrage | ERROR | `Failed to start LT: Java not found` |
| `languagetool::client` | Requête HTTP | DEBUG | `Sending check request: 150 chars, lang=fr` |
| `languagetool::client` | Réponse HTTP | DEBUG | `LT response: 200 OK in 45ms` |
| `languagetool::client` | Erreur API | WARN | `LT API error: 500 Internal Server Error` |
| `dictionary` | Chargement | INFO | `Dictionary loaded: 42 words` |
| `dictionary` | Corruption | WARN | `Dictionary corrupted, creating backup` |
| `dictionary` | Ajout mot | DEBUG | `Adding word: "Tauri"` |
| `commands` | Correction | INFO | `Found 3 corrections` |
| `commands` | Texte trop long | WARN | `Text too long: 150000 chars` |
| `metrics` | Performance | INFO | `CORRECTION chars=500 matches=2 duration_ms=89` |

### 13. Gestion du port

```rust
// Dans manager.rs
impl LTManager {
    const PORT_RANGE: std::ops::Range<u16> = 8081..8090;

    pub fn find_available_port() -> Result<u16, AppError> {
        for port in Self::PORT_RANGE {
            if std::net::TcpListener::bind(("127.0.0.1", port)).is_ok() {
                return Ok(port);
            }
        }
        Err(AppError::LanguageTool(
            format!("No available port in range {:?}", Self::PORT_RANGE)
        ))
    }
}
```

## Diagramme de séquence

```
┌────────┐          ┌───────┐          ┌──────────┐          ┌────┐
│  User  │          │  UI   │          │  Tauri   │          │ LT │
└───┬────┘          └───┬───┘          └────┬─────┘          └──┬─┘
    │                   │                   │                   │
    │  ⌘↵ Corriger      │                   │                   │
    │──────────────────>│                   │                   │
    │                   │  correct_text()   │                   │
    │                   │──────────────────>│                   │
    │                   │                   │                   │
    │                   │                   │  is_running()?    │
    │                   │                   │  NON → start()    │
    │                   │                   │──────────────────>│
    │                   │                   │  wait_ready()     │
    │                   │                   │<─ ─ ─ ─ ─ ─ ─ ─ ─│
    │                   │                   │                   │
    │                   │                   │  POST /v2/check   │
    │                   │                   │──────────────────>│
    │                   │                   │  { matches }      │
    │                   │                   │<──────────────────│
    │                   │                   │                   │
    │                   │  { matches, lt_started: true }        │
    │                   │<──────────────────│                   │
    │  Texte corrigé    │                   │                   │
    │<──────────────────│                   │                   │
    │                   │                   │                   │
    │                   │      (LT reste actif)                 │
    │                   │                   │                   │
    │  Ferme l'app      │                   │                   │
    │──────────────────>│──────────────────>│                   │
    │                   │                   │  Drop → stop()    │
    │                   │                   │──────────────────>│ ✕
```

## Consommation RAM

| État | RAM estimée |
|------|-------------|
| App au démarrage (LT arrêté) | ~20-30 MB |
| Après première correction | ~200-250 MB |
| Reste stable jusqu'à fermeture | ~200-250 MB |

**Note** : La RAM n'est libérée qu'à la fermeture de l'app. C'est acceptable pour une app desktop - la complexité d'un timer d'inactivité ne vaut pas le gain.

## Critères d'acceptation

- [ ] LT **NE démarre PAS** au lancement de l'app
- [ ] LT démarre automatiquement à la première correction
- [ ] Le temps de démarrage est < 5s
- [ ] LT reste actif jusqu'à la fermeture de l'app
- [ ] Pas de crash si LT crash (détection via `try_wait`)
- [ ] Pas de process zombie (cleanup dans Drop)
- [ ] Les erreurs sont propagées correctement au frontend

## Tâches techniques

1. Créer `error.rs` avec types d'erreur
2. Implémenter `languagetool/manager.rs`
3. Implémenter `languagetool/client.rs`
4. Créer les commandes Tauri
5. Setup dans `lib.rs`
6. Tests manuels : démarrage, correction, fermeture app

## Dépendances

- Story 01 complétée (assets LT disponibles)
