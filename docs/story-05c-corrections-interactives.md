# Story 05c - Corrections interactives

## Statut
- [x] Implémenté (2026-01-14)

## Objectif

Permettre à l'utilisateur d'interagir avec les corrections : voir le mot original, ignorer un mot, annuler une correction.

## Dépendances

- Story 05b complétée (éditeur principal)
- Story 03 complétée (dictionnaire)

## Wireframes

### Correction - États visuels

```
  Normal               Hover                Focus               Reverted            Ignored
┌──────────┐       ┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
│ fatigué  │       │ fatigué  │        │ fatigué  │        │ fatigue  │        │ fatigue  │
│ ═══════  │       │▓▓▓▓▓▓▓▓▓▓│        │░░░░░░░░░░│        │ ═══════  │        │          │
│(bleu 12%)│       │(bleu 100%)│       │(outline) │        │(barré)   │        │(normal)  │
└──────────┘       └──────────┘        └──────────┘        └──────────┘        └──────────┘
```

### Tooltip (mot original)

```
                    ┌────────────┐
                    │  fatigue   │  ← mot original
                    │ (gris #888)│
                    └──────┬─────┘
                           │
                           ▼
               ┌───────────────────┐
               │      fatigué      │  ← correction affichée
               │      ════════     │
               └───────────────────┘
```

### Context Menu

```
Clic droit sur correction:

┌─────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  Le chat est fatigué.       │
│               ├────────────────────────┐
│               │ 📖 Ignorer ce mot      │
│               │ ↩ Annuler la correction│
│               │ 📋 Copier              │
│               └────────────────────────┘
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────┘
```

### Context Menu - Position

```
Cas normal:                    Bord droit:                    Bord bas:
┌──────────────┐               ┌──────────────┐               ┌──────────────┐
│   [menu]     │               │     [menu]   │               │              │
│   ↓          │               │         ↓    │               │   fatigué ───┤
│   fatigué    │               │   fatigué    │               │              │
└──────────────┘               └──────────────┘               ├──────────────┤
                                                              │   [menu]     │
                                                              └──────────────┘
```

### Flux "Ignorer un mot"

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Clic droit  │────▶│ Menu:       │────▶│ invoke()    │────▶│ Toast:      │
│ sur mot     │     │ "Ignorer"   │     │ add_to_dict │     │ "ajouté"    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
                                              ┌─────────────────────────────┐
                                              │ Mot affiché sans highlight  │
                                              │ (classe .ignored)           │
                                              └─────────────────────────────┘
```

### Flux "Annuler correction"

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Clic droit  │────▶│ Menu:       │────▶│ Revert      │────▶│ Toast:      │
│ sur mot     │     │ "Annuler"   │     │ local       │     │ "annulée"   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
                                              ┌─────────────────────────────┐
                                              │ Mot original barré affiché  │
                                              │ (classe .reverted)          │
                                              └─────────────────────────────┘
```

## HTML - Context Menu

```html
<!-- Ajouter dans body, après main -->
<div id="context-menu" class="context-menu hidden" role="menu" aria-label="Actions">
  <button class="context-item" data-action="ignore" role="menuitem">
    <svg class="context-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
    <span>Ignorer ce mot</span>
    <kbd>i</kbd>
  </button>
  <button class="context-item" data-action="revert" role="menuitem">
    <svg class="context-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="1 4 1 10 7 10"></polyline>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>
    <span>Annuler la correction</span>
    <kbd>r</kbd>
  </button>
  <div class="context-divider"></div>
  <button class="context-item" data-action="copy" role="menuitem">
    <svg class="context-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    <span>Copier</span>
    <kbd>⌘C</kbd>
  </button>
</div>
```

## CSS - Corrections

```css
/* ===== CORRECTION SPANS ===== */

/* État normal */
.correction {
  display: inline;
  background: var(--accent-primary-bg);
  color: var(--accent-primary);
  padding: 0 2px;
  border-radius: 2px;
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
}

/* Hover */
.correction:hover {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

/* Focus (navigation clavier) */
.correction:focus {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  background: var(--accent-primary-bg);
}

.correction:focus:not(:focus-visible) {
  outline: none;
}

/* ===== TOOLTIP (mot original) ===== */
.correction::before {
  content: attr(data-original);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--transition-base), visibility var(--transition-base);
  pointer-events: none;
  z-index: 100;
}

/* Flèche du tooltip */
.correction::after {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--bg-tertiary);
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--transition-base), visibility var(--transition-base);
  pointer-events: none;
  z-index: 100;
}

/* Afficher tooltip au hover */
.correction:hover::before,
.correction:hover::after {
  opacity: 1;
  visibility: visible;
}

/* ===== ÉTATS SPÉCIAUX ===== */

/* Correction annulée (reverted) */
.correction.reverted {
  background: transparent;
  color: var(--text-primary);
  text-decoration: line-through;
  text-decoration-color: var(--text-muted);
  cursor: default;
}

.correction.reverted:hover {
  background: transparent;
  color: var(--text-primary);
}

.correction.reverted::before,
.correction.reverted::after {
  display: none;
}

/* Mot ignoré (ajouté au dictionnaire) */
.correction.ignored {
  background: transparent;
  color: var(--text-primary);
  cursor: default;
}

.correction.ignored:hover {
  background: transparent;
  color: var(--text-primary);
}

.correction.ignored::before,
.correction.ignored::after {
  display: none;
}

/* ===== CONTEXT MENU ===== */
.context-menu {
  position: fixed;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-xs);
  min-width: 200px;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
}

.context-menu.hidden {
  display: none;
}

.context-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
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
  transition: background var(--transition-fast);
}

.context-item:hover {
  background: var(--bg-hover);
}

.context-item:focus {
  background: var(--bg-hover);
  outline: none;
}

.context-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.context-item span {
  flex: 1;
}

.context-item kbd {
  font-family: inherit;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  background: var(--bg-secondary);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
}

.context-divider {
  height: 1px;
  background: var(--border-primary);
  margin: var(--space-xs) 0;
}

/* ===== ANIMATION MENU ===== */
.context-menu {
  animation: menu-in 0.15s ease;
  transform-origin: top left;
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

## JavaScript - Gestion des corrections

```javascript
// corrections.js - Classe CorrectionManager
// Tauri 2.x : Imports ES modules
import { invoke } from '@tauri-apps/api/core';

class CorrectionManager {
  constructor(editor) {
    this.editor = editor;
    this.output = document.getElementById('output');
    this.contextMenu = document.getElementById('context-menu');
    this.activeCorrection = null;

    this.bindEvents();
  }

  bindEvents() {
    // Clic sur correction
    this.output.addEventListener('click', (e) => {
      const correction = e.target.closest('.correction');
      if (correction && !correction.classList.contains('reverted') &&
          !correction.classList.contains('ignored')) {
        this.selectCorrection(correction);
      }
    });

    // Context menu (clic droit)
    this.output.addEventListener('contextmenu', (e) => {
      const correction = e.target.closest('.correction');
      if (correction && !correction.classList.contains('reverted') &&
          !correction.classList.contains('ignored')) {
        e.preventDefault();
        this.showContextMenu(correction, e.clientX, e.clientY);
      }
    });

    // Fermer menu au clic ailleurs
    document.addEventListener('click', (e) => {
      if (!this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // Actions du menu
    this.contextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-item');
      if (item) {
        const action = item.dataset.action;
        this.handleAction(action);
      }
    });

    // Raccourcis clavier sur correction focusée
    this.output.addEventListener('keydown', (e) => {
      const focused = e.target.closest('.correction');
      if (!focused) return;

      // Enter ou Space = ouvrir menu
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const rect = focused.getBoundingClientRect();
        this.showContextMenu(focused, rect.left, rect.bottom + 4);
        return;
      }

      // i = ignorer
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        this.activeCorrection = focused;
        this.handleAction('ignore');
        return;
      }

      // r = revert
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.activeCorrection = focused;
        this.handleAction('revert');
        return;
      }

      // Escape = blur
      if (e.key === 'Escape') {
        focused.blur();
      }
    });

    // Navigation clavier dans le menu
    this.contextMenu.addEventListener('keydown', (e) => {
      const items = [...this.contextMenu.querySelectorAll('.context-item')];
      const current = document.activeElement;
      const index = items.indexOf(current);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[(index + 1) % items.length];
        next?.focus();
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[(index - 1 + items.length) % items.length];
        prev?.focus();
      }

      if (e.key === 'Escape') {
        this.hideContextMenu();
        this.activeCorrection?.focus();
      }
    });
  }

  selectCorrection(correction) {
    correction.focus();
  }

  showContextMenu(correction, x, y) {
    this.activeCorrection = correction;
    this.contextMenu.classList.remove('hidden');

    // Position avec gestion des bords
    const menuRect = this.contextMenu.getBoundingClientRect();
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    let finalX = x;
    let finalY = y;

    // Débordement droite
    if (x + menuRect.width > viewWidth - 10) {
      finalX = viewWidth - menuRect.width - 10;
    }

    // Débordement bas
    if (y + menuRect.height > viewHeight - 10) {
      finalY = y - menuRect.height - 4;
    }

    this.contextMenu.style.left = `${finalX}px`;
    this.contextMenu.style.top = `${finalY}px`;

    // Focus premier item
    const firstItem = this.contextMenu.querySelector('.context-item');
    setTimeout(() => firstItem?.focus(), 10);
  }

  hideContextMenu() {
    this.contextMenu.classList.add('hidden');
    this.activeCorrection = null;
  }

  async handleAction(action) {
    if (!this.activeCorrection) return;

    const correction = this.activeCorrection;
    const original = correction.dataset.original;
    const current = correction.textContent;

    switch (action) {
      case 'ignore':
        await this.ignoreWord(original);
        correction.classList.add('ignored');
        correction.textContent = original;
        this.editor.showToast(`"${original}" ajouté au dictionnaire`, 'success');
        break;

      case 'revert':
        correction.classList.add('reverted');
        correction.textContent = original;
        this.editor.showToast('Correction annulée');
        break;

      case 'copy':
        await navigator.clipboard.writeText(current);
        this.editor.showToast('Copié');
        break;
    }

    this.hideContextMenu();
  }

  async ignoreWord(word) {
    try {
      // invoke est importé en haut du fichier
      await invoke('add_to_dictionary', { word });
      // Mettre à jour le panneau dictionnaire si ouvert
      window.dictionaryManager?.loadWords();
    } catch (e) {
      console.error('Failed to add word:', e);
      this.editor.showToast('Erreur lors de l\'ajout', 'error');
      throw e;
    }
  }

  // Compter les corrections actives (non revertées, non ignorées)
  getActiveCount() {
    const all = this.output.querySelectorAll('.correction');
    let count = 0;
    all.forEach(el => {
      if (!el.classList.contains('reverted') && !el.classList.contains('ignored')) {
        count++;
      }
    });
    return count;
  }

  // Obtenir le texte final (avec corrections appliquées/annulées)
  getFinalText() {
    return this.output.textContent;
  }
}

// Intégration avec Editor
class Editor {
  constructor() {
    // ... code existant ...
    this.correctionManager = new CorrectionManager(this);
  }

  // ... reste du code ...
}
```

## Tableau des interactions

| Élément | Action | Résultat |
|---------|--------|----------|
| Correction | Hover | Tooltip avec mot original, fond bleu |
| Correction | Click | Focus (outline) |
| Correction | Clic droit | Ouvre context menu |
| Correction | Enter/Space | Ouvre context menu |
| Correction | `i` | Ignore le mot |
| Correction | `r` | Annule la correction |
| Correction | Tab | Focus correction suivante |
| Menu | Click "Ignorer" | Ajoute au dictionnaire |
| Menu | Click "Annuler" | Revert à l'original |
| Menu | Click "Copier" | Copie le mot |
| Menu | Escape | Ferme le menu |
| Menu | Arrows | Navigation |

## Navigation clavier complète

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Tab ─────────────────────────────────────────────────────▶ │
│                                                             │
│  [Input] ──Tab──▶ [Correction 1] ──Tab──▶ [Correction 2]   │
│     ▲                    │                      │          │
│     │                    │ Enter                │ Enter    │
│  Shift+Tab               ▼                      ▼          │
│                    ┌──────────┐           ┌──────────┐     │
│                    │ Menu     │           │ Menu     │     │
│                    │  ↑ ↓     │           │  ↑ ↓     │     │
│                    │ Escape   │           │ Escape   │     │
│                    └──────────┘           └──────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Mobile - Touch events

```javascript
// Ajouter dans CorrectionManager
const LONG_PRESS_DELAY = 500; // ms

bindTouchEvents() {
  let touchTimer = null;
  let touchTarget = null;

  this.output.addEventListener('touchstart', (e) => {
    const correction = e.target.closest('.correction');
    if (!correction) return;
    if (correction.classList.contains('reverted') ||
        correction.classList.contains('ignored')) return;

    touchTarget = correction;

    // Long press = context menu
    touchTimer = setTimeout(() => {
      const touch = e.touches[0];
      this.showContextMenuMobile(correction, touch.clientX, touch.clientY);
    }, LONG_PRESS_DELAY);
  });

  this.output.addEventListener('touchend', () => {
    clearTimeout(touchTimer);
  });

  this.output.addEventListener('touchmove', () => {
    clearTimeout(touchTimer);
  });
}

showContextMenuMobile(correction, x, y) {
  this.activeCorrection = correction;

  // Sur mobile, menu en bas de l'écran (sheet style)
  this.contextMenu.classList.remove('hidden');
  this.contextMenu.classList.add('mobile');

  // Position bottom sheet
  this.contextMenu.style.left = '0';
  this.contextMenu.style.right = '0';
  this.contextMenu.style.bottom = '0';
  this.contextMenu.style.top = 'auto';
}
```

## CSS Mobile

```css
@media (max-width: 600px) {
  /* Context menu = bottom sheet */
  .context-menu.mobile {
    position: fixed;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    max-width: none;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    padding: var(--space-md);
    animation: sheet-in 0.2s ease;
  }

  @keyframes sheet-in {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .context-menu.mobile .context-item {
    padding: var(--space-md) var(--space-lg);
    min-height: 44px; /* Touch target */
    font-size: var(--font-size-base);
  }

  .context-menu.mobile kbd {
    display: none; /* Masquer raccourcis clavier sur mobile */
  }

  /* Backdrop pour fermer */
  .context-menu.mobile::before {
    content: '';
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
  }

  /* Tooltip désactivé sur touch */
  .correction::before,
  .correction::after {
    display: none;
  }
}
```

## Critères d'acceptation

- [ ] Hover sur correction montre le mot original (tooltip)
- [ ] Clic droit sur correction ouvre le context menu
- [ ] Action "Ignorer" ajoute au dictionnaire
- [ ] Action "Annuler" remet le mot original (barré)
- [ ] Action "Copier" copie le mot
- [ ] Raccourcis `i` et `r` sur correction focusée
- [ ] Navigation clavier (Tab, Enter, Escape, Arrows)
- [ ] Long press sur mobile ouvre le menu
- [ ] Menu adapté sur mobile (bottom sheet)
- [ ] Toast de confirmation après action
- [ ] Focus géré correctement (trap dans menu)

## Fichiers

- `web/style.css` - Styles corrections et context menu
- `web/corrections.js` - Classe CorrectionManager
- `web/script.js` - Intégration avec Editor

## Dépendances

- Story 05b complétée (éditeur principal)
- Story 03 complétée (commande `add_to_dictionary`)
