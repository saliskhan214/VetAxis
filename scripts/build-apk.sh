#!/bin/bash
set -e

echo "🔨 [VetAxis 360] Compiling Native Android APK..."

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/android/build_tmp"
KEYSTORE_DIR="$ROOT_DIR/android/keystore"
KEYSTORE="$KEYSTORE_DIR/vetaxis-release.keystore"
if [ -f "/opt/android-28.jar" ]; then
    ANDROID_JAR="/opt/android-28.jar"
elif [ -f "/usr/lib/android-sdk/platforms/android-28/android.jar" ]; then
    ANDROID_JAR="/usr/lib/android-sdk/platforms/android-28/android.jar"
else
    ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
fi
R8_JAR="/opt/r8.jar"
APP_DIR="$ROOT_DIR/android/app/src/main"
OUTPUT_APK="$ROOT_DIR/public/downloads/vetaxis360.apk"
OUTPUT_ZIP="$ROOT_DIR/public/downloads/vetaxis360-android-source.zip"

# Ensure R8 jar exists
if [ ! -f "$R8_JAR" ]; then
    echo "⬇️ Downloading Google D8/R8 compiler..."
    mkdir -p /opt
    curl -fsSL -o "$R8_JAR" "https://dl.google.com/android/maven2/com/android/tools/r8/8.2.42/r8-8.2.42.jar"
fi

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/classes" "$BUILD_DIR/dex" "$KEYSTORE_DIR" "$ROOT_DIR/public/downloads"

# 1. Ensure Keystore exists
if [ ! -f "$KEYSTORE" ]; then
    echo "🔑 Generating release keystore..."
    keytool -genkeypair -v \
        -keystore "$KEYSTORE" \
        -alias vetaxis \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass vetaxis360 \
        -keypass vetaxis360 \
        -dname "CN=VetAxis 360, OU=Mobile, O=VetAxis, L=Singapore, C=SG"
fi

# 2. Synchronize compiled web distribution into Android assets
echo "📦 Packaging compiled web distribution into Android assets..."
mkdir -p "$APP_DIR/assets"
echo "⚙️ Building fresh production web bundle..."
(cd "$ROOT_DIR" && npm run build)
rm -rf "$APP_DIR/assets"/*
cp -rf "$ROOT_DIR/dist"/* "$APP_DIR/assets/"
rm -rf "$APP_DIR/assets/downloads" "$APP_DIR/assets/server.cjs"*

# 3. Generate R.java using AAPT
echo "📄 Generating R.java with AAPT..."
aapt package -f -m \
    -J "$BUILD_DIR/gen" \
    -M "$APP_DIR/AndroidManifest.xml" \
    -S "$APP_DIR/res" \
    -I "$ANDROID_JAR"

# 4. Compile Java sources
echo "☕ Compiling Java sources with javac..."
javac -source 8 -target 8 \
    -bootclasspath "$ANDROID_JAR" \
    -d "$BUILD_DIR/classes" \
    "$BUILD_DIR/gen/com/vetaxis/app/R.java" \
    "$APP_DIR/java/com/vetaxis/app/MainActivity.java"

# 5. Convert classes to classes.dex using Google D8
echo "⚡ Converting bytecode to Dalvik/ART classes.dex with Google D8..."
java -cp "$R8_JAR" com.android.tools.r8.D8 \
    --release \
    --min-api 21 \
    --lib "$ANDROID_JAR" \
    --output "$BUILD_DIR/dex" \
    "$BUILD_DIR/classes/com/vetaxis/app"/*.class

# 6. Package base APK with AAPT (resources, binary AndroidManifest.xml, and web assets)
echo "📦 Packaging APK resources, manifest, and assets with AAPT..."
aapt package -f \
    -0 "" \
    -M "$APP_DIR/AndroidManifest.xml" \
    -S "$APP_DIR/res" \
    -A "$APP_DIR/assets" \
    -I "$ANDROID_JAR" \
    -F "$BUILD_DIR/base.apk"

# 7. Add classes.dex to the APK using AAPT
echo "📥 Adding classes.dex to APK package..."
(cd "$BUILD_DIR/dex" && aapt add "$BUILD_DIR/base.apk" classes.dex)

# 8. Align APK on 4-byte boundaries
echo "📐 Zipaligning APK to 4-byte boundaries..."
zipalign -f -p 4 "$BUILD_DIR/base.apk" "$BUILD_DIR/aligned.apk"
zipalign -c 4 "$BUILD_DIR/aligned.apk"

# 9. Sign APK with apksigner (v1, v2, and v3 schemes)
echo "🔏 Cryptographically signing APK with apksigner (v1, v2, v3 schemes)..."
apksigner sign \
    --ks "$KEYSTORE" \
    --ks-key-alias vetaxis \
    --ks-pass pass:vetaxis360 \
    --key-pass pass:vetaxis360 \
    --v1-signing-enabled true \
    --v2-signing-enabled true \
    --v3-signing-enabled true \
    --out "$OUTPUT_APK" \
    "$BUILD_DIR/aligned.apk"

# 10. Verify APK archive structure, alignment and cryptographic signature
echo "🔍 Verifying APK archive alignment and cryptographic signatures..."
zipalign -c -v 4 "$OUTPUT_APK"
apksigner verify -v --print-certs "$OUTPUT_APK"
aapt dump badging "$OUTPUT_APK" | head -n 14

# 11. Sync to dist directory if present
if [ -d "$ROOT_DIR/dist/downloads" ]; then
    cp -f "$OUTPUT_APK" "$ROOT_DIR/dist/downloads/vetaxis360.apk"
    [ -f "$OUTPUT_APK.idsig" ] && cp -f "$OUTPUT_APK.idsig" "$ROOT_DIR/dist/downloads/vetaxis360.apk.idsig"
fi

# 12. Re-pack source zip
echo "🗜️ Updating Android source zip archive..."
cd "$ROOT_DIR"
rm -f "$OUTPUT_ZIP"
python3 -c '
import zipfile, os

zip_path = "public/downloads/vetaxis360-android-source.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk("android"):
        if "build_tmp" in root or "keystore" in root:
            continue
        for f in files:
            full_p = os.path.join(root, f)
            zf.write(full_p, full_p)
'
mkdir -p "$ROOT_DIR/dist/downloads"
cp -f "$OUTPUT_APK"* "$ROOT_DIR/dist/downloads/"
cp -f "$OUTPUT_ZIP" "$ROOT_DIR/dist/downloads/vetaxis360-android-source.zip"

echo "✅ [VetAxis 360] Production APK successfully compiled & verified at: $OUTPUT_APK"
ls -lh "$OUTPUT_APK"

