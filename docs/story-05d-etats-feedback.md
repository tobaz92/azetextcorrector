# Story 05d - États et feedback utilisateur

## Statut
- [x] Implémenté (2026-01-14)

## Objectif

Gérer tous les états de l'application (loading, erreur, succès) avec feedback visuel approprié, accessibilité et responsive design.

## Dépendances

- Story 05a, 05b, 05c complétées

## États de l'application

### Diagramme d'états

```
                    ┌─────────┐
                    │  IDLE   │ (prêt)
                    └────┬────┘
                         │
                    ⌘↵ (correct)
                         │
                         ▼
                    ┌─────────┐
                    │ LOADING │ (correction...)
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
         success      error      lt_starting
            │            │            │
            ▼            ▼            ▼
       ┌─────────┐  ┌─────────┐  ┌─────────────┐
       │ SUCCESS │  │  ERROR  │  │ LT_STARTING │
       │ (X corr)│  │ (erreur)│  │ (démarrage) │
       └────┬────┘  └────┬────┘  └──────┬──────┘
            │            │              │
            └────────────┴──────────────┘
                         │
                    (nouveau texte)
                         │
                         ▼
                    ┌─────────┐
                    │  IDLE   │
                    └─────────┘
```

## Wireframes - États visuels

### État Loading (correction en cours)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ azeTextCorrector                                                    [📖] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │  Le chat est fatigue.      │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │  Il mange sa soupe.        │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒  ◠◡◠  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │                            │    │▒▒▒▒  Correction...  ▒▒▒▒▒▒▒▒▒▒│   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  └────────────────────────────┘    └────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ◠ correction...                                          ⌘↵ | ⌘⇧C | ⌘D │
└──────────────────────────────────────────────────────────────────────────┘
```

### État Loading (démarrage LanguageTool)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ azeTextCorrector                                                    [📖] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │  Le chat est fatigue.      │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │  Il mange sa soupe.        │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒  ◠◡◠  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │                            │    │▒▒  Démarrage LanguageTool... ▒▒│   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  │                            │    │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│   │
│  └────────────────────────────┘    └────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ◠ démarrage...                                           ⌘↵ | ⌘⇧C | ⌘D │
└──────────────────────────────────────────────────────────────────────────┘
```

### État Erreur

```
┌──────────────────────────────────────────────────────────────────────────┐
│ azeTextCorrector                                                    [📖] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐   │
│  │                            │    │                                │   │
│  │  Le chat est fatigue.      │    │  ┌──────────────────────────┐  │   │
│  │  Il mange sa soupe.        │    │  │                          │  │   │
│  │                            │    │  │    ⚠ Erreur              │  │   │
│  │                            │    │  │                          │  │   │
│  │                            │    │  │  LanguageTool n'a pas    │  │   │
│  │                            │    │  │  pu démarrer.            │  │   │
│  │                            │    │  │                          │  │   │
│  │                            │    │  │     [ Réessayer ]        │  │   │
│  │                            │    │  │                          │  │   │
│  │                            │    │  └──────────────────────────┘  │   │
│  └────────────────────────────┘    └────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ✕ erreur                                                 ⌘↵ | ⌘⇧C | ⌘D │
└──────────────────────────────────────────────────────────────────────────┘
```

### Toast notifications

```
Position: centré horizontalement, 60px du bas

┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │
│       (contenu de l'application)        │
│                                         │
│                                         │
│                                         │
│                                         │
│     ┌───────────────────────────┐       │
│     │ ✓ "fatigué" ajouté        │       │
│     │   au dictionnaire         │       │
│     └───────────────────────────┘       │
│                                         │
│  status                    shortcuts    │
└─────────────────────────────────────────┘

Types de toast:
┌────────────────────────────────┐
│▌ ✓ Texte copié                 │  success (vert #4ade80)
└────────────────────────────────┘

┌────────────────────────────────┐
│▌ ⚠ Texte long - correction     │  warning (orange #fbbf24)
│▌   peut prendre du temps       │
└────────────────────────────────┘

┌────────────────────────────────┐
│▌ ✕ Erreur lors de l'ajout      │  error (rouge #f87171)
└────────────────────────────────┘
```

## HTML - Loading et Error

```html
<!-- Ajouter dans le pane-output -->
<div class="pane pane-output">
  <div class="pane-header">...</div>
  <div class="output-wrapper">
    <div id="output" class="output-content"></div>
    <div id="output-placeholder" class="placeholder">...</div>

    <!-- Loading overlay -->
    <div id="loading-overlay" class="loading-overlay hidden">
      <div class="loading-content">
        <div class="spinner"></div>
        <div class="loading-message" id="loading-message">Correction...</div>
      </div>
    </div>

    <!-- Error state -->
    <div id="error-state" class="error-state hidden">
      <div class="error-icon">⚠</div>
      <div class="error-title">Erreur</div>
      <div class="error-message" id="error-message">Une erreur s'est produite.</div>
      <button class="btn" id="retry-btn">Réessayer</button>
    </div>
  </div>
</div>

<!-- Toast container -->
<div id="toast-container" class="toast-container" role="status" aria-live="polite"></div>
```

## CSS - Loading, Error, Toasts

```css
/* ===== LOADING OVERLAY ===== */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 10, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--transition-base), visibility var(--transition-base);
}

.loading-overlay:not(.hidden) {
  opacity: 1;
  visibility: visible;
}

.loading-content {
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  margin: 0 auto var(--space-md);
  border: 2px solid var(--border-secondary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-message {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* ===== ERROR STATE ===== */
.error-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-xl);
  background: var(--bg-primary);
  z-index: 10;
}

.error-state.hidden {
  display: none;
}

.error-icon {
  font-size: 32px;
  color: var(--error);
}

.error-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.error-message {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  text-align: center;
  max-width: 280px;
}

.error-state .btn {
  margin-top: var(--space-md);
}

/* ===== TOAST CONTAINER ===== */
.toast-container {
  position: fixed;
  bottom: 60px; /* Au-dessus du footer */
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  pointer-events: none;
}

/* ===== TOAST ===== */
.toast {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  box-shadow: var(--shadow-md);
  border-left: 3px solid var(--border-secondary);
  animation: toast-in 0.25s ease;
  pointer-events: auto;
  max-width: 320px;
}

.toast.success {
  border-left-color: var(--success);
}

.toast.warning {
  border-left-color: var(--warning);
}

.toast.error {
  border-left-color: var(--error);
}

/* Animation d'entrée */
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

/* Animation de sortie */
.toast.leaving {
  animation: toast-out 0.2s ease forwards;
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

## JavaScript - Gestion des états

```javascript
// states.js - Gestion des états et toasts

const LOADING_MESSAGES = {
  DEFAULT: 'Correction...',
  LT_STARTING: 'Démarrage de LanguageTool...',
  LONG_TEXT: 'Analyse en cours (texte long)...',
};

class StateManager {
  constructor(editor) {
    this.editor = editor;
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.loadingMessage = document.getElementById('loading-message');
    this.errorState = document.getElementById('error-state');
    this.errorMessage = document.getElementById('error-message');
    this.retryBtn = document.getElementById('retry-btn');
    this.toastContainer = document.getElementById('toast-container');

    this.ltStarted = false;
    this.toastQueue = [];

    this.bindEvents();
  }

  bindEvents() {
    this.retryBtn.addEventListener('click', () => {
      this.hideError();
      this.editor.correct();
    });
  }

  // ===== LOADING =====

  showLoading(textLength = 0) {
    // Déterminer le message approprié
    let message = LOADING_MESSAGES.DEFAULT;

    if (!this.ltStarted) {
      message = LOADING_MESSAGES.LT_STARTING;
    } else if (textLength > 10000) {
      message = LOADING_MESSAGES.LONG_TEXT;
    }

    this.loadingMessage.textContent = message;
    this.loadingOverlay.classList.remove('hidden');
    this.hideError();
  }

  hideLoading() {
    this.loadingOverlay.classList.add('hidden');
  }

  setLtStarted(started) {
    this.ltStarted = started;
  }

  // ===== ERROR =====

  showError(message = 'Une erreur s\'est produite.') {
    this.hideLoading();
    this.errorMessage.textContent = message;
    this.errorState.classList.remove('hidden');
  }

  hideError() {
    this.errorState.classList.add('hidden');
  }

  // ===== TOASTS =====

  showToast(message, type = '', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');

    this.toastContainer.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 200);
    }, duration);

    return toast;
  }

  // Types helpers
  success(message, duration) {
    return this.showToast(message, 'success', duration);
  }

  warning(message, duration) {
    return this.showToast(message, 'warning', duration);
  }

  error(message, duration) {
    return this.showToast(message, 'error', duration);
  }
}

// Intégration dans Editor
class Editor {
  constructor() {
    // ... code existant ...
    this.stateManager = new StateManager(this);
  }

  async correct() {
    const text = this.input.value.trim();
    if (!text) return;

    if (!this.validateText(text)) return;

    this.originalText = text;
    this.setStatus('correction...', 'loading');
    this.stateManager.showLoading(text.length);

    try {
      const result = await invoke('correct_text', { text });

      // Mettre à jour l'état LT
      if (result.lt_started) {
        this.stateManager.setLtStarted(true);
      }

      this.stateManager.hideLoading();
      this.matches = result.matches;
      this.renderOutput(text, result.matches);

      const n = result.matches.length;
      this.setStatus(
        n ? `${n} correction${n > 1 ? 's' : ''}` : 'aucune erreur',
        n ? '' : 'done'
      );
    } catch (e) {
      console.error('Correction failed:', e);
      this.setStatus('erreur', 'error');

      // Message d'erreur adapté
      let errorMsg = 'Une erreur s\'est produite.';
      if (e.includes?.('timeout') || e.message?.includes?.('timeout')) {
        errorMsg = 'Le délai d\'attente a été dépassé. Réessayez.';
      } else if (e.includes?.('LT') || e.message?.includes?.('LanguageTool')) {
        errorMsg = 'LanguageTool n\'a pas pu démarrer.';
      }

      this.stateManager.showError(errorMsg);
    }
  }

  showToast(message, type) {
    return this.stateManager.showToast(message, type);
  }
}
```

## Accessibilité (a11y)

### Attributs ARIA complets

```html
<!-- Zone de saisie -->
<textarea
  id="input"
  aria-label="Texte à corriger"
  aria-describedby="input-hint"
  aria-invalid="false"
></textarea>
<span id="input-hint" class="sr-only">
  Saisissez le texte à corriger, puis appuyez sur Commande+Entrée pour lancer la correction
</span>

<!-- Zone de résultat -->
<div
  id="output"
  role="region"
  aria-label="Texte corrigé"
  aria-live="polite"
  aria-atomic="false"
></div>

<!-- Loading -->
<div
  id="loading-overlay"
  role="alert"
  aria-busy="true"
  aria-label="Correction en cours"
></div>

<!-- Error -->
<div
  id="error-state"
  role="alert"
  aria-live="assertive"
></div>

<!-- Status bar -->
<span
  id="status"
  role="status"
  aria-live="polite"
></span>

<!-- Toasts -->
<div
  id="toast-container"
  role="status"
  aria-live="polite"
  aria-relevant="additions"
></div>
```

### Classe sr-only

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

| Élément | Foreground | Background | Ratio | WCAG |
|---------|------------|------------|-------|------|
| Texte normal | #e0e0e0 | #0a0a0a | 14.3:1 | AAA |
| Correction | #6b9fff | #0a0a0a | 7.2:1 | AAA |
| Correction hover | #0a0a0a | #6b9fff | 7.2:1 | AAA |
| Texte secondaire | #888888 | #0a0a0a | 5.9:1 | AA |
| Success | #4ade80 | #0a0a0a | 9.1:1 | AAA |
| Error | #f87171 | #0a0a0a | 6.8:1 | AA |
| Placeholder | #555555 | #0a0a0a | 3.5:1 | (décoratif) |

### Focus visible

```css
/* Focus visible pour navigation clavier */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Pas d'outline pour clic souris */
:focus:not(:focus-visible) {
  outline: none;
}

/* Focus trap dans les modals/menus */
.context-menu:focus-within,
.panel:focus-within {
  /* Le focus reste dans l'élément */
}
```

## Responsive Design

### Breakpoints

```css
/* Mobile first */
:root {
  --breakpoint-sm: 480px;
  --breakpoint-md: 600px;
  --breakpoint-lg: 900px;
}
```

### Layout mobile (< 600px)

```
┌─────────────────────────────────┐
│ azeTextCorrector           [📖] │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  Texte original           │  │
│  │  ───────────────          │  │
│  │  Le chat est fatigue.     │  │
│  │  Il mange sa soupe.       │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  Texte corrigé            │  │
│  │  ───────────────          │  │
│  │  Le chat est fatigué.     │  │
│  │  Il mange sa soupe.       │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ prêt                    [⌘↵]   │
└─────────────────────────────────┘
```

### CSS Responsive

```css
@media (max-width: 600px) {
  /* Layout vertical */
  .editor {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 1px;
  }

  .pane-input {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .pane-output {
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }

  /* Header compact */
  .app-header {
    height: 48px;
    padding: 0 var(--space-md);
  }

  .app-title {
    font-size: var(--font-size-sm);
  }

  /* Footer simplifié */
  footer {
    height: 44px;
    padding: 0 var(--space-md);
  }

  .shortcuts {
    display: none; /* Masquer les raccourcis clavier */
  }

  /* Bouton corriger visible */
  .mobile-correct-btn {
    display: flex;
  }

  /* Panes */
  .pane-header {
    padding: var(--space-sm);
  }

  .editor-textarea,
  .output-content {
    padding: var(--space-md);
    font-size: var(--font-size-base);
  }

  /* Touch targets minimum 44px */
  .icon-btn {
    min-width: 44px;
    min-height: 44px;
  }

  /* Dictionnaire plein écran */
  .panel {
    width: 100%;
    max-width: none;
  }

  body.dictionary-open .editor {
    display: none;
  }

  /* Toasts */
  .toast-container {
    bottom: 56px;
    left: var(--space-md);
    right: var(--space-md);
    transform: none;
  }

  .toast {
    width: 100%;
    max-width: none;
  }
}

/* Tablette */
@media (min-width: 601px) and (max-width: 900px) {
  main {
    padding: var(--space-md);
  }

  .shortcuts span:not(:first-child) {
    display: none; /* Garder seulement le premier raccourci */
  }
}
```

## Logging Frontend

```javascript
// logger.js
// Tauri 2.x : Imports ES modules
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

class Logger {
  constructor(module) {
    this.module = module;
    this.level = parseInt(localStorage.getItem('log_level') || '1');
  }

  format(level, msg) {
    const time = new Date().toISOString().substr(11, 12);
    return `[${time}] [${this.module}] ${msg}`;
  }

  debug(msg, data) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.debug(`%c${this.format('DEBUG', msg)}`, 'color: #888', data || '');
    }
  }

  info(msg, data) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.info(`%c${this.format('INFO', msg)}`, 'color: #6b9fff', data || '');
    }
  }

  warn(msg, data) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(this.format('WARN', msg), data || '');
    }
  }

  error(msg, data) {
    console.error(this.format('ERROR', msg), data || '');
  }

  time(label) {
    console.time(`[${this.module}] ${label}`);
  }

  timeEnd(label) {
    console.timeEnd(`[${this.module}] ${label}`);
  }
}

// Export instances
export const log = {
  editor: new Logger('Editor'),
  correction: new Logger('Correction'),
  dictionary: new Logger('Dictionary'),
  ui: new Logger('UI'),
};

// Helpers globaux pour debug
window.setDebugMode = (enabled) => {
  localStorage.setItem('log_level', enabled ? '0' : '1');
  console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}. Refresh to apply.`);
};

window.exportLogs = async () => {
  try {
    const path = await invoke('export_logs');
    console.log('Logs exported to:', path);
    return path;
  } catch (e) {
    console.error('Failed to export logs:', e);
    throw e;
  }
};

window.openLogDir = async () => {
  try {
    const path = await invoke('get_log_path');
    // open est importé en haut du fichier depuis @tauri-apps/plugin-shell
    await open(path);
  } catch (e) {
    console.error('Failed to open log directory:', e);
    throw e;
  }
};
```

## Menu Debug (Ctrl+Shift+D)

```html
<div id="debug-menu" class="debug-menu hidden">
  <div class="debug-menu-header">
    <span>Debug</span>
    <button class="icon-btn" onclick="document.getElementById('debug-menu').classList.add('hidden')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
  <button class="debug-item" onclick="window.exportLogs()">
    Exporter les logs
  </button>
  <button class="debug-item" onclick="window.openLogDir()">
    Ouvrir dossier logs
  </button>
  <label class="debug-item">
    <input type="checkbox" id="debug-toggle" onchange="window.setDebugMode(this.checked)">
    Mode debug
  </label>
</div>
```

```css
.debug-menu {
  position: fixed;
  bottom: 48px;
  right: var(--space-lg);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-sm);
  min-width: 180px;
  box-shadow: var(--shadow-lg);
  z-index: 1002;
}

.debug-menu.hidden {
  display: none;
}

.debug-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm);
  border-bottom: 1px solid var(--border-primary);
  margin-bottom: var(--space-xs);
}

.debug-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-align: left;
}

.debug-item:hover {
  background: var(--bg-hover);
}
```

```javascript
// Raccourci Ctrl+Shift+D
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    document.getElementById('debug-menu').classList.toggle('hidden');
  }
});
```

## Critères d'acceptation

- [ ] Loading overlay pendant la correction
- [ ] Message adapté (démarrage LT, texte long)
- [ ] État erreur avec bouton "Réessayer"
- [ ] Toast notifications (success, warning, error)
- [ ] Toasts auto-dismiss après 3s
- [ ] Attributs ARIA complets
- [ ] Navigation clavier accessible
- [ ] Contraste WCAG AA minimum
- [ ] Layout responsive mobile
- [ ] Touch targets 44px minimum
- [ ] Menu debug accessible via Ctrl+Shift+D
- [ ] Logging frontend configurable

## Fichiers

- `web/style.css` - Styles loading, error, toasts, responsive
- `web/states.js` - Classe StateManager
- `web/logger.js` - Système de logging frontend
- `web/script.js` - Intégration

## Dépendances

- Stories 05a, 05b, 05c complétées
