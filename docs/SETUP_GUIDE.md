# Montnexus V1 — Setup Guide

> Last updated: March 2026
> For: New developers, client deployments, and fresh machine setup

This guide walks through everything needed to get Montnexus V1 running from scratch — from zero to a fully working system with real data.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Backend Setup (Django)](#3-backend-setup-django)
4. [Frontend Setup (React)](#4-frontend-setup-react)
5. [Supabase Setup](#5-supabase-setup)
6. [Environment Variables](#6-environment-variables)
7. [WhatsApp Setup (Meta)](#7-whatsapp-setup-meta)
8. [Razorpay Setup](#8-razorpay-setup)
9. [Seed Test Data](#9-seed-test-data)
10. [Running the System](#10-running-the-system)
11. [Test Credentials](#11-test-credentials)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Install these before starting:

| Tool | Version | Download |
|---|---|---|
| Python | 3.10 or higher | python.org |
| Node.js | 18 or higher | nodejs.org |
| Git | Any recent | git-scm.com |
| pip | Comes with Python | — |

Verify installations:

```bash
python --version     # Python 3.10+
node --version       # v18+
npm --version        # 9+
git --version
```

You also need accounts on:
- **Supabase** — supabase.com (free tier works)
- **Meta Developer** — developers.facebook.com (for WhatsApp, optional)
- **Razorpay** — razorpay.com (for payments, optional)

---

## 2. Clone the Repository

```bash
git clone <your-repo-url>
cd montnexus-v1
```

Your folder structure should look like:
```
montnexus-v1/
├── backend/
├── frontend/
├── scripts/
├── docs/
└── .gitignore
```

---

## 3. Backend Setup (Django)

### Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs Django, DRF, Supabase client, PyJWT, razorpay, and all other dependencies.

### Run Django migrations

Django does not manage custom tables (those live in Supabase), but it needs its internal tables:

```bash
python manage.py migrate
```

Expected output:
```
Applying contenttypes.0001_initial... OK
Applying auth.0001_initial... OK
...
```

### Verify the backend runs

```bash
python manage.py runserver
```

You should see:
```
Starting development server at http://127.0.0.1:8000/
```

Press `Ctrl+C` to stop. The backend won't work fully until environment variables are set (next steps).

---

## 4. Frontend Setup (React)

```bash
cd frontend
npm install
```

This installs React, Vite, Tailwind CSS, Axios, Recharts, lucide-react, and all other dependencies.

### Verify the frontend runs

```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
Local: http://localhost:5173/
```

The login page will load but login won't work until Supabase is configured.

---

## 5. Supabase Setup

### Step 1 — Create a Supabase project

1. Go to **supabase.com** and sign in
2. Click **New project**
3. Choose your organization, give the project a name (e.g. `montnexus-v1`)
4. Set a strong database password (save it — you won't need it often but keep it safe)
5. Choose the region closest to your users
6. Click **Create new project** and wait ~2 minutes for provisioning

### Step 2 — Run the base schema

1. In your Supabase project → click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open `docs/supabase_schema.sql` from this repo
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** (or press `Ctrl+Enter`)

This creates:
- `public.profiles` — user profiles linked to auth
- `public.documents` — document metadata
- `public.audit_logs` — action log
- `on_auth_user_created` trigger — auto-creates profile on signup

### Step 3 — Run the ERP schema

1. In SQL Editor → click **New query**
2. Open `docs/supabase_erp_schema.sql` from this repo
3. Copy the entire contents, paste, and **Run**

This creates all ERP tables:
- `patients`, `appointments`, `visit_records`
- `staff_profiles`, `shifts`, `leave_requests`, `attendance`
- `invoices`, `invoice_items`, `payments`, `expenses`
- `inventory_items`, `stock_transactions`, `assets`

### Step 4 — Create the Storage bucket

1. In your Supabase project → **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `documents`
4. Toggle: **Private** (not public)
5. Click **Save**

### Step 5 — Set Storage RLS Policies

Without these policies, document uploads will fail with "new row violates row-level security policy".

1. In SQL Editor → click **New query**
2. Paste and run:

```sql
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own files
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 6 — Enable Email Auth

1. Go to **Authentication → Providers**
2. Make sure **Email** is enabled (it should be by default)

### Step 6 — Get your credentials

Go to **Project Settings → API** and copy:

| What | Where | Used in |
|---|---|---|
| Project URL | "Project URL" | `SUPABASE_URL` in both `.env` files |
| Anon / Public key | `anon` `public` row | `VITE_SUPABASE_ANON_KEY` in frontend |
| Service role key | `service_role` row | `SUPABASE_SERVICE_KEY` in backend |

Go to **Project Settings → API → JWT Settings** and copy:

| What | Where | Used in |
|---|---|---|
| JWT Secret | "JWT Secret" field | `SUPABASE_JWT_SECRET` in backend |

> **Warning:** The service role key bypasses all Row Level Security. Never expose it in the frontend or commit it to git.

### Step 7 — Check JWT signing algorithm

Go to **Project Settings → API → JWT Settings**.

Look at the **JWT Keys** section:
- If it shows **ECC P-256 (ES256)** as the current key — you are on the new algorithm. The backend middleware handles this automatically via JWKS.
- If it shows **Legacy HS256** — also fine, the middleware handles both.

No action needed — just be aware that manually decoding tokens with the JWT secret string will not work for ES256 projects.

---

## 6. Environment Variables

### Backend — `backend/.env`

Create this file (copy from `backend/.env.example`):

```bash
cp backend/.env.example backend/.env
```

Fill in all values:

```env
# Django
DJANGO_SECRET_KEY=your_long_random_secret_key_here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-settings

# Razorpay (add when ready, leave placeholder until then)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# WhatsApp (add when ready, leave placeholder until then)
WHATSAPP_API_URL=https://graph.facebook.com/v22.0
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_ID=1234567890123456
WHATSAPP_VERIFY_TOKEN=montnexus_verify_2026
```

> Generate `DJANGO_SECRET_KEY` with:
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(50))"
> ```

### Frontend — `frontend/.env`

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=http://localhost:8000
```

> The `VITE_` prefix is required — Vite will not expose variables without it.

---

## 7. WhatsApp Setup (Meta)

Skip this section if you don't need WhatsApp notifications yet. The system works without it.

### Step 1 — Create a Meta Developer App

1. Go to **developers.facebook.com** and log in
2. Click **My Apps → Create App**
3. Choose **Business** as the app type
4. Give it a name → **Create App**

### Step 2 — Add WhatsApp

1. Inside your app → **Add a Product → WhatsApp → Set up**
2. Connect your **WhatsApp Business Account** when prompted

### Step 3 — Get credentials

Go to **WhatsApp → API Setup**:

| Credential | Where to find it |
|---|---|
| `WHATSAPP_PHONE_ID` | "Phone number ID" on API Setup page |
| `WHATSAPP_ACCESS_TOKEN` | "Temporary access token" field (or generate permanent — see below) |
| `WHATSAPP_API_URL` | Always `https://graph.facebook.com/v22.0` |
| `WHATSAPP_VERIFY_TOKEN` | Any string you choose — use the same value in `.env` and Meta webhook config |

### Step 4 — Add test recipient

In the Meta API Setup page, under **"To"**, click **Manage phone number list** and add the phone number that should receive test messages. Only registered numbers can receive messages in sandbox mode.

### Step 5 — Permanent token (for production)

The temporary token expires every 24 hours. To create a permanent one:
1. Go to **Meta Business Manager → Settings → System Users**
2. Create a system user with admin access
3. Generate a token with `whatsapp_business_messaging` permission
4. Use this token as `WHATSAPP_ACCESS_TOKEN` in `.env`

### Step 6 — Webhook (for incoming messages only)

The webhook enables the AI chatbot to respond to incoming WhatsApp messages. It requires a public URL — skip this for local development.

Once deployed:
1. **WhatsApp → Configuration → Webhooks**
2. Callback URL: `https://your-domain.com/api/notifications/webhook/whatsapp/`
3. Verify token: same value as `WHATSAPP_VERIFY_TOKEN` in `.env`
4. Subscribe to: **messages**

---

## 8. Razorpay Setup

Skip this section if you don't need online payments yet. Offline payments (cash/UPI/cheque) work without any Razorpay credentials.

### Step 1 — Create a Razorpay account

1. Go to **razorpay.com** and sign up
2. No KYC required for test mode

### Step 2 — Get API keys

1. Log in to Razorpay Dashboard
2. Go to **Settings → API Keys**
3. Click **Generate Test Key**
4. Copy **Key ID** (`rzp_test_...`) and **Key Secret**

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
```

### Step 3 — Test cards

Use these in the Razorpay test checkout:

| Card | Number | CVV | Expiry |
|---|---|---|---|
| Visa (success) | 4111 1111 1111 1111 | Any 3 digits | Any future date |
| Mastercard (success) | 5267 3181 8797 5449 | Any 3 digits | Any future date |
| Any failure | 4000 0000 0000 0002 | Any | Any future date |

UPI test ID: `success@razorpay`

### Step 4 — Go live

When ready for real payments:
1. Complete Razorpay KYC in the dashboard
2. Generate **Live Keys** from Settings → API Keys
3. Replace `rzp_test_...` with `rzp_live_...` in `backend/.env`
4. Restart Django

---

## 9. Seed Test Data

After both Supabase schemas are applied and `backend/.env` is filled, seed realistic test data.

> **Important:** Run this from the **project root** (`montnexus-v1/`), not from inside `backend/`.

```bash
# Make sure you are in the project root first
cd montnexus-v1

# Then run
python scripts/seed.py
```

If you are already inside the `backend/` folder, go up one level first:
```bash
cd ..
python scripts/seed.py
```

What it creates:

| Data | Count |
|---|---|
| Auth users (doctors + nurse) | 3 |
| Patients | 5 |
| Appointments | 8 |
| Visit records | 2 |
| Staff profiles | 3 |
| Shifts | 5 |
| Leave requests | 3 |
| Invoices (+ items + payment) | 3 |
| Expenses | 3 |
| Inventory items (2 low stock) | 6 |
| Assets | 3 |

The script is idempotent — safe to run multiple times. It skips data that already exists.

**If the script fails with "table not found":** Run `docs/supabase_erp_schema.sql` in the Supabase SQL Editor first.

**If it fails with "admin user not found":** Create at least one user manually in Supabase Auth first (see Section 10).

---

## 10. Running the System

### Create the first admin user

Before logging in, you need an admin account. Do this in Supabase:

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **Add user → Create new user**
3. Enter email and password
4. After creating, go to **Table Editor → profiles**
5. Find the new user's row and set `role` to `admin`

Or use the invite flow once Django is running:
```bash
# With Django running, POST to the invite endpoint (requires an existing admin session)
# See API docs for the invite endpoint
```

### Start the servers

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
python manage.py runserver
# Running at http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Running at http://localhost:5173 (or 5174 if 5173 is busy)
```

### Open the app

Go to `http://localhost:5173` in your browser. You should see the Montnexus login page.

Log in with the admin credentials you created in Supabase.

---

## 11. Test Credentials

After running the seed script, these accounts are ready to use:

| Name | Email | Password | Role |
|---|---|---|---|
| Dr. Priya Sharma | `dr.sharma@montnexus.test` | `Montnexus@123` | Staff |
| Dr. Arjun Mehta | `dr.mehta@montnexus.test` | `Montnexus@123` | Staff |
| Anita Thomas | `nurse.anita@montnexus.test` | `Montnexus@123` | Staff |

> These are staff accounts. To get an admin account, create one manually in Supabase Auth and set `role = admin` in the `profiles` table.

---

## 12. Troubleshooting

### Login works but all API calls return 401

**Cause:** Token not attached to requests, or JWT algorithm mismatch.

**Fix:**
1. Open browser DevTools → Application → Local Storage → check for a Supabase session key
2. If session exists, check Django logs for the exact error (`Token expired` / `Invalid token`)
3. If `Invalid token`: your Supabase project uses ES256 (ECC) signing. The middleware uses JWKS which handles this automatically — make sure `PyJWT>=2.8` is installed (`pip install -r requirements.txt`)
4. Restart Django after any `.env` change

---

### CORS error in browser console

**Cause:** Vite is running on a port not in `CORS_ALLOWED_ORIGINS`.

**Fix:** Check what port Vite is using (shown in terminal). Add it to `backend/core/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',   # add if Vite switched to 5174
    'http://127.0.0.1:5174',
]
```
Restart Django.

---

### "Could not embed because more than one relationship was found"

**Cause:** A Supabase query is embedding a table that has multiple FK references to the same parent (e.g. `appointments` has `doctor_id` and `booked_by` both pointing to `profiles`).

**Fix:** Use an explicit FK hint:
```python
# Wrong
supabase.table('appointments').select('*, doctor:profiles(id, full_name)')

# Correct
supabase.table('appointments').select('*, doctor:profiles!appointments_doctor_id_fkey(id, full_name)')
```

---

### Supabase schema errors ("relation already exists")

**Cause:** You ran the SQL schema file more than once.

**Fix:** This is safe to ignore — the schema uses `CREATE TABLE IF NOT EXISTS`. If you see an actual error, check which specific statement failed and run only that part.

---

### WhatsApp sends "Notification sent successfully" but no message arrives

**Cause 1:** Wrong phone number entered (e.g. the placeholder `919876543210`).
**Fix:** Enter your real number with country code, no spaces or `+` (e.g. `918137871221`).

**Cause 2:** Number not registered as a test recipient in Meta sandbox.
**Fix:** Go to Meta Developer Console → WhatsApp → API Setup → "To" dropdown → Manage phone number list → add your number.

**Cause 3:** Access token expired (24-hour tokens).
**Fix:** Generate a new token on the Meta API Setup page and update `WHATSAPP_ACCESS_TOKEN` in `backend/.env`. Restart Django.

---

### Django won't start — "ModuleNotFoundError"

**Fix:** Install missing packages:
```bash
cd backend
pip install -r requirements.txt
```

---

### Seed script fails — Unicode error on Windows

**Cause:** Windows cp1252 encoding cannot handle Unicode characters in print statements.
**Fix:** This was already fixed in the seed script (all Unicode replaced with ASCII). If you see this error on a custom script, add `# -*- coding: utf-8 -*-` at the top or replace Unicode chars.

---

### Multiple Django processes running (port conflict)

**Symptom:** Old settings still in effect after restarting, or "Address already in use" error.

**Fix:**
```bash
# Find and kill all processes on port 8000
netstat -ano | grep :8000
# Note the PID numbers, then:
taskkill /F /PID <pid>

# Then restart Django
python manage.py runserver
```

---

### Payments — "Razorpay error: Invalid key_id"

**Cause:** `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` is a placeholder.
**Fix:** Add real Razorpay test keys to `backend/.env` and restart Django. Offline payments (cash/UPI) work without Razorpay keys.

---

## Quick Reference

### URLs when running locally

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 (or 5174) |
| Django API | http://localhost:8000 |
| Django Admin | http://localhost:8000/admin/ |

### Key file locations

| What | Where |
|---|---|
| Backend env vars | `backend/.env` |
| Frontend env vars | `frontend/.env` |
| Django settings | `backend/core/settings.py` |
| CORS origins | `backend/core/settings.py` → `CORS_ALLOWED_ORIGINS` |
| JWT middleware | `backend/core/middleware.py` |
| Navigation config | `frontend/src/config/navigation.json` |
| Supabase base schema | `docs/supabase_schema.sql` |
| Supabase ERP schema | `docs/supabase_erp_schema.sql` |
| Seed script | `scripts/seed.py` |

### Useful commands

```bash
# Generate a Django secret key
python -c "import secrets; print(secrets.token_urlsafe(50))"

# Check which packages are installed
pip list | grep -E "django|razorpay|supabase|PyJWT"

# Test WhatsApp credentials directly
cd backend
python -c "
from dotenv import load_dotenv; load_dotenv('.env')
import requests, os
token = os.environ['WHATSAPP_ACCESS_TOKEN']
phone_id = os.environ['WHATSAPP_PHONE_ID']
r = requests.post(
    f'https://graph.facebook.com/v22.0/{phone_id}/messages',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    json={'messaging_product': 'whatsapp', 'to': '91XXXXXXXXXX',
          'type': 'template', 'template': {'name': 'hello_world', 'language': {'code': 'en_US'}}}
)
print(r.status_code, r.text)
"

# Kill all processes on port 8000 (Windows)
for /f "tokens=5" %a in ('netstat -ano ^| findstr :8000') do taskkill /F /PID %a
```

---

*Montnexus V1 | Setup Guide v1.0 | March 2026*
