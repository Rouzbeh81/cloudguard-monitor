## 2026-05-22 - AI-Generated URL Protocol Injection
**Vulnerability:** Potential XSS via `javascript:` protocol in AI-generated URLs.
**Learning:** Even if an LLM is instructed to provide valid deep links, it can hallucinate or be manipulated to return malicious protocols like `javascript:`. If these URLs are rendered directly in an `<a>` tag's `href` attribute, it leads to Cross-Site Scripting (XSS).
**Prevention:** Always sanitize and validate URLs returned by AI models or external APIs. Enforce a strict allowlist of protocols (e.g., `http:`, `https:`) before rendering them.

## 2026-05-22 - Mailto Header Injection via User Input
**Vulnerability:** Mail header injection in `mailto:` links through unsanitized recipient email.
**Learning:** Concatenating user-controlled strings directly into `mailto:` URIs without stripping CRLF or query characters (`?`, `&`) allows attackers to inject additional headers (like `CC`, `BCC`) or overwrite the email body.
**Prevention:** Sanitize recipient strings by removing dangerous characters and validating the email format before constructing the `mailto:` URI.

## 2026-05-22 - ReDoS Vulnerability in Utility Dependencies
**Vulnerability:** Regular Expression Denial of Service (ReDoS) in `minimatch` (v9.0.3).
**Learning:** High-severity vulnerabilities can exist deep within the dependency tree (e.g., via `@google/genai`). These vulnerabilities can be exploited if the application processes untrusted strings through the affected library.
**Prevention:** Regularly run `pnpm audit` and use `pnpm.overrides` to force secure versions of deep dependencies when top-level packages haven't been updated yet.

## 2026-05-22 - Unbounded Input Length in Settings
**Vulnerability:** Potential Denial of Service (DoS) and `localStorage` abuse via excessively long input strings.
**Learning:** Input fields without `maxLength` attributes allow attackers to paste massive strings that can crash the browser tab during processing or exhaust the 5MB `localStorage` limit.
**Prevention:** Always enforce reasonable `maxLength` limits on all user-facing `input` and `textarea` fields, especially those persisted to local storage.
