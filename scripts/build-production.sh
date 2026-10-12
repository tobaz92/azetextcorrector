#!/bin/bash
# =============================================================================
# build-production.sh - Build azeTextCorrector for production release
# =============================================================================
# This script builds the production app bundle for macOS.
#
# Requirements:
#   - Grammalecte downloaded (run build-assets.sh first)
#   - Rust toolchain installed
#   - Node.js 18+ installed
#
# Usage:
#   ./scripts/build-production.sh [--target <target>]
#
# Targets:
#   - aarch64-apple-darwin (Apple Silicon, default)
#   - x86_64-apple-darwin (Intel)
#   - universal (both architectures)
#
# Output:
#   src-tauri/target/<target>/release/bundle/
#   ├── dmg/azeTextCorrector_<version>_<arch>.dmg
#   └── macos/azeTextCorrector.app
# =============================================================================

set -e

# Source cargo environment
source "$HOME/.cargo/env" 2>/dev/null || true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
TARGET="aarch64-apple-darwin"
while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--target <target>]"
            echo ""
            echo "Targets:"
            echo "  aarch64-apple-darwin  - Apple Silicon (default)"
            echo "  x86_64-apple-darwin   - Intel"
            echo "  universal             - Both architectures"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENGINE_DIR="$PROJECT_ROOT/web/grammalecte"
TAURI_DIR="$PROJECT_ROOT/src-tauri"

echo ""
echo "=============================================="
echo "  azeTextCorrector - Production Build"
echo "=============================================="
echo ""
echo "  Target: $TARGET"
echo ""

# =============================================================================
# Step 1: Verify requirements
# =============================================================================

log_info "Checking requirements..."

# Check the grammar engine is present (embedded in the binary with web/)
if [ ! -f "$ENGINE_DIR/VERSION" ]; then
    log_error "Grammalecte not found. Run ./scripts/build-assets.sh first."
    exit 1
fi
log_success "Grammalecte $(cat "$ENGINE_DIR/VERSION") found"

# Check Rust toolchain
if ! command -v cargo &> /dev/null; then
    log_error "Cargo not found. Please install Rust."
    exit 1
fi
log_success "Rust toolchain found"

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js 18+."
    exit 1
fi
log_success "Node.js found"

# Check target is installed
if [ "$TARGET" != "universal" ]; then
    if ! rustup target list --installed | grep -q "$TARGET"; then
        log_info "Installing Rust target: $TARGET"
        rustup target add "$TARGET"
    fi
    log_success "Rust target $TARGET installed"
fi

# =============================================================================
# Step 2: Build the app
# =============================================================================

cd "$PROJECT_ROOT"

if [ "$TARGET" == "universal" ]; then
    log_info "Building universal binary (arm64 + x86_64)..."

    # Build for Apple Silicon
    log_info "Building for aarch64-apple-darwin..."
    npx tauri build --target aarch64-apple-darwin

    # Build for Intel
    log_info "Building for x86_64-apple-darwin..."
    npx tauri build --target x86_64-apple-darwin

    # TODO: Combine with lipo for true universal binary
    log_warn "Universal binary creation requires additional lipo step (not implemented)"

else
    log_info "Building for $TARGET..."
    npx tauri build --target "$TARGET"
fi

# =============================================================================
# Step 3: Verify the build
# =============================================================================

log_info "Verifying build..."

if [ "$TARGET" == "universal" ]; then
    BUILD_DIR="$TAURI_DIR/target/aarch64-apple-darwin/release/bundle"
else
    BUILD_DIR="$TAURI_DIR/target/$TARGET/release/bundle"
fi

APP_PATH="$BUILD_DIR/macos/azeTextCorrector.app"
DMG_PATH=$(ls "$BUILD_DIR/dmg/"*.dmg 2>/dev/null | head -1)

if [ ! -d "$APP_PATH" ]; then
    log_error "App bundle not found at $APP_PATH"
    exit 1
fi
log_success "App bundle created"

# Calculate sizes
APP_SIZE=$(du -sh "$APP_PATH" | cut -f1)

echo ""
echo "=============================================="
echo "  Build Complete!"
echo "=============================================="
echo ""
echo "  App Bundle:     $APP_SIZE"
echo ""

if [ -f "$DMG_PATH" ]; then
    DMG_SIZE=$(du -sh "$DMG_PATH" | cut -f1)
    echo "  DMG:            $DMG_SIZE"
    echo ""
    echo "  Output:"
    echo "    - $APP_PATH"
    echo "    - $DMG_PATH"
else
    echo "  Output:"
    echo "    - $APP_PATH"
fi

echo ""

# Size warnings
APP_SIZE_MB=$(du -sm "$APP_PATH" | cut -f1)
if [ "$APP_SIZE_MB" -gt 30 ]; then
    log_warn "App size ($APP_SIZE_MB MB) is larger than expected (target: <30 MB)"
fi

log_success "Production build ready!"
echo ""
