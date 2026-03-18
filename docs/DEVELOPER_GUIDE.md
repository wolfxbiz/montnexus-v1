# Montnexus V1 — Developer Guide

> Last updated: March 2026
> Version: 2.0
> Stack: React + Django + Supabase

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Local Development Setup](#4-local-development-setup)
5. [Environment Variables](#5-environment-variables)
6. [Database & Supabase Setup](#6-database--supabase-setup)
7. [Backend — Django](#7-backend--django)
8. [Frontend — React](#8-frontend--react)
9. [Authentication Flow](#9-authentication-flow)
10. [Module Reference](#10-module-reference)
11. [API Endpoints](#11-api-endpoints)
12. [Role & Permission System](#12-role--permission-system)
13. [Adding a New Module](#13-adding-a-new-module)
14. [Adding a New Route](#14-adding-a-new-route)
15. [Common Patterns](#15-common-patterns)
16. [Rules Every Developer Must Follow](#16-rules-every-developer-must-follow)
17. [Reusing Modules in Other Projects](#17-reusing-modules-in-other-projects)

---

## 1. Project Overview

Montnexus V1 is a **modular, reusable admin system** built for internal business operations — starting with healthcare clients. The system is designed so every feature is a self-contained module that can be dropped into a new client project with minimal changes.

**Core design goals:**
- Every module is self-contained. No module depends on another module's internal logic.
- Navigation, roles, and permissions are config-driven — not hardcoded.
- Supabase handles identity and storage. Django handles workflow and business logic.
- Every component is built to be extracted and reused across 10+ future client deployments.

**Current scope (V1):** Full ERP system for a healthcare clinic — CRM (patients + appointments), HR (staff, shifts, leave, attendance), Finance (invoices, payments, expenses), Inventory (items, stock, assets), Analytics, Document Vault, WhatsApp Notifications.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Tailwind CSS | UI, routing, component library |
| Build Tool | Vite | Fast development server and bundler |
| Backend | Python Django + Django REST Framework | API, business logic |
| Auth & DB | Supabase (PostgreSQL) | Authentication, database, file storage |
| Messaging | WhatsApp Business API | Notifications, appointment automation |
| State | React Context API | Global auth state, user roles |
| Charts | Recharts | Admin analytics dashboard |
| Auth Tokens | JWT via Supabase (ES256 / JWKS) | Stateless API authentication |
| Icons | lucide-react | UI icons |

---

## 3. Repository Structure

```
/montnexus-v1
├── /backend                            # Django project root
│   ├── /core                           # Django settings and middleware
│   │   ├── settings.py                 # All Django config, reads from .env
│   │   ├── urls.py                     # Root URL router
│   │   ├── middleware.py               # Supabase JWT JWKS validation middleware
│   │   └── wsgi.py
│   ├── /authentication                 # Auth bridge module
│   │   ├── views.py                    # GET /api/auth/verify/
│   │   ├── utils.py                    # JWT decode helpers
│   │   └── urls.py
│   ├── /users                          # User management module
│   │   ├── views.py                    # List users, invite user
│   │   ├── urls.py                     # /api/users/
│   │   ├── analytics_views.py          # Summary + activity endpoints
│   │   ├── analytics_urls.py           # /api/analytics/
│   │   └── models.py                   # (empty — profiles live in Supabase)
│   ├── /storage                        # Document metadata module
│   │   ├── views.py                    # File CRUD + soft delete
│   │   ├── urls.py                     # /api/storage/
│   │   └── models.py                   # (empty — documents live in Supabase)
│   ├── /notifications                  # WhatsApp + AI module
│   │   ├── views.py                    # Leave notify + webhook
│   │   ├── whatsapp_service.py         # Standalone WhatsApp API wrapper
│   │   ├── ai_handler.py               # Rule-based intent classifier
│   │   └── urls.py                     # /api/notifications/
│   ├── /crm                            # CRM module (patients, appointments, visits)
│   │   ├── views.py                    # Patients, appointments, visit records CRUD
│   │   └── urls.py                     # /api/crm/
│   ├── /hr                             # HR module (staff, shifts, leave, attendance)
│   │   ├── views.py                    # Staff, shifts, leave, attendance CRUD
│   │   └── urls.py                     # /api/hr/
│   ├── /finance                        # Finance module (invoices, payments, expenses)
│   │   ├── views.py                    # Invoices, payments, expenses, revenue CRUD
│   │   └── urls.py                     # /api/finance/
│   ├── /inventory                      # Inventory module (items, transactions, assets)
│   │   ├── views.py                    # Items, transactions, alerts, assets CRUD
│   │   └── urls.py                     # /api/inventory/
│   ├── requirements.txt
│   ├── manage.py
│   ├── .env                            # Real credentials (gitignored)
│   └── .env.example                    # Template with placeholder values
│
├── /frontend                           # React project root
│   ├── /src
│   │   ├── /config
│   │   │   ├── navigation.json         # Nav links per role (admin/staff)
│   │   │   └── roles.json              # Role definitions and permissions
│   │   ├── /lib
│   │   │   ├── supabaseClient.js       # Supabase singleton
│   │   │   └── apiClient.js            # Axios instance with auto JWT header
│   │   ├── /context
│   │   │   └── AuthContext.jsx         # Global auth state provider
│   │   ├── /features
│   │   │   ├── /auth
│   │   │   │   ├── LoginPage.jsx       # Email/password + magic link login
│   │   │   │   ├── ProtectedRoute.jsx  # Auth + role guard wrapper
│   │   │   │   └── useAuth.js          # Hook that consumes AuthContext
│   │   │   ├── /dashboard
│   │   │   │   └── DashboardPage.jsx   # Landing page after login
│   │   │   ├── /navigation
│   │   │   │   ├── Sidebar.jsx         # Config-driven nav, role-filtered
│   │   │   │   └── TopBar.jsx          # Header with user info
│   │   │   ├── /user-management
│   │   │   │   ├── UserManagementPage.jsx
│   │   │   │   ├── UserTable.jsx
│   │   │   │   └── InviteUserModal.jsx
│   │   │   ├── /docs
│   │   │   │   ├── DocumentVault.jsx   # File listing with search/filter
│   │   │   │   ├── FileUploader.jsx    # Drag-drop uploader
│   │   │   │   └── FileCard.jsx        # File card with download/delete
│   │   │   ├── /analytics
│   │   │   │   ├── AnalyticsDashboard.jsx  # ERP quick-stat widgets + charts
│   │   │   │   └── /charts
│   │   │   │       ├── SummaryCards.jsx
│   │   │   │       └── ActivityChart.jsx
│   │   │   ├── /messaging
│   │   │   │   ├── NotificationPanel.jsx  # Leave alert form
│   │   │   │   └── ChatbotWidget.jsx      # Floating in-app chat
│   │   │   ├── /crm
│   │   │   │   ├── PatientsPage.jsx
│   │   │   │   ├── PatientForm.jsx
│   │   │   │   ├── AppointmentsPage.jsx   # Includes InvoicePromptModal
│   │   │   │   ├── AppointmentForm.jsx
│   │   │   │   ├── VisitRecordForm.jsx    # Includes Supplies Used (inventory)
│   │   │   │   └── VisitRecordList.jsx
│   │   │   ├── /hr
│   │   │   │   ├── StaffPage.jsx
│   │   │   │   ├── StaffForm.jsx
│   │   │   │   ├── ShiftsPage.jsx
│   │   │   │   ├── LeavePage.jsx
│   │   │   │   └── AttendancePage.jsx
│   │   │   ├── /finance
│   │   │   │   ├── BillingPage.jsx        # Invoice list + create
│   │   │   │   ├── InvoiceForm.jsx        # Pre-fillable with patient + appointment
│   │   │   │   ├── PaymentsPage.jsx
│   │   │   │   └── ExpensesPage.jsx
│   │   │   └── /inventory
│   │   │       ├── ItemsPage.jsx
│   │   │       ├── StockPage.jsx
│   │   │       ├── AlertsPage.jsx
│   │   │       └── AssetsPage.jsx
│   │   ├── App.jsx                     # Root router and layout
│   │   ├── main.jsx                    # React entry point
│   │   └── index.css                   # Tailwind base imports
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   ├── .env                            # Real credentials (gitignored)
│   └── .env.example                    # Template with placeholder values
│
├── /scripts
│   └── seed.py                         # Mock data seed script (Python, standalone)
│
├── /docs
│   ├── DEVELOPER_GUIDE.md              # This file
│   ├── BUILD_PROGRESS.md               # Phase-by-phase build history
│   ├── MODULE_EXTRACTION_GUIDE.md      # How to extract & reuse each module
│   ├── api_endpoints.md                # Full API contract reference
│   ├── supabase_schema.sql             # Base DB schema (auth, profiles, docs)
│   ├── supabase_erp_schema.sql         # ERP DB schema (patients, appointments, etc.)
│   └── env_template.txt                # All required env variables
│
├── /modules                            # Pre-packaged standalone module copies
│   └── /auth                           # Drop-in auth package for new projects
│
└── .gitignore
```

---

## 4. Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Supabase project (free tier works)

### Step 1 — Clone and install

```bash
git clone <repo-url>
cd montnexus-v1
```

**Backend:**
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 2 — Set up environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in your real values in both `.env` files. See [Section 5](#5-environment-variables) for what each variable does.

### Step 3 — Set up Supabase

See [Section 6](#6-database--supabase-setup) for the full Supabase setup steps.

### Step 4 — Run the servers

```bash
# Terminal 1 — Backend (from /backend)
python manage.py runserver

# Terminal 2 — Frontend (from /frontend)
npm run dev
```

Open `http://localhost:5173` (or `http://localhost:5174` if 5173 is in use) in your browser.

> **Note:** Vite automatically increments the port if 5173 is busy. Both 5173 and 5174 are pre-configured in Django's `CORS_ALLOWED_ORIGINS`. If you use a different port, add it to `CORS_ALLOWED_ORIGINS` in `backend/core/settings.py`.

### Step 5 — Seed test data (optional)

```bash
cd scripts
python seed.py
```

This populates the database with realistic test data. See [Section 6](#6-database--supabase-setup) for details.

---

## 5. Environment Variables

### `backend/.env`

| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Django secret key — any long random string |
| `DEBUG` | `True` for development, `False` for production |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hostnames |
| `SUPABASE_URL` | Your Supabase project URL (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key — **never expose on frontend** |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret — kept for reference; JWT validation uses JWKS now |
| `RAZORPAY_KEY_ID` | Razorpay API key ID (e.g. `rzp_test_xxxx` or `rzp_live_xxxx`) |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret — **never expose on frontend** |
| `WHATSAPP_API_URL` | WhatsApp Business API base URL (use `https://graph.facebook.com/v22.0`) |
| `WHATSAPP_ACCESS_TOKEN` | Meta developer access token (24-hour temp or permanent system user token) |
| `WHATSAPP_PHONE_ID` | Your WhatsApp Business phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Any string — used to verify webhook from Meta |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (same as backend) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key — safe to expose in frontend |
| `VITE_API_BASE_URL` | Django server URL, e.g. `http://localhost:8000` |

> **Rule:** All frontend env variables must be prefixed with `VITE_` for Vite to expose them at runtime.

---

## 6. Database & Supabase Setup

### Run the schema

1. Go to your Supabase project → **SQL Editor**
2. Paste and run `docs/supabase_schema.sql` — creates the base tables (`profiles`, `documents`, `audit_logs`)
3. Paste and run `docs/supabase_erp_schema.sql` — creates all ERP tables (patients, appointments, visit records, staff, shifts, leave, attendance, invoices, invoice items, payments, expenses, inventory items, stock transactions, assets)

### Create the storage bucket

1. Go to Supabase Dashboard → **Storage**
2. Click **New bucket**
3. Name: `documents`
4. Set to **Private** (not public — signed URLs are used for downloads)

### Enable Auth providers

1. Go to Supabase Dashboard → **Authentication → Providers**
2. Enable **Email** (password login + magic link are both used)

### Finding your credentials

| What you need | Where to find it |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_KEY` | Project Settings → API → `service_role` key |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Settings → JWT Secret |

> **JWT Signing Algorithm Note:** Supabase projects created or updated after early 2025 use **ES256 (ECC P-256)** for JWT signing, not HS256. The Django middleware now uses JWKS-based verification which handles both automatically. See [Section 7](#7-backend--django) for details.

### Seed test data

After both SQL schemas are applied, run the seed script:

```bash
cd scripts
python seed.py
```

The script:
- Creates 3 test auth users (2 doctors, 1 nurse) via Supabase Admin API
- Seeds patients, appointments, visit records, staff, shifts, leave, attendance, invoices, expenses, inventory items, and assets
- Is idempotent — safe to run multiple times (checks for existing data first)
- Reads credentials from `../backend/.env` automatically

---

## 7. Backend — Django

### How it's structured

Django is the **workflow and business logic layer only**. It does not manage users or store files — those responsibilities belong to Supabase.

- No Django ORM models for users or files. All reads/writes go through the Supabase Python client.
- Every API endpoint is protected by `SupabaseAuthMiddleware`, which validates the JWT sent from the frontend.
- The service role key (`SUPABASE_SERVICE_KEY`) is only used server-side in Django, never exposed to the frontend.

### JWT Middleware (`core/middleware.py`)

Every incoming request (except `/admin/` and the WhatsApp webhook) must carry an `Authorization: Bearer <token>` header. The middleware:

1. Extracts the token from the header
2. Fetches the public key from Supabase's JWKS endpoint (cached for 1 hour)
3. Verifies the token signature using the public key — supports both ES256 and HS256
4. Attaches the decoded payload to `request.supabase_user`
5. Returns `401` if the token is missing, expired, or invalid

```python
from jwt import PyJWKClient

# JWKS URL: https://<project>.supabase.co/auth/v1/.well-known/jwks.json
# Automatically handles ES256 (current) and HS256 (legacy) projects
signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
payload = jwt.decode(token, signing_key.key, algorithms=['ES256', 'HS256'], audience='authenticated')
request.supabase_user = payload
```

> **Why JWKS?** Supabase migrated from Legacy HS256 (shared secret) to ES256 (ECC P-256) in 2025. Token validation against the old `SUPABASE_JWT_SECRET` string will fail for new tokens. JWKS-based verification fetches the current public key automatically and handles both algorithm types.

Inside any view, you can access the logged-in user like this:

```python
user_id = request.supabase_user.get('sub')  # Supabase user UUID
```

### Supabase client in Django

Every app that talks to Supabase creates a client using the service role key:

```python
from supabase import create_client
from django.conf import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

# Query example
result = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
data = result.data
```

### Audit logging

Every significant user action must write to `audit_logs`. Use this pattern in any view:

```python
supabase.table('audit_logs').insert({
    'actor_id': user_id,       # UUID of the user taking the action
    'action': 'UPLOAD',        # Uppercase string e.g. UPLOAD, DELETE, LOGIN
    'target_table': 'documents',
    'target_id': str(doc_id),
    'metadata': { 'file_name': 'report.pdf' },  # Any extra context as JSON
}).execute()
```

### Running migrations

Django is not managing any custom database tables (all tables live in Supabase). You only need to run migrations for Django's built-in apps:

```bash
python manage.py migrate
```

### Starting the server

```bash
python manage.py runserver
# Runs at http://localhost:8000
```

---

## 8. Frontend — React

### Key files

| File | Purpose |
|---|---|
| `src/lib/supabaseClient.js` | Supabase singleton — import `supabase` from this file everywhere |
| `src/lib/apiClient.js` | Axios instance — automatically attaches the JWT to every request |
| `src/context/AuthContext.jsx` | Provides `user`, `profile`, `role`, `isAdmin`, `login`, `logout` |
| `src/config/navigation.json` | Defines nav items per role — change nav here, not in components |
| `src/config/roles.json` | Defines roles and their permissions |
| `src/App.jsx` | All routes defined here |

### Token attachment pattern (`apiClient.js`)

The API client caches the JWT in the Axios default headers on startup and keeps it in sync using Supabase's `onAuthStateChange` listener:

```javascript
import axios from 'axios'
import { supabase } from './supabaseClient'

const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL })

function setToken(session) {
  if (session?.access_token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}

// Set token immediately from existing session (page refresh)
supabase.auth.getSession().then(({ data: { session } }) => setToken(session))

// Keep updated on login / logout / token refresh
supabase.auth.onAuthStateChange((_event, session) => setToken(session))

export default apiClient
```

> **Do not** use an `async` request interceptor that calls `getSession()` on every request — it causes a race condition on first page load where API calls fire before `getSession()` resolves.

### Making authenticated API calls to Django

Always use `apiClient` (not raw `fetch` or `axios`) — it automatically includes the JWT:

```javascript
import apiClient from '../../lib/apiClient'

// GET
const { data } = await apiClient.get('/api/crm/patients/')

// POST
const { data } = await apiClient.post('/api/crm/patients/', { full_name, phone })

// PATCH
const { data } = await apiClient.patch(`/api/crm/patients/${id}/`, updates)

// DELETE
await apiClient.delete(`/api/crm/patients/${id}/`)
```

### Querying Supabase directly from the frontend

Use the `supabase` client only for operations the frontend is allowed to do (governed by Row Level Security). File uploads and profile reads are done this way:

```javascript
import { supabase } from '../../lib/supabaseClient'

// Upload a file to storage
const { error } = await supabase.storage
  .from('documents')
  .upload(filePath, file)

// Get a signed download URL
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 60)  // 60 seconds

// Read the user's profile
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

> **Rule:** Never call Supabase Admin API from the frontend. Admin operations (invite user, delete user) must go through Django.

### Using the auth hook

In any component inside the app shell:

```javascript
import { useAuth } from '../auth/useAuth'

function MyComponent() {
  const { user, profile, role, isAdmin, logout } = useAuth()

  return <p>Hello {profile.full_name}, you are a {role}</p>
}
```

### Starting the dev server

```bash
npm run dev
# Runs at http://localhost:5173 (or 5174 if 5173 is busy)

npm run build
# Builds to /dist for production
```

---

## 9. Authentication Flow

```
User enters email + password on LoginPage
        |
supabase.auth.signInWithPassword()
        |
Supabase returns { session: { access_token, user } }
        |
AuthContext stores user + fetches profile from public.profiles
        |
AuthContext sets role (admin / staff)
        |
User is redirected to /dashboard
        |
On module load, apiClient.js:
  getSession() sets Authorization header immediately
  onAuthStateChange keeps it updated on refresh/logout
        |
On every Django API call:
  Authorization: Bearer <token> is sent automatically
        |
Django middleware (JWKS-based):
  Fetches Supabase public key from JWKS endpoint (cached 1hr)
  Verifies ES256 or HS256 signature
  Attaches decoded payload to request.supabase_user
  OR returns 401
```

**Magic link flow:** `supabase.auth.signInWithOtp({ email })` — Supabase emails a link. When clicked, Supabase sets the session automatically and `onAuthStateChange` in `AuthContext` fires.

**Session persistence:** Supabase persists the session in `localStorage`. On page refresh, `getSession()` in `AuthContext` and `apiClient.js` both restore it — users stay logged in.

---

## 10. Module Reference

### Auth (`/features/auth/`)

| File | What it does |
|---|---|
| `LoginPage.jsx` | Login form with email/password and magic link toggle |
| `ProtectedRoute.jsx` | Wraps routes — redirects to `/login` if not authenticated, `/unauthorized` if wrong role |
| `useAuth.js` | Hook — returns `{ user, profile, role, isAdmin, loading, login, loginWithMagicLink, logout }` |

**ProtectedRoute usage:**
```jsx
// Any authenticated user
<ProtectedRoute><MyPage /></ProtectedRoute>

// Admin only
<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>
```

---

### Navigation (`/features/navigation/`)

| File | What it does |
|---|---|
| `Sidebar.jsx` | Reads `role` from `useAuth()`, filters `navigation.json`, renders nav links with lucide icons, collapsible on mobile |
| `TopBar.jsx` | Header with page title, notification bell, user avatar and role badge |

**To add a new nav item**, edit `src/config/navigation.json` only:
```json
{
  "admin": [
    { "label": "My New Page", "path": "/my-page", "icon": "Settings" }
  ]
}
```
The icon must be a valid `lucide-react` icon name. Add it to `ICON_MAP` in `Sidebar.jsx`.

---

### Dashboard (`/features/dashboard/`)

| File | What it does |
|---|---|
| `DashboardPage.jsx` | Landing page after login. Shows greeting, live stat cards (admin only), recent documents, quick action links |

Admin sees 4 stat cards sourced from `GET /api/analytics/summary/`. Both admin and staff see the last 5 uploaded documents and quick links filtered by their role.

---

### User Management (`/features/user-management/`)

| File | What it does |
|---|---|
| `UserManagementPage.jsx` | Fetches all profiles, renders `UserTable`, opens `InviteUserModal` |
| `UserTable.jsx` | Table showing name, department, role badge, active status, joined date |
| `InviteUserModal.jsx` | Form for Full Name, Email, Role, Department — calls `POST /api/users/invite/` |

**Admin only.** The invite goes through Django (never direct Supabase Admin API from frontend). Supabase emails an invitation link to the new user. The DB trigger auto-creates their `profiles` row on first sign-in.

---

### Document Vault (`/features/docs/`)

| File | What it does |
|---|---|
| `DocumentVault.jsx` | Lists all non-deleted documents with search bar and category filter |
| `FileUploader.jsx` | Drag-and-drop + click-to-browse. Uploads binary to Supabase Storage, then saves metadata to Django |
| `FileCard.jsx` | Card showing filename, size, category, tags, date. Download (signed URL) and soft-delete actions |

**Upload flow (two steps):**
1. Binary → Supabase Storage bucket `documents` directly from browser
2. Metadata → `POST /api/storage/files/` to Django (saves to `public.documents` table)

**Delete is always soft** — sets `is_deleted = true`. Nothing is permanently removed.

---

### Analytics (`/features/analytics/`)

| File | What it does |
|---|---|
| `AnalyticsDashboard.jsx` | Fetches summary, activity, and all 4 ERP live widgets in parallel |
| `SummaryCards.jsx` | 4 stat cards: Total Users, Active Staff, Documents, Weekly Actions |
| `ActivityChart.jsx` | Recharts line chart — daily action count from `audit_logs` over last 30 days |

**ERP quick-stat widgets (Phase 12):** The dashboard also shows 4 live clickable cards:
- **Today's Appointments** — links to `/crm/appointments`
- **Pending Leave Requests** — links to `/hr/leave`
- **Outstanding Invoices (₹)** — links to `/finance/billing`
- **Low Stock Items** — links to `/inventory/alerts`

**Admin only.** Data comes from `GET /api/analytics/summary/`, `/api/analytics/activity/`, and the ERP module endpoints.

---

### Messaging (`/features/messaging/`)

| File | What it does |
|---|---|
| `NotificationPanel.jsx` | Form to submit a leave notice — sends WhatsApp alert to admin via `POST /api/notifications/notify/leave/` |
| `ChatbotWidget.jsx` | Floating chat bubble — in-app preview of the AI handler's rule-based responses |

**WhatsApp backend (`/backend/notifications/`):**

| File | What it does |
|---|---|
| `whatsapp_service.py` | Standalone wrapper: `send_message()`, `send_template()`, `parse_incoming()` |
| `ai_handler.py` | Rule-based intent classifier: appointment / query / unknown — returns response text |
| `views.py` | `notify_leave` view and `whatsapp_webhook` view (GET for verification, POST for incoming messages) |

> **WhatsApp setup:** Use API version `v22.0`. The access token from the Meta Developer Console expires every 24 hours in test mode — create a **permanent token** via Meta Business Manager → System Users for production. The webhook (incoming messages) requires a public URL and cannot be tested on localhost.

> Outbound messages (appointment reminders, leave approvals, leave rejections) work as soon as valid credentials are in `backend/.env`. No webhook needed for outbound-only use.

---

### CRM (`/features/crm/`)

| File | What it does |
|---|---|
| `PatientsPage.jsx` | Patient list with search — CRUD via `/api/crm/patients/` |
| `PatientForm.jsx` | Add/edit patient form (name, phone, DOB, gender, notes) |
| `AppointmentsPage.jsx` | Appointment list with date/status filters. Post-visit triggers `InvoicePromptModal` |
| `AppointmentForm.jsx` | Book appointment (patient, doctor, date/time, notes) |
| `VisitRecordForm.jsx` | Record a visit — includes "Supplies Used" section that writes to inventory on save |
| `VisitRecordList.jsx` | Past visit records per appointment |

**Phase 12 integration — Appointment → Invoice:**
After a visit record is saved, `AppointmentsPage` shows a prompt: "Visit recorded — create invoice?" with Skip and Create Invoice buttons. "Create Invoice" renders `InvoiceForm` pre-filled with the patient and appointment ID.

**Phase 12 integration — Visit → Inventory:**
`VisitRecordForm` has a "Supplies Used" section. Users select inventory items and enter quantities. On submit, for each supply it fires a `POST /api/inventory/transactions/` with `transaction_type: consume` (fire-and-forget — does not block the visit save).

**Backend CRM app:**
- `/api/crm/patients/` — list, create, retrieve, update, delete patients
- `/api/crm/appointments/` — list (filter by `date_from`, `date_to`, `doctor_id`, `status`), create, update
- `/api/crm/appointments/<id>/visit-records/` — list and create visit records for an appointment
- `/api/crm/appointments/<id>/send-reminder/` — POST to send WhatsApp reminder

> **FK disambiguation:** The `appointments` table has two FKs to `profiles` (`doctor_id` and `booked_by`). When embedding via Supabase, use the explicit FK hint: `doctor:profiles!appointments_doctor_id_fkey(id, full_name)`. See [Section 15](#15-common-patterns) for the pattern.

---

### HR (`/features/hr/`)

| File | What it does |
|---|---|
| `StaffPage.jsx` | Staff list — CRUD via `/api/hr/staff/` |
| `StaffForm.jsx` | Add/edit staff profile (department, role, phone, hire date) |
| `ShiftsPage.jsx` | Shift roster — create and view shifts per staff member |
| `LeavePage.jsx` | Leave requests — staff submit, admin approves/rejects |
| `AttendancePage.jsx` | Attendance log — clock-in/clock-out records |

**Backend HR app:**
- `/api/hr/staff/` — staff profiles
- `/api/hr/shifts/` — shift records
- `/api/hr/leave/` — leave requests (filter by `status=pending`)
- `/api/hr/attendance/` — attendance records

---

### Finance (`/features/finance/`)

| File | What it does |
|---|---|
| `BillingPage.jsx` | Invoice list — filter by status. "Collect Payment" button on each invoice opens `PaymentModal` |
| `InvoiceForm.jsx` | Invoice builder — line items, tax, discount. Accepts `defaultPatient` and `defaultAppointmentId` props for pre-filling |
| `PaymentModal.jsx` | Two-tab payment modal: **Pay Online** (Razorpay checkout) and **Record Offline** (cash/UPI/cheque/bank transfer) |
| `PaymentsPage.jsx` | Payment records against invoices |
| `ExpensesPage.jsx` | Business expenses log |

**Payment flow:**
1. Open any unpaid/partial invoice → click **"Collect Payment"**
2. **Online tab** — calls `POST /api/finance/invoices/<id>/create-order/` → opens Razorpay checkout widget → on success calls `POST /api/finance/payments/verify/` → invoice auto-marked paid
3. **Offline tab** — submits amount, method, reference to `POST /api/finance/invoices/<id>/record-offline/` → invoice status auto-updated

**Backend Finance app:**
- `/api/finance/invoices/` — invoices (filter by patient, status)
- `/api/finance/invoices/<id>/items/` — invoice line items
- `/api/finance/invoices/<id>/payments/` — payments against an invoice
- `/api/finance/invoices/<id>/create-order/` — create Razorpay order for outstanding amount
- `/api/finance/invoices/<id>/record-offline/` — record cash/UPI/cheque/bank transfer payment
- `/api/finance/payments/verify/` — verify Razorpay signature and record payment
- `/api/finance/expenses/` — expense records
- `/api/finance/summary/` — aggregate stats (outstanding amount, total revenue)

**Razorpay setup:**
- Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `backend/.env`
- The `checkout.js` script is loaded globally in `frontend/index.html`
- Test keys (`rzp_test_...`) work without KYC. Switch to live keys (`rzp_live_...`) for production
- `finance/razorpay_service.py` — standalone wrapper: `create_order()`, `verify_payment()`, `fetch_payment()`

---

### Inventory (`/features/inventory/`)

| File | What it does |
|---|---|
| `ItemsPage.jsx` | Inventory item list — add/edit items with unit and reorder threshold |
| `StockPage.jsx` | Stock transaction log — restock and consume entries |
| `AlertsPage.jsx` | Low stock alerts — items where `current_stock <= reorder_threshold` |
| `AssetsPage.jsx` | Fixed asset register — equipment, furniture, devices |

**Backend Inventory app:**
- `/api/inventory/items/` — inventory items
- `/api/inventory/transactions/` — stock transactions (`transaction_type`: `restock` or `consume`)
- `/api/inventory/alerts/` — low stock items (flat array)
- `/api/inventory/assets/` — fixed assets

---

## 11. API Endpoints

All endpoints require `Authorization: Bearer <supabase_jwt>` unless marked **PUBLIC**.

### Core

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/verify/` | Any user | Returns decoded JWT payload |
| GET | `/api/users/` | Admin | List all profiles |
| POST | `/api/users/invite/` | Admin | Invite new user via Supabase |
| GET | `/api/storage/files/` | Any user | List non-deleted documents |
| POST | `/api/storage/files/` | Any user | Save file metadata |
| DELETE | `/api/storage/files/<id>/` | Any user | Soft-delete a document |
| GET | `/api/analytics/summary/` | Admin | Aggregate stats |
| GET | `/api/analytics/activity/` | Admin | Daily action counts (30 days) |
| POST | `/api/notifications/notify/leave/` | Any user | Send leave WhatsApp alert |
| GET | `/api/notifications/webhook/whatsapp/` | **PUBLIC** | WhatsApp webhook verification |
| POST | `/api/notifications/webhook/whatsapp/` | **PUBLIC** | Incoming WhatsApp message handler |

### CRM

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/crm/patients/` | List patients / create patient |
| GET/PATCH/DELETE | `/api/crm/patients/<id>/` | Retrieve / update / delete patient |
| GET/POST | `/api/crm/appointments/` | List appointments (supports `date_from`, `date_to`, `doctor_id`, `status` filters) / create |
| GET/PATCH | `/api/crm/appointments/<id>/` | Retrieve / update appointment |
| GET/POST | `/api/crm/appointments/<id>/visit-records/` | List / create visit records |
| POST | `/api/crm/appointments/<id>/send-reminder/` | Send WhatsApp appointment reminder |

### HR

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/hr/staff/` | List staff / create staff profile |
| GET/PATCH/DELETE | `/api/hr/staff/<id>/` | Retrieve / update / delete staff |
| GET/POST | `/api/hr/shifts/` | List shifts / create shift |
| GET/POST | `/api/hr/leave/` | List leave requests (filter: `status=pending`) / create |
| PATCH | `/api/hr/leave/<id>/` | Approve or reject leave request |
| GET/POST | `/api/hr/attendance/` | List attendance / log attendance |

### Finance

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/finance/invoices/` | List invoices / create invoice |
| GET/PATCH | `/api/finance/invoices/<id>/` | Retrieve / update invoice |
| GET/POST | `/api/finance/invoices/<id>/items/` | List / add invoice line items |
| GET/POST | `/api/finance/invoices/<id>/payments/` | List / record payment |
| POST | `/api/finance/invoices/<id>/create-order/` | Create Razorpay order for outstanding amount |
| POST | `/api/finance/invoices/<id>/record-offline/` | Record cash/UPI/cheque/bank transfer payment |
| POST | `/api/finance/payments/verify/` | Verify Razorpay signature and record payment |
| GET/POST | `/api/finance/expenses/` | List expenses / create expense |
| GET | `/api/finance/summary/` | Aggregate: outstanding, total revenue |

### Inventory

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/inventory/items/` | List items / create item |
| GET/PATCH | `/api/inventory/items/<id>/` | Retrieve / update item |
| GET/POST | `/api/inventory/transactions/` | List transactions / create transaction |
| GET | `/api/inventory/alerts/` | Low stock items (flat array) |
| GET/POST | `/api/inventory/assets/` | List assets / create asset |

Full request/response shapes are in `docs/api_endpoints.md`.

---

## 12. Role & Permission System

There are two roles: `admin` and `staff`.

Roles are stored in `public.profiles.role` in Supabase. They are assigned at invite time and can be changed by updating the profiles table.

### What each role can access

| Feature | Admin | Staff |
|---|---|---|
| Dashboard (stats + docs) | Full stats + docs | Recent docs only |
| User Management | Yes | No |
| Document Vault | Yes | Yes |
| Analytics (incl. ERP widgets) | Yes | No |
| Notifications | Yes | Yes |
| CRM — Patients | Yes | Yes |
| CRM — Appointments | Yes | Yes |
| CRM — Visit Records | Yes | Yes |
| HR — Staff | Yes | No |
| HR — Shifts | Yes | Yes |
| HR — Leave | Yes (approve/reject) | Yes (submit own) |
| HR — Attendance | Yes | Yes |
| Finance — Billing | Yes | No |
| Finance — Payments | Yes | No |
| Finance — Expenses | Yes | No |
| Inventory — Items | Yes | Yes |
| Inventory — Stock | Yes | Yes |
| Inventory — Alerts | Yes | Yes |
| Inventory — Assets | Yes | No |

### How role-gating works

**Backend:** Each admin-only view checks the caller's role by querying the `profiles` table:
```python
caller_id = request.supabase_user.get('sub')
caller = supabase.table('profiles').select('role').eq('id', caller_id).single().execute()
if caller.data.get('role') != 'admin':
    return Response({'error': 'Admin access required'}, status=403)
```

**Frontend:** Admin-only routes are wrapped in `ProtectedRoute`:
```jsx
<ProtectedRoute allowedRoles={['admin']}>
  <AdminPage />
</ProtectedRoute>
```

**Navigation:** `Sidebar.jsx` reads `role` from `useAuth()` and filters `navigation.json`. Staff users never see links to admin-only pages.

---

## 13. Adding a New Module

Follow this checklist to add a new feature module correctly:

### Backend

1. Create a new Django app folder: `backend/mymodule/`
2. Add `__init__.py`, `views.py`, `urls.py`
3. Add the app to `INSTALLED_APPS` in `core/settings.py`
4. Add the URL include to `core/urls.py`:
   ```python
   path('api/mymodule/', include('mymodule.urls')),
   ```
5. Write views using `request.supabase_user` for auth context
6. Log significant actions to `audit_logs`

### Frontend

1. Create a new feature folder: `frontend/src/features/mymodule/`
2. Build your page component(s) inside it
3. Import the page in `App.jsx` and add a route:
   ```jsx
   <Route path="/mymodule" element={<MyModulePage />} />
   ```
4. If it needs auth-gating, wrap it:
   ```jsx
   <Route path="/mymodule" element={
     <ProtectedRoute allowedRoles={['admin']}>
       <MyModulePage />
     </ProtectedRoute>
   } />
   ```
5. Add the nav link to `src/config/navigation.json` for the appropriate role(s)

---

## 14. Adding a New Route

**Step 1** — Create the page component in the appropriate feature folder.

**Step 2** — Import it in `App.jsx` and add the route inside the `AppShell` route group:

```jsx
import MyPage from './features/mymodule/MyPage'

// Inside the protected <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>:
<Route path="/my-path" element={<MyPage />} />
```

**Step 3** — Add the nav entry in `navigation.json`:

```json
{ "label": "My Page", "path": "/my-path", "icon": "Settings" }
```

**Step 4** — If the icon is new, add it to `ICON_MAP` in `Sidebar.jsx`:

```javascript
import { Settings } from 'lucide-react'
const ICON_MAP = { ..., Settings }
```

---

## 15. Common Patterns

### Fetch data on page load

```javascript
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  apiClient.get('/api/mymodule/items/')
    .then(res => setData(res.data))
    .catch(() => setError('Failed to load.'))
    .finally(() => setLoading(false))
}, [])
```

### Check if the current user is admin

```javascript
const { isAdmin } = useAuth()
if (!isAdmin) return <p>Access denied</p>
```

### Get current user ID in a Django view

```python
user_id = request.supabase_user.get('sub')
```

### Soft delete (never hard delete)

```python
# Backend
supabase.table('documents').update({'is_deleted': True}).eq('id', doc_id).execute()
```

```javascript
// Frontend — remove from local state immediately after API call
setItems(items => items.filter(x => x.id !== deletedId))
```

### Supabase Storage — generate a signed download URL

```javascript
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl(file.file_path, 60)  // expires in 60 seconds
window.open(data.signedUrl, '_blank')
```

### Supabase FK disambiguation (multiple FKs to the same table)

When a table has two or more foreign keys pointing to the same table, Supabase cannot infer which relationship to use for embedding. You must provide an explicit FK hint using `!fkey_name`:

```python
# WRONG — ambiguous: appointments has both doctor_id and booked_by pointing to profiles
supabase.table('appointments').select('*, doctor:profiles(id, full_name)')

# CORRECT — explicit FK hint
supabase.table('appointments').select('*, doctor:profiles!appointments_doctor_id_fkey(id, full_name)')
```

To find the constraint name: Supabase Dashboard → Table Editor → `appointments` → Foreign Keys, or check your schema SQL for `CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id)`.

### CORS multi-port (Vite dev server)

Vite automatically increments its port if the default is in use (5173 → 5174 → ...). Add all ports you may use to `CORS_ALLOWED_ORIGINS` in `backend/core/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
]
```

### Fire-and-forget side effects (cross-module write)

When one module triggers a write in another module that should not block the primary action (e.g., consuming inventory when saving a visit record):

```javascript
// Do NOT await — failure here must not block the visit save
for (const supply of suppliesUsed) {
  apiClient.post('/api/inventory/transactions/', {
    item_id: supply.item_id,
    transaction_type: 'consume',
    quantity: supply.quantity,
    notes: `Used during visit`,
  }).catch(() => {})  // silently ignore errors
}
```

---

## 16. Rules Every Developer Must Follow

These are non-negotiable. Breaking them will cause security issues or break the system.

1. **Never call Supabase Admin API from the frontend.** Admin operations (invite, delete user) must go through Django using the service role key.

2. **Never hard-delete documents or profiles.** Always set `is_deleted = true`. The same rule applies to any future table that stores user content.

3. **Every significant action must write to `audit_logs`.** This includes uploads, deletes, invites, leave submissions, and any other state-changing operation.

4. **All file binaries go to Supabase Storage.** Django only stores and serves metadata. Never save file contents in the database or on Django's filesystem.

5. **Navigation and role access must come from config files.** Add nav items to `navigation.json`, not as hardcoded JSX conditionals.

6. **The WhatsApp webhook GET endpoint must not require auth.** It is in `EXEMPT_PATHS` in the middleware. Do not remove it.

7. **Never commit `.env` files.** Use `.env.example` for templates with placeholder values only. The `.gitignore` already excludes `.env`.

8. **Use `VITE_` prefix for all React environment variables.** Vite will not expose variables without this prefix at runtime.

9. **Every module must be self-contained.** Do not import from another feature's internal files. Shared utilities go in `/lib/`.

10. **Validate at the backend, not just the frontend.** Frontend role checks are for UX. Always enforce permissions in Django views as well.

11. **Use explicit FK hints for Supabase embeds.** Any table with multiple FKs to the same parent table must use `!fkey_name` in the `select()` call. Ambiguous embeds will throw an `APIError` at runtime.

12. **Use JWKS for JWT verification, not raw secret decoding.** The middleware uses `PyJWKClient` — do not revert to `jwt.decode(token, secret_string, ...)`. Supabase may rotate signing keys and the JWKS endpoint always returns the current key.

---

## 17. Reusing Modules in Other Projects

Every module is built to be extracted and dropped into a new client project. The `modules/` folder at the root contains pre-packaged standalone copies ready to use.

### Module dependency map

Auth is the foundation. Every other module sits on top of it.

```
AUTH ──────────────────────────── no dependencies (always required)
     |
     +-- NAVIGATION ──────────── depends on: Auth
     +-- USER MANAGEMENT ─────── depends on: Auth
     +-- DOCUMENT VAULT ──────── depends on: Auth
     +-- ANALYTICS ───────────── depends on: Auth
     +-- NOTIFICATIONS ───────── depends on: Auth
     +-- CRM ─────────────────── depends on: Auth
     +-- HR ──────────────────── depends on: Auth
     +-- FINANCE ─────────────── depends on: Auth, CRM (for patient pre-fill)
     +-- INVENTORY ───────────── depends on: Auth
```

### What changes between client projects

The code is identical across every deployment. Only these things change:

| What | Where |
|---|---|
| Supabase credentials | `backend/.env` and `frontend/.env` |
| App name / branding | A few strings in `LoginPage.jsx` and `Sidebar.jsx` |
| Nav items | `src/config/navigation.json` |
| Document categories | `DocumentVault.jsx` `CATEGORIES` array |
| Role names | `src/config/roles.json` + `profiles.role` values |
| WhatsApp credentials | `backend/.env` |
| Bot response copy | `notifications/ai_handler.py` `RESPONSES` dict |

### How to start a new client project from scratch

```
1.  Create a new repo
2.  Set up Django project (same layout as /backend)
3.  Set up React + Vite project (same layout as /frontend)
4.  Copy modules/auth/ into the new project (always first)
5.  Copy whichever other modules the client needs
6.  Create a new Supabase project for this client
7.  Run the required SQL from docs/supabase_schema.sql
        (only the tables the copied modules need)
8.  For ERP features: run docs/supabase_erp_schema.sql as well
9.  Create a private Storage bucket named 'documents'
        (only if copying the Document Vault module)
10. Fill in backend/.env and frontend/.env with the new credentials
11. Update navigation.json with the client's routes
12. Update branding strings (client name, colors in tailwind.config.js)
13. Run scripts/seed.py to populate test data (optional)
14. Run — no further code changes needed
```

> Full extraction instructions for every module are in `docs/MODULE_EXTRACTION_GUIDE.md`.

---

*Montnexus V1 | Developer Guide v2.1 | March 2026*
