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
