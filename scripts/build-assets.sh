#!/bin/bash
# =============================================================================
# build-assets.sh - Télécharge le moteur Grammalecte pour azeTextCorrector
# =============================================================================
# Récupère l'extension Firefox officielle de Grammalecte (version figée,
# empreinte SHA-256 vérifiée) et en extrait uniquement le moteur JavaScript
# et les données françaises nécessaires, dans web/grammalecte/.
#
# Requis : curl, unzip, shasum
# Usage  : ./scripts/build-assets.sh
# =============================================================================

set -euo pipefail

GRAMMALECTE_VERSION="2.3.0"
GRAMMALECTE_URL="https://addons.mozilla.org/firefox/downloads/file/4643560/grammalecte_fr-${GRAMMALECTE_VERSION}.xpi"
GRAMMALECTE_SHA256="443030004dbf62ecd5fc42f7b96872b96c9e3765f1cba4704a2a4170bb945256"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="$PROJECT_ROOT/.tmp-build"
TARGET_DIR="$PROJECT_ROOT/web/grammalecte"
ARCHIVE="$TEMP_DIR/grammalecte-${GRAMMALECTE_VERSION}.xpi"

# Sous-ensemble chargé par web/engine-worker.js : le dictionnaire des
# synonymes, les tests et le formateur de texte ne servent pas à la correction.
FILES=(
    graphspell/helpers.js
    graphspell/str_transform.js
    graphspell/char_player.js
    graphspell/lexgraph_fr.js
    graphspell/ibdawg.js
    graphspell/spellchecker.js
    graphspell/tokenizer.js
    graphspell/_dictionaries/fr-allvars.json
    text.js
    fr/conj.js
    fr/conj_data.json
    fr/mfsp.js
    fr/mfsp_data.json
    fr/phonet.js
    fr/phonet_data.json
    fr/cregex.js
    fr/gc_options.js
    fr/gc_functions.js
    fr/gc_rules.js
    fr/gc_rules_graph.js
    fr/gc_engine.js
    README.txt
)

if [ -f "$TARGET_DIR/VERSION" ] && [ "$(cat "$TARGET_DIR/VERSION")" = "$GRAMMALECTE_VERSION" ] && [ -f "$TARGET_DIR/COPYING" ]; then
    echo "[OK] Grammalecte $GRAMMALECTE_VERSION déjà présent dans web/grammalecte/"
    exit 0
fi

mkdir -p "$TEMP_DIR"
trap 'rm -rf "$TEMP_DIR/extract"' EXIT

if [ ! -f "$ARCHIVE" ]; then
    echo "[INFO] Téléchargement de Grammalecte $GRAMMALECTE_VERSION..."
    curl -fL --retry 3 --proto '=https' -o "$ARCHIVE" "$GRAMMALECTE_URL"
fi

echo "$GRAMMALECTE_SHA256  $ARCHIVE" | shasum -a 256 -c -

rm -rf "$TEMP_DIR/extract" "$TARGET_DIR"
unzip -q "$ARCHIVE" 'grammalecte/*' -d "$TEMP_DIR/extract"

for file in "${FILES[@]}"; do
    mkdir -p "$TARGET_DIR/$(dirname "$file")"
    cp "$TEMP_DIR/extract/grammalecte/$file" "$TARGET_DIR/$file"
done
# L'archive ne contient pas le texte de la GPL, exigé quand on redistribue.
cp "$PROJECT_ROOT/licenses/GPL-3.0.txt" "$TARGET_DIR/COPYING"
echo "$GRAMMALECTE_VERSION" > "$TARGET_DIR/VERSION"

echo "[OK] Grammalecte $GRAMMALECTE_VERSION installé ($(du -sh "$TARGET_DIR" | cut -f1))"
