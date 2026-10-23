# Phase 1: Project-Wide Analysis Report

**Date**: 2026-10-23  
**Target App**: Zen-app (Expo SDK 57.0.31, React Native 0.86.3, React 19.2.3, Hermes, New Architecture enabled)  
**Evidence Sources**: 
- `npx expo-doctor` ([docs/baseline/expo-doctor.txt](file:///Users/sarveshvarvatkar/projects/Zen-app/docs/baseline/expo-doctor.txt))
- `knip` ([docs/baseline/knip.txt](file:///Users/sarveshvarvatkar/projects/Zen-app/docs/baseline/knip.txt))
- `jscpd` ([docs/baseline/jscpd.txt](file:///Users/sarveshvarvatkar/projects/Zen-app/docs/baseline/jscpd.txt))
- `madge --circular` ([docs/baseline/madge.txt](file:///Users/sarveshvarvatkar/projects/Zen-app/docs/baseline/madge.txt))
- `expo export` Bundle Composition ([docs/baseline/bundle-export.txt](file:///Users/sarveshvarvatkar/projects/Zen-app/docs/baseline/bundle-export.txt))
- ESLint Flat Config ([docs/baseline/eslint-baseline.txt](file:///Users/sarveshvarvatkar/projects/Zen-app/docs/baseline/eslint-baseline.txt))

---

## A. Structure & Architecture Audit

### 1. Folder Structure & Expo Router Layout
```
Zen-app/
├── app/                  # Expo Router file-based routes
│   ├── (auth)/sign-in.tsx# 143 lines - Auth sign-in screen
│   ├── (tabs)/           # Main tab navigator
│   │   ├── _layout.tsx   # 379 lines - Tab navigation bar & layout
│   │   ├── index.tsx     # 1,559 lines - Today Dashboard (God-component)
│   │   ├── todo.tsx      # 1,766 lines - Task & Todo manager (God-component)
│   │   └── profile.tsx   # 553 lines - User profile & settings hub
│   ├── _layout.tsx       # 121 lines - Root layout & providers
│   ├── focus.tsx         # 1,651 lines - Focus timer & ambient sound modal (God-component)
│   ├── routine.tsx       # 1,580 lines - Routine builder & time-step manager (God-component)
│   ├── setup.tsx         # 2,084 lines - Onboarding setup wizard (God-component)
│   ├── settings.tsx      # 321 lines - Global settings screen
│   ├── privacy.tsx       # 122 lines - Privacy policy
│   ├── terms.tsx         # 119 lines - Terms of service
│   └── +not-found.tsx    # 143 lines - 404 handler
├── components/           # Feature & Common components
│   ├── common/           # Generic pickers, sheet, error boundary
│   ├── dashboard/        # Task modals, timeline, calendar
│   ├── profile/          # Profile cards, theme & music selectors
│   └── SetupTimeSteps.tsx# 994 lines - Wizard step animation engine
├── context/              # 5 Context providers (Audio, Auth, Settings, Theme, Timer)
├── styles/shared.tsx     # 479 lines - Mixed theme definitions & abandoned components
└── utils/                # Haptics, notifications, stats, storage helpers
```

### 2. Screen Inventory & Complexity Matrix

| Screen / Route | Lines | Concerns Mixed | Complexity | Major Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| `app/setup.tsx` | **2,084** | UI + Animated Sky Engine + Sleep Math + AsyncStorage + Notifications | **CRITICAL** | `AsyncStorage`, `Animated`, `lucide-react-native` |
| `app/(tabs)/todo.tsx` | **1,766** | Task List UI + Category Filters + CRUD Logic + Timer Binding + AsyncStorage | **CRITICAL** | `useTimer`, `AsyncStorage`, `Haptics` |
| `app/focus.tsx` | **1,651** | Pomodoro UI + Audio Playback + Timer Engine + Task Picker + Ambient Track Controls | **CRITICAL** | `useTimer`, `useAudio`, `expo-audio`, `AsyncStorage` |
| `app/routine.tsx` | **1,580** | Routine Step List + Duration Calculators + Sequence Builder + Form Inputs | **CRITICAL** | `AsyncStorage`, `notifications`, `Haptics` |
| `app/(tabs)/index.tsx` | **1,559** | Today Timeline + Up Next Cards + Routine Checkoffs + Stats Cards + Timer Binding | **CRITICAL** | `useTimer`, `useTheme`, `AsyncStorage` |
| `app/(tabs)/profile.tsx`| **553** | Profile Card + Statistics Graphs + Theme Pickers + Backup/Restore Modals | **HIGH** | `useTheme`, `useAuth`, `AsyncStorage` |
| `app/(tabs)/_layout.tsx`| **379** | Tab Bar UI + Floating Active Badges + Theme Integration | **MEDIUM** | `expo-router`, `lucide-react-native` |
| `app/settings.tsx` | **321** | Notifications Toggles + Haptics Settings + Sound Prefs | **MEDIUM** | `useSettings`, `useAudio` |
| `app/(auth)/sign-in.tsx`| **143** | Auth UI + Offline Bypass logic | **LOW** | `useAuth`, `router` |
| `app/privacy.tsx` | **122** | Static content (90% duplicate of `terms.tsx`) | **LOW** | `ScrollView` |
| `app/terms.tsx` | **119** | Static content (90% duplicate of `privacy.tsx`) | **LOW** | `ScrollView` |

### 3. God-Components & Architectural Smells
- **Top 6 God-Components exceed 1,500 lines each**: `setup.tsx` (2,084), `DayTimelineView.tsx` (1,718), `todo.tsx` (1,766), `focus.tsx` (1,651), `routine.tsx` (1,580), and `index.tsx` (1,559).
- **Direct Local Storage in UI**: Almost every screen imports `AsyncStorage` directly, performing synchronous-like JSON parse/stringify inside render or effect blocks.
- **Circular Imports**: Verified clean (`madge --circular` found **0 circular dependencies**).

---

## B. Reusability Audit

### 1. Duplicated Components (Evidence from `jscpd`)
`jscpd` identified **65 code clones** covering **989 duplicate lines**:

1. **`TaskForm.tsx` vs `TaskModal.tsx`** ([components/dashboard/](file:///Users/sarveshvarvatkar/projects/Zen-app/components/dashboard)):
   - **84 contiguous lines (333 tokens)** duplicated in form rendering and validation.
   - Another **30 lines (144 tokens)** duplicated in category selector and priority chips.
   - Another **23 lines (120 tokens)** duplicated in time/date button triggers.
   - *Fix*: Unify into a single, headless `TaskForm` component wrapped by a shared `ModalSheet`.

2. **`DayTimelineView.tsx` vs `TimelineEventCard.tsx` & `MonthCalendarView.tsx`**:
   - Identical color maps (`TASK_COLORS`), status chip badges, and time calculation routines repeated verbatim across 3 files (29 lines / 115 tokens clone).

3. **`InlineTimePicker.tsx` vs `WebTimePicker.tsx`** ([components/common/](file:///Users/sarveshvarvatkar/projects/Zen-app/components/common)):
   - 22 lines duplicated wheel/scroll physics and time formatting logic.

4. **`privacy.tsx` vs `terms.tsx`**:
   - 57 identical lines of scroll wrapper, header navigation, back button, and disclaimer styling.

5. **Screen-level UI Duplication**:
   - Custom cards, header banners, action buttons, and stat pills are re-implemented from scratch in `index.tsx`, `todo.tsx`, `routine.tsx`, and `focus.tsx` instead of using the primitives defined in `styles/shared.tsx`.

### 2. Duplicated Logic Candidates for Custom Hooks

| Repeated Pattern | Found In | Proposed Custom Hook |
| :--- | :--- | :--- |
| **Entity Storage & CRUD** | `todo.tsx`, `routine.tsx`, `index.tsx` | `useStoredEntities<T>(storageKey, initialValue)` |
| **Notification Scheduling** | `setup.tsx`, `routine.tsx`, `SettingsContext.tsx` | `useRoutineNotifications()` |
| **Haptic Feedback Triggers** | `focus.tsx`, `todo.tsx`, `routine.tsx`, `setup.tsx` | `useAppHaptics()` (respecting `settings.hapticsEnabled`) |
| **Debounced Search/Input** | `ThemeSelectionModal.tsx`, `todo.tsx` | `useDebounce<T>(value, delay)` |
| **Time Math & Minute Parsing** | `DayTimelineView.tsx`, `routine.tsx`, `utils.ts` | `useTimeCalculations()` or pure utility module |

### 3. Hardcoded Tokens vs Design System
- Hardcoded hex values throughout components: `#F5F5F7`, `#FFFFFF`, `#1A1A1A`, `#666666`, `rgba(0,0,0,0.06)`, `rgba(0,0,0,0.5)`.
- Hardcoded layout metrics: `borderRadius: 16`, `padding: 20`, `height: 52`.
- `styles/shared.tsx` already has high-quality design tokens (`theme.colors`, `theme.fonts`, `theme.spacing`, `theme.borderRadius`, `theme.icons`), but components bypass them in favor of inline `StyleSheet.create` objects.

### 4. Proposed Shared Component & Library Structure
```
components/
├── ui/                   # Universal Design System Primitives
│   ├── Button.tsx        # Primary, secondary, ghost, icon buttons
│   ├── Card.tsx          # Glass card, elevated card, stat card
│   ├── Chip.tsx          # Tag / filter / category chip
│   ├── ModalSheet.tsx    # Unified bottom sheet (replaces duplicate BottomSheets)
│   ├── Header.tsx        # Standard screen header with back/action buttons
│   ├── EmptyState.tsx    # Standard empty list graphic & message
│   └── TimePicker/       # Unified cross-platform time picker
├── forms/
│   ├── Input.tsx         # Clean, themed text input
│   ├── Switch.tsx        # Accessible toggle switch
│   └── SegmentedControl.tsx # Clean cross-platform segmented control
hooks/
│   ├── useStorage.ts     # Type-safe, reactive local storage
│   ├── useThemeTokens.ts # Quick token resolver
│   └── useHaptics.ts     # Guarded haptic triggers
constants/
│   ├── storageKeys.ts    # Single source of truth for '@zen_*' keys
│   └── themeTokens.ts    # Centralized tokens & typography
```

---

## C. State Architecture Audit

The application currently relies **100% on React Context** for global state, with no store or server-state cache.

### 1. Context Inventory & Blast Radius

| Context | State Stored | Mutation Frequency | Consumers | Re-render Impact |
| :--- | :--- | :--- | :--- | :--- |
| **`TimerContext`** | `timeLeft`, `isActive`, `pomodoroSession`, `taskName` | **Every 1 second** when active | `app/(tabs)/index.tsx`, `app/(tabs)/todo.tsx`, `app/focus.tsx` | **EXTREME CRITICAL**: Running a timer triggers re-rendering of the entire 1,559-line Today screen and 1,766-line Todo screen **every single second**. |
| **`ThemeContext`** | Active theme, dark mode, custom Pokemon themes | Rare (on theme change) | **24+ files** (almost all components) | **HIGH**: When a theme updates, the entire component tree mounts and calculates styles. |
| **`AudioContext`** | `selectedSong`, `isPlaying`, `AudioPlayer` ref | On track select / stop | `app/focus.tsx`, `components/profile/MusicSelectionModal.tsx` | **LOW**: Well-isolated, few consumers. |
| **`SettingsContext`** | Notifications, haptics, music preference | Rare (user preference toggle) | `app/settings.tsx`, `components/profile/SettingsSection.tsx` | **LOW**: Targeted consumers. |
| **`AuthContext`** | `user`, `session`, `initialized` | Rarely changes (offline mock) | Root layout, Profile card | **LOW**: Static mock session. |

### 2. State Classification: Server vs Client vs Local

- **Server Data**:
  - The app is currently **100% offline-first**.
  - Only PokeAPI queries in `ThemeSelectionModal.tsx` fetch external server data (`pokeapi.co/api/v2/pokemon/...`). This is prime for TanStack Query (automatic caching, de-duplication, background retry).
  - Note: `@supabase/supabase-js` is unused (`lib/supabase.ts` is a no-op mock) and can be removed or cleanly isolated.
- **Client Global State**:
  - `TimerState`: Must be extracted from React Context into a selective store (e.g. **Zustand**). Screens should only re-render if they subscribe to `timeLeft` (the timer display itself), NOT the parent dashboard.
  - `ThemeState` & `SettingsState`: Clean fit for a lightweight client store with instant MMKV sync.
- **Local Screen State**:
  - Form draft inputs (e.g., inside `TaskForm`, routine title editor).

### 3. Concrete Migration Order
1. **Timer State**: Migrate from `TimerContext` to a Zustand store with granular selectors. Eliminates 1Hz re-renders across `index.tsx` and `todo.tsx`.
2. **Theme & Settings State**: Migrate to persistent client store, removing context provider nesting at root.
3. **Data Fetching (PokeAPI)**: Wrap with TanStack Query with staleTime=Infinity (Pokemon data never changes).

---

## D. Performance Audit

### 1. Re-render Hotspots
- **1Hz Timer Cascade**: Confirmed `useTimer()` causes parent dashboard and task screens to re-render 60 times a minute.
- **Sync `setState` in Effects**: ESLint flagged **126 instances of `react-hooks/set-state-in-effect`** (e.g., in `ThemeSelectionModal.tsx:99`, `ProfileCard.tsx:43`). These cause double renders on mount/update.

### 2. List Virtualization vs Unvirtualized ScrollViews
- Only `DayTimelineView.tsx` uses `FlatList`.
- `app/(tabs)/index.tsx`, `app/(tabs)/todo.tsx`, `app/routine.tsx`, and `app/setup.tsx` render item arrays inside standard unvirtualized `ScrollView` using `.map()`.
- *Consequence on Low-End Android*: If a user has 30 tasks or 20 routine steps, all 30 card views, icon nodes, and text nodes remain allocated in the Fabric view hierarchy simultaneously, consuming heap and causing frame drops on scroll.
- *Recommendation*: Migrate heavy task and routine lists to `@shopify/flash-list` or virtualized `FlatList`.

### 3. Image Optimization
- All images (Pokemon sprites in `ThemeSelectionModal.tsx`, user avatars in `ProfileCard.tsx`) use `Image` from `react-native`.
- `expo-image` is not installed. Network images are not aggressively disk-cached, decoded off the main thread, or downsampled.
- *Recommendation*: Adopt `expo-image` with automatic disk caching and blurhash placeholders.

### 4. JS-Thread Animations
- `SetupTimeSteps.tsx` (lines 600, 610) uses React Native `Animated.timing` with `useNativeDriver: false` for sky gradients and fade transitions.
- `TaskModal.tsx` and `CrossPlatformSegmentedControl.tsx` use legacy `Animated.spring` on the JS thread.
- *Recommendation*: Move animations to `react-native-reanimated` worklets executing directly on the UI thread.

### 5. Storage Bottlenecks (`AsyncStorage` → MMKV)
- `AsyncStorage` communicates across the asynchronous native bridge/JSI to SQLite or Android SharedPreferences.
- Frequent reads (loading routine, tasks, profile on every tab visit) block JS event queues with serialization overhead.
- *Recommendation*: Replace with `react-native-mmkv` (synchronous, direct memory-mapped C++ storage, ~30x faster on Android).

### 6. Startup Path & Asset Weight
- **Hermes Bytecode Bundle**: **7.2 MB** (3,920 modules).
- **Embedded Audio Assets**: **25.5 MB** embedded in the bundle across 10 uncompressed MP3 files.
- **Embedded Icon Fonts**: **5.5 MB** (18 full icon font families from `@expo/vector-icons`).
- **Startup Glitch**: `app/_layout.tsx` returns a blank `<View style={{ flex: 1, backgroundColor: "#F5F5F7" }} />` while fonts and AsyncStorage load, instead of coordinating with `expo-splash-screen`.

---

## E. Code Quality & Technical Debt

1. **Lint Errors (179 Total)**:
   - 126 errors: Synchronous `setState()` in `useEffect` violating React 19 / React Compiler rules.
   - 53 warnings: Unused variables (`useMemo`, `isFetching`, `darkThemes`, etc.).
2. **Type Safety**:
   - 27 occurrences of `: any` (e.g. `segments[0] === ("(auth)" as any)`, `router.replace("/setup" as any)`).
3. **Logging & Debug Code**:
   - 36 raw `console.log` / `console.error` calls active in production paths.
4. **Dead Code & Unused Packages (via `knip`)**:
   - Unused packages: `@react-native-segmented-control/segmented-control`, `@supabase/supabase-js`, `expo-calendar`, `react-native-pager-view`, `react-native-tab-view`.
   - Dead files: `components/common/index.ts`, `lib/supabase.ts`.

---

## F. Consolidated Findings & Prioritization Matrix

| Finding | Location | Impact | Effort | Risk | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Timer 1Hz Cascade Re-render** | `TimerContext.tsx`, `index.tsx`, `todo.tsx` | **High** | Medium | Medium | Code trace: `useTimer` consumed at root of 1500+ line screens |
| **Unvirtualized Long Lists** | `todo.tsx`, `index.tsx`, `routine.tsx` | **High** | Medium | Low | Grep: `ScrollView` with `.map()` rendering all items simultaneously |
| **65 Code Clones / Duplicate Modals** | `TaskForm.tsx` vs `TaskModal.tsx`, etc. | **High** | High | Low | `jscpd`: 989 duplicate lines across 65 clone blocks |
| **Missing Peer Dependencies & Schema Error** | `app.json`, `package.json` | **High** | Low | Low | `expo-doctor`: missing `expo-asset`, `react-native-worklets`, invalid `edgeToEdgeEnabled` |
| **Uncompressed Audio & Font Bundle Bloat** | `assets/audio/`, `@expo/vector-icons` | **High** | Medium | Low | `expo export`: 25.5MB audio + 5.5MB fonts in package |
| **126 React 19 Cascading Render Errors** | `ThemeSelectionModal.tsx`, `ProfileCard.tsx` | **Med** | Medium | Low | `npm run lint`: 179 total issues (126 errors) |
| **5 Unused Heavy Dependencies** | `package.json` | **Med** | Low | Low | `knip`: `@supabase/supabase-js`, `expo-calendar`, `react-native-tab-view`, etc. |
| **AsyncStorage Serialization Overhead** | Across all screens & contexts | **Med** | Medium | Low | Direct calls to `AsyncStorage.getItem/setItem` with raw JSON parse |
| **Legacy JS-Thread Animated Usage** | `SetupTimeSteps.tsx`, `TaskModal.tsx` | **Med** | Medium | Low | `useNativeDriver: false` in `Animated.timing` |
| **Uncached React Native `Image`** | `ThemeSelectionModal.tsx`, `ProfileCard.tsx` | **Med** | Low | Low | Direct `Image` imports from `react-native` for network URIs |
