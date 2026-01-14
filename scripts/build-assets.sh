#!/bin/bash
# =============================================================================
# build-assets.sh - Prepare LanguageTool and minimal JRE for azeTextCorrector
# =============================================================================
# This script downloads LanguageTool and creates a minimal JRE using jlink.
# Run this script before building the Tauri app.
#
# Requirements:
#   - JDK 17+ installed (for jlink)
#   - curl
#   - unzip
#
# Usage:
#   ./scripts/build-assets.sh
#
# Output:
#   resources/
#   ├── runtime/        # Minimal JRE (~50 MB)
#   └── languagetool/   # LanguageTool server + libs (~180 MB)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LANGUAGETOOL_VERSION="6.6"
LANGUAGETOOL_URL="https://languagetool.org/download/LanguageTool-${LANGUAGETOOL_VERSION}.zip"
LANGUAGETOOL_ZIP="LanguageTool-${LANGUAGETOOL_VERSION}.zip"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESOURCES_DIR="$PROJECT_ROOT/resources"
TEMP_DIR="$PROJECT_ROOT/.tmp-build"

# Required Java modules for LanguageTool
# Determined by: jdeps --print-module-deps languagetool-server.jar libs/*.jar
# jdk.httpserver is required for com.sun.net.httpserver.HttpHandler (LT HTTP server)
JAVA_MODULES="java.base,java.logging,java.xml,java.naming,java.management,java.sql,java.desktop,java.instrument,jdk.httpserver"

# =============================================================================
# Helper functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_java() {
    if ! command -v java &> /dev/null; then
        log_error "Java not found. Please install JDK 17+."
        exit 1
    fi

    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [ "$JAVA_VERSION" -lt 17 ]; then
        log_error "Java 17+ required. Found: $JAVA_VERSION"
        exit 1
    fi
    log_success "Java $JAVA_VERSION found"
}

check_jlink() {
    if ! command -v jlink &> /dev/null; then
        # Try JAVA_HOME
        if [ -n "$JAVA_HOME" ] && [ -f "$JAVA_HOME/bin/jlink" ]; then
            JLINK="$JAVA_HOME/bin/jlink"
        else
            log_error "jlink not found. Make sure JDK (not JRE) is installed."
            exit 1
        fi
    else
        JLINK="jlink"
    fi
    log_success "jlink found: $JLINK"
}

cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        log_info "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}

trap cleanup EXIT

# =============================================================================
# Main script
# =============================================================================

echo ""
echo "=============================================="
echo "  azeTextCorrector - Build Assets"
echo "=============================================="
echo ""

# Check requirements
log_info "Checking requirements..."
check_java
check_jlink

# Create directories
log_info "Creating directories..."
mkdir -p "$RESOURCES_DIR"
mkdir -p "$TEMP_DIR"

# =============================================================================
# Step 1: Download LanguageTool
# =============================================================================

if [ -d "$RESOURCES_DIR/languagetool" ] && [ -f "$RESOURCES_DIR/languagetool/languagetool-server.jar" ]; then
    log_warn "LanguageTool already exists, skipping download"
else
    log_info "Downloading LanguageTool $LANGUAGETOOL_VERSION..."

    if [ -f "$TEMP_DIR/$LANGUAGETOOL_ZIP" ]; then
        log_warn "Using cached download"
    else
        curl -L -o "$TEMP_DIR/$LANGUAGETOOL_ZIP" "$LANGUAGETOOL_URL"
    fi

    log_info "Extracting LanguageTool..."
    unzip -q "$TEMP_DIR/$LANGUAGETOOL_ZIP" -d "$TEMP_DIR"

    log_info "Copying LanguageTool files..."
    mkdir -p "$RESOURCES_DIR/languagetool"
    cp "$TEMP_DIR/LanguageTool-$LANGUAGETOOL_VERSION/languagetool-server.jar" "$RESOURCES_DIR/languagetool/"
    cp -r "$TEMP_DIR/LanguageTool-$LANGUAGETOOL_VERSION/libs" "$RESOURCES_DIR/languagetool/"

    # Copy language modules (org/ and META-INF/ contain language definitions)
    cp -r "$TEMP_DIR/LanguageTool-$LANGUAGETOOL_VERSION/org" "$RESOURCES_DIR/languagetool/"
    cp -r "$TEMP_DIR/LanguageTool-$LANGUAGETOOL_VERSION/META-INF" "$RESOURCES_DIR/languagetool/"

    log_success "LanguageTool $LANGUAGETOOL_VERSION installed"
fi

# =============================================================================
# Step 2: Create minimal JRE with jlink
# =============================================================================

if [ -d "$RESOURCES_DIR/runtime" ] && [ -f "$RESOURCES_DIR/runtime/bin/java" ]; then
    log_warn "JRE runtime already exists, skipping creation"
else
    log_info "Creating minimal JRE with jlink..."
    log_info "Modules: $JAVA_MODULES"

    # Remove existing runtime if incomplete
    rm -rf "$RESOURCES_DIR/runtime"

    # Detect compression flag based on Java version
    JAVA_MAJOR_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [ "$JAVA_MAJOR_VERSION" -ge 21 ]; then
        COMPRESS_FLAG="--compress=zip-6"
    else
        COMPRESS_FLAG="--compress=2"
    fi

    $JLINK \
        --add-modules "$JAVA_MODULES" \
        --output "$RESOURCES_DIR/runtime" \
        --strip-debug \
        $COMPRESS_FLAG \
        --no-header-files \
        --no-man-pages

    log_success "Minimal JRE created"
fi

# =============================================================================
# Step 3: Verify installation
# =============================================================================

echo ""
log_info "Verifying installation..."

# Check Java
if [ -f "$RESOURCES_DIR/runtime/bin/java" ]; then
    RUNTIME_VERSION=$("$RESOURCES_DIR/runtime/bin/java" -version 2>&1 | head -n 1)
    log_success "Runtime: $RUNTIME_VERSION"
else
    log_error "Runtime java binary not found!"
    exit 1
fi

# Check LanguageTool
if [ -f "$RESOURCES_DIR/languagetool/languagetool-server.jar" ]; then
    LT_SIZE=$(du -sh "$RESOURCES_DIR/languagetool" | cut -f1)
    log_success "LanguageTool: $LT_SIZE"
else
    log_error "LanguageTool JAR not found!"
    exit 1
fi

# Calculate sizes
RUNTIME_SIZE=$(du -sh "$RESOURCES_DIR/runtime" | cut -f1)
LT_SIZE=$(du -sh "$RESOURCES_DIR/languagetool" | cut -f1)
TOTAL_SIZE=$(du -sh "$RESOURCES_DIR" | cut -f1)

echo ""
echo "=============================================="
echo "  Build Complete!"
echo "=============================================="
echo ""
echo "  Runtime (JRE):     $RUNTIME_SIZE"
echo "  LanguageTool:      $LT_SIZE"
echo "  Total:             $TOTAL_SIZE"
echo ""
echo "  Location: $RESOURCES_DIR"
echo ""

# =============================================================================
# Step 4: Quick test (optional)
# =============================================================================

read -p "Run quick test? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Starting LanguageTool server for quick test..."

    "$RESOURCES_DIR/runtime/bin/java" \
        -Xms128m \
        -Xmx256m \
        -XX:+UseSerialGC \
        -jar "$RESOURCES_DIR/languagetool/languagetool-server.jar" \
        --port 8081 \
        --allow-origin "*" &

    LT_PID=$!

    log_info "Waiting for server to start..."
    sleep 5

    log_info "Testing French correction..."
    RESULT=$(curl -s -X POST http://localhost:8081/v2/check \
        -d "language=fr" \
        -d "text=Je suis fatiqué" 2>&1)

    if echo "$RESULT" | grep -q "fatigué"; then
        log_success "Correction test passed! 'fatiqué' -> 'fatigué'"
    else
        log_warn "Correction test may have failed. Response: $RESULT"
    fi

    log_info "Stopping test server..."
    kill $LT_PID 2>/dev/null || true

    echo ""
    log_success "Quick test complete"
fi

echo ""
log_success "Assets ready for Tauri build!"
echo ""
