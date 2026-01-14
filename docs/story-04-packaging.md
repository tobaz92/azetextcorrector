# Story 04 - Packaging et distribution multi-plateforme

## Statut
- [x] Implémenté (2026-01-14)

## Objectif

Configurer le build et le packaging de l'application pour macOS (prioritaire), avec une architecture permettant le support futur de Windows et Linux.

## Scope

### Phase 1 (cette story) - macOS
- Build pour Apple Silicon (arm64)
- Build pour Intel (x86_64)
- Universal binary (optionnel)
- DMG avec installation drag-and-drop
- Code signing (optionnel pour distribution hors App Store)

### Phase 2 (future) - Windows/Linux
- Windows : NSIS installer ou MSI
- Linux : AppImage, .deb, .rpm

## Création des icônes

### Structure requise

```
src-tauri/icons/
├── 32x32.png           # 32x32 pixels
├── 128x128.png         # 128x128 pixels
├── 128x128@2x.png      # 256x256 pixels (Retina)
├── icon.icns           # macOS bundle
└── icon.ico            # Windows
```

### Génération depuis une source SVG

**Prérequis** : créer un fichier source `icon.svg` (512x512 ou plus)

**Script de génération** (`scripts/generate-icons.sh`) :
```bash
#!/bin/bash
# Nécessite : brew install imagemagick

SOURCE="icon-source.png"  # 1024x1024 PNG ou SVG
OUTPUT_DIR="src-tauri/icons"

mkdir -p "$OUTPUT_DIR"

# PNG pour différentes tailles
convert "$SOURCE" -resize 32x32   "$OUTPUT_DIR/32x32.png"
convert "$SOURCE" -resize 128x128 "$OUTPUT_DIR/128x128.png"
convert "$SOURCE" -resize 256x256 "$OUTPUT_DIR/128x128@2x.png"

# ICO pour Windows (multi-résolution)
convert "$SOURCE" -resize 256x256 \
    \( -clone 0 -resize 16x16 \) \
    \( -clone 0 -resize 32x32 \) \
    \( -clone 0 -resize 48x48 \) \
    \( -clone 0 -resize 64x64 \) \
    \( -clone 0 -resize 128x128 \) \
    -delete 0 "$OUTPUT_DIR/icon.ico"

# ICNS pour macOS
mkdir -p icon.iconset
convert "$SOURCE" -resize 16x16   icon.iconset/icon_16x16.png
convert "$SOURCE" -resize 32x32   icon.iconset/icon_16x16@2x.png
convert "$SOURCE" -resize 32x32   icon.iconset/icon_32x32.png
convert "$SOURCE" -resize 64x64   icon.iconset/icon_32x32@2x.png
convert "$SOURCE" -resize 128x128 icon.iconset/icon_128x128.png
convert "$SOURCE" -resize 256x256 icon.iconset/icon_128x128@2x.png
convert "$SOURCE" -resize 256x256 icon.iconset/icon_256x256.png
convert "$SOURCE" -resize 512x512 icon.iconset/icon_256x256@2x.png
convert "$SOURCE" -resize 512x512 icon.iconset/icon_512x512.png
convert "$SOURCE" -resize 1024x1024 icon.iconset/icon_512x512@2x.png

iconutil -c icns icon.iconset -o "$OUTPUT_DIR/icon.icns"
rm -rf icon.iconset

echo "Icons generated in $OUTPUT_DIR"
```

### Design de l'icône (suggestions)

- **Style** : Minimaliste, flat design
- **Forme** : Carré arrondi ou cercle (standard macOS)
- **Couleur** : Utiliser `--accent-correction: #6b9fff` du design system
- **Symbole** : Crayon, checkmark, ou lettre stylisée "T"
- **Contraste** : Doit être lisible en 16x16

## Architecture des builds

```
builds/
├── macos/
│   ├── arm64/
│   │   ├── runtime/              # JRE minimal arm64
│   │   └── languagetool/
│   ├── x86_64/
│   │   ├── runtime/              # JRE minimal x86_64
│   │   └── languagetool/
│   └── universal/                # Fat binary (optionnel)
├── windows/                      # Future
│   └── x86_64/
└── linux/                        # Future
    └── x86_64/
```

## Spécifications détaillées

### 1. Configuration tauri.conf.json

```json
{
  "productName": "azeTextCorrector",
  "version": "2.0.0",
  "identifier": "com.azetextcorrector.app",
  "build": {
    "beforeBuildCommand": "npm run build:assets",
    "beforeBundleCommand": ""
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "resources/runtime/**/*",
      "resources/languagetool/**/*"
    ],
    "macOS": {
      "minimumSystemVersion": "10.15",
      "dmg": {
        "appPosition": { "x": 180, "y": 170 },
        "applicationFolderPosition": { "x": 480, "y": 170 },
        "windowSize": { "width": 660, "height": 400 }
      },
      "entitlements": null,
      "exceptionDomain": null,
      "frameworks": [],
      "providerShortName": null,
      "signingIdentity": null
    },
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "linux": {
      "appId": "com.azetextcorrector.app",
      "category": "Utility"
    }
  }
}
```

### 2. Scripts de préparation des assets

**package.json** :
```json
{
  "scripts": {
    "build:assets": "node scripts/prepare-assets.js",
    "build:assets:macos-arm64": "node scripts/prepare-assets.js --platform=macos --arch=arm64",
    "build:assets:macos-x64": "node scripts/prepare-assets.js --platform=macos --arch=x64",
    "build:macos": "npm run build:assets:macos-arm64 && npx tauri build --target aarch64-apple-darwin",
    "build:macos-x64": "npm run build:assets:macos-x64 && npx tauri build --target x86_64-apple-darwin"
  }
}
```

**scripts/prepare-assets.js** :

> **Note** : Ce script utilise des commandes shell (`curl`, `unzip`, `cp -r`) et est conçu pour **macOS/Linux uniquement**. Pour Windows, un script PowerShell séparé serait nécessaire (hors scope v1).

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LANGUAGETOOL_VERSION = '6.6';  // Dernière version traditionnelle (mars 2025)
const LANGUAGETOOL_URL = `https://languagetool.org/download/LanguageTool-${LANGUAGETOOL_VERSION}.zip`;
// Alternative: https://languagetool.org/download/snapshots/ pour les dernières corrections

const args = process.argv.slice(2);
const platform = args.find(a => a.startsWith('--platform='))?.split('=')[1] || 'macos';
const arch = args.find(a => a.startsWith('--arch='))?.split('=')[1] || 'arm64';

const RESOURCES_DIR = path.join(__dirname, '..', 'src-tauri', 'resources');
const TEMP_DIR = path.join(__dirname, '..', '.temp');
const CACHE_DIR = path.join(__dirname, '..', '.cache');

function main() {
  console.log(`Preparing assets for ${platform}-${arch}...`);

  // Créer les répertoires
  fs.mkdirSync(RESOURCES_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // 1. Télécharger LanguageTool si nécessaire
  downloadLanguageTool();

  // 2. Créer le JRE minimal (spécifique à l'architecture)
  createMinimalJRE(arch);

  // 3. Copier LanguageTool
  copyLanguageTool();

  console.log('Assets ready!');
}

function downloadLanguageTool() {
  // Cache permanent (ne dépend pas de l'arch)
  const zipPath = path.join(CACHE_DIR, `languagetool-${LANGUAGETOOL_VERSION}.zip`);

  if (!fs.existsSync(zipPath)) {
    console.log('Downloading LanguageTool...');
    execSync(`curl -L -o "${zipPath}" "${LANGUAGETOOL_URL}"`, { stdio: 'inherit' });
  } else {
    console.log('LanguageTool already cached.');
  }

  const extractDir = path.join(TEMP_DIR, 'languagetool');
  if (!fs.existsSync(extractDir)) {
    console.log('Extracting LanguageTool...');
    execSync(`unzip -q "${zipPath}" -d "${TEMP_DIR}"`);
    fs.renameSync(
      path.join(TEMP_DIR, `LanguageTool-${LANGUAGETOOL_VERSION}`),
      extractDir
    );
  }
}

function createMinimalJRE(arch) {
  const javaHome = process.env.JAVA_HOME;
  if (!javaHome) {
    throw new Error('JAVA_HOME not set. Please install JDK 17+');
  }

  // Vérifier que le JDK correspond à l'architecture cible
  const javaArch = execSync(`"${javaHome}/bin/java" -XshowSettings:properties -version 2>&1 | grep os.arch`)
    .toString().trim();
  console.log(`JDK architecture: ${javaArch}`);

  const runtimeDir = path.join(RESOURCES_DIR, 'runtime');

  // Nettoyer si le runtime existe (peut être d'une autre arch)
  if (fs.existsSync(runtimeDir)) {
    console.log('Removing existing JRE (may be different arch)...');
    fs.rmSync(runtimeDir, { recursive: true });
  }

  console.log(`Creating minimal JRE with jlink for ${arch}...`);

  // Modules déterminés par jdeps (voir story-01)
  const modules = [
    'java.base',
    'java.logging',
    'java.xml',
    'java.naming',
    'java.management',
    'java.sql'
  ].join(',');

  execSync(`
    "${javaHome}/bin/jlink" \
      --add-modules ${modules} \
      --output "${runtimeDir}" \
      --strip-debug \
      --compress zip-6 \
      --no-header-files \
      --no-man-pages
  `, { stdio: 'inherit' });

  // Marquer l'architecture
  fs.writeFileSync(
    path.join(runtimeDir, '.arch'),
    arch
  );

  const size = execSync(`du -sh "${runtimeDir}"`).toString().trim();
  console.log(`JRE created successfully (${size})`);
}

function copyLanguageTool() {
  const ltDir = path.join(RESOURCES_DIR, 'languagetool');
  const sourceDir = path.join(TEMP_DIR, 'languagetool');

  // Nettoyer si existe
  if (fs.existsSync(ltDir)) {
    fs.rmSync(ltDir, { recursive: true });
  }

  console.log('Copying LanguageTool...');
  fs.mkdirSync(ltDir, { recursive: true });

  // Copier languagetool-server.jar
  const serverJar = path.join(sourceDir, 'languagetool-server.jar');
  if (fs.existsSync(serverJar)) {
    fs.copyFileSync(serverJar, path.join(ltDir, 'languagetool-server.jar'));
  } else {
    throw new Error('languagetool-server.jar not found!');
  }

  // Copier le dossier libs (contient toutes les dépendances)
  const libsSrc = path.join(sourceDir, 'libs');
  const libsDest = path.join(ltDir, 'libs');
  execSync(`cp -r "${libsSrc}" "${libsDest}"`);

  const size = execSync(`du -sh "${ltDir}"`).toString().trim();
  console.log(`LanguageTool copied (${size})`);
}

main();
```

**Note** : Le dossier `org/languagetool` et `META-INF/` SONT nécessaires - ils contiennent les modules de langues pour la détection.

### 3. Structure finale du bundle macOS

```
azeTextCorrector.app/
└── Contents/
    ├── Info.plist
    ├── MacOS/
    │   └── azeTextCorrector           # Binaire Rust
    ├── Resources/
    │   ├── icon.icns
    │   ├── runtime/                    # ~50 MB (JRE minimal)
    │   │   ├── bin/
    │   │   │   └── java
    │   │   ├── conf/
    │   │   ├── lib/
    │   │   └── .arch                   # Marqueur d'architecture
    │   └── languagetool/               # ~180 MB
    │       ├── languagetool-server.jar
    │       └── libs/                   # Dépendances (ressources incluses)
    └── _CodeSignature/
```

**Note** : Pas de dossier `org/` - les ressources linguistiques sont dans les JARs de `libs/`.

### 4. Commandes de build

```bash
# macOS Apple Silicon (M1/M2/M3)
npm run build:macos

# macOS Intel
npm run build:macos-x64

# Les deux (Universal binary) - nécessite lipo
npm run build:macos && npm run build:macos-x64
# Puis combiner avec lipo (script séparé)
```

### 5. GitHub Actions (CI/CD)

**.github/workflows/build.yml** :
```yaml
name: Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-macos:
    runs-on: macos-latest
    strategy:
      matrix:
        include:
          - target: aarch64-apple-darwin
            arch: arm64
          - target: x86_64-apple-darwin
            arch: x64

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17.0.13+11'  # Ou 17.0.17+10 selon disponibilité CI
          architecture: ${{ matrix.arch }}

      - name: Cache LanguageTool download
        uses: actions/cache@v4
        with:
          path: .cache
          key: languagetool-6.6

      - name: Install dependencies
        run: npm ci

      - name: Prepare assets
        run: npm run build:assets:macos-${{ matrix.arch }}

      - name: Rust cache
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri

      - name: Build Tauri app
        run: npx tauri build --target ${{ matrix.target }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: macos-${{ matrix.target }}
          path: |
            src-tauri/target/${{ matrix.target }}/release/bundle/dmg/*.dmg
            src-tauri/target/${{ matrix.target }}/release/bundle/macos/*.app
```

**Points clés** :
- `dtolnay/rust-toolchain@stable` (pas rust-action)
- Cache npm, Rust et LanguageTool pour éviter les timeouts
- Java architecture spécifiée pour arm64/x64
- Matrix avec `include` pour mapper target → arch

## Tailles réelles (2026-01-14)

| Composant | arm64 | Notes |
|-----------|-------|-------|
| App Tauri (Rust) | ~5 MB | Binaire optimisé |
| JRE minimal | ~46 MB | Via jlink |
| LanguageTool + org/ + META-INF/ | ~390 MB | Inclut modules de langues |
| **Total .app** | **~442 MB** | Plus grand que prévu |
| **DMG compressé** | **~272 MB** | Compression standard |

> Note: La taille est plus grande que l'estimation initiale car `org/` et `META-INF/` sont nécessaires pour le chargement des modules de langue.

## Critères d'acceptation

- [x] Build arm64 fonctionne et produit un .app valide
- [ ] Build x86_64 fonctionne et produit un .app valide (non testé)
- [x] DMG se génère correctement
- [x] L'app se lance sur macOS
- [x] LanguageTool démarre correctement depuis le bundle
- [x] Script de build reproductible (`scripts/build-production.sh`)

## Tâches techniques

1. Créer le script `prepare-assets.js`
2. Configurer `tauri.conf.json` avec les ressources
3. Tester le build arm64
4. Tester le build x86_64
5. Créer le workflow GitHub Actions
6. Documenter le processus de release

## Vérification de la taille finale

### Script de vérification (`scripts/check-bundle-size.sh`)

```bash
#!/bin/bash
# Vérifie que le bundle respecte les contraintes de taille

MAX_APP_SIZE_MB=260
MAX_DMG_SIZE_MB=180

APP_PATH="$1"
DMG_PATH="$2"

if [ -z "$APP_PATH" ]; then
    APP_PATH="src-tauri/target/release/bundle/macos/azeTextCorrector.app"
fi

if [ -z "$DMG_PATH" ]; then
    DMG_PATH="src-tauri/target/release/bundle/dmg/azeTextCorrector_*.dmg"
fi

echo "=== Bundle Size Report ==="
echo ""

# Vérifier .app
if [ -d "$APP_PATH" ]; then
    APP_SIZE=$(du -sm "$APP_PATH" | cut -f1)
    echo "📦 App bundle: ${APP_SIZE} MB"

    # Détail par composant
    echo "   ├── Runtime (JRE): $(du -sm "$APP_PATH/Contents/Resources/runtime" 2>/dev/null | cut -f1 || echo "N/A") MB"
    echo "   ├── LanguageTool: $(du -sm "$APP_PATH/Contents/Resources/languagetool" 2>/dev/null | cut -f1 || echo "N/A") MB"
    echo "   └── Binary: $(du -sm "$APP_PATH/Contents/MacOS" 2>/dev/null | cut -f1 || echo "N/A") MB"

    if [ "$APP_SIZE" -gt "$MAX_APP_SIZE_MB" ]; then
        echo "❌ ERREUR: App trop grosse ($APP_SIZE MB > $MAX_APP_SIZE_MB MB)"
        exit 1
    else
        echo "✅ App OK (< $MAX_APP_SIZE_MB MB)"
    fi
else
    echo "⚠️  App not found at $APP_PATH"
fi

echo ""

# Vérifier DMG
DMG_FILE=$(ls $DMG_PATH 2>/dev/null | head -1)
if [ -f "$DMG_FILE" ]; then
    DMG_SIZE=$(du -sm "$DMG_FILE" | cut -f1)
    echo "💿 DMG: ${DMG_SIZE} MB"

    if [ "$DMG_SIZE" -gt "$MAX_DMG_SIZE_MB" ]; then
        echo "❌ ERREUR: DMG trop gros ($DMG_SIZE MB > $MAX_DMG_SIZE_MB MB)"
        exit 1
    else
        echo "✅ DMG OK (< $MAX_DMG_SIZE_MB MB)"
    fi
else
    echo "⚠️  DMG not found"
fi

echo ""
echo "=== Fin du rapport ==="
```

### Tailles cibles

| Composant | Cible | Maximum |
|-----------|-------|---------|
| JRE minimal (runtime/) | ~50 MB | 70 MB |
| LanguageTool (languagetool/) | ~180 MB | 200 MB |
| Binaire Tauri | ~5 MB | 10 MB |
| **App totale** | **~235 MB** | **260 MB** |
| **DMG compressé** | **~150 MB** | **180 MB** |

## Code Signing et Notarization (optionnel)

### Prérequis Apple Developer

Pour distribuer hors App Store sans avertissement Gatekeeper :
1. Compte Apple Developer ($99/an)
2. Certificat "Developer ID Application"
3. Notarization via `notarytool`

### Configuration tauri.conf.json (avec signing)

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "entitlements": "./entitlements.plist",
      "providerShortName": "TEAM_ID"
    }
  }
}
```

### Fichier entitlements.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
</dict>
</plist>
```

**Note** : `allow-unsigned-executable-memory` et `allow-jit` sont requis pour Java/JRE.

### Processus de notarization

```bash
# 1. Build l'app signée
npm run build:macos

# 2. Créer un ZIP pour notarization
ditto -c -k --keepParent \
    "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/azeTextCorrector.app" \
    "azeTextCorrector.zip"

# 3. Soumettre pour notarization
xcrun notarytool submit "azeTextCorrector.zip" \
    --apple-id "your@email.com" \
    --team-id "TEAM_ID" \
    --password "@keychain:AC_PASSWORD" \
    --wait

# 4. Staple le ticket (pour distribution offline)
xcrun stapler staple \
    "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/azeTextCorrector.app"

# 5. Recréer le DMG avec l'app staplée
npm run build:dmg  # ou refaire le bundle
```

### Sans code signing (développement)

Sans signing, macOS affiche un avertissement Gatekeeper :
- L'utilisateur doit faire clic-droit > Ouvrir
- Ou : `xattr -cr azeTextCorrector.app` pour supprimer la quarantaine

**Recommandation** : Pour v1, distribuer sans signing avec instructions claires. Ajouter la notarization en v1.1.

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| JRE incompatible entre archs | Build cassé | Générer JRE par arch séparément |
| Taille excessive | UX dégradée | Compression DMG, strip debug |
| Code signing requis | Distribution bloquée | Notarization Apple (future) |
| CI/CD timeout | Release bloquée | Cache des assets |

## Notes pour Windows/Linux (future)

### Windows
- JRE : Même approche avec jlink, cibler `x86_64-pc-windows-msvc`
- Installer : NSIS ou MSI via Tauri
- Path : `%LOCALAPPDATA%\azeTextCorrector\`

### Linux
- JRE : jlink pour `x86_64-unknown-linux-gnu`
- Packages : AppImage (universel), .deb, .rpm via Tauri
- Path : `~/.local/share/azeTextCorrector/`

## Dépendances

- Stories 01, 02, 03, 05 complétées (architecture, backend, dictionnaire, frontend)
- JDK 17+ installé pour jlink
- Rust toolchain avec targets cross-compilation
