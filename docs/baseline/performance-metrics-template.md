# Baseline & Refactoring Performance Metrics Template

**Device**: Physical low-end Android device (e.g. 2GB–3GB RAM, budget SoC)  
**Package**: `com.anonymous.Zenapp`  
**MainActivity**: `com.anonymous.Zenapp/.MainActivity`  

---

## 1. Test Methodology & Execution Guidelines

### A. Cold Start Time-to-Interactive (TTI)
> [!IMPORTANT]
> `am start-activity -W` measures until the first window is displayed, not until React Native has mounted and interactive content is painted.

**Procedure**:
1. Kill app: `adb shell am force-stop com.anonymous.Zenapp`
2. Start app: `adb shell am start-activity -W -n com.anonymous.Zenapp/.MainActivity`
3. Record `TotalTime` from logcat/am output.
4. TTI Marker: In dev/test, inspect the `performance.now()` timestamp emitted when `HomeScreen` finishes its initial render effect.
5. Perform **5 consecutive runs** and record the **median**.

---

### B. List Scroll Smoothness (GPU Profiling)
**Procedure**:
1. Open the target list screen.
2. Reset frame statistics:
   ```bash
   adb shell dumpsys gfxinfo com.anonymous.Zenapp reset
   ```
3. Execute standard scroll script: perform exactly **5 consistent full-height flings** from top to bottom, then 5 flings back to top.
4. Dump frame stats:
   ```bash
   adb shell dumpsys gfxinfo com.anonymous.Zenapp framestats
   ```
5. Record: Total Frames, Janky Frames (>16.6ms), Dropped Frame %, 90th percentile frame time.

---

### C. Render Counts During Running Timer (React Profiler)
> [!NOTE]
> React DevTools cannot profile a release build. Profiling MUST be performed on a **DEV build**. Treat render counts as **relative before/after numbers**.

**Procedure**:
1. Connect device to React DevTools (`npx react-devtools` or Chrome DevTools).
2. Start the React Profiler.
3. Start a focus timer.
4. Record render commits over exactly **10 seconds** while viewing:
   - Scenario A: **Today Dashboard** with timer running.
   - Scenario B: **Todo & Tasks Screen** with timer running (high-contention screen).
5. Record total commit count and component re-render count for `HomeScreen` and `TodoScreen`.

---

### D. Memory Consumption
**Procedure**:
1. Launch app and navigate normally for 5 minutes (open tabs, create a task, start a timer).
2. Run:
   ```bash
   adb shell dumpsys meminfo com.anonymous.Zenapp
   ```
3. Record Total PSS and Native Heap.

---

## 2. Metrics Recording Matrix

| Metric Category | Specific Measurement | Before (Baseline) | After (Refactored) | Delta / Gain | Measurement Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cold Start** | Median Launch Time (`am start -W TotalTime`) | *(Fill ms)* | *(Stage 6)* | | Median of 5 release cold starts |
| **Cold Start** | Time to Interactive (TTI Marker) | *(Fill ms)* | *(Stage 6)* | | `performance.now()` to Home mount |
| **Scroll: Todo List** | Total / Janky Frames (5 flings) | *(Fill)* | *(Stage 5B)* | | `dumpsys gfxinfo reset` + dump |
| **Scroll: Todo List** | Dropped Frame Percentage (%) | *(Fill %)* | *(Stage 5B)* | | % frames exceeding 16.6ms |
| **Scroll: Routine List**| Dropped Frame Percentage (%) | *(Fill %)* | *(Stage 5D)* | | `dumpsys gfxinfo reset` + dump |
| **Profiler: Home** | Re-render count during 10s active timer | *(Fill)* | *(Stage 1B: 0 target)* | | React Profiler (Dev build) |
| **Profiler: Todo** | Re-render count during 10s active timer | *(Fill)* | *(Stage 1B: 0 target)* | | React Profiler (Dev build) |
| **Memory** | Total PSS after 5m normal use | *(Fill MB)* | *(Stage 6)* | | `dumpsys meminfo` |
| **Memory** | Native Heap | *(Fill MB)* | *(Stage 6)* | | `dumpsys meminfo` |
| **Binary: JS Bundle** | Hermes Bytecode (`entry.hbc`) | **7.2 MB** | *(Stage 6)* | | `npx expo export` output |
| **Binary: Audio Assets**| `assets/audio/*.mp3` total size | **25.5 MB** | *(Stage 6: ~10MB target)*| | File system inspection |
| **Binary: Icon Fonts** | `@expo/vector-icons` bundled fonts | **5.5 MB** | *(Stage 6)* | | Dist asset manifest |
| **Code Quality** | Total ESLint Problems | **128 errors, 62 warnings**| *(0 target)* | | `node scripts/lint-ratchet.js` |
| **Code Duplication** | Duplicate Code Clones (`jscpd`) | **65 clones (989 lines)** | *(<30 target)* | | `npx jscpd` |
