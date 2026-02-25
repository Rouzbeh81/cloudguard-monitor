## 2026-05-19 - [Consolidated Dashboard Stats]
**Learning:** Multiple O(N) `.filter()` passes for dashboard statistics (e.g., GA Status, Preview Status, Category counts) can cause significant lag when the parent component re-renders frequently (e.g., during search input). Consolidating these into a single pass inside `useMemo` significantly reduces computational overhead.
**Action:** Consolidate multiple array iterations for stats into a single loop or pass when the data is stable and the UI is interactive.

## 2026-05-20 - [Dashboard Interaction Optimization]
**Learning:** Even with memoized stats, frequent re-renders of heavy components like Recharts and long lists during search input can cause perceived lag. Using `useDeferredValue` for search queries allows React to prioritize the input responsiveness, and memoizing sub-components (with stable prop patterns like passing Lucide references instead of elements) ensures heavy parts of the UI stay static during interaction.
**Action:** Use `useDeferredValue` for interactive filters and strictly memoize sibling components that don't depend on those filters, ensuring props remain stable (e.g., passing components instead of JSX elements).

## 2026-05-21 - [Effective Component Memoization]
**Learning:** Wrapping a large component like `Dashboard` in `React.memo` is only effective if all props, especially function callbacks from the parent, have stable references. Passing inline arrow functions (e.g., `onOpenAlerts={() => ...}`) in the parent component (`App.tsx`) causes the memoized child to re-render every time the parent renders, negating the performance benefits of `memo`.
**Action:** Always use `useCallback` for functions passed as props to memoized components to ensure prop stability and prevent unnecessary tree re-renders.
