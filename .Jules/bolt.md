## 2026-05-19 - [Consolidated Dashboard Stats]
**Learning:** Multiple O(N) `.filter()` passes for dashboard statistics (e.g., GA Status, Preview Status, Category counts) can cause significant lag when the parent component re-renders frequently (e.g., during search input). Consolidating these into a single pass inside `useMemo` significantly reduces computational overhead.
**Action:** Consolidate multiple array iterations for stats into a single loop or pass when the data is stable and the UI is interactive.

## 2026-05-20 - [Dashboard Interaction Optimization]
**Learning:** Even with memoized stats, frequent re-renders of heavy components like Recharts and long lists during search input can cause perceived lag. Using `useDeferredValue` for search queries allows React to prioritize the input responsiveness, and memoizing sub-components (with stable prop patterns like passing Lucide references instead of elements) ensures heavy parts of the UI stay static during interaction.
**Action:** Use `useDeferredValue` for interactive filters and strictly memoize sibling components that don't depend on those filters, ensuring props remain stable (e.g., passing components instead of JSX elements).

## 2026-05-21 - [Efficient Filtering and String Operations]
**Learning:** O(N) filtering operations in React components can be optimized by implementing early returns for the default state (O(1)) and short-circuiting cheap comparisons (like category matching) before performing expensive string searches (like `.toLowerCase().includes()`). Additionally, using exact string matching for known schemas eliminates redundant conversion overhead.
**Action:** Always place cheaper, more restrictive filters (like category or ID matching) before expensive full-text searches in `.filter()` predicates, and use O(1) early returns when no filters are active.
