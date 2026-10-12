# Performance Benchmarks

## Baseline (2026-01-14)

### Configuration
- JVM: `-Xms256m -Xmx512m -XX:+UseG1GC -XX:+UseStringDeduplication`
- Warm-up: Enabled (pre-loads French dictionaries)
- HTTP: Connection pooling + keep-alive

### Warm-up Time
- ~4.7s (one-time cost at first correction)

### Correction Times (after warm-up)

| Test | Input | Time |
|------|-------|------|
| 1 | "azeaze" | 0.826s |
| 2 | "azeaze" | 0.817s |
| 3 | "azeaze" | 0.821s |
| 4 | "azeaze" | 0.820s |
| 5 | "azeaze" | 0.845s |

**Average: ~0.82s**

### Before Optimization
- First correction: ~4.8s (including dictionary loading)
- Subsequent: ~1s

### After Optimization
- Warm-up: ~4.7s (moved to startup)
- First real correction: ~1s
- Subsequent: ~0.82s

## Potential Improvements

1. [ ] Disable unused LanguageTool rules
2. [ ] Cache identical requests in Rust
3. [ ] Disable language detection (force "fr")
4. [ ] Use `--fastext` for faster language detection
5. [ ] Reduce JVM GC pauses with ZGC
6. [ ] Pre-compile LanguageTool patterns

## After Preload Optimization (2026-01-14)

### Changes
- Added `preload_lt` command called on app startup
- Disabled WHITESPACE_RULE (slow)
- Warm-up moved to app startup (not first correction)

### Results
| Metric | Before | After |
|--------|--------|-------|
| Warm-up | 4.7s | 4.0s |
| First correction (user-perceived) | ~5s | ~1s |
| Subsequent corrections | 0.82s | 0.76s |

### User Experience
- App shows "Chargement..." during startup (~4s)
- Then shows "Prêt"
- First correction is fast (~1s)

## Target
- Correction time < 500ms

## Notes
- 0.7-1s seems to be the minimum for LanguageTool
- Further optimization would require:
  - Native spell checker (hunspell FFI)
  - Custom trie-based dictionary lookup
  - Pre-compiled pattern matching

## Remplacement de LanguageTool par Grammalecte (2026-10-12)

Mesures sur Apple Silicon, macOS 27.0.1.

### Avant : LanguageTool 6.6 (JVM embarquée)

- `preload_lt` n'a jamais tourné : `StateManager.setStatus` n'existait pas,
  l'exception était levée avant l'appel. LT démarrait donc à la première
  correction (~1,7 s de boot + ~4,2 s de warm-up).
- ~0,75 s par requête, même pour « Bonjour. » : le serveur reconstruisait
  le pipeline de règles à chaque requête (`pipelineCaching` absent).
- JVM : 565 Mo de RSS (`-Xms256m -Xmx512m`, G1).
- Bundle : ~480 Mo (dont ~380 Mo de langues inutilisées).

### Après : Grammalecte 2.3.0 dans un Web Worker + NSSpellChecker

| Mesure | Valeur |
|--------|--------|
| Moteur prêt après lancement | ~0,3 s |
| Phrase courte | 1-3 ms (moteur seul) |
| 5 phrases avec 9 fautes, via l'UI | 45-68 ms |
| 40 paragraphes (3 600 car., 160 fautes), via l'UI | 62 ms |
| Mémoire (phys_footprint) | app 40 Mo + WebContent 101 Mo + réseau 6 Mo |
| Bundle .app | 7,5 Mo |
| Connexions réseau | 0 |

### Limites connues

- « a la plage » : Grammalecte ne signale pas « a » → « à » dans ce cas.
- « Je suis contant » : non détecté (LanguageTool ne le détectait pas non plus).
- Accords à alternatives (« Elle sont belles ») : la première alternative
  proposée porte sur le verbe (« Elle est belles »).

### Mots inconnus : signalés plutôt que remplacés

Texte technique de référence (`cron`, `npm`, `Slack`, `GraphQL`, `payload`,
`pgbouncer`…) : LanguageTool remplaçait 21 mots, la première version
Grammalecte 26 (`cron` → `Crau`, `Slack` → `Clac`). Désormais un mot inconnu
n'est remplacé que si la suggestion n'en diffère que par les accents ou une
lettre (mot de 4 lettres et plus), sans chiffre, majuscule interne, majuscule
hors début de phrase ni mot anglais valide. Le reste est surligné en orange,
intact, avec les suggestions dans le menu.

Résultat : 1 remplacement (`axios` → `axis`), 11 mots signalés. Les fautes
réelles du texte de contrôle restent corrigées (`fatiqué`, `tres`, `demin`,
`maisno`).
