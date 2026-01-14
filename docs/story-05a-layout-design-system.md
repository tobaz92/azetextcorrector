# Story 05a - Layout et Design System

## Statut
- [x] Implémenté (2026-01-14)

## Objectif

Mettre en place le layout de base et le design system complet de l'application.

## Design System

### Palette de couleurs

```css
:root {
  /* ===== BACKGROUNDS ===== */
  --bg-primary: #0a0a0a;      /* Fond principal (panels) */
  --bg-secondary: #111111;    /* Fond secondaire (app) */
  --bg-tertiary: #1a1a1a;     /* Fond éléments (menus, modals) */
  --bg-hover: #252525;        /* État hover */
  --bg-active: #303030;       /* État actif/pressed */

  /* ===== TEXT ===== */
  --text-primary: #e0e0e0;    /* Texte principal */
  --text-secondary: #888888;  /* Texte secondaire (labels) */
  --text-muted: #555555;      /* Texte désactivé/placeholder */
  --text-inverse: #0a0a0a;    /* Texte sur fond clair */

  /* ===== ACCENTS ===== */
  --accent-primary: #6b9fff;      /* Bleu principal (corrections) */
  --accent-primary-hover: #4a7fd9;
  --accent-primary-bg: #6b9fff20; /* 12% opacity */

  /* ===== SEMANTIC ===== */
  --success: #4ade80;
  --success-bg: #4ade8020;
  --warning: #fbbf24;
  --warning-bg: #fbbf2420;
  --error: #f87171;
  --error-bg: #f8717120;

  /* ===== BORDERS ===== */
  --border-primary: #1a1a1a;
  --border-secondary: #2a2a2a;
  --border-focus: #6b9fff;

  /* ===== SHADOWS ===== */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);

  /* ===== SPACING ===== */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;

  /* ===== RADIUS ===== */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* ===== TRANSITIONS ===== */
  --transition-fast: 0.1s ease;
  --transition-base: 0.15s ease;
  --transition-slow: 0.25s ease;
}
```

### Typographie

```css
:root {
  /* Police */
  --font-family: 'IBM Plex Mono', ui-monospace, monospace;

  /* Tailles */
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;

  /* Line height */
  --line-height-tight: 1.3;
  --line-height-base: 1.5;
  --line-height-relaxed: 1.7;

  /* Font weight */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--text-primary);
  background: var(--bg-secondary);
  -webkit-font-smoothing: antialiased;
}
```

## Layout principal

### Structure générale

```
┌──────────────────────────────────────────────────────────────────────────┐
│ HEADER (40px)                                                       [📖] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐   │
│  │                            │    │                                │   │
│  │      PANE INPUT            │    │       PANE OUTPUT              │   │
│  │      (50%)                 │    │       (50%)                    │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  └────────────────────────────┘    └────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ FOOTER (36px)  status                              ⌘↵ corriger | ⌘⇧C... │
└──────────────────────────────────────────────────────────────────────────┘
```

### Dimensions

| Zone | Hauteur | Notes |
|------|---------|-------|
| Header | 40px | Fixe |
| Main | calc(100vh - 76px) | Flexible |
| Footer | 36px | Fixe |
| Panneau dictionnaire | 240px largeur | Slide depuis droite |

### CSS Layout de base

```css
/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
}

/* App container */
body {
  display: flex;
  flex-direction: column;
}

/* ===== HEADER ===== */
.app-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  -webkit-app-region: drag; /* Draggable sur macOS */
}

.app-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
  -webkit-app-region: no-drag;
}

/* ===== MAIN ===== */
main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important pour flex */
  padding: var(--space-lg);
  gap: var(--space-lg);
}

/* ===== EDITOR (2 panels) ===== */
.editor {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-height: 0;
}

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

/* ===== FOOTER ===== */
footer {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

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

.shortcuts {
  display: flex;
  gap: var(--space-lg);
}

.shortcuts kbd {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-family: inherit;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Composants de base

### Bouton icône

```
┌─────┐       ┌─────┐       ┌─────┐
│  📖 │       │  📖 │       │  📖 │
│     │       │░░░░░│       │▓▓▓▓▓│
└─────┘       └─────┘       └─────┘
 Normal        Hover         Active
```

```css
.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.icon-btn:active {
  background: var(--bg-active);
}

.icon-btn:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.icon-btn.active {
  background: var(--accent-primary-bg);
  color: var(--accent-primary);
}

.icon-btn svg {
  width: 16px;
  height: 16px;
}
```

### Bouton standard

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Corriger   │    │   Corriger   │    │   Corriger   │
└──────────────┘    └──────────────┘    └──────────────┘
    Normal             Hover              Disabled
    #1a1a1a            #252525            #1a1a1a 50%
```

```css
.btn {
  padding: var(--space-sm) var(--space-lg);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn:hover:not(:disabled) {
  background: var(--bg-hover);
}

.btn:active:not(:disabled) {
  background: var(--bg-active);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--text-inverse);
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-primary-hover);
}
```

## États de l'application

### État initial (vide)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ azeTextCorrector                                                    [📖] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐   │
│  │                            │    │                                │   │
│  │  Texte à corriger...       │    │  Résultat...                   │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░   │    │  ░░░░░░░░░░░                   │   │
│  │  (placeholder)             │    │  (placeholder)                 │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  └────────────────────────────┘    └────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ prêt                                                   ⌘↵ | ⌘⇧C | ⌘D    │
└──────────────────────────────────────────────────────────────────────────┘
```

### État avec texte saisi

```
┌──────────────────────────────────────────────────────────────────────────┐
│ azeTextCorrector                                                    [📖] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐   │
│  │                            │    │                                │   │
│  │  Le chat est fatigé.       │    │  Résultat...                   │   │
│  │  Il mange sa soupe.        │    │  ░░░░░░░░░░░                   │   │
│  │  █                         │    │                                │   │
│  │  (curseur)                 │    │                                │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  └────────────────────────────┘    └────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ prêt                                                   ⌘↵ | ⌘⇧C | ⌘D    │
└──────────────────────────────────────────────────────────────────────────┘
```

### État loading (correction en cours)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ azeTextCorrector                                                    [📖] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐   │
│  │                            │    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│  │  Le chat est fatigé.       │    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│  │  Il mange sa soupe.        │    │░░░░░░░░  ◠◡◠  ░░░░░░░░░░░░░░░░│   │
│  │                            │    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│  │                            │    │░░░░ Correction... ░░░░░░░░░░░░│   │
│  │                            │    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│  │                            │    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│  │                            │    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│  └────────────────────────────┘    └────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ◠ correction...                                        ⌘↵ | ⌘⇧C | ⌘D    │
└──────────────────────────────────────────────────────────────────────────┘
```

### État avec résultat

```
┌──────────────────────────────────────────────────────────────────────────┐
│ azeTextCorrector                                                    [📖] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐   │
│  │                            │    │                                │   │
│  │  Le chat est fatigé.       │    │  Le chat est fatigué.          │   │
│  │  Il mange sa soupe.        │    │              ════════          │   │
│  │                            │    │              (bleu)            │   │
│  │                            │    │  Il mange sa soupe.            │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  │                            │    │                                │   │
│  └────────────────────────────┘    └────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ✓ 1 correction                                         ⌘↵ | ⌘⇧C | ⌘D    │
└──────────────────────────────────────────────────────────────────────────┘
```

### État erreur

```
┌──────────────────────────────────────────────────────────────────────────┐
│ azeTextCorrector                                                    [📖] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────────┐   │
│  │                            │    │                                │   │
│  │  Le chat est fatigé.       │    │  ┌────────────────────────┐   │   │
│  │  Il mange sa soupe.        │    │  │ ⚠ Erreur               │   │   │
│  │                            │    │  │                        │   │   │
│  │                            │    │  │ LanguageTool n'a pas   │   │   │
│  │                            │    │  │ pu démarrer.           │   │   │
│  │                            │    │  │                        │   │   │
│  │                            │    │  │    [ Réessayer ]       │   │   │
│  │                            │    │  └────────────────────────┘   │   │
│  └────────────────────────────┘    └────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ✕ erreur                                               ⌘↵ | ⌘⇧C | ⌘D    │
└──────────────────────────────────────────────────────────────────────────┘
```

## Critères d'acceptation

- [ ] Layout 2 colonnes égales
- [ ] Header avec titre et bouton dictionnaire
- [ ] Footer avec status et raccourcis
- [ ] Variables CSS du design system
- [ ] États des boutons (hover, active, disabled)
- [ ] Draggable region sur macOS
- [ ] Responsive (voir story-05d)

## Fichiers

- `web/style.css` - Styles principaux
- `web/index.html` - Structure HTML de base

## Dépendances

Aucune (première story frontend)
