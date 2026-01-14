#!/bin/bash
# =============================================================================
# check-env.sh - Verify development environment for azeTextCorrector
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=============================================="
echo "  azeTextCorrector - Environment Check"
echo "=============================================="
echo ""

ERRORS=0

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}[OK]${NC} Node.js: $NODE_VERSION"
else
    echo -e "${RED}[MISSING]${NC} Node.js not found"
    ERRORS=$((ERRORS + 1))
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}[OK]${NC} npm: $NPM_VERSION"
else
    echo -e "${RED}[MISSING]${NC} npm not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version | cut -d' ' -f2)
    echo -e "${GREEN}[OK]${NC} Rust: $RUST_VERSION"
else
    echo -e "${RED}[MISSING]${NC} Rust not found (install via rustup.rs)"
    ERRORS=$((ERRORS + 1))
fi

# Check Cargo
if command -v cargo &> /dev/null; then
    CARGO_VERSION=$(cargo --version | cut -d' ' -f2)
    echo -e "${GREEN}[OK]${NC} Cargo: $CARGO_VERSION"
else
    echo -e "${RED}[MISSING]${NC} Cargo not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Java
JAVA_OUTPUT=$(java -version 2>&1)
if echo "$JAVA_OUTPUT" | grep -q "version"; then
    JAVA_VERSION=$(echo "$JAVA_OUTPUT" | head -n 1 | cut -d'"' -f2)
    JAVA_MAJOR=$(echo $JAVA_VERSION | cut -d'.' -f1)
    if [ "$JAVA_MAJOR" -ge 17 ] 2>/dev/null; then
        echo -e "${GREEN}[OK]${NC} Java: $JAVA_VERSION"
    else
        echo -e "${YELLOW}[WARN]${NC} Java $JAVA_VERSION found, but 17+ required"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}[MISSING]${NC} Java JDK 17+ not found"
    echo -e "         Install: brew install temurin@17"
    ERRORS=$((ERRORS + 1))
fi

# Check jlink
if command -v jlink &> /dev/null; then
    echo -e "${GREEN}[OK]${NC} jlink: available"
else
    if [ -n "$JAVA_HOME" ] && [ -f "$JAVA_HOME/bin/jlink" ]; then
        echo -e "${GREEN}[OK]${NC} jlink: $JAVA_HOME/bin/jlink"
    else
        echo -e "${RED}[MISSING]${NC} jlink not found (part of JDK, not JRE)"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check Tauri CLI
if npm list @tauri-apps/cli &> /dev/null; then
    TAURI_VERSION=$(npm list @tauri-apps/cli --json 2>/dev/null | grep -o '"version": "[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}[OK]${NC} Tauri CLI: $TAURI_VERSION"
else
    echo -e "${YELLOW}[WARN]${NC} Tauri CLI not installed locally"
    echo -e "         Run: npm install"
fi

echo ""
echo "=============================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. npm install"
    echo "  2. npm run build:assets"
    echo "  3. npm run dev"
else
    echo -e "${RED}$ERRORS issue(s) found${NC}"
    echo ""
    echo "Please install missing dependencies before continuing."
fi

echo ""
exit $ERRORS
