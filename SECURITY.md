# Astritsa — Security Review (pre-launch)

Review date: 2026-09-06 · Scope: `server.js`, `public/`, tests. Follows OWASP Top 10 (2021).

## Controls in place

| Area | Control |
|---|---|
| A01 Broken Access Control | `requireUser` / `requireAdmin` / `requireReadyUser` gates on every private route; admin CRUD tested (`test/admin-crud.test.js`); user-scoped history/export/delete; admin role cannot be self-assigned (role set only at signup against `ADMIN_EMAIL`). |
| A02 Cryptographic Failures | PBKDF2-SHA256, 310k iterations, per-user salt (`createPasswordHash`); session tokens are 256-bit random, stored **hashed** (`tokenHash`); `Secure`+`HttpOnly`+`SameSite=Lax` cookie; admin password from env, never logged. |
| A03 Injection | All SQLi N/A (JSON-file DB, no string-built queries). XSS: all dynamic renders go through `esc()` client-side; server stores free-text only after `sanitizeText()` (sanitize-html, tags stripped); CSP blocks inline/foreign scripts. Path traversal: `path.resolve` + prefix check + `/zodiac/:sign` whitelist (tested). |
| A04 Insecure Design | Mandatory 18+ gate and legal/AI consents enforced server-side (`451 CONSENT_REQUIRED`) — the client cannot bypass; entertainment-only disclaimers required by design docs. |
| A05 Security Misconfiguration | Baseline security headers on every response (CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`); JSON body capped at 2 MB (413); static `Cache-Control: no-store` for HTML. |
| A06 Vulnerable Components | Runtime deps: `astronomy-engine`, `sanitize-html` only. Re-audit on each deploy (`npm audit --production`); CI runs tests + syntax checks. |
| A07 Auth Failures | Rate limits: signup 10/min, signin 20/min, contact 5/min per IP (429 `RATE_LIMITED`); uniform `INVALID_CREDENTIALS` error (no user enumeration); password policy ≥8 chars + upper + digit + special; sessions expire (SESSION_DAYS) and are pruned. |
| A08 Integrity Failures | No deserialization of untrusted data; Stripe webhook verifies signature when `STRIPE_WEBHOOK_SECRET` set; DB writes go through explicit field assignment only. |
| A09 Logging Failures | 5xx logged server-side without request bodies; contact/webhook delivery failures recorded on the message record, not user-facing. |
| A10 SSRF | The only outbound fetches are to the configured `AI_API_URL` / `CONTACT_WEBHOOK_URL` (admin-set env) and lawfully configured RSS sources — not user-supplied URLs. |

## Failure-path auth tests (verified in suite)
- signin with wrong password → 401 `INVALID_CREDENTIALS`
- weak passwords (short, no upper, no digit, no special) → 400 `WEAK_PASSWORD`
- signup without mandatory consents → 451; without 18+ → 403
- admin routes as anonymous → 401, as user → 403
- consent-gated reading for user missing consents → 451
- rate-limited endpoint returns 429 (see `test/hardening.test.js`)

## Data map (GDPR)
| Data | Where | Purpose | Erasure |
|---|---|---|---|
| Email, name, birth date/time, city, zodiac, life-path | `db.users` | account + personalization | account delete button (`/api/privacy/delete`) |
| Consents + versions + timestamps | `db.users`, `db.consentLogs` | legal proof | retained as anonymized log (legal basis) |
| Sessions (hashed tokens, IP hash, UA) | `db.sessions` | authentication | auto-expiry + pruning |
| Readings history | `db.readings` | user history feature | account delete |
| Contact messages | `db.contacts` | support | admin delete; deleted with account link where personal |
| Subscription refs | `db.users.subscription` | billing state via Stripe | account delete |
| Cookie consent choice | `localStorage` (client) | cookie compliance | “Ρυθμίσεις cookies” reset |
| Logs | server console | ops | rotated with deployment |

No card data, no passwords in clear, no third-party trackers without cookie consent (GA4/Meta Pixel load only after both server-side tag config AND stored consent).

## Residual risks / recommendations
- Rate limiter is in-memory per process — behind multiple instances, front it with the reverse proxy’s limits.
- Set a strict `CSP` (already default) and keep `report-only` mode in mind if adding external scripts.
- Schedule dependency audit monthly; pin the two runtime deps in the Docker build (`npm ci`).
