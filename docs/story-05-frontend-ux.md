# Story 05 - Interface utilisateur et expérience de correction

## Statut
- [ ] Non implémenté

## Objectif

Améliorer l'interface utilisateur pour une expérience de correction plus professionnelle et interactive, avec la possibilité d'ignorer des mots directement depuis le résultat.

## Problèmes actuels

1. **Couleur verte cliché** - Le `#00ff9f` fait "terminal hacker", pas pro
2. **Pas d'interaction** - On ne peut pas voir ce qui a changé
3. **Pas de feedback** - Impossible d'ignorer un mot depuis le résultat
4. **Textarea readonly** - Limite les interactions possibles

## Design System

### Palette de couleurs (évolution)

```css
:root {
  /* Background */
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --bg-tertiary: #1a1a1a;
  --bg-hover: #252525;

  /* Text */
  --text-primary: #e0e0e0;
  --text-secondary: #888888;
  --text-muted: #555555;

  /* Accents - Plus subtils que le vert */
  --accent-correction: #6b9fff;     /* Bleu doux pour les corrections */
  --accent-deletion: #ff6b6b40;     /* Rouge transparent pour suppressions */
  --accent-addition: #6b9fff20;     /* Bleu transparent pour ajouts */
  --accent-hover: #4a7fd9;

  /* Semantic */
  --success: #4ade80;
  --warning: #fbbf24;
  --error: #f87171;

  /* Border */
  --border-primary: #1a1a1a;
  --border-secondary: #2a2a2a;
}
```

### Typographie

```css
/* Police principale - déjà en place */
font-family: 'IBM Plex Mono', monospace;

/* Hiérarchie */
--font-size-sm: 12px;
--font-size-base: 14px;
--font-size-lg: 16px;
```

## Nouvelle architecture UI

### Vue principale avec corrections interactives

```
┌────────────────────────────────────────────────────────────────────┐
│  azeTextCorrector                                           [📖]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────┐  ┌────────────────────────────────┐ │
│  │                          │  │                                │ │
│  │  Le chat mange sa soupe  │  │  Le chat mange sa soupe        │ │
│  │  Il est très fatigué.    │  │  Il est très fatigué.          │ │
│  │                          │  │         ─────                   │ │
│  │                          │  │         fatigué  ← correction  │ │
│  │                          │  │                                │ │
│  └──────────────────────────┘  └────────────────────────────────┘ │
│                                                                    │
│  ────────────────────────────────────────────────────────────────  │
│  2 corrections                                          ⌘↵ | ⌘⇧C │
└────────────────────────────────────────────────────────────────────┘
```

### Panneau de sortie enrichi (contenteditable au lieu de textarea)

Le panneau droit devient un `div[contenteditable]` pour permettre :
- Mise en forme des corrections (highlight, tooltip)
- Clic droit contextuel
- Sélection de mots spécifiques

## Spécifications détaillées

### 1. Structure HTML mise à jour

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
      <div class="pane pane-input">
        <textarea id="input" placeholder="Texte à corriger..." spellcheck="false" autofocus></textarea>
      </div>
      <div class="pane pane-output">
        <div id="output" class="output-content" contenteditable="false"></div>
        <div id="output-placeholder" class="placeholder">Résultat...</div>
      </div>
    </div>

    <footer>
      <span class="status" id="status">prêt</span>
      <div class="shortcuts">
        <kbd>⌘↵</kbd> corriger
        <kbd>⌘⇧C</kbd> copier
        <kbd>⌘D</kbd> dictionnaire
      </div>
    </footer>
  </main>

  <!-- Context Menu -->
  <div id="context-menu" class="context-menu hidden">
    <button class="context-item" data-action="ignore">
      <span class="context-icon">📖</span>
      Ignorer ce mot
    </button>
    <button class="context-item" data-action="revert">
      <span class="context-icon">↩</span>
      Annuler la correction
    </button>
    <button class="context-item" data-action="copy">
      <span class="context-icon">📋</span>
      Copier
    </button>
  </div>

  <!-- Toast notifications -->
  <div id="toast-container" class="toast-container"></div>

  <!-- Dictionary panel (from story-03) -->
  <aside id="dictionary-panel" class="panel hidden">
    <!-- ... contenu story-03 ... -->
  </aside>

  <script src="script.js"></script>
  <script src="dictionary.js"></script>
</body>
</html>
```

### 2. Affichage des corrections

Chaque correction est un `<span>` cliquable avec métadonnées :

```html
<!-- Mot corrigé -->
<span class="correction"
      data-original="fatigue"
      data-offset="25"
      data-length="7"
      tabindex="0">
  fatigué
</span>

<!-- Mot supprimé (affiché barré puis masqué) -->
<span class="deletion" data-original="très ">très </span>

<!-- Texte normal -->
<span class="text">Le chat mange sa soupe. Il est </span>
```

### 3. CSS pour les corrections

```css
/* Output content */
.output-content {
  flex: 1;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  padding: 20px;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-y: auto;
}

.output-content:empty + .placeholder {
  display: block;
}

.placeholder {
  display: none;
  position: absolute;
  top: 20px;
  left: 20px;
  color: var(--text-muted);
  pointer-events: none;
}

/* Correction highlight */
.correction {
  background: var(--accent-addition);
  color: var(--accent-correction);
  border-radius: 2px;
  padding: 0 2px;
  cursor: pointer;
  transition: background 0.15s;
}

.correction:hover,
.correction:focus {
  background: var(--accent-correction);
  color: var(--bg-primary);
  outline: none;
}

/* Tooltip on hover - shows original */
.correction::after {
  content: attr(data-original);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
  margin-bottom: 4px;
}

.correction:hover::after {
  opacity: 1;
}

/* Correction revertie (ignorée) */
.correction.reverted {
  background: transparent;
  color: var(--text-primary);
  text-decoration: line-through;
  text-decoration-color: var(--text-muted);
}

/* Mot ignoré (ajouté au dictionnaire) */
.correction.ignored {
  background: transparent;
  color: var(--text-primary);
  cursor: default;
}

/* Context menu */
.context-menu {
  position: fixed;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  padding: 4px;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.context-menu.hidden {
  display: none;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.context-item:hover {
  background: var(--bg-hover);
}

.context-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

/* Toast notifications */
.toast-container {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: toast-in 0.2s ease;
}

.toast.success {
  border-left: 3px solid var(--success);
}

.toast.error {
  border-left: 3px solid var(--error);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 4. JavaScript - Rendu des corrections

```javascript
const { invoke } = window.__TAURI__.core;

class CorrectionManager {
  constructor() {
    this.input = document.getElementById('input');
    this.output = document.getElementById('output');
    this.status = document.getElementById('status');
    this.contextMenu = document.getElementById('context-menu');

    this.originalText = '';
    this.matches = [];
    this.activeCorrection = null;

    this.bindEvents();
  }

  bindEvents() {
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Context menu
    this.output.addEventListener('contextmenu', (e) => this.showContextMenu(e));
    document.addEventListener('click', () => this.hideContextMenu());

    // Actions context menu
    this.contextMenu.addEventListener('click', (e) => {
      const action = e.target.closest('.context-item')?.dataset.action;
      if (action) this.handleContextAction(action);
    });

    // Clic sur correction
    this.output.addEventListener('click', (e) => {
      const correction = e.target.closest('.correction');
      if (correction) this.selectCorrection(correction);
    });
  }

  async correct() {
    const text = this.input.value.trim();
    if (!text) return;

    this.originalText = text;
    this.setStatus('correction...', 'loading');

    try {
      const result = await invoke('correct_text', { text });
      this.matches = result.matches;
      this.renderOutput(text, result.matches);

      const n = result.matches.length;
      this.setStatus(
        n ? `${n} correction${n > 1 ? 's' : ''}` : 'aucune erreur',
        'done'
      );
    } catch (e) {
      this.setStatus('erreur', 'error');
      console.error('Correction failed:', e);
    }
  }

  renderOutput(text, matches) {
    if (!matches.length) {
      this.output.textContent = text;
      return;
    }

    // Convertir en tableau de chars pour gérer UTF-8
    const chars = [...text];
    const fragments = [];
    let lastIndex = 0;

    // Trier par offset
    const sorted = [...matches].sort((a, b) => a.offset - b.offset);

    sorted.forEach(match => {
      // Texte avant la correction
      if (match.offset > lastIndex) {
        const before = chars.slice(lastIndex, match.offset).join('');
        fragments.push({ type: 'text', content: before });
      }

      // Le mot original
      const original = chars.slice(match.offset, match.offset + match.length).join('');

      // Le remplacement
      const replacement = match.replacements?.[0]?.value || original;

      fragments.push({
        type: 'correction',
        original,
        replacement,
        offset: match.offset,
        length: match.length,
        message: match.message
      });

      lastIndex = match.offset + match.length;
    });

    // Texte restant
    if (lastIndex < chars.length) {
      fragments.push({ type: 'text', content: chars.slice(lastIndex).join('') });
    }

    // Render
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
        span.title = f.message;
        span.tabIndex = 0;
        this.output.appendChild(span);
      }
    });
  }

  showContextMenu(e) {
    const correction = e.target.closest('.correction');
    if (!correction) return;

    e.preventDefault();
    this.activeCorrection = correction;

    const menu = this.contextMenu;
    menu.classList.remove('hidden');

    // Position
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 150);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }

  hideContextMenu() {
    this.contextMenu.classList.add('hidden');
    this.activeCorrection = null;
  }

  async handleContextAction(action) {
    if (!this.activeCorrection) return;

    const correction = this.activeCorrection;
    const original = correction.dataset.original;

    switch (action) {
      case 'ignore':
        await this.ignoreWord(correction.textContent);
        correction.classList.add('ignored');
        correction.textContent = original;
        this.showToast(`"${original}" ajouté au dictionnaire`, 'success');
        break;

      case 'revert':
        correction.classList.add('reverted');
        correction.textContent = original;
        this.showToast('Correction annulée');
        break;

      case 'copy':
        navigator.clipboard.writeText(correction.textContent);
        this.showToast('Copié');
        break;
    }

    this.hideContextMenu();
  }

  async ignoreWord(word) {
    try {
      await invoke('add_to_dictionary', { word });
      // Rafraîchir le dictionnaire si ouvert
      window.dictionaryManager?.loadWords();
    } catch (e) {
      console.error('Failed to add word:', e);
      this.showToast('Erreur lors de l\'ajout', 'error');
    }
  }

  selectCorrection(correction) {
    // Double-clic pour ignorer rapidement
    // Simple clic pour sélectionner
    correction.focus();
  }

  copyOutput() {
    const text = this.output.textContent;
    if (!text) return;

    navigator.clipboard.writeText(text);
    this.setStatus('copié', 'done');
  }

  handleKeydown(e) {
    // ⌘↵ - Corriger
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      this.correct();
    }

    // ⌘⇧C - Copier
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
      if (document.activeElement !== this.input) {
        e.preventDefault();
        this.copyOutput();
      }
    }

    // Escape - Fermer context menu
    if (e.key === 'Escape') {
      this.hideContextMenu();
    }

    // Sur une correction sélectionnée
    const focused = document.activeElement;
    if (focused?.classList.contains('correction')) {
      // i - Ignorer
      if (e.key === 'i') {
        e.preventDefault();
        this.activeCorrection = focused;
        this.handleContextAction('ignore');
      }
      // r - Revert
      if (e.key === 'r') {
        e.preventDefault();
        this.activeCorrection = focused;
        this.handleContextAction('revert');
      }
    }
  }

  setStatus(text, state = '') {
    this.status.textContent = text;
    this.status.className = `status ${state}`;
  }

  showToast(message, type = '') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  window.correctionManager = new CorrectionManager();
});
```

## Interactions utilisateur

### Tableau des interactions

| Action | Déclencheur | Résultat |
|--------|-------------|----------|
| Corriger | `⌘↵` | Lance la correction |
| Copier résultat | `⌘⇧C` | Copie le texte corrigé |
| Ouvrir dictionnaire | `⌘D` | Toggle panneau |
| Menu contextuel | Clic droit sur correction | Affiche options |
| Ignorer mot | Menu > Ignorer / touche `i` | Ajoute au dictionnaire |
| Annuler correction | Menu > Annuler / touche `r` | Remet le mot original |
| Focus correction | Clic sur mot bleu | Sélectionne |
| Voir original | Hover sur correction | Tooltip avec mot original |

### Flux "Ignorer un mot"

```
┌─────────────────┐
│ Clic droit sur  │
│ "fatigué"       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Context menu   │
│  ┌───────────┐  │
│  │ 📖 Ignorer │◄─── Clic
│  │ ↩ Annuler │  │
│  │ 📋 Copier  │  │
│  └───────────┘  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ invoke('add_to_ │
│ dictionary')    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Toast: "fatigué"│
│ ajouté au dict. │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mot affiché     │
│ sans highlight  │
│ (original)      │
└─────────────────┘
```

## État de chargement (Loading)

### Spinner pendant la correction

```css
/* Loading spinner */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 10, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.loading-overlay.active {
  opacity: 1;
  pointer-events: auto;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--border-secondary);
  border-top-color: var(--accent-correction);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Message de chargement */
.loading-message {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}
```

### Messages de chargement

| État | Message |
|------|---------|
| Première correction | "Démarrage de LanguageTool..." |
| Correction en cours | "Correction..." |
| Texte long (> 10000 chars) | "Analyse en cours (texte long)..." |

```javascript
setLoadingMessage(text) {
  const chars = text.length;
  if (!this.ltStarted) {
    return "Démarrage de LanguageTool...";
  }
  if (chars > 10000) {
    return "Analyse en cours (texte long)...";
  }
  return "Correction...";
}
```

## Limites de texte (côté UI)

### Constantes

```javascript
const TEXT_LIMITS = {
  MAX_LENGTH: 100000,        // Correspond au backend
  WARNING_LENGTH: 50000,     // Afficher un warning
  PERFORMANCE_LENGTH: 10000, // Au-delà, warning performance
};
```

### Validation côté UI

```javascript
validateText(text) {
  const length = text.length;
  const charCount = [...text].length; // Compte Unicode correct

  if (length > TEXT_LIMITS.MAX_LENGTH) {
    this.showToast(
      `Texte trop long (${charCount.toLocaleString()} caractères, max ${TEXT_LIMITS.MAX_LENGTH.toLocaleString()})`,
      'error'
    );
    return false;
  }

  if (length > TEXT_LIMITS.WARNING_LENGTH) {
    this.showToast(
      `Texte long - la correction peut prendre quelques secondes`,
      'warning'
    );
  }

  return true;
}
```

### Compteur de caractères (optionnel)

```html
<footer>
  <span class="status" id="status">prêt</span>
  <span class="char-count" id="char-count">0 / 100 000</span>
  <!-- ... -->
</footer>
```

```javascript
updateCharCount() {
  const count = [...this.input.value].length;
  const max = TEXT_LIMITS.MAX_LENGTH;
  const el = document.getElementById('char-count');

  el.textContent = `${count.toLocaleString()} / ${max.toLocaleString()}`;
  el.classList.toggle('warning', count > TEXT_LIMITS.WARNING_LENGTH);
  el.classList.toggle('error', count > max);
}
```

## Accessibilité (a11y)

### Attributs ARIA

```html
<!-- Zone de saisie -->
<textarea
  id="input"
  aria-label="Texte à corriger"
  aria-describedby="input-hint"
  spellcheck="false"
></textarea>
<span id="input-hint" class="sr-only">
  Saisissez le texte à corriger, puis appuyez sur Commande+Entrée
</span>

<!-- Zone de résultat -->
<div
  id="output"
  role="region"
  aria-label="Texte corrigé"
  aria-live="polite"
  aria-atomic="false"
></div>

<!-- Correction individuelle -->
<span
  class="correction"
  role="button"
  aria-label="Correction: 'fatigué' remplace 'fatiqué'"
  tabindex="0"
>
  fatigué
</span>

<!-- Menu contextuel -->
<div
  id="context-menu"
  role="menu"
  aria-label="Actions sur la correction"
>
  <button role="menuitem" data-action="ignore">
    Ignorer ce mot
  </button>
  <!-- ... -->
</div>

<!-- Toast -->
<div
  role="status"
  aria-live="polite"
  class="toast"
>
  "fatigué" ajouté au dictionnaire
</div>
```

### Navigation clavier

| Touche | Action |
|--------|--------|
| `Tab` | Naviguer entre input, output, boutons |
| `Enter` sur correction | Ouvrir menu contextuel |
| `Escape` | Fermer menu / panneau dictionnaire |
| `↑` / `↓` dans menu | Naviguer les options |
| `i` sur correction focusée | Ignorer |
| `r` sur correction focusée | Annuler |

### Classe utilitaire sr-only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Contraste des couleurs

| Élément | Foreground | Background | Ratio |
|---------|------------|------------|-------|
| Texte normal | #e0e0e0 | #0a0a0a | 14.3:1 ✅ |
| Correction | #6b9fff | #0a0a0a | 7.2:1 ✅ |
| Correction hover | #0a0a0a | #6b9fff | 7.2:1 ✅ |
| Texte secondaire | #888888 | #0a0a0a | 5.9:1 ✅ |
| Placeholder | #555555 | #0f0f0f | 3.5:1 ⚠️ (décoratif OK) |

Tous les éléments interactifs respectent WCAG AA (4.5:1 minimum).

## Mobile et touch

### Responsive design

```css
@media (max-width: 600px) {
  .editor {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .pane {
    border-right: none;
    border-bottom: 1px solid var(--border-primary);
  }

  .pane:last-child {
    border-bottom: none;
  }

  /* Menu contextuel adapté */
  .context-menu {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    border-radius: 12px 12px 0 0;
    padding: 8px;
    max-height: 50vh;
  }

  .context-item {
    padding: 14px 16px;
    font-size: 16px;
  }

  /* Masquer les raccourcis clavier */
  .shortcuts {
    display: none;
  }

  /* Footer simplifié */
  footer {
    padding: 12px 16px;
  }

  /* Panneau dictionnaire plein écran */
  .panel {
    width: 100%;
  }

  body.dictionary-open main {
    display: none; /* Masquer le contenu principal */
  }
}
```

### Gestion du touch

```javascript
// Long press pour menu contextuel (mobile)
let touchTimer = null;

this.output.addEventListener('touchstart', (e) => {
  const correction = e.target.closest('.correction');
  if (!correction) return;

  touchTimer = setTimeout(() => {
    this.activeCorrection = correction;
    this.showContextMenuMobile(correction);
  }, 500);
});

this.output.addEventListener('touchend', () => {
  clearTimeout(touchTimer);
});

this.output.addEventListener('touchmove', () => {
  clearTimeout(touchTimer);
});

showContextMenuMobile(correction) {
  const menu = this.contextMenu;
  menu.classList.remove('hidden');
  menu.classList.add('mobile');
  // Position en bas de l'écran (voir CSS)
}
```

### Touch targets

Tous les éléments interactifs ont une taille minimum de 44x44px sur mobile (recommandation Apple).

```css
@media (max-width: 600px) {
  .icon-btn {
    min-width: 44px;
    min-height: 44px;
  }

  .context-item {
    min-height: 44px;
  }

  .word-item .delete-btn {
    min-width: 44px;
    min-height: 44px;
  }
}
```

## Logging Frontend (Debug)

### Console JavaScript structurée

```javascript
// logger.js - Utilitaire de logging
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor(module) {
    this.module = module;
    this.level = this.getLogLevel();
  }

  getLogLevel() {
    // Récupérer depuis localStorage ou défaut
    const stored = localStorage.getItem('log_level');
    return stored ? parseInt(stored) : LOG_LEVELS.INFO;
  }

  setLevel(level) {
    localStorage.setItem('log_level', level);
    this.level = level;
  }

  format(level, message, data) {
    const timestamp = new Date().toISOString().substr(11, 12);
    const prefix = `[${timestamp}] [${this.module}]`;
    return data
      ? `${prefix} ${message}`
      : `${prefix} ${message}`;
  }

  debug(message, data) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.debug(`%c${this.format('DEBUG', message)}`, 'color: #888', data || '');
    }
  }

  info(message, data) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.info(`%c${this.format('INFO', message)}`, 'color: #6b9fff', data || '');
    }
  }

  warn(message, data) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(this.format('WARN', message), data || '');
    }
  }

  error(message, data) {
    console.error(this.format('ERROR', message), data || '');
  }

  // Mesure de performance
  time(label) {
    console.time(`[${this.module}] ${label}`);
  }

  timeEnd(label) {
    console.timeEnd(`[${this.module}] ${label}`);
  }

  // Grouper les logs
  group(label) {
    console.group(`[${this.module}] ${label}`);
  }

  groupEnd() {
    console.groupEnd();
  }
}

// Instances par module
const loggers = {
  correction: new Logger('Correction'),
  dictionary: new Logger('Dictionary'),
  ui: new Logger('UI'),
};

export default loggers;
```

### Utilisation dans le code

```javascript
import log from './logger.js';

// Dans CorrectionManager
class CorrectionManager {
  async correct() {
    const text = this.input.value.trim();

    log.correction.info(`Starting correction: ${text.length} chars`);
    log.correction.time('correction');

    try {
      const result = await invoke('correct_text', { text });

      log.correction.timeEnd('correction');
      log.correction.info(`Received ${result.matches.length} corrections`);

      if (result.lt_started) {
        log.correction.info('LanguageTool was started for this request');
      }

      log.correction.debug('Matches:', result.matches);

      this.renderOutput(text, result.matches);
    } catch (e) {
      log.correction.timeEnd('correction');
      log.correction.error('Correction failed', e);
      this.setStatus('erreur', 'error');
    }
  }

  renderOutput(text, matches) {
    log.ui.group('Rendering output');
    log.ui.debug(`Text length: ${text.length}`);
    log.ui.debug(`Matches count: ${matches.length}`);

    // ... rendering logic

    log.ui.groupEnd();
  }
}

// Dans DictionaryManager
class DictionaryManager {
  async addWord() {
    const word = this.newWordInput.value.trim();

    log.dictionary.info(`Adding word: "${word}"`);

    try {
      await invoke('add_to_dictionary', { word });
      log.dictionary.info(`Word added successfully`);
      await this.loadWords();
    } catch (e) {
      log.dictionary.error(`Failed to add word: "${word}"`, e);
    }
  }

  async loadWords() {
    log.dictionary.debug('Loading dictionary...');
    log.dictionary.time('load');

    try {
      const words = await invoke('get_dictionary');
      log.dictionary.timeEnd('load');
      log.dictionary.info(`Loaded ${words.length} words`);
      this.renderWords(words);
    } catch (e) {
      log.dictionary.timeEnd('load');
      log.dictionary.error('Failed to load dictionary', e);
    }
  }
}
```

### Activer le mode debug depuis DevTools

```javascript
// Dans la console du navigateur (DevTools)

// Voir tous les logs (y compris DEBUG)
localStorage.setItem('log_level', '0');
location.reload();

// Revenir au niveau INFO
localStorage.setItem('log_level', '1');
location.reload();

// Ou utiliser les commandes raccourcies
window.setDebugMode = (enabled) => {
  localStorage.setItem('log_level', enabled ? '0' : '1');
  console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}. Refresh to apply.`);
};

// Exporter les logs Rust (via Tauri)
window.exportLogs = async () => {
  const path = await window.__TAURI__.core.invoke('export_logs');
  console.log('Logs exported to:', path);
};

// Ouvrir le dossier des logs
// Note: Tauri 2.x - le plugin shell doit être activé côté Rust
window.openLogDir = async () => {
  const path = await window.__TAURI__.core.invoke('get_log_path');
  // API Tauri 2.x : import depuis @tauri-apps/plugin-shell
  const { open } = await import('@tauri-apps/plugin-shell');
  await open(path);
};
```

### Affichage des logs Rust dans DevTools

Grâce à `TargetKind::Webview` dans la config Rust, les logs backend apparaissent dans la console DevTools :

```
[2025-01-14 10:30:15.123 INFO azetextcorrector::languagetool::manager:42] Starting LanguageTool on port 8081...
[2025-01-14 10:30:17.456 INFO azetextcorrector::languagetool::manager:58] LT started with PID 12345 in 2.33s
[2025-01-14 10:30:18.789 DEBUG azetextcorrector::languagetool::client:25] Sending check request: 150 chars, lang=fr
```

### Ouvrir DevTools en mode debug

**macOS** :
- `Cmd + Option + I` dans l'app
- Ou lancer avec : `WEBKIT_INSPECTOR_HTTP_SERVER=0.0.0.0:9221`

**tauri.conf.json** - Activer DevTools en dev :
```json
{
  "build": {
    "devPath": "http://localhost:5173",
    "devUrl": "http://localhost:5173"
  },
  "app": {
    "withGlobalTauri": true
  },
  "bundle": {
    "macOS": {
      "exceptionDomain": "localhost"
    }
  }
}
```

### Menu d'aide avec accès aux logs (UI)

```html
<!-- Dans le footer ou menu aide -->
<div class="debug-menu" id="debug-menu">
  <button onclick="window.exportLogs()">Exporter les logs</button>
  <button onclick="window.openLogDir()">Ouvrir dossier logs</button>
  <label>
    <input type="checkbox" id="debug-mode-toggle" onchange="window.setDebugMode(this.checked)">
    Mode debug
  </label>
</div>
```

```css
/* Masqué par défaut, visible avec raccourci */
.debug-menu {
  display: none;
  position: fixed;
  bottom: 40px;
  right: 20px;
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-secondary);
}

.debug-menu.visible {
  display: block;
}
```

```javascript
// Ctrl+Shift+D pour afficher le menu debug
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    document.getElementById('debug-menu').classList.toggle('visible');
  }
});
```

## Critères d'acceptation

- [ ] Le résultat affiche les corrections en surbrillance (pas vert)
- [ ] Hover sur correction montre le mot original
- [ ] Clic droit ouvre le menu contextuel
- [ ] "Ignorer" ajoute au dictionnaire et met à jour l'affichage
- [ ] "Annuler" remet le mot original avec style barré
- [ ] Toast de confirmation après action
- [ ] Raccourcis `i` et `r` fonctionnent sur correction focusée
- [ ] Le texte copié est le résultat final (avec corrections appliquées)
- [ ] Responsive sur mobile (menu adapté)
- [ ] **Loading spinner pendant la première correction**
- [ ] **Message adapté si LT démarre / texte long**
- [ ] **Validation de la taille du texte côté UI**
- [ ] **Navigation clavier complète (Tab, Enter, Escape)**
- [ ] **Attributs ARIA pour lecteurs d'écran**
- [ ] **Long press sur mobile pour menu contextuel**
- [ ] **Touch targets 44x44px minimum**

## Tâches techniques

1. Mettre à jour `style.css` avec le nouveau design system
2. Remplacer le textarea output par un div contenteditable
3. Implémenter `renderOutput()` avec fragments
4. Ajouter le context menu HTML/CSS/JS
5. Implémenter les toasts
6. Ajouter les raccourcis `i` et `r`
7. Tester les interactions
8. Optimiser pour textes longs (virtualisation si nécessaire)

## Améliorations futures (hors scope v1)

- Diff side-by-side avec lignes connectées
- Historique des corrections
- Statistiques (mots les plus corrigés)
- Mode "accepter tout" / "rejeter tout"
- Export vers Word/PDF

## Dépendances

- Story 02 complétée (backend Tauri)
- Story 03 complétée (dictionnaire)
