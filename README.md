# azeTextCorrector

Correcteur orthographique et grammatical français pour macOS. Tout tourne en local, pas de compte, pas de serveur distant.

L'app embarque [LanguageTool](https://languagetool.org/) dans un runtime Java minimal et l'expose via une interface native Tauri.

## Ce que ça fait

- Correction orthographique et grammaticale du français
- Les corrections sont cliquables : on peut annuler une correction ou ajouter le mot au dictionnaire personnel
- Le dictionnaire personnel est sauvegardé localement en JSON
- LanguageTool démarre automatiquement au lancement, pas besoin de le configurer

## Stack

- **Frontend** : HTML/CSS/JS vanilla (pas de framework, pas de bundler)
- **Backend** : Rust + Tauri 2
- **Moteur** : LanguageTool embedded (Java, ~230 MB)

## Télécharger

Récupérer le `.dmg` depuis la page [Releases](../../releases) :
- **Apple Silicon** (M1/M2/M3/M4) : `azeTextCorrector_*_aarch64.dmg`
- **Intel** : `azeTextCorrector_*_x86_64.dmg`

L'app n'est pas signée par un certificat Apple Developer.
macOS Gatekeeper va bloquer le premier lancement.
Pour débloquer, faire **clic droit > Ouvrir** sur l'app et confirmer.
Sinon en terminal :

```
xattr -cr /Applications/azeTextCorrector.app
```

## Prérequis (dev)

- macOS 11.0+
- Node.js 18+
- Rust 1.77+

## Build depuis les sources

```
git clone https://github.com/xxx/azetextcorrector.git
cd azetextcorrector
npm install
npm run build:assets   # télécharge le runtime Java + LanguageTool
npm run dev            # lance en mode dev
```

Pour builder le .app :

```
npm run build:macos
```

Le .dmg se retrouve dans `src-tauri/target/release/bundle/dmg/`.

## Raccourcis

| Raccourci | Action |
|-----------|--------|
| `Cmd+Enter` | Lancer la correction |
| `Cmd+Shift+C` | Copier le texte corrigé |
| `Cmd+D` | Ouvrir le dictionnaire |
| `Escape` | Fermer les menus |

## Structure

```
web/              HTML/CSS/JS du frontend
src-tauri/src/    Code Rust (commandes Tauri, client LT, dictionnaire)
resources/        Runtime Java + JARs LanguageTool (téléchargés par build:assets)
```

## Licence

MIT
