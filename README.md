# Astritsa

Astritsa is a Greek-first full-stack astrology entertainment app scaffold with real authentication, consent gates, AI-provider integration, admin source management, Stripe payments, GDPR tools and legal pages.

## Important change

The previous Greek astrologer spotlight section has been removed to avoid confusion or implied endorsement.

## Features

- Greek-first UI with instant English toggle.
- Signup/signin with secure HTTP-only session cookie, plus one-click demo account login for frictionless preview/testing.
- Mandatory 18+ confirmation, Terms acceptance, Privacy acceptance and AI transparency agreement before features can be used.
- AI-generated readings for daily astrology, optional-question coffee cup reading, numerology, compatibility, Greek Oracle and surprise/moon portal.
- Real ephemeris context (astronomy-engine): each reading receives the day's true planetary positions, zodiac signs and degrees, mutual aspects, retrograde status and moon phase, plus astrological ground rules that instruct the AI on the sun-sign / transit / house methodology.
- Real-time aggregation layer that fetches admin-configured or environment-configured astrology sources and asks the AI to identify common high-level themes without copying source text.
- Admin interface for sources, users, contact messages and configuration status.
- Contact form with local storage and optional webhook forwarding.
- Stripe subscription checkout, billing portal and webhook endpoint.
- GDPR data export and account deletion endpoints.
- Cookie banner with essential-only and optional consent choices.
- Terms and Privacy pages.

## Run locally

```bash
cd astritsa
npm install   # installs astronomy-engine (real ephemeris)
npm start
```

The server binds to `0.0.0.0` and defaults to port `3000`.

Dependencies: the app has a single runtime dependency — the pure-JS `astronomy-engine` package (MIT), used to compute the true ephemeris (planets, aspects, retrogrades, moon phase). If it is missing or fails to load, the AI engine automatically falls back to a calendar-date approximation so the app still runs.

## Deploy

Production deployment (Docker, PM2, systemd, environment variables, health checks, reverse proxy, DNS for astritsa.com, backups) is documented in [DEPLOY.md](DEPLOY.md). Quick start:

```bash
cp .env.example .env.production   # fill in real values
docker compose up -d --build      # serves on 127.0.0.1:3000 behind your proxy
curl -fsS http://127.0.0.1:3000/api/health
```

## Tests

Run the automated suite (built-in `node:test`, no extra dev dependencies):

```bash
npm test
```

Coverage:

- `test/ephemeris.test.js` — ephemeris sanity: sign/degree mapping, known-sky checks (Sun sign across the year, September 2026 outer-planet retrogrades, the Mars–Saturn square), aspect soft/hard conventions.
- `test/ephemeris-golden.test.js` — golden snapshots locking positions (±0.5°, Moon ±1.5°), signs, retrograde flags, moon phase and aspect orbs for four historical dates (2026-09-04, 2024-06-21 eclipse-adjacent solstice, the 2017-08-21 total solar eclipse, 2000-01-01), each cross-validated against independent astro sources; fails loudly if an astronomy-engine update changes the sky.
- `test/auth-consent.test.js` — signup validations (weak password, age, mandatory consents, duplicates), signin, profile derivation, cookie consent, the Terms-version consent gate (451 → refresh → ready), GDPR export/delete, admin 403.
- `test/admin-crud.test.js` — admin bootstrapped from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, 401/403 guards, and full CRUD over HTTP: sources (create/validate/update/delete), users (rename, promote/demote, self-demote blocked, cascade delete), contacts (status update, delete).
- `test/readings.test.js` — all six reading endpoints through the full pipeline (auth → consent → real ephemeris context → in-process fake OpenAI-compatible provider), history, payments gate, plus the trending-topics flow: `GET /api/trends` catalog (id/title/query/topicSky) and `POST /api/trends` running real AI readings per topic query (stored in history as `trend`, 400/401 validation).
- `test/sign-page.test.js` — dedicated per-sign pages: `/zodiac` + `/zodiac/:sign` HTML serving (404s, traversal guards), and `GET /api/sky/:sign` real-ephemeris snapshots (10 bodies with whole-sign aspects, rulers, moon phase, unknown-sign/date validation) pinned to the independently validated 2026-09-04 sky.
- `test/hardening.test.js` — pre-launch security suite: password policy (upper/digit/special), refund-policy consent enforcement, security headers on API + static responses, XSS sanitization end-to-end, rate limiting (contact 5/min, signin 20/min → 429), legal/SEO artifacts (`/terms.html`, `/privacy.html`, `/refund.html`, `robots.txt`, `sitemap.xml`, `llms.txt`, canonical/OG/JSON-LD), and the lazy-loaded admin module.

Security posture (OWASP review, data map, residual risks) is documented in [SECURITY.md](SECURITY.md); deployment on Dokploy/Hostinger is covered in [DEPLOY.md](DEPLOY.md).

## SEO & AI visibility

- Static: `robots.txt`, `sitemap.xml` (home + legal + all 12 sign pages), `llms.txt` (AI-model ground truth), `humans.txt`.
- Per-page: canonical + Open Graph/Twitter meta, a dynamic meta manager that updates title/description per view and language, `Organization`/`WebSite`/`ItemList` JSON-LD on the home page, per-sign `Article` JSON-LD on `/zodiac/:sign`, and an `FAQPage` schema mirroring the on-page FAQ.

Tests never touch `data/db.json`: each test file runs in its own process against a temp DB (override `DB_PATH`) and an ephemeral in-process HTTP port.

## Required production environment variables

### AI

```bash
AI_API_KEY=...
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1   # optional OpenAI-compatible base URL
```

Without `AI_API_KEY`, reading endpoints intentionally return a setup error instead of mock content.

### Astrology sources

Add sources from the admin panel, or use env config:

```bash
ASTRO_SOURCE_URLS='[{"name":"Official Source","url":"https://example.com/rss","language":"en"}]'
SOURCE_CACHE_SECONDS=600
```

Use only sources you are allowed to use: official APIs, licensed feeds, RSS feeds whose terms permit this use, or your own editorial sources.

### Admin

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD='use-a-long-secure-password'
```

On boot, the app creates or upgrades this email to admin.

### Sessions

```bash
SESSION_DAYS=30
APP_ORIGIN=https://your-domain.example
```

### Analytics & marketing tags (optional, consent-gated)

```bash
ANALYTICS_GA4_ID=G-XXXXXXXXXX   # Google Analytics 4 measurement id
MARKETING_PIXEL_ID=1234567890   # Meta Pixel id
```

When set, the ids are exposed via `/api/config`. The client injects the gtag.js / Meta Pixel scripts only after the visitor's stored cookie-consent choice (Accept all / Customize in the banner) grants the matching category — analytics/marketing are never loaded for "Essential only" visitors. Withdrawing consent revokes the tags (GA consent mode denied / pixel revoke) and they are not re-injected on later page loads.

### Stripe

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://your-domain.example/?billing=success#account
STRIPE_CANCEL_URL=https://your-domain.example/?billing=cancel#account
PAYMENTS_REQUIRED=false
```

If `PAYMENTS_REQUIRED=true`, AI reading endpoints require an active/trialing subscription unless the user is admin.

### Contact forwarding

```bash
CONTACT_WEBHOOK_URL=https://hooks.zapier.com/...   # optional
```

If omitted, messages are still stored and visible to admins.

## API overview

- `GET /api/health`
- `GET /api/config`
- `GET /api/signs`
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/signout`
- `GET /api/auth/me`
- `POST /api/profile`
- `POST /api/daily`
- `POST /api/coffee`
- `POST /api/numerology`
- `POST /api/compatibility`
- `POST /api/tarot`
- `POST /api/surprise`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/stripe/webhook`
- `GET /api/privacy/export`
- `DELETE /api/privacy/delete`
- `POST /api/contact`
- `GET /api/admin/overview`
- `POST /api/admin/sources`
- `DELETE /api/admin/sources/:id`

## Compliance note

This scaffold includes technical controls and clear notices for GDPR and AI transparency, but final legal compliance depends on your production deployment, your company details, data processing agreements, Stripe/AI provider settings, source licenses, retention policy and legal review.
