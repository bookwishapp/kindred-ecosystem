#!/bin/bash

# iOS Icon generation script
SOURCE="/Users/terryheath/Developer/kindred-ecosystem/docs/app logo.png"
IOS_DIR="/Users/terryheath/Developer/kindred-ecosystem/apps/kindred/ios/Runner/Assets.xcassets/AppIcon.appiconset"
ANDROID_DIR="/Users/terryheath/Developer/kindred-ecosystem/apps/kindred/android/app/src/main/res"

echo "Generating iOS icons..."

# iOS icons - using sips for macOS
sips -z 40 40 "$SOURCE" --out "$IOS_DIR/Icon-App-20x20@2x.png"
sips -z 60 60 "$SOURCE" --out "$IOS_DIR/Icon-App-20x20@3x.png"
sips -z 29 29 "$SOURCE" --out "$IOS_DIR/Icon-App-29x29@1x.png"
sips -z 58 58 "$SOURCE" --out "$IOS_DIR/Icon-App-29x29@2x.png"
sips -z 87 87 "$SOURCE" --out "$IOS_DIR/Icon-App-29x29@3x.png"
sips -z 40 40 "$SOURCE" --out "$IOS_DIR/Icon-App-40x40@1x.png"
sips -z 80 80 "$SOURCE" --out "$IOS_DIR/Icon-App-40x40@2x.png"
sips -z 120 120 "$SOURCE" --out "$IOS_DIR/Icon-App-40x40@3x.png"
sips -z 60 60 "$SOURCE" --out "$IOS_DIR/Icon-App-60x60@2x.png"
sips -z 120 120 "$SOURCE" --out "$IOS_DIR/Icon-App-60x60@2x.png"
sips -z 180 180 "$SOURCE" --out "$IOS_DIR/Icon-App-60x60@3x.png"
sips -z 76 76 "$SOURCE" --out "$IOS_DIR/Icon-App-76x76@1x.png"
sips -z 152 152 "$SOURCE" --out "$IOS_DIR/Icon-App-76x76@2x.png"
sips -z 167 167 "$SOURCE" --out "$IOS_DIR/Icon-App-83.5x83.5@2x.png"
sips -z 1024 1024 "$SOURCE" --out "$IOS_DIR/Icon-App-1024x1024@1x.png"

echo "Generating Android icons..."

# Android icons
mkdir -p "$ANDROID_DIR/mipmap-mdpi"
mkdir -p "$ANDROID_DIR/mipmap-hdpi"
mkdir -p "$ANDROID_DIR/mipmap-xhdpi"
mkdir -p "$ANDROID_DIR/mipmap-xxhdpi"
mkdir -p "$ANDROID_DIR/mipmap-xxxhdpi"

sips -z 48 48 "$SOURCE" --out "$ANDROID_DIR/mipmap-mdpi/ic_launcher.png"
sips -z 72 72 "$SOURCE" --out "$ANDROID_DIR/mipmap-hdpi/ic_launcher.png"
sips -z 96 96 "$SOURCE" --out "$ANDROID_DIR/mipmap-xhdpi/ic_launcher.png"
sips -z 144 144 "$SOURCE" --out "$ANDROID_DIR/mipmap-xxhdpi/ic_launcher.png"
sips -z 192 192 "$SOURCE" --out "$ANDROID_DIR/mipmap-xxxhdpi/ic_launcher.png"

# Play Store icon
sips -z 512 512 "$SOURCE" --out "$ANDROID_DIR/../../../playstore-icon.png"

echo "Icon generation complete!"