# Story 05b - Éditeur principal

## Statut
- [x] Implémenté (2026-01-14)

## Objectif

Implémenter les deux panneaux de l'éditeur : zone de saisie (input) et zone de résultat (output).

## Dépendances

- Story 05a complétée (layout et design system)

## Structure HTML

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>azeTextCorrector</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="app-header">
    <span class="app-title">azeTextCorrector</span>
    <button id="toggle-dictionary" class="icon-btn" title="Dictionnaire (⌘D)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    </button>
  </header>

  <main>
    <div class="editor">
      <!-- PANE INPUT -->
      <div class="pane pane-input">
        <div class="pane-header">
          <span class="pane-label">Texte original</span>
          <button class="icon-btn" id="clear-input" title="Effacer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <textarea
          id="input"
          class="editor-textarea"
          placeholder="Collez ou saisissez votre texte ici..."
          spellcheck="false"
          autofocus
          aria-label="Texte à corriger"
          aria-describedby="input-hint"
        ></textarea>
        <span id="input-hint" class="sr-only">
          Saisissez le texte à corriger, puis appuyez sur Commande+Entrée
        </span>
      </div>

      <!-- PANE OUTPUT -->
      <div class="pane pane-output">
        <div class="pane-header">
          <span class="pane-label">Texte corrigé</span>
          <button class="icon-btn" id="copy-output" title="Copier (⌘⇧C)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
        <div class="output-wrapper">
          <div
            id="output"
            class="output-content"
            role="region"
            aria-label="Texte corrigé"
            aria-live="polite"
          ></div>
          <div id="output-placeholder" class="placeholder">
            Le résultat apparaîtra ici...
          </div>
        </div>
      </div>
    </div>
  </main>

  <footer>
    <div class="footer-left">
      <span class="status" id="status">prêt</span>
      <span class="char-count" id="char-count"></span>
    </div>
    <div class="shortcuts">
      <span><kbd>⌘↵</kbd> corriger</span>
      <span><kbd>⌘⇧C</kbd> copier</span>
      <span><kbd>⌘D</kbd> dictionnaire</span>
    </div>
  </footer>

  <!-- Context Menu (voir story-05c) -->
  <div id="context-menu" class="context-menu hidden"></div>

  <!-- Toast container (voir story-05d) -->
  <div id="toast-container" class="toast-container"></div>

  <!-- Dictionary panel (voir story-03) -->
  <aside id="dictionary-panel" class="panel hidden"></aside>

  <script type="module" src="script.js"></script>
</body>
</html>
```

## Wireframes détaillés

### Pane Input - États

#### Vide (placeholder)
```
┌─────────────────────────────────────────────┐
│ Texte original                          [×] │
├─────────────────────────────────────────────┤
│                                             │
│  Collez ou saisissez votre texte ici...     │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│  (placeholder gris #555)                    │
│                                             │
│                                             │
│                                             │
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

#### Avec texte
```
┌─────────────────────────────────────────────┐
│ Texte original                          [×] │
├─────────────────────────────────────────────┤
│                                             │
│  Le chat est fatigue.                       │
│  Il mange sa soupe tranquilement.           │
│  █                                          │
│  (curseur clignotant)                       │
│                                             │
│                                             │
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

#### Focus (bordure accent)
```
┌─────────────────────────────────────────────┐
│ Texte original                          [×] │
╔═════════════════════════════════════════════╗
║                                             ║
║  Le chat est fatigue.█                      ║
║                                             ║
║  (bordure bleue --accent-primary)           ║
║                                             ║
║                                             ║
║                                             ║
║                                             ║
╚═════════════════════════════════════════════╝
```

### Pane Output - États

#### Vide (placeholder)
```
┌─────────────────────────────────────────────┐
│ Texte corrigé                          [📋] │
├─────────────────────────────────────────────┤
│                                             │
│  Le résultat apparaîtra ici...              │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░              │
│  (placeholder gris #555)                    │
│                                             │
│                                             │
│                                             │
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

#### Avec résultat (corrections)
```
┌─────────────────────────────────────────────┐
│ Texte corrigé                          [📋] │
├─────────────────────────────────────────────┤
│                                             │
│  Le chat est fatigué.                       │
│              ════════                       │
│              (bleu #6b9fff, cliquable)      │
│  Il mange sa soupe tranquillement.          │
│                      ══════════════         │
│                      (bleu #6b9fff)         │
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

#### Sans erreur
```
┌─────────────────────────────────────────────┐
│ Texte corrigé                          [📋] │
├─────────────────────────────────────────────┤
│                                             │
│  Le chat est fatigué.                       │
│  Il mange sa soupe tranquillement.          │
│                                             │
│  (texte identique à l'input, pas de        │
│   surbrillance = aucune correction)         │
│                                             │
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

## CSS Éditeur

```css
/* ===== PANE STRUCTURE ===== */
.pane {
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  min-height: 0;
}

.pane-input {
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

.pane-output {
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
}

/* ===== PANE HEADER ===== */
.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.pane-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ===== TEXTAREA INPUT ===== */
.editor-textarea {
  flex: 1;
  width: 100%;
  padding: var(--space-lg);
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  resize: none;
  outline: none;
}

.editor-textarea::placeholder {
  color: var(--text-muted);
}

/* Focus ring sur le pane, pas sur le textarea */
.pane-input:focus-within {
  box-shadow: inset 0 0 0 2px var(--border-focus);
}

/* ===== OUTPUT WRAPPER ===== */
.output-wrapper {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

/* ===== OUTPUT CONTENT ===== */
.output-content {
  height: 100%;
  padding: var(--space-lg);
  overflow-y: auto;
  font-family: inherit;
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Scrollbar style */
.output-content::-webkit-scrollbar {
  width: 8px;
}

.output-content::-webkit-scrollbar-track {
  background: transparent;
}

.output-content::-webkit-scrollbar-thumb {
  background: var(--border-secondary);
  border-radius: 4px;
}

.output-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* ===== PLACEHOLDER ===== */
.placeholder {
  position: absolute;
  top: var(--space-lg);
  left: var(--space-lg);
  color: var(--text-muted);
  pointer-events: none;
  transition: opacity var(--transition-base);
}

/* Masquer placeholder quand output a du contenu */
.output-content:not(:empty) + .placeholder {
  opacity: 0;
}

/* ===== FOOTER ===== */
footer {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  border-top: 1px solid var(--border-primary);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

/* ===== STATUS ===== */
.status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.status.loading::before {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid var(--border-secondary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.status.done {
  color: var(--success);
}

.status.error {
  color: var(--error);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== CHAR COUNT ===== */
.char-count {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.char-count.warning {
  color: var(--warning);
}

.char-count.error {
  color: var(--error);
}

/* ===== SHORTCUTS ===== */
.shortcuts {
  display: flex;
  gap: var(--space-lg);
}

.shortcuts span {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.shortcuts kbd {
  display: inline-block;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: var(--font-size-xs);
}
```

## JavaScript - Éditeur de base

```javascript
// script.js
// Tauri 2.x : Imports ES modules
import { invoke } from '@tauri-apps/api/core';

// Alternative si withGlobalTauri est activé dans tauri.conf.json :
// const { invoke } = window.__TAURI__.core;

// Limites de texte
const TEXT_LIMITS = {
  MAX_LENGTH: 100000,        // Max backend
  WARNING_LENGTH: 50000,     // Afficher warning
  PERFORMANCE_LENGTH: 10000, // Warning performance
};

class Editor {
  constructor() {
    this.input = document.getElementById('input');
    this.output = document.getElementById('output');
    this.status = document.getElementById('status');
    this.charCount = document.getElementById('char-count');
    this.clearBtn = document.getElementById('clear-input');
    this.copyBtn = document.getElementById('copy-output');

    this.originalText = '';
    this.matches = [];

    this.bindEvents();
    this.updateCharCount();
  }

  bindEvents() {
    // Input events
    this.input.addEventListener('input', () => this.onInput());

    // Boutons
    this.clearBtn.addEventListener('click', () => this.clearInput());
    this.copyBtn.addEventListener('click', () => this.copyOutput());

    // Raccourcis clavier globaux
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  onInput() {
    this.updateCharCount();
  }

  updateCharCount() {
    const text = this.input.value;
    const count = [...text].length; // Comptage Unicode correct
    const max = TEXT_LIMITS.MAX_LENGTH;

    // Afficher seulement si du texte
    if (count === 0) {
      this.charCount.textContent = '';
      return;
    }

    this.charCount.textContent = `${count.toLocaleString('fr-FR')}`;

    // Classes d'état
    this.charCount.classList.toggle('warning', count > TEXT_LIMITS.WARNING_LENGTH);
    this.charCount.classList.toggle('error', count > max);
  }

  validateText(text) {
    const length = [...text].length; // Comptage Unicode correct

    if (length > TEXT_LIMITS.MAX_LENGTH) {
      this.showToast(
        `Texte trop long (max ${TEXT_LIMITS.MAX_LENGTH.toLocaleString('fr-FR')} caractères)`,
        'error'
      );
      return false;
    }

    if (length > TEXT_LIMITS.WARNING_LENGTH) {
      this.showToast('Texte long - la correction peut prendre quelques secondes');
    }

    return true;
  }

  async correct() {
    const text = this.input.value.trim();
    if (!text) return;

    if (!this.validateText(text)) return;

    this.originalText = text;
    this.setStatus('correction...', 'loading');

    try {
      const result = await invoke('correct_text', { text });
      this.matches = result.matches;
      this.renderOutput(text, result.matches);

      const n = result.matches.length;
      this.setStatus(
        n ? `${n} correction${n > 1 ? 's' : ''}` : 'aucune erreur',
        n ? '' : 'done'
      );
    } catch (e) {
      this.setStatus('erreur', 'error');
      console.error('Correction failed:', e);
      this.showToast('Erreur lors de la correction', 'error');
    }
  }

  renderOutput(text, matches) {
    // Si pas de corrections, afficher le texte brut
    if (!matches.length) {
      this.output.textContent = text;
      return;
    }

    // Convertir en tableau de caractères (UTF-8)
    const chars = [...text];
    const fragments = [];
    let lastIndex = 0;

    // Trier par position
    const sorted = [...matches].sort((a, b) => a.offset - b.offset);

    sorted.forEach(match => {
      // Texte avant la correction
      if (match.offset > lastIndex) {
        const before = chars.slice(lastIndex, match.offset).join('');
        fragments.push({ type: 'text', content: before });
      }

      // Mot original
      const original = chars.slice(match.offset, match.offset + match.length).join('');

      // Remplacement (première suggestion)
      const replacement = match.replacements?.[0]?.value || original;

      fragments.push({
        type: 'correction',
        original,
        replacement,
        offset: match.offset,
        length: match.length,
        message: match.message,
        rule: match.rule?.id
      });

      lastIndex = match.offset + match.length;
    });

    // Texte restant
    if (lastIndex < chars.length) {
      fragments.push({ type: 'text', content: chars.slice(lastIndex).join('') });
    }

    // Render DOM
    this.output.innerHTML = '';
    fragments.forEach(f => {
      if (f.type === 'text') {
        const span = document.createElement('span');
        span.className = 'text';
        span.textContent = f.content;
        this.output.appendChild(span);
      } else {
        const span = document.createElement('span');
        span.className = 'correction';
        span.textContent = f.replacement;
        span.dataset.original = f.original;
        span.dataset.offset = f.offset;
        span.dataset.length = f.length;
        span.dataset.rule = f.rule || '';
        span.title = f.message;
        span.tabIndex = 0;
        span.setAttribute('role', 'button');
        span.setAttribute('aria-label',
          `Correction: "${f.replacement}" remplace "${f.original}"`
        );
        this.output.appendChild(span);
      }
    });
  }

  clearInput() {
    this.input.value = '';
    this.output.textContent = '';
    this.matches = [];
    this.updateCharCount();
    this.setStatus('prêt');
    this.input.focus();
  }

  copyOutput() {
    const text = this.output.textContent;
    if (!text) return;

    navigator.clipboard.writeText(text);
    this.setStatus('copié', 'done');

    // Reset status après 2s
    setTimeout(() => {
      if (this.status.textContent === 'copié') {
        this.setStatus('prêt');
      }
    }, 2000);
  }

  handleKeydown(e) {
    // Détection Mac : userAgentData (moderne) avec fallback userAgent
    const isMac = navigator.userAgentData?.platform === 'macOS'
      || /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
    const mod = isMac ? e.metaKey : e.ctrlKey;

    // ⌘↵ - Corriger
    if (mod && e.key === 'Enter') {
      e.preventDefault();
      this.correct();
      return;
    }

    // ⌘⇧C - Copier résultat
    if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
      // Ne pas interférer si on sélectionne du texte dans l'input
      if (document.activeElement !== this.input || !this.input.selectionStart) {
        e.preventDefault();
        this.copyOutput();
        return;
      }
    }

    // ⌘D - Toggle dictionnaire
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.toggleDictionary();
      return;
    }
  }

  toggleDictionary() {
    const panel = document.getElementById('dictionary-panel');
    panel?.classList.toggle('hidden');
    document.body.classList.toggle('dictionary-open');
  }

  setStatus(text, state = '') {
    this.status.textContent = text;
    this.status.className = `status ${state}`;
  }

  showToast(message, type = '') {
    // Implémentation dans story-05d
    console.log(`[Toast] ${type}: ${message}`);
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  window.editor = new Editor();
});
```

## Comportements détaillés

### Textarea Input

| Action | Comportement |
|--------|--------------|
| Focus | Bordure bleue sur le pane entier |
| Paste | Accepte texte brut uniquement |
| ⌘A | Sélectionne tout le texte |
| ⌘Z | Undo natif du browser |
| Scroll | Scrollbar invisible (style minimal) |

### Output

| État | Comportement |
|------|--------------|
| Vide | Affiche placeholder gris |
| Avec texte | Texte blanc, corrections en bleu |
| Hover correction | Fond bleu, texte inverse |
| Click correction | Ouvre context menu (story-05c) |

### Boutons header

| Bouton | Action | État disabled |
|--------|--------|---------------|
| Clear (×) | Vide input + output | Si input vide |
| Copy (📋) | Copie output | Si output vide |

### Compteur de caractères

| Seuil | Affichage |
|-------|-----------|
| 0 | Masqué |
| 1 - 50000 | Blanc (normal) |
| 50001 - 100000 | Orange (warning) |
| > 100000 | Rouge (erreur, bloque envoi) |

## Critères d'acceptation

- [ ] Textarea input avec placeholder
- [ ] Focus ring sur le pane (pas le textarea)
- [ ] Output avec placeholder quand vide
- [ ] Rendu des corrections avec spans cliquables
- [ ] Bouton clear fonctionne
- [ ] Bouton copy fonctionne
- [ ] Raccourcis clavier (⌘↵, ⌘⇧C, ⌘D)
- [ ] Compteur de caractères
- [ ] Validation de la taille du texte
- [ ] Status bar avec états (prêt, loading, done, error)
- [ ] Scrollbar stylisée

## Fichiers

- `web/index.html` - Structure complète
- `web/style.css` - Styles éditeur (ajout à story-05a)
- `web/script.js` - Classe Editor

## Dépendances

- Story 05a complétée (design system)
- Story 02 complétée (backend, commande `correct_text`)
