# Engineering Conventions & Architectural Guidelines

**Project**: Zen-app  
**Applies to**: All refactoring stages and feature development.

---

## 1. Golden Rules

1. **Extract-When-Used-Twice Rule**:
   - Do NOT create premature abstractions.
   - If logic or UI is used in only 1 place, keep it local to that screen/component.
   - If logic or UI appears in 2+ places, or is fundamentally a design-system primitive (e.g. Button, Card, Chip, ModalSheet), extract it into `components/ui/`, `hooks/`, or `utils/`.

2. **React 19 & React Compiler Compliance**:
   - The React Compiler is active. Do NOT add manual `useMemo`, `useCallback`, or `React.memo` unless there is a profiled, measured reason.
   - **Zero `setState` inside synchronous `useEffect` bodies**: Do not use effects to sync state with other state. Derive state during render, compute values in event handlers, or use store actions.

3. **Zero Behavior / UI / API Contract Regressions**:
   - Visual aesthetics, gesture feel, props, navigation parameters, and offline persistence keys must remain completely backwards-compatible unless explicitly discussed and approved.

4. **Strict Type Safety**:
   - No `: any` annotations. All props, navigation params, store states, and entity models must have explicit TypeScript definitions in `types/`.

---

## 2. Directory Structure & Import Boundaries

```
Zen-app/
├── app/                  # Expo Router file routes ONLY (thin screen containers)
│   ├── (auth)/           # Authentication screens
│   ├── (tabs)/           # Core tab screens (Today, Todo, Profile)
│   ├── _layout.tsx       # Root layout & app initialization
│   └── ...               # Standalone modal screens (Focus, Routine, Setup)
├── components/
│   ├── ui/               # Reusable, design-system UI primitives (dumb components)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Chip.tsx
│   │   ├── ModalSheet.tsx
│   │   ├── Header.tsx
│   │   └── EmptyState.tsx
│   ├── forms/            # Form controls (Input, Switch, TimePicker)
│   └── <feature>/        # Feature-specific composite components (e.g. routine/, dashboard/)
├── constants/            # Single source of truth constants (StorageKeys, ThemeTokens, SongList)
├── hooks/                # Shared custom hooks (useStorage, useHaptics, useDebounce)
├── stores/               # Zustand stores for client global state (timerStore, themeStore, settingsStore)
├── services/             # External APIs and data queries (PokeAPI queries)
├── types/                # Canonical domain entity interfaces (Task, Routine, Theme, User)
├── utils/                # Pure helper functions (timeMath, formatting, hapticsGuard)
└── docs/                 # Architectural documentation, baselines, and refactoring plans
```

### Import Rules:
- UI Primitives (`components/ui/*`) must NEVER import from feature folders or `app/*`.
- Screens (`app/*`) should be thin containers: fetch/select state from stores or hooks, render feature components and UI primitives.
- Never use relative `../../../../` spaghetti when `@/*` alias is available.

---

## 3. Styling & Design System Tokens

- **Theme Consistency**: Never hardcode colors (`#F5F5F7`, `#FFFFFF`, `#1A1A1A`, `#666`) or border radii (`16`, `24`) in inline styles.
- Always consume tokens from the active theme:
  ```tsx
  // Preferred
  const { colors, spacing, borderRadius, fonts } = useThemeTokens();
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      padding: spacing.md,
      borderRadius: borderRadius.md,
    }
  });
  ```
- Use `StyleSheet.create` for all component styles to take advantage of native optimizations and compiler caching.

---

## 4. State Management Conventions

- **Server / Remote Data**:
  - Use **TanStack Query** (`useQuery`, `useMutation`).
  - Cache aggressively (`staleTime: Infinity` for immutable data like PokeAPI).
- **Client Global State**:
  - Use **Zustand**.
  - Always use **selective subscriptions** to avoid unnecessary re-renders:
    ```tsx
    // Correct: Only re-renders when timeLeft changes
    const timeLeft = useTimerStore((state) => state.timeLeft);

    // Incorrect: Re-renders on any store update!
    const { timeLeft, startTimer, pauseTimer } = useTimerStore();
    ```
  - Keep actions separate from frequently updating state values where appropriate.
- **Local State**:
  - Keep local form inputs (e.g., text being typed) in `useState` within the form component.

---

## 5. Performance Standards

1. **Lists**:
   - Any list containing more than 10 dynamic items (tasks, routines, timeline events) MUST use virtualized lists (`@shopify/flash-list` or `FlatList`). Never use unvirtualized `.map()` inside a `ScrollView`.
2. **Images**:
   - Always import `Image` from `expo-image`.
   - Always specify cache policy (`cachePolicy: 'memory-disk'`) and content-fit.
3. **Animations**:
   - All gesture-driven or continuous animations must use `react-native-reanimated` worklets running on the UI thread.
   - Avoid React Native legacy `Animated` with `useNativeDriver: false`.
4. **Storage**:
   - Access persistent storage through the typed `useStorage` hook (backed by MMKV).
   - Never run raw `JSON.parse` / `JSON.stringify` on large collections in render functions.
