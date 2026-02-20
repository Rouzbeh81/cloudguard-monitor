## 2026-05-19 - [Consolidated Dashboard Stats]
**Learning:** Multiple O(N) `.filter()` passes for dashboard statistics (e.g., GA Status, Preview Status, Category counts) can cause significant lag when the parent component re-renders frequently (e.g., during search input). Consolidating these into a single pass inside `useMemo` significantly reduces computational overhead.
**Action:** Consolidate multiple array iterations for stats into a single loop or pass when the data is stable and the UI is interactive.
