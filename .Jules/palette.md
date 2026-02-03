## 2026-05-19 - [Accessibility in Settings Modals]
**Learning:** In projects with hybrid state (mixed boolean and string settings), ARIA attributes like `aria-checked` must be strictly cast to boolean to satisfy TypeScript when using a generic `Toggle` component. Always use `Boolean()` or `!!` for `aria-checked`.
**Action:** When implementing custom toggles using `button`, ensure `role="switch"` is used along with `aria-checked`.

## 2026-05-19 - [Focus Visibility and Accessibility]
**Learning:** Custom Tailwind-styled buttons (like switches) often lack default focus indicators. Adding `focus:ring-2` with an offset significantly improves keyboard navigation UX.
**Action:** Always include focus ring styles on custom interactive elements.
