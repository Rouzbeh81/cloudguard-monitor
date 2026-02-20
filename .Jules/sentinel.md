## 2026-05-22 - AI-Generated URL Protocol Injection
**Vulnerability:** Potential XSS via `javascript:` protocol in AI-generated URLs.
**Learning:** Even if an LLM is instructed to provide valid deep links, it can hallucinate or be manipulated to return malicious protocols like `javascript:`. If these URLs are rendered directly in an `<a>` tag's `href` attribute, it leads to Cross-Site Scripting (XSS).
**Prevention:** Always sanitize and validate URLs returned by AI models or external APIs. Enforce a strict allowlist of protocols (e.g., `http:`, `https:`) before rendering them.
