# Baseline Performance Metrics Template

Use this document to record the baseline performance before any refactoring begins.
All measurements must be conducted on a **RELEASE** build (`npx expo run:android --variant release` or EAS release build) on a physical **low-end Android device** (e.g., 2GB-3GB RAM, budget SoC).

---

## 1. Test Environment

| Property | Value |
| :--- | :--- |
| **Device Model** | *(e.g., Samsung Galaxy A13 / Moto G / Poco C31)* |
| **Android OS Version** | *(e.g., Android 12 / 13)* |
| **RAM / CPU** | *(e.g., 3GB RAM, Octa-core 2.0 GHz)* |
| **Expo SDK / RN Version** | Expo SDK 57.0.31 / React Native 0.86.3 (Hermes, New Arch Enabled) |
| **Build Configuration** | Release APK / AAB |

---

## 2. Cold Start (Time to Interactive - TTI)
*Measurement method: Measure via `adb shell am start-activity -W -n com.anonymous.Zenapp/.MainActivity` after `adb shell am force-stop com.anonymous.Zenapp` (average of 3 runs).*

| Run | Launch Time (TotalTime ms) | WaitTime (ms) | Notes |
| :--- | :--- | :--- | :--- |
| Run 1 | | | |
| Run 2 | | | |
| Run 3 | | | |
| **Average TTI** | **ms** | | |

---

## 3. List Scroll Smoothness (Heaviest Lists)
*Measurement method: Android GPU Rendering Profiling (`adb shell dumpsys gfxinfo com.anonymous.Zenapp framestats`) or React Native Performance Monitor overlay while scrolling vigorously.*

| List Screen / Component | JS FPS | UI FPS | Dropped / Janky Frames (%) | Perceived Stutter (None / Mild / Severe) |
| :--- | :--- | :--- | :--- | :--- |
| 1. Today Dashboard (`app/(tabs)/index.tsx`) | | | | |
| 2. Tasks / Todo List (`app/(tabs)/todo.tsx`) | | | | |
| 3. Day Timeline (`components/dashboard/DayTimelineView.tsx`) | | | | |
| 4. Setup Wizard Steps (`components/SetupTimeSteps.tsx`) | | | | |

---

## 4. Screen Transition Latency
*Measurement method: Milliseconds between pressing the navigation trigger and the screen completing render (using React Profiler or Perfetto/logcat markers).*

| Screen Transition | Measured Transition Time (ms) | Visual Lag / Blank Screen Observed? |
| :--- | :--- | :--- |
| Tab Switch: Today -> Todo | | |
| Tab Switch: Today -> Profile | | |
| Open Focus Timer (`app/focus.tsx`) | | |
| Open Routine Builder (`app/routine.tsx`) | | |
| Open Setup Flow (`app/setup.tsx`) | | |

---

## 5. Memory Footprint
*Measurement method: Android Studio Profiler or `adb shell dumpsys meminfo com.anonymous.Zenapp`.*

| State | Native Heap (MB) | Dalvik/Art Heap (MB) | Total PSS (MB) |
| :--- | :--- | :--- | :--- |
| Immediate Cold Start | | | |
| After 5 Minutes of Normal Navigation & List Scrolling | | | |
| After Playing Audio & Focus Session | | | |

---

## 6. Bundle & Binary Sizes (Tool-Measured)

| Artifact | Measured Size | Notes |
| :--- | :--- | :--- |
| **Hermes Bytecode Bundle** (`entry.hbc`) | **7.2 MB** | 3,920 modules bundled |
| **Bundled Audio Assets** (`assets/audio/*.mp3`) | **~25.5 MB** | 10 high-bitrate MP3 files |
| **Bundled Fonts** (`assets/fonts/*`, `@expo/vector-icons`) | **~5.5 MB** | 18 vector icon font sets bundled |
| **Release APK / AAB Size** | *(Record final release binary size in MB)* | |

---

## 7. Qualitative Pain Points Survey

- **Most visited screens**:
- **Most complained about screens / interactions**:
- **Worst perceived interactions (laggy gestures, slow modals, audio glitching)**:
