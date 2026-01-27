#!/usr/bin/env bash
set -euo pipefail

# build-ios.sh - Build iOS app for device/archive
#
# Usage:
#   ./scripts/build-ios.sh              # Debug build (simulator)
#   ./scripts/build-ios.sh release      # Release archive (TestFlight)
#
# Prerequisites:
#   - Xcode installed with iOS SDK
#   - Web assets already built (run build:shared && build:client first)
#   - cap sync already run

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_ROOT/packages/client/ios/App"
XCODEPROJ="$IOS_DIR/App.xcodeproj"
BUILD_DIR="$PROJECT_ROOT/build/ios"
ARCHIVE_PATH="$BUILD_DIR/HeyHey.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"

CONFIGURATION="${1:-debug}"

mkdir -p "$BUILD_DIR"

echo "==> iOS Build: configuration=$CONFIGURATION"
echo "    Project: $XCODEPROJ"
echo "    Output:  $BUILD_DIR"

if [ "$CONFIGURATION" = "release" ]; then
  echo "==> Building Release archive for TestFlight..."
  xcodebuild archive \
    -project "$XCODEPROJ" \
    -scheme "App" \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE_PATH" \
    CODE_SIGN_STYLE=Automatic \
    -allowProvisioningUpdates \
    -quiet

  echo "==> Archive created: $ARCHIVE_PATH"

  # Export for App Store / TestFlight
  if [ -f "$PROJECT_ROOT/scripts/ExportOptions.plist" ]; then
    echo "==> Exporting IPA for TestFlight..."
    xcodebuild -exportArchive \
      -archivePath "$ARCHIVE_PATH" \
      -exportOptionsPlist "$PROJECT_ROOT/scripts/ExportOptions.plist" \
      -exportPath "$EXPORT_PATH" \
      -allowProvisioningUpdates \
      -quiet

    echo "==> IPA exported to: $EXPORT_PATH"
    echo ""
    echo "To upload to TestFlight:"
    echo "  xcrun altool --upload-app -f $EXPORT_PATH/HeyHey.ipa -t ios -u YOUR_APPLE_ID"
    echo "  -- or --"
    echo "  xcrun notarytool (for newer Xcode)"
  else
    echo "==> No ExportOptions.plist found. Archive ready for manual export."
    echo "    Open in Xcode: open $ARCHIVE_PATH"
  fi
else
  # Find an available iPad simulator, fall back to generic
  SIMULATOR_DEST=$(xcrun simctl list devices available -j 2>/dev/null \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if 'iPad' in d.get('name', '') and d.get('isAvailable', False):
            print(f\"platform=iOS Simulator,id={d['udid']}\")
            sys.exit(0)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d.get('isAvailable', False):
            print(f\"platform=iOS Simulator,id={d['udid']}\")
            sys.exit(0)
" 2>/dev/null || true)

  if [ -z "$SIMULATOR_DEST" ]; then
    echo "==> No simulator available. Building for generic iOS Simulator..."
    SIMULATOR_DEST="generic/platform=iOS Simulator"
  fi

  echo "==> Building Debug for: $SIMULATOR_DEST"
  xcodebuild build \
    -project "$XCODEPROJ" \
    -scheme "App" \
    -configuration Debug \
    -destination "$SIMULATOR_DEST" \
    -derivedDataPath "$BUILD_DIR/DerivedData" \
    -quiet

  echo "==> Debug build complete"
fi

echo "==> Done"
