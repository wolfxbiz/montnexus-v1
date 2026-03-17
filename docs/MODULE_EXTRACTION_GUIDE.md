# Montnexus — Module Extraction Guide

Every module in this system is designed to be extracted and dropped into a new client project independently. This document tells you exactly which files belong to each module, what they depend on, and what to change for a new project.

---

## How modules are structured

Each module has two parts:

| Part | Location | What it contains |
|---|---|---|
| Frontend | `frontend/src/features/<module>/` | React components and pages |
| Backend | `backend/<module>/` | Django views, URLs, models |

The `modules/` folder at the root contains **pre-packaged standalone copies** of each module ready to drop into a new project.

---

## Module dependency map

Some modules depend on a shared foundation. Always check this before extracting:

```
AUTH ──────────────────────────── no dependencies (foundation)
     │
     ├── NAVIGATION ──────────── depends on: Auth
     ├── USER MANAGEMENT ─────── depends on: Auth
     ├── DOCUMENT VAULT ──────── depends on: Auth
     ├── ANALYTICS ───────────── depends on: Auth
     └── NOTIFICATIONS ───────── depends on: Auth
```

**Auth is always required.** Every other module sits on top of it. When extracting any module, always include Auth.

The shared foundation files every module needs:

```
frontend/src/lib/supabaseClient.js
frontend/src/lib/apiClient.js
frontend/src/context/AuthContext.jsx
frontend/src/features/auth/
backend/authentication/
backend/core/middleware.py
```

---

## Module 1 — Authentication

**Standalone package:** `modules/auth/` — contains all files + its own README with full install steps.

### Files to copy

**Frontend:**
```
src/lib/supabaseClient.js
src/lib/apiClient.js
src/context/AuthContext.jsx
src/features/auth/LoginPage.jsx
src/features/auth/ProtectedRoute.jsx
src/features/auth/useAuth.js
```

**Backend:**
```
authentication/__init__.py
authentication/views.py
authentication/utils.py
authentication/urls.py
core/middleware.py
```

### Dependencies
- `@supabase/supabase-js`, `axios`, `react-router-dom`
- `PyJWT`, `supabase`, `python-dotenv`, `django-cors-headers`
- A Supabase project with `public.profiles` table (SQL in `modules/auth/README.md`)

### What to change for a new client
| What | Where | Change to |
|---|---|---|
| Redirect after login | `LoginPage.jsx` | `/dashboard` → whatever your landing route is |
| App name/branding | `LoginPage.jsx` | Replace "Montnexus" with client name |
| Exempt paths | `middleware.py` `EXEMPT_PATHS` | Add any public endpoints for the new project |

---

## Module 2 — Navigation

### Files to copy
*(Always include Auth module first)*

**Frontend:**
```
src/config/navigation.json
src/config/roles.json
src/features/navigation/Sidebar.jsx
src/features/navigation/TopBar.jsx
```

**Backend:** None — navigation is frontend-only.

### Dependencies
- Auth module
- `lucide-react`

### What to change for a new client
| What | Where | Change to |
|---|---|---|
| Nav items | `navigation.json` | Replace with client's routes and labels |
| Roles | `roles.json` | Add/remove roles as needed |
| Icons | `Sidebar.jsx` `ICON_MAP` | Add any new icons used in `navigation.json` |
| Brand name | `Sidebar.jsx` | Replace "Montnexus" |

**navigation.json structure:**
```json
{
  "admin": [
    { "label": "Page Name", "path": "/route", "icon": "LucideIconName" }
  ],
  "staff": [...]
}
```

---

## Module 3 — User Management

### Files to copy
*(Always include Auth module first)*

**Frontend:**
```
src/features/user-management/UserManagementPage.jsx
src/features/user-management/UserTable.jsx
src/features/user-management/InviteUserModal.jsx
```

**Backend:**
```
users/__init__.py
users/views.py
users/urls.py
users/models.py
```

### Dependencies
- Auth module
- `lucide-react`
- Supabase `public.profiles` table with `role` column

### What to change for a new client
| What | Where | Change to |
|---|---|---|
| Role options | `InviteUserModal.jsx` `<select>` | Add/remove role options matching the new project |
| Table columns | `UserTable.jsx` | Add/remove columns to match the client's profile fields |
| Profile fields | `users/views.py` invite body | Add any extra `user_metadata` fields the client needs |

---

## Module 4 — Document Vault

### Files to copy
*(Always include Auth module first)*

**Frontend:**
```
src/features/docs/DocumentVault.jsx
src/features/docs/FileUploader.jsx
src/features/docs/FileCard.jsx
```

**Backend:**
```
storage/__init__.py
storage/views.py
storage/urls.py
storage/models.py
```

**Supabase:** Create a private storage bucket named `documents` (or rename to match the client).

### Dependencies
- Auth module
- `lucide-react`
- Supabase Storage bucket
- `public.documents` table (SQL in `docs/supabase_schema.sql`)

### What to change for a new client
| What | Where | Change to |
|---|---|---|
| Bucket name | `FileUploader.jsx` `.from('documents')` | Match the client's bucket name |
| Bucket name | `FileCard.jsx` `.from('documents')` | Same |
| Category list | `DocumentVault.jsx` `CATEGORIES` array | Replace with client's document categories |
| Accepted file types | `FileUploader.jsx` `ACCEPTED_TYPES` | Add/remove MIME types |

---

## Module 5 — Analytics

### Files to copy
*(Always include Auth module first)*

**Frontend:**
```
src/features/analytics/AnalyticsDashboard.jsx
src/features/analytics/charts/SummaryCards.jsx
src/features/analytics/charts/ActivityChart.jsx
```

**Backend:**
```
users/analytics_views.py
users/analytics_urls.py
```
*(These live in the `users` app — copy them into whichever app makes sense in the new project.)*

### Dependencies
- Auth module
- `recharts`
- `public.audit_logs` table
- `public.documents` table (for document count)
- `public.profiles` table (for user/staff count)

### What to change for a new client
| What | Where | Change to |
|---|---|---|
| Stat cards | `SummaryCards.jsx` `CARDS` array | Add/replace metrics that matter for the client |
| Summary query | `analytics_views.py` `summary()` | Add/remove counts matching new tables |
| Chart label | `ActivityChart.jsx` | Update the period label if needed |

---

## Module 6 — Notifications (WhatsApp)

### Files to copy
*(Always include Auth module first)*

**Frontend:**
```
src/features/messaging/NotificationPanel.jsx
src/features/messaging/ChatbotWidget.jsx
```

**Backend:**
```
notifications/__init__.py
notifications/views.py
notifications/whatsapp_service.py
notifications/ai_handler.py
notifications/urls.py
```

### Dependencies
- Auth module
- A Meta Developer account with WhatsApp Business API access
- `requests` (Python)

### What to change for a new client
| What | Where | Change to |
|---|---|---|
| Message text | `notifications/views.py` `notify_leave()` | Rewrite for the client's notification type |
| Intent keywords | `ai_handler.py` `classify_intent()` | Replace with the client's domain terms |
| Bot responses | `ai_handler.py` `RESPONSES` dict | Replace with the client's actual response copy |
| WhatsApp credentials | `backend/.env` | New client's Meta app credentials |

---

## Extracting multiple modules at once

Example: You need Auth + Documents + Notifications for a new client.

**Copy list:**
```
# Foundation (always)
src/lib/supabaseClient.js
src/lib/apiClient.js
src/context/AuthContext.jsx
src/features/auth/
backend/authentication/
backend/core/middleware.py

# Documents
src/features/docs/
backend/storage/

# Notifications
src/features/messaging/
backend/notifications/
```

**Install:**
```bash
# Frontend
npm install @supabase/supabase-js axios react-router-dom lucide-react

# Backend
pip install django djangorestframework PyJWT supabase python-dotenv requests django-cors-headers psycopg2-binary
```

**Supabase tables needed:**
- `public.profiles` (auth)
- `public.documents` (document vault)
- `public.audit_logs` (notifications logging)

Run the relevant sections from `docs/supabase_schema.sql`.

---

## Step-by-step: Starting a new client project

```
1. Create new repo
2. Set up Django project + React/Vite project (same structure as montnexus-v1)
3. Copy the Auth module (modules/auth/) into the new project
4. Copy whichever other modules the client needs
5. Set up a new Supabase project for the client
6. Run the required SQL tables (only what the copied modules need)
7. Fill in .env files with the new client's Supabase credentials
8. Customise branding (name, colors in tailwind.config.js)
9. Update navigation.json with the client's routes
10. Done — no code logic changes needed
```

**The only things that ever change between clients:**
- `.env` files (credentials)
- `navigation.json` (routes and labels)
- Branding text (client name, a few strings)
- Category/role names if the client uses different terminology

All business logic, auth flow, JWT validation, and component behaviour stays identical.

---

## Pre-packaged modules

The `modules/` folder contains ready-to-copy standalone packages:

```
/modules
└── /auth        ← complete auth package with its own README
    ├── README.md
    ├── /frontend
    │   ├── /lib
    │   ├── /context
    │   └── /features/auth
    └── /backend
        ├── /authentication
        └── middleware.py
```

More modules will be added to `modules/` as they are stabilised.
