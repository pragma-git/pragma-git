#!/bin/bash

# Sökväg till din utdatamapp där apparna har byggts
DIST_DIR="${1:-./dist}"  # Fallback to ./dist if no argument

echo " "
echo "================================================================="
echo "🔍 STARTAR AUTOMATISKT CPU-ARKITEKTURTEST FÖR ALLA PLATTFORMAR"
echo "================================================================="
FAILED=0

# --- 1. TESTA MACOS ARM64 ---
echo -n "Checking macOS ARM64... "
if [ -d "$DIST_DIR"/mac_arm64 ]; then
    # Hitta alla .node-filer och kontrollera att de INTE innehåller Intel-kod, utan ARM
    ERRORS=$(find "$DIST_DIR"/mac_arm64 -name "*.node" -exec file {} \; | grep -v "arm64")
    if [ ! -z "$ERRORS" ]; then
        echo "❌ FEL: Hittade icke-ARM-filer i Mac-ARM-bygget!"
        echo "$ERRORS"
        FAILED=1
    else
        echo "✅ OK! (Alla binärer är ren arm64)"
    fi
else
    echo "⚠️ Skippade (Mapp saknas)"
fi

# --- 2. TESTA MACOS INTEL (X64) ---
echo -n "Checking macOS Intel x64... "
if [ -d "$DIST_DIR"/mac ]; then
    # Filer måste vara x86_64
    ERRORS=$(find "$DIST_DIR"/mac -name "*.node" -exec file {} \; | grep -v "x86_64")
    if [ ! -z "$ERRORS" ]; then
        echo "❌ FEL: Hittade icke-Intel-filer i Mac-Intel-bygget!"
        echo "$ERRORS"
        FAILED=1
    else
        echo "✅ OK! (Alla binärer är ren x86_64)"
    fi
else
    echo "⚠️ Skippade (Mapp saknas)"
fi

# --- 3. TESTA WINDOWS (X64) ---
echo -n "Checking Windows x64... "
if [ -d "$DIST_DIR"/win64 ] || [ -d "$DIST_DIR"/*-win64 ]; then
    # Windows-binärer (.node eller .exe) visar PE32+ executable (optional Windows-GUI) x86-64 under 'file'
    ERRORS=$(find "$DIST_DIR"/win64 -name "*.node" -exec file {} \; | grep -v -E "x86-64|PE32\+")
    if [ ! -z "$ERRORS" ]; then
        echo "❌ FEL: Hittade felaktig arkitektur i Windows-bygget!"
        echo "$ERRORS"
        FAILED=1
    else
        echo "✅ OK! (Alla binärer är Windows x64)"
    fi
else
    echo "⚠️ Skippade (Mapp saknas)"
fi

# --- 4. TESTA LINUX (X64) ---
echo -n "Checking Linux x64... "
if [ -d "$DIST_DIR"/Pragma-git-*-linux-x64 ] ; then
    # 1. Hitta filer som INTE matchar Linux x64, men ignorera macOS (Mach-O) och ARM-filer som ligger i multi-pkg mappar
    ERRORS=$(find "$DIST_DIR"/Pragma-git-*-linux-x64/package.nw -name "*.node" -exec file {} \; | grep -v "x86-64" | grep -v "Mach-O" | grep -v "ARM aarch64" | grep -v "darwin")
    
    # 2. Kontrollera att det faktiskt finns minst en giltig Linux x64-binär i bygget (så inte allt rensades bort)
    VALID_LINUX_BIN=$(find "$DIST_DIR"/Pragma-git-*-linux-x64/package.nw -name "*.node" -exec file {} \; | grep "ELF 64-bit.*x86-64")

    if [ ! -z "$ERRORS" ]; then
        echo "❌ FEL: Hittade felaktig arkitektur i Linux-bygget!"
        echo "$ERRORS"
        FAILED=1
    elif [ -z "$VALID_LINUX_BIN" ]; then
        echo "❌ FEL: Hittade inga giltiga Linux x64 (.node) binärer alls!"
        FAILED=1
    else
        echo "✅ OK! (Alla relevanta binärer är Linux x64, Mac/ARM-filer ignorerade)"
    fi
else
    echo "⚠️ Skippade (Mapp \"${DIST_DIR}/Pragma-git-*-linux-x64\" saknas)"
fi


echo "================================================================="
if [ $FAILED -eq 1 ]; then
    echo "🚨 TESTET MISSLYCKADES: En eller flera plattformar har felaktig kod!"
    exit 1
else
    echo "🎉 ALLA TESTER GODKÄNDA: Inga arkitekturkrockar funna i paketen!"
    exit 0
fi
