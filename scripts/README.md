# Scripts de build - azeTextCorrector

## Prérequis

### Java JDK 17+

Le script `build-assets.sh` nécessite Java JDK 17+ pour créer le JRE minimal avec jlink.

#### Installation sur macOS

**Option 1 : Homebrew (recommandé)**
```bash
brew install temurin@17
```

**Option 2 : SDKMAN**
```bash
curl -s "https://get.sdkman.io" | bash
sdk install java 17.0.13-tem
```

**Option 3 : Téléchargement direct**
- Visitez https://adoptium.net/temurin/releases/
- Téléchargez le JDK 17 pour macOS (aarch64 pour M1/M2, x64 pour Intel)
- Installez le .pkg

#### Vérification
```bash
java -version
# Doit afficher: openjdk version "17.x.x"

jlink --version
# Doit afficher: 17.x.x
```

## Scripts disponibles

### build-assets.sh

Télécharge LanguageTool et crée le JRE minimal.

```bash
# Depuis la racine du projet
npm run build:assets
# ou directement
./scripts/build-assets.sh
```

**Output** :
```
resources/
├── runtime/        # JRE minimal (~50 MB)
│   └── bin/java
└── languagetool/   # LanguageTool server (~180 MB)
    ├── languagetool-server.jar
    └── libs/
```

### Commandes npm

| Commande | Description |
|----------|-------------|
| `npm run build:assets` | Télécharge LT + crée JRE |
| `npm run build:macos` | Build complet (assets + Tauri) |
| `npm run dev` | Mode développement |
| `npm run clean:assets` | Nettoie les fichiers temporaires |
| `npm run clean:all` | Nettoie tout (resources + node_modules + target) |

## Troubleshooting

### "Unable to locate a Java Runtime"

Java JDK n'est pas installé. Suivez les instructions ci-dessus.

### "jlink not found"

Vous avez peut-être installé un JRE au lieu d'un JDK. jlink fait partie du JDK uniquement.

### LanguageTool ne démarre pas

1. Vérifiez que les fichiers existent :
   ```bash
   ls -la resources/runtime/bin/java
   ls -la resources/languagetool/languagetool-server.jar
   ```

2. Testez manuellement :
   ```bash
   ./resources/runtime/bin/java -jar resources/languagetool/languagetool-server.jar --port 8081
   ```

3. Dans un autre terminal :
   ```bash
   curl http://localhost:8081/v2/languages
   ```
