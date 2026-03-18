# Montnexus V1 — Deployment Guide

> Version: 1.0 | March 2026
> Stack: Django (Railway) + React (Vercel) + Supabase (existing)

---

## Overview

| Layer | Local | Production |
|---|---|---|
| Frontend | `localhost:5174` (Vite) | Vercel (free) |
| Backend | `localhost:8000` (Django) | Railway (free tier) |
| Database | Supabase project | Same Supabase project |
| Domain | — | Namecheap / GoDaddy (~₹800/year) |

Total cost to deploy: **₹0–800/month** on free tiers.

---

## Step 1 — Prepare the Backend for Production

### 1.1 Create `backend/Procfile`

```
web: gunicorn core.wsgi --bind 0.0.0.0:$PORT
```

### 1.2 Add `gunicorn` to requirements

```bash
cd backend
pip install gunicorn
pip freeze > requirements.txt
```

### 1.3 Update `core/settings.py`

Add these settings (they read from env vars in production):

```python
import os

# Security
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')

# CORS — add your Vercel frontend URL
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://your-app.vercel.app',      # add after Vercel deploy
    'https://your-custom-domain.com',   # add after domain setup
]

# Static files (needed for Django admin)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
```

### 1.4 Add `whitenoise` for static files

```bash
pip install whitenoise
pip freeze > requirements.txt
```

In `core/settings.py` MIDDLEWARE, add after `SecurityMiddleware`:

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # add this
    ...
]
```

### 1.5 Collect static files

```bash
python manage.py collectstatic --noinput
```

### 1.6 Add `runtime.txt` (tells Railway which Python version)

Create `backend/runtime.txt`:

```
python-3.13.0
```

---

## Step 2 — Prepare the Frontend for Production

### 2.1 Update `frontend/.env.example`

Make sure it has the production API URL placeholder:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-backend.railway.app
```

### 2.2 Test the production build locally

```bash
cd frontend
npm run build
npm run preview
```

Make sure everything works at `http://localhost:4173` before deploying.

---

## Step 3 — Deploy Backend to Railway

### 3.1 Create a Railway account

Go to **railway.app** → Sign up with GitHub.

### 3.2 Create a new project

1. Click **New Project → Deploy from GitHub repo**
2. Connect your GitHub account and select the `montnexus-v1` repo
3. Railway will detect it's a Python project

### 3.3 Set the root directory

In Railway project settings → **Root Directory** → set to `backend`

### 3.4 Set environment variables

In Railway → your service → **Variables** tab, add all of these:

```
DJANGO_SECRET_KEY=<generate a new long random string>
DEBUG=False
ALLOWED_HOSTS=<your-app>.railway.app
SUPABASE_URL=https://szcdfidxuyuivunxmjyo.supabase.co
SUPABASE_SERVICE_KEY=<your service role key>
SUPABASE_JWT_SECRET=<your jwt secret>
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=<your razorpay secret>
WHATSAPP_API_URL=https://graph.facebook.com/v22.0
WHATSAPP_ACCESS_TOKEN=<your permanent token>
WHATSAPP_PHONE_ID=1070806886107552
WHATSAPP_VERIFY_TOKEN=montnexus_verify_2026
```

> Generate a new Django secret key:
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(50))"
> ```

### 3.5 Deploy

Railway auto-deploys on every push to `main`. Click **Deploy** to trigger the first deploy.

### 3.6 Get your backend URL

Once deployed, Railway gives you a URL like:
`https://montnexus-backend-production.up.railway.app`

Save this — you need it for the frontend.

### 3.7 Run Django migrations on Railway

In Railway → your service → **Shell** tab:

```bash
python manage.py migrate
```

---

## Step 4 — Deploy Frontend to Vercel

### 4.1 Create a Vercel account

Go to **vercel.com** → Sign up with GitHub.

### 4.2 Import the project

1. Click **Add New → Project**
2. Select your `montnexus-v1` GitHub repo
3. Set **Root Directory** to `frontend`
4. Framework: **Vite** (Vercel auto-detects)

### 4.3 Set environment variables in Vercel

In Vercel project → **Settings → Environment Variables**, add:

```
VITE_SUPABASE_URL=https://szcdfidxuyuivunxmjyo.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
VITE_API_BASE_URL=https://montnexus-backend-production.up.railway.app
```

### 4.4 Deploy

Click **Deploy**. Vercel builds the React app and gives you a URL like:
`https://montnexus-v1.vercel.app`

### 4.5 Update CORS in Django

Now that you have the Vercel URL, go back to Railway → Variables and update:

```
ALLOWED_HOSTS=montnexus-backend-production.up.railway.app
```

And update `CORS_ALLOWED_ORIGINS` in `core/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    'https://montnexus-v1.vercel.app',
]
```

Commit and push — Railway auto-redeploys.

---

## Step 5 — Connect a Custom Domain (optional)

### 5.1 Buy a domain

Buy from Namecheap, GoDaddy, or Google Domains. e.g. `montnexus.in` (~₹800/year)

### 5.2 Add domain to Vercel (frontend)

1. Vercel → your project → **Settings → Domains**
2. Add `montnexus.in` and `www.montnexus.in`
3. Vercel gives you DNS records (CNAME or A record)

### 5.3 Add domain to Railway (backend, optional)

1. Railway → your service → **Settings → Networking → Custom Domain**
2. Add `api.montnexus.in`
3. Add the CNAME record to your DNS

### 5.4 Update DNS

In your domain registrar (Namecheap etc.) → DNS settings:

| Type | Name | Value |
|---|---|---|
| A | @ | `76.76.21.21` (Vercel IP) |
| CNAME | www | `cname.vercel-dns.com` |
| CNAME | api | `<your-railway-url>.railway.app` |

DNS changes take 10–30 minutes to propagate.

### 5.5 Update env vars with new domain

Update Vercel env var:
```
VITE_API_BASE_URL=https://api.montnexus.in
```

Update `CORS_ALLOWED_ORIGINS` in Django settings:
```python
CORS_ALLOWED_ORIGINS = [
    'https://montnexus.in',
    'https://www.montnexus.in',
]
```

---

## Step 6 — Set Up WhatsApp Webhook (now that you have a public URL)

1. Go to **Meta Developer Console → WhatsApp → Configuration**
2. Callback URL: `https://api.montnexus.in/api/notifications/webhook/whatsapp/`
3. Verify token: `montnexus_verify_2026` (same as in env)
4. Click **Verify and Save**
5. Subscribe to **messages** field

This enables the AI chatbot to receive and respond to incoming WhatsApp messages.

---

## Step 7 — Set Up a Permanent WhatsApp Token

The 24-hour temporary token will break in production. Create a permanent one:

1. Go to **Meta Business Manager** (business.facebook.com)
2. **Settings → Users → System Users**
3. Create a System User → assign it to your WhatsApp app
4. Click **Generate Token** → select your app → check `whatsapp_business_messaging`
5. Copy the token → update `WHATSAPP_ACCESS_TOKEN` in Railway env vars

---

## Step 8 — Switch Razorpay to Live Mode

1. Log in to **Razorpay Dashboard** (razorpay.com)
2. Complete KYC if not done
3. Go to **Settings → API Keys → Live Mode**
4. Generate live keys
5. Update Railway env vars:
   ```
   RAZORPAY_KEY_ID=rzp_live_xxxx
   RAZORPAY_KEY_SECRET=<live secret>
   ```
6. Update Vercel env var (if you expose key ID to frontend):
   ```
   VITE_RAZORPAY_KEY_ID=rzp_live_xxxx
   ```

---

## Step 9 — Post-Deployment Checklist

Run through these after every deployment:

- [ ] Frontend loads at production URL
- [ ] Login works (Admin and Staff)
- [ ] Dashboard loads with data
- [ ] API calls succeed (no CORS errors in browser console)
- [ ] At least one patient, appointment, invoice loads
- [ ] Document upload works (Supabase storage RLS policies applied)
- [ ] WhatsApp notification sends successfully
- [ ] Razorpay checkout opens (test mode or live)
- [ ] Logout and session persistence work

---

## Step 10 — Per-Client Deployment

Each new clinic client gets their own deployment:

### What changes per client

| What | Where |
|---|---|
| Supabase project | Create a new project in Supabase |
| Railway service | Create a new service or new project |
| Vercel project | Fork the repo or create new project |
| Domain | Client's own domain or a subdomain (`clinic-name.montnexus.in`) |
| Branding | Update clinic name in `LoginPage.jsx` and `Sidebar.jsx` |
| WhatsApp | Client's own Meta app and phone number |
| Razorpay | Client's own Razorpay account |

### Steps for a new client

```
1. Create new Supabase project for the client
2. Run docs/supabase_schema.sql in their Supabase SQL Editor
3. Run docs/supabase_erp_schema.sql
4. Fork the repo OR create a new branch: client/<clinic-name>
5. Update branding (clinic name, colors in tailwind.config.js)
6. Create new Railway service → point to the branch
7. Fill in all env vars with client's credentials
8. Create new Vercel project → point to the branch
9. Fill in Vercel env vars
10. Connect client's domain
11. Run seed.py to create initial admin user
12. Hand over admin credentials to client
```

---

## Troubleshooting

### Frontend shows blank page after deploy

- Check browser console for errors
- Verify all `VITE_` env vars are set in Vercel
- Rebuild and redeploy after adding env vars

### Django 500 errors on Railway

- Check Railway logs: Railway dashboard → your service → **Logs** tab
- Common cause: missing env var — compare with `.env.example`

### CORS error in browser console

```
Access to XMLHttpRequest blocked by CORS policy
```

- Add your Vercel URL to `CORS_ALLOWED_ORIGINS` in `settings.py`
- Commit, push, wait for Railway to redeploy

### Supabase RLS errors after deploy

- The RLS policies are on Supabase — they apply regardless of environment
- Run the storage policies SQL if document uploads fail

### WhatsApp webhook verification fails

- Make sure the backend is deployed and responding before adding the webhook
- Test: `curl https://api.montnexus.in/api/notifications/webhook/whatsapp/?hub.mode=subscribe&hub.verify_token=montnexus_verify_2026&hub.challenge=test`
- Should return `test`

---

## Quick Reference

| Service | URL | Login |
|---|---|---|
| Railway (backend) | railway.app | GitHub |
| Vercel (frontend) | vercel.com | GitHub |
| Supabase | supabase.com | GitHub/email |
| Meta Developer | developers.facebook.com | Facebook |
| Razorpay | razorpay.com | Email |

---

*Montnexus V1 | Deployment Guide v1.0 | March 2026*
