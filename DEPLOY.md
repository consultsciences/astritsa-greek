# Deploying Astritsa to production

This guide takes the app from `node server.js` to a real domain (e.g. `astritsa.com`).

## Architecture notes (read first)

- **One Node process, one file.** The entire database is `data/db.json` (users, sessions, history, sources, contacts, consents) with synchronous writes. Run exactly **one instance** — never cluster/replicate it. Scale is handled by the reverse proxy, not by more app processes.
- **Outbound network required.** At reading time the app (a) calls your AI provider (OpenAI-compatible chat completions) and (b) fetches configured astrology sources (RSS) for consensus. The container/host must reach both.
- **Runtime dependency:** `astronomy-engine` (pure JS). `npm ci --omit=dev` is the only install step.
- **Cookies.** Session cookies get the `Secure` flag when `APP_ORIGIN` starts with `https://` or the proxy sends `X-Forwarded-Proto: https`. Set `APP_ORIGIN=https://astritsa.com` and configure the proxy as shown below.
- **Health endpoint:** `GET /api/health` returns HTTP 200 with `{"ok":true,...}`. Use it for Docker HEALTHCHECK, systemd/PM2 health hooks, and uptime monitors.
- `mock-ai.js` (the local dev AI provider on port 4010) is **dev-only** and is not included in the Docker image. Production must set a real `AI_API_KEY`/`AI_BASE_URL`.

---

## Option A0 — Dokploy on a Hostinger VPS

The image and compose file are Dokploy-ready (Dokploy builds from the Dockerfile and injects env at runtime).

1. **Create project → Service → Docker Compose** (or “Dockerfile”), pointing at this repo/branch.
   - Build type: **Dockerfile** (no custom path needed) or paste `docker-compose.yml` for compose mode.
2. **Environment tab:** paste every variable from the `.env.example` table below **except `PORT`**
   (the container listens on 3000; Dokploy maps its own domain/port). Secrets stay in Dokploy's
   encrypted env store — never in the image.
3. **Volumes:** add a volume mounting to `/app/data` (this is the whole database + consent logs).
   In compose mode this is already declared as `astritsa-data`.
4. **Domains tab:** add `astritsa.com` and `www.astritsa.com`, enable **HTTPS** (Let's Encrypt —
   Dokploy handles the certificate and reverse proxy; traffic reaches the container as HTTP on 3000).
5. **Health check:** path `/api/health`, port 3000, interval 30s. Dokploy waits for it before routing.
6. **Webhook (optional):** point the Stripe webhook endpoint at `https://astritsa.com/api/stripe/webhook`
   and set `STRIPE_WEBHOOK_SECRET` in the env tab.
7. **Deploy.** Verify: `curl -fsS https://astritsa.com/api/health` returns `ok:true`, then sign in as admin
   once to bootstrap the admin user.

Secrets checklist for the Dokploy env tab (minimum for launch):
`APP_ORIGIN=https://astritsa.com`, `AI_API_KEY`, `AI_MODEL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`,
`STRIPE_CANCEL_URL`, optionally `CONTACT_WEBHOOK_URL`, `ANALYTICS_GA4_ID`, `MARKETING_PIXEL_ID`.

## Option A — Docker (recommended)

### 1. Configure

```bash
cp .env.example .env.production
# edit .env.production with real values (see the env table below)
```

### 2. Build & run

```bash
docker compose up -d --build
docker compose ps            # status + health
curl -fsS http://127.0.0.1:3000/api/health
```

Or plain Docker:

```bash
docker build -t astritsa:latest .
docker run -d --name astritsa \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  --env-file .env.production \
  -v astritsa-data:/app/data \
  astritsa:latest
```

The image:
- runs as the unprivileged `node` user,
- ships **without** `data/` (the DB lives in a volume you must persist),
- ships **without** `mock-ai.js` and `test/`,
- has a built-in `HEALTHCHECK` hitting `/api/health`.

### Updating

```bash
git pull && docker compose up -d --build
```

Back up the volume (`docker run --rm -v astritsa-data:/data -v "$PWD":/backup alpine tar czf /backup/db-backup.tgz -C /data db.json`) before major upgrades.

---

## Option B — PM2 (bare metal / VM)

```bash
npm ci --omit=dev
npm install -g pm2
cp .env.example .env            # fill in real values
set -a && source .env && set +a # or use pm2's env file support
pm2 start ecosystem.config.js
pm2 save                        # persist across reboots
pm2 startup                    # follow its instructions
```

- Keep `instances: 1` (fork mode) — see the architecture note.
- Logs: `pm2 logs astritsa`.
- Health: `pm2 start` supports `--` no built-in probe; use an uptime monitor pointed at `/api/health`, or a cron:

```bash
# crontab: every minute, restart if unhealthy
* * * * * curl -fsS --max-time 5 http://127.0.0.1:3000/api/health >/dev/null || pm2 restart astritsa
```

---

## Option C — systemd (bare metal / VM)

A ready unit file is in [`deploy/astritsa.service`](deploy/astritsa.service) — install instructions are in its header comment. Highlights:

- `EnvironmentFile=/etc/astritsa.env` (chmod 600 — this is where your secrets live).
- `Restart=always`, `ProtectSystem=full`, `ReadWritePaths=/opt/astritsa/data`, dedicated `astritsa` user.
- Health: use a monitor on `/api/health`, or add a `HealthCheckCommand` if your platform supports it.

---

## Reverse proxy (TLS termination)

Terminate TLS at the proxy; forward to the app. **Must pass `X-Forwarded-Proto: https`** so the app sets `Secure` cookies.

nginx:

```nginx
server {
  listen 443 ssl http2;
  server_name astritsa.com www.astritsa.com;
  # ssl_certificate ... / ssl_certificate_key ...  (e.g. certbot)

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_http_version 1.1;
  }

  location /api/health {
    proxy_pass http://127.0.0.1:3000;
    access_log off;
  }
}

server {  # redirect plain HTTP
  listen 80;
  server_name astritsa.com www.astritsa.com;
  return 301 https://$host$request_uri;
}
```

Caddy (simpler):

```
astritsa.com, www.astritsa.com {
  reverse_proxy 127.0.0.1:3000
}
```

Then set `APP_ORIGIN=https://astritsa.com` so Stripe return URLs, cookie flags, and origin-relative logic are correct.

---

## Health checks

`GET /api/health` → `200` with `{"ok":true,"name":"Astritsa","date":"...","aiConfigured":true|false,"stripeConfigured":true|false}`.

- **Docker:** the image's `HEALTHCHECK` (interval 30s, start-period 15s) marks the container unhealthy when the app is down. Compose shows it in `docker compose ps`.
- **Manual smoke:**

  ```bash
  curl -fsS https://astritsa.com/api/health
  ```

  `aiConfigured:false` there means the AI env vars are missing/mis-set even though the app is up.
- **Uptime monitoring (UptimeRobot, Better Uptime, Grafana…):** monitor `https://astritsa.com/api/health`, expect HTTP 200.
- **Deep smoke (optional):** a demo login + one reading exercises auth → consents → ephemeris → AI provider → source aggregation:

  ```bash
  curl -s -c /tmp/c -X POST https://astritsa.com/api/auth/demo
  curl -s -b /tmp/c -X POST https://astritsa.com/api/daily -H 'Content-Type: application/json' -d '{"language":"en"}'
  ```

  Expect `{"reading":{...}}` with `title`, `summary`, `sourcesUsed`.

---

## Environment variables

All are read from the process env. Required for a fully working site: **`AI_API_KEY`, `AI_MODEL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `APP_ORIGIN`**. Everything else is optional with the defaults shown.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | `3000` | Bind port (in Docker, keep `3000` and map the port). |
| `APP_ORIGIN` | **yes (prod)** | request host | Canonical origin, e.g. `https://astritsa.com`; enables `Secure` cookies and correct Stripe return URLs. |
| `SESSION_DAYS` | no | `30` | Session cookie lifetime. |
| `AI_API_KEY` | **yes** | — | Provider API key. Unset → readings return `AI_NOT_CONFIGURED` (by design). |
| `AI_MODEL` | **yes** | `gpt-4o-mini` | Model id. |
| `AI_BASE_URL` | no | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint. |
| `AI_TEMPERATURE` | no | `0.72` | Sampling temperature. |
| `ASTRO_SOURCE_URLS` | no | — | JSON array `[{"name","url","language"}]` of allowed RSS sources. |
| `SOURCE_CACHE_SECONDS` | no | `600` | Source fetch cache TTL. |
| `MAX_ASTRO_SOURCES` | no | `10` | Max sources per request. |
| `SOURCE_TIMEOUT_MS` | no | `7000` | Per-source fetch timeout. |
| `SOURCE_EXCERPT_CHARS` | no | `2400` | Excerpt length per source. |
| `AI_SOURCE_CONTEXT_CHARS` | no | `12000` | Total source text given to the AI. |
| `ADMIN_EMAIL` | **yes** | — | Bootstraps/upgrades this email to admin. |
| `ADMIN_PASSWORD` | **yes** | — | Admin sign-in password. |
| `STRIPE_SECRET_KEY` | no | — | Enables billing endpoints. |
| `STRIPE_PRICE_ID` | no | — | Subscription price. |
| `STRIPE_WEBHOOK_SECRET` | no | — | Webhook signature verification. |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | no | `APP_ORIGIN` based | Stripe redirects. |
| `PAYMENTS_REQUIRED` | no | `false` | `true` → readings require active/trialing subscription (except admin). |
| `CONTACT_WEBHOOK_URL` | no | — | Contact-form forwarding; without it messages are stored for admin review. |
| `ANALYTICS_GA4_ID` | no | — | Google Analytics 4 measurement id (e.g. `G-XXXXXXX`). The gtag.js script loads client-side **only** after the visitor grants analytics cookie consent. |
| `MARKETING_PIXEL_ID` | no | — | Meta Pixel id. The pixel loads client-side **only** after the visitor grants marketing cookie consent. |
| `DB_PATH` | no | `data/db.json` | Override the database file (already used for tests; mount a volume on `data/` instead in prod). |

Never put secrets in the Docker image or commit them. Use `env_file` (Docker), `/etc/astritsa.env` chmod 600 (systemd), or the platform's secret manager.

---

## DNS & edge — occupying astritsa.com

Current state of the domain (checked Sep 2026): `www.astritsa.com` has **no DNS records**, and `astritsa.com` points at Cloudflare → an origin that answers Go's `404 page not found` on every path. To make the app live there:

1. **Add a `www` record** — CNAME `www` → `astritsa.com` (or an A record to the origin IP).
2. **Point the origin at the app** — replace the Go-404 service behind Cloudflare with this Node app (Docker on the origin box, proxy on 127.0.0.1:3000). Verify with `curl -I https://astritsa.com/` → 200 and `curl -fsS https://astritsa.com/api/health`.
3. **TLS** — Cloudflare (Full/Strict) or certbot; ensure `X-Forwarded-Proto: https` reaches the app and `APP_ORIGIN=https://astritsa.com`.
4. **Set `robots.txt` / SEO** if the site should be indexable, and decide on a `www` → apex redirect (do it at the edge: 301 `www` → apex).
5. **Smoke the Stripe webhook path** — Cloudflare proxies only HTTP; Stripe will call `https://astritsa.com/api/stripe/webhook` fine, but confirm `STRIPE_WEBHOOK_SECRET` is set so signatures are verified.

---

## Data persistence & backups

- Everything lives in `data/db.json`. The app creates it on first boot.
- **Backup** (Docker):

  ```bash
  docker run --rm -v astritsa-data:/data -v "$PWD":/backup alpine \
    tar czf /backup/db-backup-$(date +%F).tgz -C /data .
  ```

  Bare metal: `cp data/db.json data/db.json.$(date +%F)` (writes are small and synchronous; a plain copy is fine for a moment-in-time snapshot).
- **Restore:** stop the app, replace `data/db.json` from the backup, start.
- **Disaster note:** the source cache and sessions are memory/disk ephemeral; losing them is fine. Only `db.json` matters. Consider off-site copies (S3/Rclone) if the DB has real users.
- **Never** run two instances against the same `db.json` file.

---

## Rollout checklist

- [ ] `npm ci --omit=dev` succeeds on a clean checkout (locks `astronomy-engine`).
- [ ] `npm test` passes (24 tests: ephemeris sanity, auth/consent gates, all six readings against a fake provider).
- [ ] `/api/health` returns `{"ok":true}` **and** `aiConfigured:true` from the public URL.
- [ ] Admin bootstrap: sign in with `ADMIN_EMAIL`/`ADMIN_PASSWORD` at `/#account` → admin panel visible.
- [ ] One live reading end-to-end (demo login → daily) with real source consensus and no `SOURCE …` header junk in the UI.
- [ ] `PAYMENTS_REQUIRED` and Stripe tested with a Stripe test key + test webhook before switching to live keys.
- [ ] `APP_ORIGIN` is `https://astritsa.com`, cookies carry `Secure`, HTTP → HTTPS redirect works.
- [ ] Backups scheduled and restore rehearsed.
- [ ] Legal review: consent/terms versions (`TERMS_VERSION` in `server.js`), AI transparency text, GDPR export/delete — per the compliance note in the README.