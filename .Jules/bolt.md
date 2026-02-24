## 2026-05-19 - [Consolidated Dashboard Stats]
**Learning:** Multiple O(N) `.filter()` passes for dashboard statistics (e.g., GA Status, Preview Status, Category counts) can cause significant lag when the parent component re-renders frequently (e.g., during search input). Consolidating these into a single pass inside `useMemo` significantly reduces computational overhead.
**Action:** Consolidate multiple array iterations for stats into a single loop or pass when the data is stable and the UI is interactive.

## 2026-05-20 - [Dashboard Interaction Optimization]
**Learning:** Even with memoized stats, frequent re-renders of heavy components like Recharts and long lists during search input can cause perceived lag. Using `useDeferredValue` for search queries allows React to prioritize the input responsiveness, and memoizing sub-components (with stable prop patterns like passing Lucide references instead of elements) ensures heavy parts of the UI stay static during interaction.
**Action:** Use `useDeferredValue` for interactive filters and strictly memoize sibling components that don't depend on those filters, ensuring props remain stable (e.g., passing components instead of JSX elements).

## 2026-05-21 - [Component Memoization Typing]
**Learning:** When using `React.memo`, assigning the result to a variable typed as `React.FC<Props>` can cause TypeScript errors because `memo` returns a `NamedExoticComponent`. Typing the props directly in the function signature within `memo` is safer and more compatible.
**Action:** Define props directly in the function argument of `memo` (e.g., `memo(({ prop }: Props) => ...)`) instead of using `React.FC` on the resulting variable.
