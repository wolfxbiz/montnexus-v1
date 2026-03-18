# Montnexus V1 — Credentials & Environment Variables Reference

> Version: 1.0 | March 2026
> **NEVER commit real credentials to git. All `.env` files are gitignored.**
> This document explains every variable, where to find it, and how to use it.

---

## Quick Summary

| File | Used by | Contains |
|---|---|---|
| `backend/.env` | Django server | Supabase, Razorpay, WhatsApp secrets |
| `frontend/.env` | React (Vite) | Supabase public keys, backend URL |

---

## `backend/.env` — Full Reference

### Django Core

```
DJANGO_SECRET_KEY=
```
- **What it is:** A long random string used by Django for cryptographic signing (sessions, CSRF tokens)
- **Where to get it:** Generate a new one — never reuse between projects or environments
- **Generate command:**
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(50))"
  ```
- **Example:** `K3mX9vR2_qLpNwZ8aYcT1uJfDsEhOiBx7gMnVkWA6tCyPl4rH5`
- **Security:** Never expose. If leaked, regenerate immediately and redeploy.

---

```
DEBUG=
```
- **What it is:** Enables Django debug mode
- **Values:** `True` (development only) | `False` (production — always)
- **Warning:** Never set `True` in production — exposes stack traces and internal config

---

```
ALLOWED_HOSTS=
```
- **What it is:** Comma-separated list of hostnames Django will accept requests from
- **Development:** `localhost,127.0.0.1`
- **Production:** `your-app.railway.app` or `api.yourdomain.com`
- **Example:** `localhost,127.0.0.1,montnexus-backend.up.railway.app`

---

### Supabase

```
SUPABASE_URL=
```
- **What it is:** Your Supabase project's base URL
- **Where to find:** Supabase Dashboard → Project Settings → API → Project URL
- **Format:** `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
- **Example:** `https://szcdfidxuyuivunxmjyo.supabase.co`
- **Used for:** All Supabase client calls from Django (service role)

---

```
SUPABASE_SERVICE_KEY=
```
- **What it is:** Service role key — bypasses Row Level Security, has full DB access
- **Where to find:** Supabase Dashboard → Project Settings → API → `service_role` key
- **Format:** Long JWT starting with `eyJ...`
- **Security:** CRITICAL — never expose to frontend, never commit to git. If leaked, rotate immediately in Supabase Dashboard.
- **Used for:** All Django backend queries to Supabase

---

```
SUPABASE_JWT_SECRET=
```
- **What it is:** JWT signing secret (legacy HS256 — kept for reference)
- **Where to find:** Supabase Dashboard → Project Settings → API → JWT Settings → JWT Secret
- **Note:** Not actively used for verification anymore — the middleware uses JWKS (ES256). Keep it in `.env` for reference only.

---

### Razorpay

```
RAZORPAY_KEY_ID=
```
- **What it is:** Razorpay API key identifier (public-facing part)
- **Where to find:** Razorpay Dashboard → Settings → API Keys
- **Test format:** `rzp_test_xxxxxxxxxxxxxxxxxxxx`
- **Live format:** `rzp_live_xxxxxxxxxxxxxxxxxxxx`
- **Used for:** Creating payment orders (backend) and initialising checkout widget (frontend)

---

```
RAZORPAY_KEY_SECRET=
```
- **What it is:** Razorpay API secret key — used to sign and verify payments
- **Where to find:** Razorpay Dashboard → Settings → API Keys (shown once at generation)
- **Security:** Never expose to frontend. Used only in Django to verify payment signatures.
- **If lost:** Regenerate in Razorpay Dashboard → old key is invalidated

---

### WhatsApp (Meta)

```
WHATSAPP_API_URL=
```
- **What it is:** Meta Graph API base URL for WhatsApp
- **Value:** Always `https://graph.facebook.com/v22.0`
- **Note:** Version number (v22.0) may need updating as Meta deprecates older versions

---

```
WHATSAPP_ACCESS_TOKEN=
```
- **What it is:** OAuth token used to authenticate API calls to Meta
- **Where to find:** Meta Developer Console → your app → WhatsApp → API Setup → Access Token
- **Types:**
  - **Temporary (24h):** Generated from API Setup page — expires every 24 hours, for testing only
  - **Permanent:** Generated via Meta Business Manager → System Users — never expires
- **Security:** Treat like a password. If leaked, revoke in Meta Developer Console.
- **For production:** Always use a permanent system user token

---

```
WHATSAPP_PHONE_ID=
```
- **What it is:** The numeric ID of your WhatsApp Business phone number
- **Where to find:** Meta Developer Console → WhatsApp → API Setup → Phone Number ID
- **Example:** `1070806886107552`
- **Note:** This is the "From" number — the number that sends messages

---

```
WHATSAPP_VERIFY_TOKEN=
```
- **What it is:** A string you choose — used to verify Meta's webhook during setup
- **Where to find:** You set this yourself — must match what you enter in Meta Developer Console → Configuration → Verify Token
- **Example:** `montnexus_verify_2026`
- **Used for:** `GET /api/notifications/webhook/whatsapp/` verification handshake

---

## `frontend/.env` — Full Reference

```
VITE_SUPABASE_URL=
```
- **What it is:** Your Supabase project URL — same as backend
- **Where to find:** Supabase Dashboard → Project Settings → API → Project URL
- **Safe to expose:** Yes — this is a public endpoint

---

```
VITE_SUPABASE_ANON_KEY=
```
- **What it is:** Supabase anonymous/public key — used for frontend auth and direct Supabase queries
- **Where to find:** Supabase Dashboard → Project Settings → API → `anon` `public` key
- **Safe to expose:** Yes — this is intentionally public. Row Level Security (RLS) controls what it can access.
- **Note:** Different from `SUPABASE_SERVICE_KEY`. The anon key respects RLS — it cannot bypass policies.

---

```
VITE_API_BASE_URL=
```
- **What it is:** The base URL of your Django backend
- **Development:** `http://localhost:8000`
- **Production:** `https://your-app.railway.app` or `https://api.yourdomain.com`
- **Used for:** All `apiClient.get/post/...` calls in the React frontend

---

## Complete `.env` Templates

### `backend/.env` (copy and fill in)

```env
# Django
DJANGO_SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=your-jwt-secret

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=

# WhatsApp
WHATSAPP_API_URL=https://graph.facebook.com/v22.0
WHATSAPP_ACCESS_TOKEN=EAANkbvt...
WHATSAPP_PHONE_ID=1070806886107552
WHATSAPP_VERIFY_TOKEN=montnexus_verify_2026
```

### `frontend/.env` (copy and fill in)

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_API_BASE_URL=http://localhost:8000
```

---

## Where to Find Everything — Quick Reference

| Credential | Dashboard | Location |
|---|---|---|
| `SUPABASE_URL` | supabase.com | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | supabase.com | Project Settings → API → anon public key |
| `SUPABASE_SERVICE_KEY` | supabase.com | Project Settings → API → service_role key |
| `SUPABASE_JWT_SECRET` | supabase.com | Project Settings → API → JWT Settings |
| `RAZORPAY_KEY_ID` | razorpay.com | Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | razorpay.com | Settings → API Keys |
| `WHATSAPP_ACCESS_TOKEN` | developers.facebook.com | App → WhatsApp → API Setup |
| `WHATSAPP_PHONE_ID` | developers.facebook.com | App → WhatsApp → API Setup |
| `WHATSAPP_VERIFY_TOKEN` | You set this | Must match Meta → Configuration → Verify Token |
| `DJANGO_SECRET_KEY` | Generate locally | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |

---

## Security Rules

1. **Never commit `.env` files.** The `.gitignore` already excludes them. Double-check with `git status` before every push.

2. **Never share `SUPABASE_SERVICE_KEY` or `RAZORPAY_KEY_SECRET`** — these have full access to your database and payment account.

3. **Rotate keys immediately if leaked:**
   - Supabase: Dashboard → Settings → API → Regenerate keys
   - Razorpay: Dashboard → Settings → API Keys → Regenerate
   - WhatsApp: Meta Developer Console → Invalidate token
   - Django: Generate a new `DJANGO_SECRET_KEY` and redeploy (logs out all users)

4. **Use separate credentials per environment:**
   - Development → Razorpay test keys (`rzp_test_...`)
   - Production → Razorpay live keys (`rzp_live_...`)
   - Each client → Their own Supabase project + WhatsApp account

5. **Use a permanent WhatsApp token in production.** Temporary tokens (24h) will cause the app to stop sending messages overnight.

6. **Store production credentials in Railway/Vercel env vars**, not in files. Never put live credentials in any file that touches the repo.

---

## Per-Client Credential Checklist

When onboarding a new clinic client, they need their own set of:

- [ ] Supabase project (new project URL + anon key + service key)
- [ ] Razorpay account (their own KYC — payments go to their bank)
- [ ] Meta Developer App + WhatsApp Business number
- [ ] Django secret key (generate fresh)
- [ ] Domain (optional)
- [ ] Railway service + Vercel project with their env vars

---

*Montnexus V1 | Credentials Reference v1.0 | March 2026*
