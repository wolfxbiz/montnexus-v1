# Montnexus V1 — Developer Guide

> Last updated: March 2026
> Version: 1.0
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
| Auth Tokens | JWT (via Supabase) | Stateless API authentication |
| Icons | lucide-react | UI icons |

---

## 3. Repository Structure

```
/montnexus-v1
├── /backend                            # Django project root
│   ├── /core                           # Django settings and middleware
│   │   ├── settings.py                 # All Django config, reads from .env
│   │   ├── urls.py                     # Root URL router
│   │   ├── middleware.py               # Supabase JWT validation middleware
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
│   │   │   │   ├── AnalyticsDashboard.jsx
│   │   │   │   └── /charts
│   │   │   │       ├── SummaryCards.jsx
│   │   │   │       └── ActivityChart.jsx
│   │   │   └── /messaging
│   │   │       ├── NotificationPanel.jsx  # Leave alert form
│   │   │       └── ChatbotWidget.jsx      # Floating in-app chat
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
├── /docs
│   ├── DEVELOPER_GUIDE.md              # This file
│   ├── MODULE_EXTRACTION_GUIDE.md      # How to extract & reuse each module
│   ├── api_endpoints.md                # Full API contract reference
│   ├── supabase_schema.sql             # DB schema — run in Supabase SQL editor
│   └── env_template.txt                # All required env variables
│
├── /modules                            # Pre-packaged standalone module copies
│   └── /auth                           # Drop-in auth package for new projects
│       ├── README.md                   # Install instructions for this module
│       ├── /frontend
│       │   ├── /lib
│       │   │   ├── supabaseClient.js
│       │   │   └── apiClient.js
│       │   ├── /context
│       │   │   └── AuthContext.jsx
│       │   └── /features/auth
│       │       ├── LoginPage.jsx
│       │       ├── ProtectedRoute.jsx
│       │       └── useAuth.js
│       └── /backend
│           ├── /authentication
│           │   ├── __init__.py
│           │   ├── views.py
│           │   ├── utils.py
│           │   └── urls.py
│           └── middleware.py
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

Open `http://localhost:5173` in your browser.

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
| `SUPABASE_JWT_SECRET` | Supabase JWT secret — used to validate user tokens |
| `WHATSAPP_API_URL` | WhatsApp Business API base URL |
| `WHATSAPP_ACCESS_TOKEN` | Meta developer access token |
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
2. Paste and run the entire contents of `docs/supabase_schema.sql`

This creates:
- `public.profiles` — extends `auth.users` with role, department, phone, avatar
- `public.documents` — file metadata (binaries live in Supabase Storage)
- `public.audit_logs` — every significant action is logged here
- A trigger `on_auth_user_created` — auto-creates a profile row when a new user signs up
- Row Level Security policies on all three tables

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
2. Decodes and validates it using `SUPABASE_JWT_SECRET`
3. Attaches the decoded payload to `request.supabase_user`
4. Returns `401` if the token is missing, expired, or invalid

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

### Making authenticated API calls to Django

Always use `apiClient` (not raw `fetch` or `axios`) — it automatically includes the JWT:

```javascript
import apiClient from '../../lib/apiClient'

// GET
const { data } = await apiClient.get('/api/users/')

// POST
const { data } = await apiClient.post('/api/users/invite/', { email, full_name, role })

// DELETE
await apiClient.delete(`/api/storage/files/${id}/`)
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
# Runs at http://localhost:5173

npm run build
# Builds to /dist for production
```

---

## 9. Authentication Flow

```
User enters email + password on LoginPage
        ↓
supabase.auth.signInWithPassword()
        ↓
Supabase returns { session: { access_token, user } }
        ↓
AuthContext stores user + fetches profile from public.profiles
        ↓
AuthContext sets role (admin / staff)
        ↓
User is redirected to /dashboard
        ↓
On every Django API call:
  apiClient interceptor reads session.access_token
  Adds "Authorization: Bearer <token>" header
        ↓
Django middleware validates token using SUPABASE_JWT_SECRET
  → attaches decoded payload to request.supabase_user
  → or returns 401
```

**Magic link flow:** `supabase.auth.signInWithOtp({ email })` — Supabase emails a link. When clicked, Supabase sets the session automatically and `onAuthStateChange` in `AuthContext` fires.

**Session persistence:** Supabase persists the session in `localStorage`. On page refresh, `getSession()` in `AuthContext` restores it — users stay logged in.

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
| `AnalyticsDashboard.jsx` | Fetches summary + activity data in parallel, composes charts |
| `SummaryCards.jsx` | 4 stat cards: Total Users, Active Staff, Documents, Weekly Actions |
| `ActivityChart.jsx` | Recharts line chart — daily action count from `audit_logs` over last 30 days |

**Admin only.** Data comes from `GET /api/analytics/summary/` and `GET /api/analytics/activity/`.

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
| `ai_handler.py` | Rule-based intent classifier: appointment / query / unknown → returns response text |
| `views.py` | `notify_leave` view and `whatsapp_webhook` view (GET for verification, POST for incoming messages) |

> WhatsApp requires real `WHATSAPP_ACCESS_TOKEN`, `PHONE_ID`, and `VERIFY_TOKEN` in `backend/.env` before it will work.

---

## 11. API Endpoints

All endpoints require `Authorization: Bearer <supabase_jwt>` unless marked **PUBLIC**.

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

Full request/response shapes are in `docs/api_endpoints.md`.

---

## 12. Role & Permission System

There are two roles: `admin` and `staff`.

Roles are stored in `public.profiles.role` in Supabase. They are assigned at invite time and can be changed by updating the profiles table.

### What each role can access

| Feature | Admin | Staff |
|---|---|---|
| Dashboard (stats + docs) | Full stats + docs | Recent docs only |
| User Management | Yes | No (redirected to /unauthorized) |
| Document Vault | Yes | Yes |
| Analytics | Yes | No |
| Notifications | Yes | Yes |

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

---

## 17. Reusing Modules in Other Projects

Every module is built to be extracted and dropped into a new client project. The `modules/` folder at the root contains pre-packaged standalone copies ready to use.

### The `modules/` folder

```
/modules
└── /auth                   ← ready-to-use standalone package
    ├── README.md            ← full install instructions for this module
    ├── /frontend
    │   ├── /lib
    │   │   ├── supabaseClient.js
    │   │   └── apiClient.js
    │   ├── /context
    │   │   └── AuthContext.jsx
    │   └── /features/auth
    │       ├── LoginPage.jsx
    │       ├── ProtectedRoute.jsx
    │       └── useAuth.js
    └── /backend
        ├── /authentication
        │   ├── __init__.py
        │   ├── views.py
        │   ├── utils.py
        │   └── urls.py
        └── middleware.py
```

Each package in `modules/` is a **snapshot of the source files** from `backend/` and `frontend/src/`. The actual source of truth is still the main codebase — if you update a module here, update the copy in `modules/` too.

> Full extraction instructions for every module are in `docs/MODULE_EXTRACTION_GUIDE.md`.

---

### Module dependency map

Auth is the foundation. Every other module sits on top of it.

```
AUTH ──────────────────────────── no dependencies (always required)
     │
     ├── NAVIGATION ──────────── depends on: Auth
     ├── USER MANAGEMENT ─────── depends on: Auth
     ├── DOCUMENT VAULT ──────── depends on: Auth
     ├── ANALYTICS ───────────── depends on: Auth
     └── NOTIFICATIONS ───────── depends on: Auth
```

When extracting any module, always include the Auth module files first.

---

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

No business logic, auth flow, JWT validation, or component structure needs to change.

---

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
8.  Create a private Storage bucket named 'documents'
        (only if copying the Document Vault module)
9.  Fill in backend/.env and frontend/.env with the new credentials
10. Update navigation.json with the client's routes
11. Update branding strings (client name, colors in tailwind.config.js)
12. Run — no further code changes needed
```

---

### Keeping modules up to date

When you fix a bug or improve a module in the main Montnexus codebase:

1. Apply the fix in `backend/<module>/` or `frontend/src/features/<module>/`
2. Copy the updated file(s) into `modules/<module>/` to keep the package in sync
3. Note the change in a comment or commit message so other developers know to pull the update into their client projects

---

*Montnexus V1 | Developer Guide v1.0 | March 2026*
