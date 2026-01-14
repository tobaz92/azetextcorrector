# azeTextCorrector - Version Embarquée (Offline)

## Objectif

Créer une version totalement autonome de l'application de correction grammaticale française, sans aucune dépendance externe :
- Pas de Docker
- Pas d'appels API externes
- Pas de Java pré-installé requis
- Fonctionne 100% hors-ligne

## Todo List

| Status | Story | Description | Dépend de |
|--------|-------|-------------|-----------|
| [x] | [Story 01](./story-01-architecture.md) | Architecture technique et choix du moteur | - |
| [x] | [Story 02](./story-02-backend-tauri.md) | Intégration backend Rust/Tauri | 01 |
| [x] | [Story 03](./story-03-dictionnaire-personnalise.md) | Gestion du dictionnaire personnalisé | 02 |
| [x] | **Story 05 - Frontend** | Interface utilisateur | 02, 03 |
| [x] | ├─ [Story 05a](./story-05a-layout-design-system.md) | Layout et Design System | - |
| [x] | ├─ [Story 05b](./story-05b-editeur-principal.md) | Éditeur principal (input/output) | 05a, 02 |
| [x] | ├─ [Story 05c](./story-05c-corrections-interactives.md) | Corrections interactives | 05b, 03 |
| [x] | └─ [Story 05d](./story-05d-etats-feedback.md) | États et feedback utilisateur | 05a-c |
| [x] | [Story 04](./story-04-packaging.md) | Packaging et distribution | 01-03, 05 |

> **Note** : Story 05 (Frontend) a été découpée en sous-stories (05a-d) pour plus de clarté.
> Story 04 (Packaging) est en dernière position car elle dépend de toutes les autres.

## Processus de validation des stories

Avant de marquer une story comme terminée, **4 étapes obligatoires** doivent être complétées :

### Étape 1 : Audit technique par expert

Un agent expert effectue une revue complète du code implémenté :

| Story | Expert requis | Focus |
|-------|---------------|-------|
| 01 - Architecture | Expert DevOps/Infra | Scripts, JRE, structure bundle |
| 02 - Backend | Expert Rust senior | Async, gestion mémoire, error handling |
| 03 - Dictionnaire | Expert Rust + Frontend | Persistence, UX, synchronisation |
| 05a - Layout | Expert Frontend | CSS, accessibilité, responsive |
| 05b - Éditeur | Expert Frontend | JS, performance, UX |
| 05c - Corrections | Expert Frontend | Interactions, accessibilité |
| 05d - États | Expert Frontend | États, feedback, a11y |
| 04 - Packaging | Expert DevOps | Build, signing, distribution |

**Checklist audit technique** :
- [ ] Code conforme aux bonnes pratiques du langage
- [ ] Pas de code mort ou inutilisé
- [ ] Gestion d'erreurs appropriée
- [ ] Performance acceptable
- [ ] Code maintenable et documenté si nécessaire

### Étape 2 : Audit de sécurité

Un agent spécialisé en sécurité vérifie :

- [ ] **Injection** : Pas d'injection de commandes, XSS, ou SQL
- [ ] **Validation** : Toutes les entrées utilisateur sont validées
- [ ] **Secrets** : Pas de credentials ou tokens en dur
- [ ] **Permissions** : Principe du moindre privilège respecté
- [ ] **Dépendances** : Pas de vulnérabilités connues (CVE)
- [ ] **Données sensibles** : Stockage sécurisé si applicable

### Étape 3 : Vérification de conformité

Vérifier que l'implémentation répond à **tous** les critères d'acceptation de la story :

- [ ] Chaque critère d'acceptation est testé et validé
- [ ] Comportement conforme aux wireframes/maquettes
- [ ] Cas limites et erreurs gérés comme spécifié
- [ ] Intégration correcte avec les dépendances (autres stories)

### Étape 4 : Validation finale

Une fois les 3 étapes précédentes validées :

1. Mettre à jour le statut de la story : `- [x] Implémenté`
2. Documenter les éventuelles déviations par rapport à la spec
3. Créer un commit avec le message : `feat(story-XX): implementation complete`
4. Passer à la story suivante

### Diagramme du processus

```
┌─────────────────────┐
│   Implémentation    │
│   de la story       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  1. Audit technique │────▶│  Corrections si     │
│     par expert      │  ✗  │  problèmes trouvés  │
└──────────┬──────────┘     └──────────┬──────────┘
           │ ✓                         │
           ▼                           │
┌─────────────────────┐                │
│  2. Audit sécurité  │────────────────┤
│                     │  ✗             │
└──────────┬──────────┘                │
           │ ✓                         │
           ▼                           │
┌─────────────────────┐                │
│  3. Conformité aux  │────────────────┘
│     critères story  │  ✗
└──────────┬──────────┘
           │ ✓
           ▼
┌─────────────────────┐
│  4. STORY VALIDÉE   │
│     ──────────────  │
│  Passer à la suite  │
└─────────────────────┘
```

## Résumé des recherches

### Options évaluées

| Solution | Support FR | Taille | Complexité | Verdict |
|----------|-----------|--------|------------|---------|
| nlprule (Rust) | Non | ~50MB | Faible | Rejeté - pas de français |
| Harper (Rust) | Non | ~10MB | Faible | Rejeté - anglais uniquement |
| ltex-ls (Java bundled) | Oui | ~250MB | Moyenne | Viable |
| LanguageTool + JRE | Oui | ~300MB | Moyenne | Viable |
| GraalVM native-image | Oui | ~150MB | Élevée | Expérimental |

### Solution retenue : LanguageTool + JRE minimal embarqué

**Raisons :**
- Support complet du français (orthographe + grammaire + style)
- Projet mature et activement maintenu
- Documentation complète
- Possibilité d'utiliser un JRE minimal (jlink) pour réduire la taille
- API HTTP locale identique à la version Docker actuelle

### Taille estimée de l'application finale

| Composant | Taille estimée |
|-----------|---------------|
| App Tauri (Rust + WebView) | ~5 MB |
| JRE minimal (jlink) | ~40-60 MB |
| LanguageTool FR | ~150-200 MB |
| **Total** | **~200-250 MB** |

## Architecture cible

```
azeTextCorrector.app/
├── Contents/
│   ├── MacOS/
│   │   └── azeTextCorrector          # Binaire Tauri
│   ├── Resources/
│   │   ├── runtime/                   # JRE minimal (jlink)
│   │   │   └── bin/java
│   │   └── languagetool/
│   │       ├── languagetool-server.jar
│   │       └── libs/                  # Dépendances (ressources incluses)
│   └── _CodeSignature/
```

## Flux d'exécution

```
┌─────────────────────────────────────────────────────────────┐
│                    azeTextCorrector                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │   WebView   │───▶│  Rust Core  │───▶│ LanguageTool    │ │
│  │  (Frontend) │    │   (Tauri)   │    │   (Embedded)    │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│        │                  │                    │            │
│        │                  │                    │            │
│        ▼                  ▼                    ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │    HTML     │    │  Commandes  │    │   JRE Minimal   │ │
│  │  CSS / JS   │    │   Tauri     │    │    (jlink)      │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│                    ┌─────────────┐                          │
│                    │ Dictionnaire│                          │
│                    │ Personnalisé│                          │
│                    │   (JSON)    │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Stratégie RAM

LT démarre à la première correction et reste actif jusqu'à fermeture de l'app.

| État de l'app | RAM |
|---------------|-----|
| Au démarrage (LT arrêté) | ~20-30 MB |
| Après première correction | ~200-250 MB |

**Principe simple** :
1. LT ne démarre PAS au lancement de l'app
2. LT démarre à la première correction (~2-3s)
3. LT reste actif jusqu'à fermeture de l'app

Pas de timer d'inactivité - simplicité > micro-optimisation RAM.

## Contraintes

- **macOS** : Version initiale (arm64 + x86_64)
- **Windows/Linux** : Support ultérieur avec la même architecture
- **Taille max acceptable** : 300 MB (disque)
- **Temps de démarrage app** : instantané
- **Temps de démarrage LT** : < 5 secondes (à la demande)
- **Mémoire en utilisation** : < 300 MB RAM

## Sources

- [LanguageTool GitHub](https://github.com/languagetool-org/languagetool)
- [ltex-ls](https://github.com/valentjn/ltex-ls)
- [nlprule](https://github.com/bminixhofer/nlprule) (non retenu)
- [Harper](https://github.com/Automattic/harper) (non retenu)

## Debugging et Troubleshooting

### Accès aux logs

| OS | Commande |
|----|----------|
| macOS | `open ~/Library/Logs/com.azetextcorrector.app/` |
| Windows | `explorer %LOCALAPPDATA%\com.azetextcorrector.app\logs` |
| Linux | `xdg-open ~/.local/share/com.azetextcorrector.app/logs/` |

### Mode debug

```bash
# macOS/Linux - logs verbeux
AZETEXTCORRECTOR_DEBUG=1 ./azeTextCorrector.app/Contents/MacOS/azeTextCorrector

# Windows
set AZETEXTCORRECTOR_DEBUG=1 && azeTextCorrector.exe
```

### Problèmes courants et solutions

#### LanguageTool ne démarre pas

**Symptôme** : Première correction échoue après timeout de 5s

**Logs à chercher** :
```
[ERROR] Failed to start LT: Java not found at /path/to/java
[ERROR] LanguageTool JAR not found at /path/to/jar
```

**Solutions** :
1. Vérifier que `runtime/bin/java` existe dans le bundle
2. Vérifier que `languagetool/languagetool-server.jar` existe
3. Tester manuellement :
   ```bash
   cd /Applications/azeTextCorrector.app/Contents/Resources
   ./runtime/bin/java -jar languagetool/languagetool-server.jar --port 8081
   ```

#### Port 8081 déjà utilisé

**Symptôme** : `Address already in use`

**Logs à chercher** :
```
[WARN] Port 8081 occupied, trying 8082...
[ERROR] No available port in range 8081..8090
```

**Solutions** :
1. Fermer l'application correctement (pas force quit)
2. Tuer le processus Java orphelin :
   ```bash
   pkill -f languagetool-server.jar
   ```
3. Vérifier les ports utilisés :
   ```bash
   lsof -i :8081
   ```

#### Corrections lentes (> 2s)

**Symptôme** : Délai notable avant affichage des corrections

**Logs à chercher** :
```
[INFO] CORRECTION chars=50000 matches=15 duration_ms=3500
```

**Causes possibles** :
1. Texte très long (> 10000 caractères)
2. RAM insuffisante (LT utilise ~200MB)
3. Processeur surchargé

**Solutions** :
1. Diviser le texte en morceaux plus petits
2. Vérifier la RAM disponible
3. Attendre la fin du démarrage de LT (première correction plus lente)

#### Dictionnaire ne se charge pas

**Symptôme** : Mots ignorés ne sont plus reconnus après redémarrage

**Logs à chercher** :
```
[WARN] Dictionary corrupted: expected value at line 1 column 1, creating backup
[INFO] Dictionary loaded: 0 words
```

**Solutions** :
1. Vérifier le fichier JSON :
   ```bash
   cat ~/Library/Application\ Support/com.azetextcorrector.app/dictionary.json
   ```
2. Restaurer depuis backup si existe :
   ```bash
   ls ~/Library/Application\ Support/com.azetextcorrector.app/dictionary.corrupted.*.json
   ```
3. Supprimer et recréer le dictionnaire

#### App ne s'ouvre pas (macOS)

**Symptôme** : "azeTextCorrector is damaged and can't be opened"

**Cause** : Gatekeeper bloque l'app non signée

**Solution** :
```bash
xattr -cr /Applications/azeTextCorrector.app
```

#### DevTools inaccessibles

**Symptôme** : `Cmd+Option+I` ne fait rien

**Solutions** :
1. En dev, lancer avec WebKit Inspector :
   ```bash
   WEBKIT_INSPECTOR_HTTP_SERVER=0.0.0.0:9221 ./azeTextCorrector
   ```
2. Accéder via Safari : Develop → [nom de l'app]

### Commandes de diagnostic

```bash
# Vérifier la structure du bundle
ls -la /Applications/azeTextCorrector.app/Contents/Resources/

# Tester Java embarqué
/Applications/azeTextCorrector.app/Contents/Resources/runtime/bin/java -version

# Tester LanguageTool manuellement
curl -X POST http://localhost:8081/v2/check \
  -d "language=fr" \
  -d "text=Je suis fatiqué"

# Voir les logs en temps réel
tail -f ~/Library/Logs/com.azetextcorrector.app/app.log

# Taille du bundle
du -sh /Applications/azeTextCorrector.app

# Processus Java
ps aux | grep languagetool
```

### Export des logs pour support

Depuis l'app : `Ctrl+Shift+D` → "Exporter les logs"

Ou manuellement :
```bash
# macOS
zip -r ~/Desktop/azetextcorrector-logs.zip ~/Library/Logs/com.azetextcorrector.app/
```

### Niveaux de log

| Niveau | Variable d'env | localStorage |
|--------|---------------|--------------|
| DEBUG (verbeux) | `AZETEXTCORRECTOR_DEBUG=1` | `log_level=0` |
| INFO (défaut) | - | `log_level=1` |
| WARN | - | `log_level=2` |
| ERROR | - | `log_level=3` |
