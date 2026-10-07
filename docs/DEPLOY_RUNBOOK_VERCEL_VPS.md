# Deploy Runbook — Voxentra CRM (Vercel + VPS + Supabase)

Production stack for **voxentra-crm.com** (branch `stable`).  
Do **not** use this for albaaits.id unless that project is explicitly in scope.

## Architecture (current)

| Layer | Where | Role |
|-------|--------|------|
| CRM UI + API Routes | **Vercel** (Next.js) | Agent app, `send-message` / `send-media` / `send-location`, bridge inbound/status |
| WhatsApp (Baileys) | **VPS** `129.226.81.114:3001` (PM2 `whatsapp-service`) | QR session, send/receive WA, forward to CRM when no local Supabase key |
| Data / Auth / Realtime / Storage | **Supabase Cloud** | Postgres, Auth, Realtime (`messages`), Storage (`chat-media`) |

```
Browser ──HTTPS──► Vercel (Next.js)
                      │
                      ├── service role ──► Supabase
                      └── HTTP ──────────► VPS :3001 (Baileys)
                                              │
                         inbound / status ────┘
                         POST /api/whatsapp/baileys-incoming
                         POST /api/whatsapp/baileys-status
```

**Important:** Agent chat sends **directly** to the VPS (not BullMQ on Vercel).  
Browser must **not** call `http://129.226…` (Mixed Content); use `/api/whatsapp/service-health` proxies instead.

---

## Paths & remotes

| Item | Value |
|------|--------|
| Git branch (prod) | `stable` |
| GitHub | `ztrans-apps/crm` |
| Vercel app URL | `https://voxentra-crm.com` (also `*.vercel.app`) |
| VPS app path | `/home/ubuntu/apps/crm` |
| VPS Baileys cwd | `/home/ubuntu/apps/crm/whatsapp-service` |
| Auth sessions | `/home/ubuntu/apps/crm/.baileys_auth` (or path in env) |
| PM2 process | `whatsapp-service` → `src/server.js` |
| Baileys health | `http://127.0.0.1:3001/health` (on VPS) |

---

## Environment variables

### Never commit secrets

- Put secrets only in **Vercel Project Settings → Environment Variables** and **VPS** `whatsapp-service/.env`.
- If a key was pasted in chat/email, **rotate it in Supabase** (Settings → API) and update Vercel/VPS.

### Vercel (Production / Preview as needed)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Legacy JWT **anon** key (safe in browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role JWT — server only, never `NEXT_PUBLIC_*` |
| `WHATSAPP_SERVICE_URL` | Yes | `http://129.226.81.114:3001` (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://voxentra-crm.com` |
| `DEFAULT_TENANT_ID` | Recommended | UUID tenant default |
| `WHATSAPP_BRIDGE_SECRET` | Recommended | Shared secret; same value as VPS |
| `NEXT_PUBLIC_WHATSAPP_SERVICE_URL` | Avoid HTTP VPS | Prefer omit, or leave unset so browser uses proxies |

Optional: Redis/Upstash, Sentry, Meta Cloud API vars (only if those features are used).

**Do not** put Baileys secret / service role in `NEXT_PUBLIC_*`.

### VPS — `whatsapp-service/.env`

| Variable | Required | Notes |
|----------|----------|--------|
| `PORT` | Yes | `3001` |
| `FRONTEND_URL` | Yes | `https://voxentra-crm.com` (CORS + bridge base) |
| `CRM_APP_URL` | Optional | Overrides bridge base if set; else uses `FRONTEND_URL` |
| `SUPABASE_URL` | Optional | Only if writing DB from VPS |
| `SUPABASE_SERVICE_KEY` | Leave empty for bridge mode | Empty → inbound + status go to Vercel bridge |
| `WHATSAPP_BRIDGE_SECRET` | Same as Vercel if set | Header `x-bridge-secret` |
| `DEFAULT_TENANT_ID` | Recommended | Same as Vercel |

Bridge mode (current production): **empty** `SUPABASE_SERVICE_KEY` on VPS is intentional.

---

## Deploy procedures

### A. App (Vercel) — usual path

1. Merge / commit on `stable`.
2. `git push origin stable`.
3. Wait for Vercel production deployment (Git integration).
4. Smoke-check:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://voxentra-crm.com/
   curl -s -X POST https://voxentra-crm.com/api/whatsapp/baileys-status \
     -H "Content-Type: application/json" \
     -d '{"whatsappMessageId":"probe","status":"sent"}'
   ```
   Expect bridge status JSON like `{"success":true,"updated":false,"reason":"message_not_found"}` (route live).

CLI (optional, needs `vercel login` on the machine):

```bash
npx vercel deploy --prod --yes
```

### B. Baileys (VPS) — after `whatsapp-service` or shared code changes

From a machine with SSH access:

```bash
ssh ubuntu@129.226.81.114
cd /home/ubuntu/apps/crm
git fetch origin stable
git checkout stable
git pull origin stable
cd whatsapp-service
npm ci --omit=dev   # or: npm install --omit=dev
pm2 restart whatsapp-service
pm2 status whatsapp-service
curl -s http://127.0.0.1:3001/health
```

Expect: process **online**, health `{"success":true,"status":"healthy",...}`.

**Do not** delete `.baileys_auth` unless you intentionally want a new QR login.

### C. Full release (both)

1. Push `stable` → Vercel auto-deploys.
2. Immediately SSH and pull + `pm2 restart` on VPS (Baileys code is not served by Vercel).
3. Run smoke tests below.

---

## Smoke tests (WhatsApp parity)

| # | Test | Pass criteria |
|---|------|----------------|
| 1 | CRM → WA text | Message appears on phone; DB `status` → `sent` then `delivered` / `read` |
| 2 | WA → CRM text | Appears in chat list/realtime; not stuck as `[Media]` for plain text |
| 2b | Sales reply on phone WA | Appears in CRM as outbound (`is_from_me`), no unread bump; no duplicate if also sent from CRM |
| 3 | CRM → WA image | Received on phone |
| 4 | WA → CRM image | Bubble + storage URL in CRM |
| 5 | CRM → WA location | Pin on phone |
| 6 | WA → CRM location | Map / `message_type=location` in CRM |
| 7 | Reply / quote | Quoted context visible both sides |
| 8 | Session | WhatsApp stays **CONNECTED** after PM2 restart (no forced new QR) |

Logs:

```bash
# VPS
pm2 logs whatsapp-service --lines 100

# Bridge failures often show: forward incoming/status failed, or CRM 401 if bridge secret mismatch
```

---

## Rollback

### Vercel

- Vercel Dashboard → Deployments → promote previous production deployment.

### VPS Baileys

```bash
cd /home/ubuntu/apps/crm
git log --oneline -5
git checkout <previous-good-sha>
cd whatsapp-service && npm ci --omit=dev
pm2 restart whatsapp-service
```

Or: `git revert` on `stable` and push, then pull on VPS.

---

## Common failures

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Mixed Content / health fail in browser | Calling `http://129…` from HTTPS | Use `/api/whatsapp/service-health` only |
| Reply in CRM, not on phone | Send went to queue / wrong URL | Confirm `WHATSAPP_SERVICE_URL` on Vercel; direct-send paths |
| Inbound missing | Bridge URL wrong / Vercel down / secret mismatch | Check VPS `FRONTEND_URL`, `WHATSAPP_BRIDGE_SECRET` both sides |
| Status stuck on `sent` | Status bridge not deployed / CRM URL empty | Deploy `baileys-status`; set `FRONTEND_URL` |
| QR logout after restart | Init with `forceNew: true` | Keep restore-from-auth; do not wipe `.baileys_auth` |
| `lid:628…` invalid phone | LID stored as phone | Normalized in send path; fix contact if needed |

---

## Security checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` only on Vercel (and never in git / chat / screenshots)
- [ ] Rotate any key that was shared in chat, then update Vercel + local `.env.local` only
- [ ] Prefer `WHATSAPP_BRIDGE_SECRET` on Vercel **and** VPS
- [ ] VPS firewall: expose `:3001` only as needed (or put behind nginx + allowlist Vercel egress if tightened later)
- [ ] Do not commit `.env`, `.env.local`, or VPS `.env`

---

## Related docs

- `DEPLOYMENT_CHECKLIST.md` — Vercel checklist (generic)
- `.env.production.example` — variable names for Vercel
- `.github/workflows/deploy-production.yml` — **Docker / `main` path**; not the current Voxentra `stable` + PM2 flow
