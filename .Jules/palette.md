## 2026-05-19 - [Accessibility in Settings Modals]
**Learning:** In projects with hybrid state (mixed boolean and string settings), ARIA attributes like `aria-checked` must be strictly cast to boolean to satisfy TypeScript when using a generic `Toggle` component. Always use `Boolean()` or `!!` for `aria-checked`.
**Action:** When implementing custom toggles using `button`, ensure `role="switch"` is used along with `aria-checked`.

## 2026-05-19 - [Focus Visibility and Accessibility]
**Learning:** Custom Tailwind-styled buttons (like switches) often lack default focus indicators. Adding `focus:ring-2` with an offset significantly improves keyboard navigation UX.
**Action:** Always include focus ring styles on custom interactive elements.

## 2026-05-20 - [Contextual Clipboard Feedback]
**Learning:** Replacing blocking `alert()` calls with inline state-based feedback (e.g., swapping a button label to "Copied!") significantly improves user immersion and perceived application quality.
**Action:** Always use temporary state changes or non-blocking toasts for simple user confirmations.

## 2026-05-20 - [Semantic Modal Attributes]
**Learning:** Even if a modal visually looks like a dialog, it must explicitly use `role="dialog"` and `aria-modal="true"` to be correctly announced by assistive technologies. Linking the dialog to its title via `aria-labelledby` ensures immediate context for screen reader users.
**Action:** Standardize modal components to include these three ARIA attributes by default.

## 2026-05-21 - [Semantic Empty States]
**Learning:** Differentiating between a completely empty dataset ("No Updates Found") and a filtered result set that is empty ("No matches found") prevents user confusion. Providing a "Clear all filters" call-to-action in the latter case significantly improves recovery speed.
**Action:** Always implement context-aware empty states for searchable/filterable views.

## 2026-05-22 - [Keyboard Shortcut Hijacking]
**Learning:** Global keyboard shortcuts (like '/' for search) must include explicit checks for `document.activeElement` to prevent hijacking focus when the user is already typing in an `input` or `textarea`. This avoids unexpected cursor jumps and input disruption.
**Action:** Always guard global keydown listeners with `tagName` checks before performing programmatic focus or navigation.
