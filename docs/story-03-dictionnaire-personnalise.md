# Story 03 - Gestion du dictionnaire personnalisé (UX/UI)

## Statut
- [x] Implémenté (2026-01-14)

## Objectif

Permettre à l'utilisateur de gérer simplement une liste de mots à ignorer lors de la correction (noms propres, termes techniques, acronymes, etc.).

## User Stories

> En tant qu'utilisateur, je veux pouvoir ajouter un mot au dictionnaire pour qu'il ne soit plus signalé comme erreur.

> En tant qu'utilisateur, je veux pouvoir voir la liste de mes mots personnalisés.

> En tant qu'utilisateur, je veux pouvoir supprimer un mot de mon dictionnaire si je l'ai ajouté par erreur.

## Maquettes UI

### 1. Vue principale - Panneau latéral (fermé par défaut)

```
┌────────────────────────────────────────────────────────────┐
│  azeTextCorrector                                    [📖]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────────────┐ │
│  │                     │  │                             │ │
│  │   Texte original    │  │    Texte corrigé            │ │
│  │                     │  │                             │ │
│  │                     │  │                             │ │
│  └─────────────────────┘  └─────────────────────────────┘ │
│                                                            │
│  ────────────────────────────────────────────────────────  │
│  aucune erreur                                   ⌘↵ | ⌘⇧C │
└────────────────────────────────────────────────────────────┘

[📖] = Bouton pour ouvrir le dictionnaire (⌘D)
```

### 2. Panneau dictionnaire (ouvert)

```
┌────────────────────────────────────────────────────────────┐
│  azeTextCorrector                                    [📖]  │
├────────────────────────────────────────┬───────────────────┤
│                                        │                   │
│  ┌───────────────┐  ┌────────────────┐│    Dictionnaire   │
│  │               │  │                ││                   │
│  │ Texte original│  │ Texte corrigé  ││  ┌─────────────┐  │
│  │               │  │                ││  │ + mot...    │  │
│  │               │  │                ││  └─────────────┘  │
│  └───────────────┘  └────────────────┘│                   │
│                                        │  ┌─────────────┐  │
│  ─────────────────────────────────────│  │ Tauri     ✕ │  │
│  aucune erreur               ⌘↵ | ⌘⇧C │  │ macOS     ✕ │  │
│                                        │  │ API       ✕ │  │
│                                        │  └─────────────┘  │
│                                        │                   │
│                                        │  3 mots           │
└────────────────────────────────────────┴───────────────────┘
```

## Spécifications techniques

### 1. Structure du dictionnaire (JSON)

**Chemin** : `~/Library/Application Support/com.azetextcorrector.app/dictionary.json`

```json
{
  "version": 1,
  "words": ["Tauri", "macOS", "API", "OAuth", "WebSocket"],
  "updated_at": 1705312200
}
```

**Note** : Utiliser un timestamp Unix (i64) plutôt que chrono pour la simplicité.

### 2. Module Rust dictionary/storage.rs

```rust
use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::error::AppError;

const MAX_WORDS: usize = 10000;
const MAX_WORD_LENGTH: usize = 100; // Limite raisonnable pour un mot

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Dictionary {
    version: u32,
    words: Vec<String>,
    updated_at: i64,
    #[serde(skip)]
    file_path: PathBuf,
}

impl Dictionary {
    /// Charge le dictionnaire depuis le fichier ou crée un nouveau
    pub fn load(app_data_dir: &Path) -> Result<Self, AppError> {
        let file_path = app_data_dir.join("dictionary.json");

        if file_path.exists() {
            let content = fs::read_to_string(&file_path)?;
            let mut dict: Dictionary = serde_json::from_str(&content)?;
            dict.file_path = file_path;
            Ok(dict)
        } else {
            // Créer le répertoire si nécessaire
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent)?;
            }

            Ok(Self {
                version: 1,
                words: Vec::new(),
                updated_at: Self::now(),
                file_path,
            })
        }
    }

    /// Sauvegarde le dictionnaire
    pub fn save(&mut self) -> Result<(), AppError> {
        self.updated_at = Self::now();
        let content = serde_json::to_string_pretty(&self)?;
        fs::write(&self.file_path, content)?;
        Ok(())
    }

    /// Ajoute un mot (insensible à la casse pour la recherche)
    /// Note: Cette méthode modifie l'état en mémoire. Appeler save() après.
    pub fn add_word(&mut self, word: &str) -> Result<(), AppError> {
        let word = word.trim().to_string();

        if word.is_empty() {
            return Err(AppError::Dictionary("Le mot ne peut pas être vide".into()));
        }

        if word.chars().count() > MAX_WORD_LENGTH {
            return Err(AppError::Dictionary(
                format!("Mot trop long ({} caractères, max {})", word.chars().count(), MAX_WORD_LENGTH)
            ));
        }

        // Validation : pas de caractères de contrôle ou de newlines
        if word.chars().any(|c| c.is_control()) {
            return Err(AppError::Dictionary("Le mot contient des caractères invalides".into()));
        }

        if self.words.len() >= MAX_WORDS {
            return Err(AppError::Dictionary(
                format!("Limite du dictionnaire atteinte ({} mots)", MAX_WORDS)
            ));
        }

        // Éviter les doublons (insensible à la casse)
        if !self.contains(&word) {
            self.words.push(word);
            self.words.sort_by(|a, b| {
                a.to_lowercase().cmp(&b.to_lowercase())
            });
        }

        Ok(())
    }

    /// Ajoute un mot et sauvegarde atomiquement (rollback si échec)
    pub fn add_word_and_save(&mut self, word: &str) -> Result<(), AppError> {
        let word_trimmed = word.trim().to_string();

        // Ajouter le mot
        self.add_word(&word_trimmed)?;

        // Sauvegarder - rollback si échec
        if let Err(e) = self.save() {
            // Rollback : supprimer le mot ajouté
            let _ = self.remove_word(&word_trimmed);
            return Err(e);
        }

        Ok(())
    }

    /// Supprime un mot et sauvegarde atomiquement (rollback si échec)
    pub fn remove_word_and_save(&mut self, word: &str) -> Result<(), AppError> {
        let word_lower = word.to_lowercase();

        // Trouver le mot original avant suppression (pour rollback)
        let original_word = self.words
            .iter()
            .find(|w| w.to_lowercase() == word_lower)
            .cloned();

        // Supprimer le mot
        self.remove_word(word)?;

        // Sauvegarder - rollback si échec
        if let Err(e) = self.save() {
            // Rollback : remettre le mot
            if let Some(w) = original_word {
                self.words.push(w);
                self.words.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
            }
            return Err(e);
        }

        Ok(())
    }

    /// Supprime un mot (insensible à la casse Unicode)
    pub fn remove_word(&mut self, word: &str) -> Result<(), AppError> {
        let word_lower = word.to_lowercase();
        let initial_len = self.words.len();
        self.words.retain(|w| w.to_lowercase() != word_lower);

        if self.words.len() == initial_len {
            return Err(AppError::Dictionary("Word not found".into()));
        }

        Ok(())
    }

    /// Retourne une référence vers la liste des mots
    pub fn words(&self) -> &[String] {
        &self.words
    }

    /// Vérifie si un mot est dans le dictionnaire (insensible à la casse Unicode)
    pub fn contains(&self, word: &str) -> bool {
        let word_lower = word.to_lowercase();
        self.words.iter().any(|w| w.to_lowercase() == word_lower)
    }

    fn now() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
    }
}
```

### 2b. Gestion des corruptions et récupération

```rust
impl Dictionary {
    /// Charge le dictionnaire avec gestion des erreurs
    pub fn load(app_data_dir: &Path) -> Result<Self, AppError> {
        let file_path = app_data_dir.join("dictionary.json");

        if file_path.exists() {
            let content = fs::read_to_string(&file_path)?;

            // Tenter de parser
            match serde_json::from_str::<Dictionary>(&content) {
                Ok(mut dict) => {
                    dict.file_path = file_path;
                    // Valider et nettoyer les données
                    dict.sanitize();
                    Ok(dict)
                }
                Err(e) => {
                    // Fichier corrompu - créer une backup et recommencer
                    log::warn!("Dictionary corrupted: {}, creating backup", e);
                    Self::backup_corrupted(&file_path)?;
                    Ok(Self::new(file_path))
                }
            }
        } else {
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent)?;
            }
            Ok(Self::new(file_path))
        }
    }

    fn new(file_path: PathBuf) -> Self {
        Self {
            version: 1,
            words: Vec::new(),
            updated_at: Self::now(),
            file_path,
        }
    }

    /// Crée une backup du fichier corrompu
    fn backup_corrupted(path: &Path) -> Result<(), AppError> {
        let backup_name = format!(
            "dictionary.corrupted.{}.json",
            Self::now()
        );
        let backup_path = path.parent()
            .map(|p| p.join(&backup_name))
            .unwrap_or_else(|| PathBuf::from(&backup_name));

        // Conversion automatique std::io::Error -> AppError via #[from]
        fs::rename(path, &backup_path)?;

        log::info!("Corrupted dictionary backed up to {:?}", backup_path);
        Ok(())
    }

    /// Nettoie les données invalides après chargement
    fn sanitize(&mut self) {
        // Supprimer les mots vides, trop longs, ou avec caractères invalides
        self.words.retain(|w| {
            !w.trim().is_empty()
                && w.chars().count() <= MAX_WORD_LENGTH
                && !w.chars().any(|c| c.is_control())
        });

        // Supprimer les doublons (insensible à la casse)
        let mut seen = std::collections::HashSet::new();
        self.words.retain(|w| {
            let lower = w.to_lowercase();
            seen.insert(lower)
        });

        // Trier
        self.words.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    }
}
```

### 2c. Encodage et format

**Encodage** : UTF-8 (garanti par Rust String)

**Format JSON** :
- Version du schéma pour migration future
- Timestamp Unix pour traçabilité
- Tableau de strings pour simplicité

**Exemple fichier** :
```json
{
  "version": 1,
  "words": [
    "API",
    "OAuth",
    "Tauri",
    "macOS",
    "WebSocket"
  ],
  "updated_at": 1705312200
}
```

**Validation à l'ajout** :
- Mot non vide après trim
- Max 100 caractères
- Pas de caractères de contrôle (\\n, \\t, etc.)
- Pas de doublon (case-insensitive)
- Max 10000 mots au total

### 3. Module dictionary/mod.rs

```rust
mod storage;
pub use storage::Dictionary;
```

### 4. Composants Frontend

**Structure** :
```
web/
├── index.html
├── style.css
├── script.js
└── dictionary.js      # Module dictionnaire
```

### 5. HTML du panneau (index.html - ajouts)

```html
<!-- Bouton dans le header -->
<button id="toggle-dictionary" class="icon-btn" title="Dictionnaire (⌘D)">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
</button>

<!-- Panneau latéral -->
<aside id="dictionary-panel" class="panel hidden">
  <header class="panel-header">
    <h2>Dictionnaire</h2>
    <button id="close-panel" class="icon-btn" title="Fermer (Escape)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </header>

  <div class="panel-content">
    <div class="add-word">
      <input type="text" id="new-word" placeholder="Ajouter un mot..." maxlength="100">
      <button id="add-word-btn" class="btn-icon" title="Ajouter">+</button>
    </div>

    <ul id="word-list" class="word-list"></ul>
  </div>

  <footer class="panel-footer">
    <span id="word-count">0 mots</span>
  </footer>
</aside>
```

### 6. CSS du panneau (style.css - ajouts)

```css
/* Panneau latéral */
.panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: var(--bg-secondary, #1a1a1a);
  border-left: 1px solid var(--border-color, #333);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.2s ease;
  z-index: 100;
}

.panel:not(.hidden) {
  transform: translateX(0);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #333);
}

.panel-header h2 {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary, #fff);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* Ajout de mot */
.add-word {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.add-word input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  background: var(--bg-primary, #0d0d0d);
  color: var(--text-primary, #fff);
  font-size: 13px;
  font-family: inherit;
}

.add-word input:focus {
  outline: none;
  border-color: var(--accent-color, #4a9eff);
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  background: var(--bg-tertiary, #252525);
  color: var(--text-primary, #fff);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--bg-hover, #333);
}

/* Liste des mots */
.word-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.word-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.word-item:hover {
  background: var(--bg-hover, #252525);
}

.word-item .word {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 12px;
  color: var(--text-primary, #fff);
}

.word-item .delete-btn {
  opacity: 0;
  cursor: pointer;
  color: var(--text-secondary, #888);
  background: none;
  border: none;
  padding: 4px;
  transition: opacity 0.15s;
}

.word-item:hover .delete-btn {
  opacity: 1;
}

.word-item .delete-btn:hover {
  color: var(--error-color, #ff6b6b);
}

/* Footer */
.panel-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border-color, #333);
  font-size: 11px;
  color: var(--text-secondary, #888);
}

/* Icon button */
.icon-btn {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: var(--text-secondary, #888);
  border-radius: 4px;
}

.icon-btn:hover {
  background: var(--bg-hover, #252525);
  color: var(--text-primary, #fff);
}

/* Ajuster le main quand le panneau est ouvert */
body.dictionary-open main {
  margin-right: 240px;
}
```

### 7. JavaScript dictionary.js

```javascript
// Tauri 2.x : Imports ES modules
import { invoke } from '@tauri-apps/api/core';

// Alternative si withGlobalTauri est activé dans tauri.conf.json :
// const { invoke } = window.__TAURI__.core;

class DictionaryManager {
  constructor() {
    this.panel = document.getElementById('dictionary-panel');
    this.wordList = document.getElementById('word-list');
    this.wordCount = document.getElementById('word-count');
    this.newWordInput = document.getElementById('new-word');
    this.addBtn = document.getElementById('add-word-btn');
    this.toggleBtn = document.getElementById('toggle-dictionary');
    this.closeBtn = document.getElementById('close-panel');

    this.bindEvents();
    this.loadWords();
  }

  bindEvents() {
    // Toggle panneau
    this.toggleBtn?.addEventListener('click', () => this.toggle());
    this.closeBtn?.addEventListener('click', () => this.close());

    // Ajout de mot
    this.addBtn?.addEventListener('click', () => this.addWord());
    this.newWordInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addWord();
      }
    });

    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      // ⌘D pour toggle
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.toggle();
      }
      // Escape pour fermer
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.panel && !this.panel.classList.contains('hidden');
  }

  toggle() {
    if (!this.panel) return;

    this.panel.classList.toggle('hidden');
    document.body.classList.toggle('dictionary-open', this.isOpen());

    if (this.isOpen()) {
      this.newWordInput?.focus();
    }
  }

  close() {
    if (!this.panel) return;

    this.panel.classList.add('hidden');
    document.body.classList.remove('dictionary-open');
  }

  async loadWords() {
    try {
      const words = await invoke('get_dictionary');
      this.renderWords(words);
    } catch (e) {
      console.error('Failed to load dictionary:', e);
    }
  }

  renderWords(words) {
    if (!this.wordList) return;

    // Utiliser textContent pour éviter XSS
    this.wordList.innerHTML = '';

    words.forEach(word => {
      const li = document.createElement('li');
      li.className = 'word-item';

      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;

      const btn = document.createElement('button');
      btn.className = 'delete-btn';
      btn.textContent = '✕';
      btn.title = 'Supprimer';
      btn.addEventListener('click', () => this.removeWord(word));

      li.appendChild(span);
      li.appendChild(btn);
      this.wordList.appendChild(li);
    });

    if (this.wordCount) {
      this.wordCount.textContent = `${words.length} mot${words.length !== 1 ? 's' : ''}`;
    }
  }

  async addWord() {
    if (!this.newWordInput) return;

    const word = this.newWordInput.value.trim();
    if (!word) return;

    try {
      await invoke('add_to_dictionary', { word });
      this.newWordInput.value = '';
      await this.loadWords();
    } catch (e) {
      console.error('Failed to add word:', e);
      // Optionnel : afficher une erreur à l'utilisateur
    }
  }

  async removeWord(word) {
    try {
      await invoke('remove_from_dictionary', { word });
      await this.loadWords();
    } catch (e) {
      console.error('Failed to remove word:', e);
    }
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  window.dictionaryManager = new DictionaryManager();
});
```

## Interactions et raccourcis

| Action | Interaction | Raccourci |
|--------|-------------|-----------|
| Ouvrir/fermer dictionnaire | Clic sur icône livre | `⌘D` |
| Ajouter un mot | Saisir + clic + ou Enter | `Enter` |
| Supprimer un mot | Clic sur ✕ | - |
| Fermer panneau | Clic sur ✕ header | `Escape` |

## Critères d'acceptation

- [ ] Le panneau dictionnaire s'ouvre/ferme avec animation
- [ ] Les mots sont persistés entre les sessions
- [ ] Ajout de mot fonctionne (avec validation)
- [ ] Suppression de mot fonctionne
- [ ] Le compteur de mots est à jour
- [ ] Raccourcis `⌘D` et `Escape` fonctionnent
- [ ] Les mots du dictionnaire sont ignorés lors de la correction
- [ ] Limite de 10000 mots maximum
- [ ] L'UI reste cohérente avec le design existant

## Tâches techniques

1. Implémenter `dictionary/storage.rs`
2. Implémenter `dictionary/mod.rs`
3. Ajouter le HTML du panneau dans `index.html`
4. Ajouter les styles CSS dans `style.css`
5. Créer `dictionary.js`
6. Intégrer le filtrage dans `correct_text`
7. Tests manuels

## Améliorations futures (hors scope)

- Import/export du dictionnaire (JSON, TXT)
- Recherche dans la liste des mots
- Catégories de mots
- Sync cloud

## Dépendances

- Story 02 complétée (commandes Tauri en place)
