# Maestro E2E Smoke Test Suite

This suite contains 8 automated E2E flows covering the critical paths of Zen-app.

---

## Prerequisites & Installation

1. **Install Maestro CLI** (on host machine):
   ```bash
   curl -FsSL "https://get.maestro.mobile.dev" | bash
   ```
2. **Start an Android Emulator or Connect a Physical Device**:
   ```bash
   adb devices
   ```

> [!CAUTION]
> **RUN FLOWS ON AN ANDROID EMULATOR ONLY**:
> **DO NOT** execute this Maestro test suite on your personal physical phone!
> - **Flow 1 (`01_onboarding_setup.yaml`) invokes `clearState: true`**, which immediately wipes all app storage on the target device.
> - **Flows 3 and 5 create dummy test tasks and routines**.
> - Always run smoke test flows against an isolated emulator instance.

---

## Build & Installation Instructions (Personal Device & E2E Testing)

### Keystore & Signing Warning for Personal Devices:
> [!WARNING]
> `adb install -r` and `expo run:android --variant release` require the **exact same signing keystore** as your currently installed build. If you built your current installed build via EAS Cloud and try to sideload a locally generated APK signed with a different key, Android will fail with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.
> **Never uninstall the app to bypass a signing mismatch**, as uninstalling immediately deletes all local AsyncStorage data.

### Inspect Your Currently Installed Build:
Before building or upgrading, check what permissions your currently installed phone build actually holds:
```bash
adb shell dumpsys package com.anonymous.Zenapp | grep -i foreground
```
*(If empty, your installed build was built from the committed `android/` and lacks foreground audio permissions; if present, it was built via managed prebuild).*

---

### Installation Options:
Choose any of the following methods to install or update the app:

### Option A: Direct Local Install via USB (Fastest for Emulator)
```bash
# Debug dev build:
npx expo run:android --device

# Release build with E2E flag enabled (for Flow 8 smoke testing):
EXPO_PUBLIC_E2E=1 npx expo run:android --variant release --device
```

### Option B: Local APK Build & Sideload (In-place Upgrade Testing)
```bash
# 1. Build release APK directly using Gradle:
cd android && ./gradlew assembleRelease && cd ..

# 2. Sideload over your existing installed build (keeps local data intact):
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Option C: EAS Cloud Build (Standalone Internal Distribution)
```bash
# Builds standalone APK via EAS cloud service:
eas build -p android --profile preview
```
*(In regular builds, `EXPO_PUBLIC_E2E` is unset, so the debug button is completely excluded from the UI).*

---

## Running the Tests

### Run All 8 Flows:
```bash
maestro test .maestro/
```

### Run Individual Flows:
```bash
# 01: Onboarding Setup Flow (clears state on launch)
maestro test .maestro/01_onboarding_setup.yaml

# 02: Today Dashboard Flow
maestro test .maestro/02_today_dashboard.yaml

# 03: Todo CRUD & Toggle Flow
maestro test .maestro/03_todo_crud.yaml

# 04: Focus Session Flow
maestro test .maestro/04_focus_timer.yaml

# 05: Routine Builder Flow
maestro test .maestro/05_routine_builder.yaml

# 06: Profile & Theme Selection Flow
maestro test .maestro/06_profile_theme.yaml

# 07: Storage Persistence Flow (Kills and relaunches app without clearing state)
maestro test .maestro/07_persistence_kill_relaunch.yaml

# 08: Background Drift Flow (Starts 20s timer, backgrounds for 10s, resumes, checks 7-13s remaining)
maestro test .maestro/08_timer_in_background.yaml
```
