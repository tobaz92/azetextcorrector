# azeTextCorrector

Correcteur orthographique et grammatical français pour macOS. Tout tourne en local, pas de compte, pas de serveur distant.

L'app embarque [Grammalecte](https://grammalecte.net/), le correcteur grammatical français libre, exécuté directement dans l'app (JavaScriptCore, le moteur JS de macOS). Les suggestions orthographiques viennent du correcteur natif de macOS. Aucun serveur, aucune connexion réseau.

## Ce que ça fait

- Correction orthographique et grammaticale du français
- Les corrections sont cliquables : on peut annuler une correction ou ajouter le mot au dictionnaire personnel
- Le dictionnaire personnel est sauvegardé localement en JSON
- Le moteur se charge en moins d'une demi-seconde au lancement

## Stack

- **Frontend** : HTML/CSS/JS vanilla (pas de framework, pas de bundler)
- **Backend** : Rust + Tauri 2
- **Moteur grammatical** : Grammalecte 2.3 dans un Web Worker (~9 Mo)
- **Suggestions orthographiques** : `NSSpellChecker` (macOS)

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
npm run build:assets   # télécharge Grammalecte (version figée, SHA-256 vérifié)
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
web/                  HTML/CSS/JS du frontend
web/engine-worker.js  Worker qui fait tourner Grammalecte
web/corrector.js      Sélection et application des corrections
web/grammalecte/      Moteur Grammalecte (téléchargé par build:assets)
src-tauri/src/        Code Rust (dictionnaire, suggestions NSSpellChecker)
```

## Licence

Le code de ce dépôt est sous licence MIT.

L'app distribuée embarque Grammalecte (© Olivier R., GPL v3) : le binaire
publié est donc distribué sous les termes de la GPL v3. Grammalecte n'est pas
versionné ici, il est téléchargé au build depuis sa source officielle.
