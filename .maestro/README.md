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

---

## Build Instructions (E2E Test Build)

To enable the debug 20s timer for Flow 8 while testing a release-like preview binary:
```bash
# Set the E2E flag and run preview / release build:
EXPO_PUBLIC_E2E=1 npx expo run:android --variant release
```
*(In production builds, `EXPO_PUBLIC_E2E` is unset, so the debug button is completely excluded from the UI).*

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
