#!/bin/bash
set -e

SOURCE_ICON="assets/images/icon.png"
RES_DIR="android/app/src/main/res"

if [ ! -f "$SOURCE_ICON" ]; then
  echo "Source icon not found at $SOURCE_ICON"
  exit 1
fi

echo "Generating Android launcher icons and splashscreen logos..."

# Densities and sizes: (folder, launcher_size, foreground_size, splash_size)
declare -a CONFIGS=(
  "mipmap-mdpi:48:108:drawable-mdpi:200"
  "mipmap-hdpi:72:162:drawable-hdpi:300"
  "mipmap-xhdpi:96:216:drawable-xhdpi:400"
  "mipmap-xxhdpi:144:324:drawable-xxhdpi:600"
  "mipmap-xxxhdpi:192:432:drawable-xxxhdpi:800"
)

for item in "${CONFIGS[@]}"; do
  IFS=":" read -r mipmap_folder launcher_sz fg_sz drawable_folder splash_sz <<< "$item"

  TARGET_MIPMAP="$RES_DIR/$mipmap_folder"
  TARGET_DRAWABLE="$RES_DIR/$drawable_folder"

  mkdir -p "$TARGET_MIPMAP"
  mkdir -p "$TARGET_DRAWABLE"

  # Remove old webp files to prevent resource duplication collisions
  rm -f "$TARGET_MIPMAP"/ic_launcher*.webp

  # Generate launcher icons
  sips -z "$launcher_sz" "$launcher_sz" "$SOURCE_ICON" --out "$TARGET_MIPMAP/ic_launcher.png" > /dev/null
  sips -z "$launcher_sz" "$launcher_sz" "$SOURCE_ICON" --out "$TARGET_MIPMAP/ic_launcher_round.png" > /dev/null
  sips -z "$fg_sz" "$fg_sz" "$SOURCE_ICON" --out "$TARGET_MIPMAP/ic_launcher_foreground.png" > /dev/null

  # Generate splash logo
  sips -z "$splash_sz" "$splash_sz" "$SOURCE_ICON" --out "$TARGET_DRAWABLE/splashscreen_logo.png" > /dev/null

  echo "Processed $mipmap_folder ($launcher_sz x $launcher_sz) & $drawable_folder ($splash_sz x $splash_sz)"
done

echo "Icon & Splash generation completed successfully!"
