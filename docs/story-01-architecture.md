# Story 01 - Architecture technique et choix du moteur

## Statut
- [x] Implémenté (2026-01-14)

## Objectif

Définir et mettre en place l'architecture technique pour embarquer LanguageTool dans l'application Tauri sans dépendance externe.

## Contexte

L'application actuelle utilise LanguageTool via Docker (port 8010). L'objectif est d'avoir une application autonome qui embarque tout le nécessaire pour fonctionner hors-ligne.

## Solution technique retenue

### LanguageTool Server embarqué avec JRE minimal

```
┌────────────────────────────────────────────────────────────┐
│                    Bundle Application                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐     ┌──────────────────────────────┐ │
│  │   Tauri App      │     │    LanguageTool Bundle       │ │
│  │   (Rust)         │     │                              │ │
│  │                  │     │  ┌────────────────────────┐  │ │
│  │  - Gestion       │────▶│  │ JRE Minimal (jlink)    │  │ │
│  │    processus     │     │  │ ~40-60 MB              │  │ │
│  │  - Communication │     │  └────────────────────────┘  │ │
│  │    HTTP locale   │     │                              │ │
│  │  - Dictionnaire  │     │  ┌────────────────────────┐  │ │
│  │    personnalisé  │     │  │ LanguageTool Server    │  │ │
│  │                  │     │  │ + French Resources     │  │ │
│  └──────────────────┘     │  │ ~150-200 MB            │  │ │
│                           │  └────────────────────────┘  │ │
│                           └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Spécifications détaillées

### 1. JRE Minimal avec jlink

**Objectif** : Créer un runtime Java minimal contenant uniquement les modules nécessaires.

**Modules requis pour LanguageTool** :
```bash
# JDK 17+
$JAVA_HOME/bin/jlink \
    --add-modules java.base,java.logging,java.xml,java.naming,java.management,java.sql,java.instrument \
    --output runtime \
    --strip-debug \
    --compress zip-6 \
    --no-header-files \
    --no-man-pages
```

**Note** : `--compress=2` est obsolète, utiliser `--compress zip-6` (JDK 17+) ou `--compress=2` (JDK 11-16).

**Taille cible** : 40-60 MB (vs ~300 MB pour un JRE complet)

### 2. LanguageTool Server

**Version** : LanguageTool 6.x (dernière stable)

**Mode** : Serveur HTTP local

**Commande de lancement** :
```bash
./runtime/bin/java \
    -Xms128m \
    -Xmx256m \
    -XX:+UseSerialGC \
    -jar languagetool-server.jar \
    --port 8081 \
    --allow-origin "*"
```

**Port** : 8081 (interne, différent de 8010 pour éviter conflits avec Docker)

### 3. Structure LanguageTool

**Important** : Les ressources linguistiques sont DANS les JARs, pas à côté.

**Fichiers requis** :
```
languagetool/
├── languagetool-server.jar      # Serveur HTTP + core
└── libs/                         # Dépendances (copiées depuis le zip officiel)
    ├── languagetool-core-6.x.jar
    ├── language-fr-6.x.jar       # Module français
    ├── hunspell-1.x.jar
    ├── morfologik-*.jar
    └── ... (autres dépendances)
```

**Note** : Le classpath est géré par le manifest du JAR principal, pas besoin de `-cp`.

### 4. Structure des ressources dans le bundle macOS

```
azeTextCorrector.app/
└── Contents/
    └── Resources/
        ├── runtime/                    # JRE minimal (~50 MB)
        │   ├── bin/
        │   │   └── java
        │   ├── lib/
        │   └── conf/
        └── languagetool/               # LanguageTool (~180 MB)
            ├── languagetool-server.jar
            └── libs/
```

### 5. Déterminer les modules Java nécessaires

Pour trouver les modules exacts requis par LanguageTool :

```bash
# Analyser les dépendances du JAR
jdeps --print-module-deps languagetool-server.jar libs/*.jar
```

Résultat typique : `java.base,java.logging,java.xml,java.naming,java.management,java.sql`

## Critères d'acceptation

- [ ] JRE minimal généré avec jlink (< 60 MB)
- [ ] LanguageTool server démarre en < 3 secondes
- [ ] API accessible sur localhost:8081
- [ ] Correction française fonctionnelle (orthographe + grammaire)
- [ ] Taille totale du bundle < 250 MB
- [ ] Pas de dépendance Java système
- [ ] Fonctionne sur macOS arm64 et x86_64

## Tâches techniques

### Phase 1 : Préparation des assets

1. **Télécharger LanguageTool**
   ```bash
   curl -LO https://languagetool.org/download/LanguageTool-6.6.zip
   unzip LanguageTool-6.6.zip
   ```

2. **Analyser les modules Java requis**
   ```bash
   cd LanguageTool-6.6
   jdeps --print-module-deps languagetool-server.jar libs/*.jar
   ```

3. **Créer le JRE minimal**
   ```bash
   $JAVA_HOME/bin/jlink \
       --add-modules <modules-from-jdeps> \
       --output runtime \
       --strip-debug \
       --compress zip-6 \
       --no-header-files \
       --no-man-pages
   ```

4. **Tester le lancement**
   ```bash
   ./runtime/bin/java -jar languagetool-server.jar --port 8081
   curl http://localhost:8081/v2/languages
   ```

### Phase 2 : Intégration Tauri

Voir [Story 02](./story-02-backend-tauri.md)

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Modules Java manquants | LT ne démarre pas | Utiliser jdeps pour analyser |
| Taille trop importante | UX dégradée | Strip debug, compress max |
| JRE arm64 vs x86_64 | Build par arch | Générer JRE séparément par arch |
| Mises à jour LT | Maintenance | Script d'update automatisé |

## Dépendances

- **JDK** : Temurin 17 LTS (dernière version 17.x disponible)
  - macOS arm64 : https://adoptium.net/temurin/releases/?os=mac&arch=aarch64&package=jdk&version=17
  - macOS x64 : https://adoptium.net/temurin/releases/?os=mac&arch=x64&package=jdk&version=17
- **LanguageTool** : 6.6 (dernière version traditionnelle avant snapshots)
  - URL : https://languagetool.org/download/LanguageTool-6.6.zip
  - Alternative : https://languagetool.org/download/snapshots/ (snapshots quotidiens)
  - SHA256 : (à vérifier lors du téléchargement)
- **Tauri** : 2.9+ (dernière stable : 2.9.5)

## Versions recommandées

```bash
# .tool-versions ou équivalent
java temurin-17  # Dernière version 17 LTS disponible
languagetool 6.6
```

**Note** : Utiliser la dernière version 17.x LTS disponible (ex: 17.0.13, 17.0.14, etc.). La version exacte n'est pas critique tant que c'est du JDK 17.

**Note** : Depuis mars 2025, LanguageTool utilise un modèle de snapshots quotidiens.
La version 6.6 est la dernière release traditionnelle. Pour les nouvelles features,
utiliser les snapshots : https://languagetool.org/download/snapshots/

## Tests de validation

### Test 1 : Vérifier que le JRE démarre
```bash
./runtime/bin/java -version
# Doit afficher : openjdk version "17.0.x"
```

### Test 2 : Vérifier que LT démarre
```bash
./runtime/bin/java -jar languagetool-server.jar --port 8081 &
sleep 3
curl -s http://localhost:8081/v2/languages | grep -q '"fr"'
echo $?  # Doit retourner 0
```

### Test 3 : Vérifier la correction française
```bash
curl -s -X POST http://localhost:8081/v2/check \
  -d "language=fr" \
  -d "text=Je suis fatiqué" | grep -q "fatigué"
echo $?  # Doit retourner 0 (fatigué suggéré)
```

### Test 4 : Vérifier la grammaire
```bash
curl -s -X POST http://localhost:8081/v2/check \
  -d "language=fr" \
  -d "text=Il a manger une pomme" | grep -q "mangé"
echo $?  # Doit retourner 0 (participe passé)
```

## Gestion des erreurs

### Si jdeps échoue
```bash
# Fallback : utiliser les modules connus
MODULES="java.base,java.logging,java.xml,java.naming,java.management,java.sql"

# Si LT ne démarre pas, ajouter un par un :
# java.desktop, java.instrument, java.net.http
```

### Si le port 8081 est occupé
Le backend Rust (story 02) doit :
1. Vérifier si le port est libre avant de démarrer LT
2. Si occupé, tester si c'est déjà notre instance de LT
3. Sinon, essayer les ports 8082, 8083, etc.

## Estimation complexité

**Effort** : Moyen
**Points de vigilance** : Modules jlink, compatibilité arm64/x86_64
