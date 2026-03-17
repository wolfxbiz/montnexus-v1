# MONTNEXUS V1 — SYSTEM ARCHITECTURE & BUILD INSTRUCTIONS
> This document is the single source of truth for the Claude agent building the Montnexus modular admin system. Read this fully before writing any code.

---

## 0. AGENT INSTRUCTIONS

You are building a **modular, reusable admin system** for Montnexus — a startup that builds customized internal systems for businesses (starting with healthcare). The system must be built as **atomic, plug-and-play modules** so each feature can be dropped into any future client project with minimal changes.

### Core Principles
- **Every module is self-contained.** No module should depend on another module's internal logic.
- **Config-driven wherever possible.** Navigation, roles, and permissions come from JSON/config, not hardcoded logic.
- **Supabase is the identity and storage layer.** Django is the workflow and AI logic layer. Never mix their responsibilities.
- **Build for reuse.** You are not just building for one client. Every component you build will be used across 10+ future client deployments.

---

## 1. TECH STACK

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Tailwind CSS | UI, routing, component library |
| Backend | Python Django + Django REST Framework | API, business logic, AI workflows |
| Auth & DB | Supabase (PostgreSQL) | Authentication, database, file storage |
| Realtime/Messaging | WhatsApp Business API (via webhook) | Notifications, appointment automation |
| State Management | React Context API or Zustand | Global auth state, user roles |
| Charts | Recharts | Admin analytics dashboard |
| Auth Tokens | JWT (via Supabase) | Stateless API authentication |

---

## 2. REPOSITORY STRUCTURE

```
/montnexus-v1
├── /backend                          # Django project root
│   ├── /core                         # Django settings, URLs, middleware
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── middleware.py             # Supabase JWT validation middleware
│   ├── /authentication               # Supabase auth bridge
│   │   ├── views.py                  # Token verify endpoint
│   │   └── utils.py                  # JWT decode helpers
│   ├── /notifications                # WhatsApp & AI module
│   │   ├── views.py                  # /api/notify/ and /api/webhook/
│   │   ├── whatsapp_service.py       # Standalone WhatsApp API wrapper
│   │   └── ai_handler.py             # Chatbot/SLM logic
│   ├── /storage                      # Document metadata & audit
│   │   ├── models.py                 # FileRecord, AuditLog models
│   │   ├── views.py                  # File metadata CRUD
│   │   └── signals.py                # DB change listeners → audit log
│   ├── /users                        # User profile extension
│   │   ├── models.py                 # UserProfile (extends Supabase user)
│   │   └── views.py                  # Profile CRUD
│   ├── requirements.txt
│   └── manage.py
│
├── /frontend                         # React project root
│   ├── /public
│   ├── /src
│   │   ├── /config
│   │   │   ├── navigation.json       # Config-driven nav links per role
│   │   │   └── roles.json            # Role definitions and permissions
│   │   ├── /lib
│   │   │   ├── supabaseClient.js     # Supabase singleton instance
│   │   │   └── apiClient.js          # Axios instance with JWT headers
│   │   ├── /context
│   │   │   └── AuthContext.jsx       # Global auth state provider
│   │   ├── /features
│   │   │   ├── /auth                 # DEV 1
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   └── useAuth.js
│   │   │   ├── /navigation           # DEV 1
│   │   │   │   ├── Sidebar.jsx       # Config-driven from navigation.json
│   │   │   │   └── TopBar.jsx
│   │   │   ├── /user-management      # DEV 1
│   │   │   │   ├── UserManagementPage.jsx
│   │   │   │   ├── InviteUserModal.jsx
│   │   │   │   └── UserTable.jsx
│   │   │   ├── /messaging            # DEV 2
│   │   │   │   ├── NotificationPanel.jsx
│   │   │   │   └── ChatbotWidget.jsx
│   │   │   ├── /docs                 # DEV 3
│   │   │   │   ├── DocumentVault.jsx
│   │   │   │   ├── FileUploader.jsx
│   │   │   │   └── FileCard.jsx
│   │   │   └── /analytics            # DEV 3
│   │   │       ├── AnalyticsDashboard.jsx
│   │   │       └── charts/
│   │   │           ├── ActivityChart.jsx
│   │   │           └── SummaryCards.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── package.json
│
└── /docs
    ├── api_endpoints.md              # All Django API contracts
    ├── supabase_schema.sql           # DB schema to run in Supabase
    └── env_template.txt              # All required env variables
```

---

## 3. DATABASE SCHEMA (Supabase / PostgreSQL)

Run the following in your Supabase SQL editor.

```sql
-- Supabase handles the auth.users table automatically.
-- We extend it with a profiles table.

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff',  -- 'admin' or 'staff'
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 
          COALESCE(NEW.raw_user_meta_data->>'role', 'staff'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Document / File metadata
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id UUID REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,           -- Supabase storage path
  file_size BIGINT,
  mime_type TEXT,
  category TEXT,                     -- e.g. 'Contract', 'Medical', 'Report'
  tags TEXT[],
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,              -- e.g. 'UPLOAD', 'DELETE', 'LOGIN'
  target_table TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, only update their own
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admins can do everything on profiles
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Documents: authenticated users can read, upload restricted
CREATE POLICY "Authenticated users can view documents"
  ON public.documents FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload documents"
  ON public.documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Supabase Storage bucket (run via Supabase dashboard or API)
-- Bucket name: 'documents'
-- Make it private (not public)
```

---

## 4. ENVIRONMENT VARIABLES

### `/backend/.env`
```
DJANGO_SECRET_KEY=your_django_secret
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key  # Never expose this on frontend
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
```

### `/frontend/.env`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key   # Safe to expose
VITE_API_BASE_URL=http://localhost:8000
```

---

## 5. MODULE SPECIFICATIONS

---

### MODULE 1: AUTHENTICATION (Dev 1)

**Files:** `/frontend/src/features/auth/`

#### `supabaseClient.js`
```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

#### `AuthContext.jsx` — Global auth state
- On mount: call `supabase.auth.getSession()`
- Listen to `supabase.auth.onAuthStateChange`
- Store: `{ user, profile, role, loading }`
- Fetch `profiles` table after login to get `role`
- Expose: `login()`, `logout()`, `user`, `role`, `isAdmin`

#### `LoginPage.jsx`
- Email + Password login via `supabase.auth.signInWithPassword()`
- Magic Link option via `supabase.auth.signInWithOtp()`
- Redirect to `/dashboard` on success
- Show error states clearly

#### `ProtectedRoute.jsx`
```jsx
// Usage: <ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>
// Props: allowedRoles (array), children
// Behavior: redirect to /login if not authenticated
//           redirect to /unauthorized if role not in allowedRoles
```

#### `useAuth.js`
- Custom hook that consumes AuthContext
- Returns: `{ user, role, isAdmin, login, logout, loading }`

---

### MODULE 2: NAVIGATION (Dev 1)

**Files:** `/frontend/src/features/navigation/`

#### `navigation.json` — Config file
```json
{
  "admin": [
    { "label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard" },
    { "label": "User Management", "path": "/users", "icon": "Users" },
    { "label": "Documents", "path": "/docs", "icon": "FolderOpen" },
    { "label": "Analytics", "path": "/analytics", "icon": "BarChart2" },
    { "label": "Notifications", "path": "/notifications", "icon": "Bell" }
  ],
  "staff": [
    { "label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard" },
    { "label": "Documents", "path": "/docs", "icon": "FolderOpen" },
    { "label": "Notifications", "path": "/notifications", "icon": "Bell" }
  ]
}
```

#### `Sidebar.jsx`
- Read role from `useAuth()`
- Import navigation.json, filter by role
- Render nav links dynamically
- Use `lucide-react` for icons
- Highlight active route
- Collapsible on mobile

---

### MODULE 3: USER MANAGEMENT (Dev 1)

**Files:** `/frontend/src/features/user-management/`

#### `UserManagementPage.jsx` — Admin only
- Fetch all profiles from Supabase `profiles` table
- Display in `UserTable` component
- Button to open `InviteUserModal`

#### `InviteUserModal.jsx`
- Form: Full Name, Email, Role (admin/staff), Department
- On submit: call `supabase.auth.admin.inviteUserByEmail()` via your Django backend (never call admin API from frontend)
- Django endpoint: `POST /api/users/invite/`

#### Django: `POST /api/users/invite/`
```python
# Uses Supabase Admin SDK (service role key)
# Body: { email, full_name, role, department }
# Action: calls supabase.auth.admin.invite_user_by_email()
#         with user_metadata = { full_name, role, department }
# The DB trigger will auto-create the profile
```

---

### MODULE 4: WHATSAPP & NOTIFICATIONS (Dev 2)

**Files:** `/backend/notifications/`

#### `whatsapp_service.py` — Standalone wrapper
```python
class WhatsAppService:
    def send_message(self, to: str, message: str) -> dict
    def send_template(self, to: str, template_name: str, params: list) -> dict
    def parse_incoming(self, payload: dict) -> dict  # returns { from, message, type }
```

#### `views.py`
- `POST /api/notify/leave/` — Triggered when staff marks leave
  - Body: `{ staff_id, leave_date, admin_phone }`
  - Sends WhatsApp message to admin
  - Logs to `audit_logs`

- `POST /api/webhook/whatsapp/` — WhatsApp webhook receiver
  - `GET` for verification (returns challenge token)
  - `POST` processes incoming messages
  - Routes to `ai_handler.py` for chatbot responses

#### `ai_handler.py`
- Receives parsed message
- Classifies intent (appointment / query / unknown)
- Returns response text
- (Phase 1: rule-based. Phase 2: connect to SLM/LLM)

---

### MODULE 5: DOCUMENT VAULT (Dev 3)

**Files:** `/frontend/src/features/docs/`

#### `FileUploader.jsx`
- Drag and drop + click to upload
- On upload: 
  1. Upload file to Supabase Storage bucket `documents`
  2. `POST /api/storage/files/` — save metadata to `documents` table
- Show upload progress

#### `DocumentVault.jsx`
- Fetch files from `documents` table (filtered by `is_deleted = false`)
- Filter by category/tags
- Display as `FileCard` grid

#### `FileCard.jsx`
- Shows: filename, category, uploader, date, size
- Actions: Download (signed URL from Supabase), Delete (soft delete)

#### Django: `/api/storage/files/`
- `GET` — list files (metadata only, not binaries)
- `POST` — save file metadata after frontend uploads to Supabase Storage
- `DELETE /api/storage/files/:id/` — soft delete (sets `is_deleted = true`)

---

### MODULE 6: ANALYTICS (Dev 3)

**Files:** `/frontend/src/features/analytics/`

#### `AnalyticsDashboard.jsx`
- Admin only
- Composed of `SummaryCards` + `ActivityChart`

#### `SummaryCards.jsx`
- Cards: Total Users, Active Staff, Documents Uploaded, Actions This Week
- Data from: `GET /api/analytics/summary/`

#### `ActivityChart.jsx`
- Line chart using Recharts
- Shows daily actions over last 30 days
- Data from: `GET /api/analytics/activity/`
- Data source: `audit_logs` table aggregated by day

#### Django analytics endpoints
```python
# GET /api/analytics/summary/
# Returns: { total_users, active_staff, total_documents, weekly_actions }

# GET /api/analytics/activity/
# Returns: [ { date: "2026-03-01", actions: 12 }, ... ] — last 30 days
```

---

## 6. DJANGO MIDDLEWARE: SUPABASE JWT VALIDATION

Every Django API endpoint must validate the Supabase JWT from the frontend.

```python
# core/middleware.py
import jwt
from django.conf import settings
from django.http import JsonResponse

class SupabaseAuthMiddleware:
    """
    Validates Supabase JWT on every request.
    Attaches decoded payload to request.supabase_user
    """
    EXEMPT_PATHS = ['/api/webhook/whatsapp/']  # Public endpoints

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path in self.EXEMPT_PATHS:
            return self.get_response(request)

        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=['HS256'],
                audience='authenticated'
            )
            request.supabase_user = payload
        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': 'Token expired'}, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({'error': 'Invalid token'}, status=401)

        return self.get_response(request)
```

---

## 7. FRONTEND API CLIENT

```javascript
// src/lib/apiClient.js
import axios from 'axios'
import { supabase } from './supabaseClient'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// Auto-attach Supabase JWT to every request
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

export default apiClient
```

---

## 8. BUILD SEQUENCE (Follow This Order)

```
PHASE 1 — FOUNDATION
[ ] 1. Set up Supabase project, run schema SQL, enable Auth providers
[ ] 2. Set up Django project, install DRF, configure settings
[ ] 3. Implement Supabase JWT middleware in Django
[ ] 4. Set up React project with Tailwind, install dependencies
[ ] 5. Create supabaseClient.js and apiClient.js

PHASE 2 — AUTH & NAVIGATION
[ ] 6. Build AuthContext and useAuth hook
[ ] 7. Build LoginPage (email + magic link)
[ ] 8. Build ProtectedRoute component
[ ] 9. Build config-driven Sidebar from navigation.json
[ ] 10. Test: login as admin → see admin nav, login as staff → see staff nav

PHASE 3 — USER MANAGEMENT
[ ] 11. Build UserManagementPage + UserTable
[ ] 12. Build InviteUserModal
[ ] 13. Build Django POST /api/users/invite/ endpoint
[ ] 14. Test full invite flow: admin invites → user gets email → logs in → profile created

PHASE 4 — DOCUMENTS
[ ] 15. Set up Supabase Storage bucket 'documents'
[ ] 16. Build FileUploader with drag-drop
[ ] 17. Build FileCard and DocumentVault
[ ] 18. Build Django storage endpoints
[ ] 19. Test: upload file → appears in vault → soft delete works

PHASE 5 — ANALYTICS
[ ] 20. Build Django analytics endpoints (query audit_logs)
[ ] 21. Build SummaryCards
[ ] 22. Build ActivityChart with Recharts
[ ] 23. Test: perform actions → audit_logs fill up → charts reflect data

PHASE 6 — NOTIFICATIONS (WhatsApp)
[ ] 24. Build whatsapp_service.py wrapper
[ ] 25. Build /api/notify/leave/ endpoint
[ ] 26. Build webhook listener
[ ] 27. Build basic ai_handler.py (rule-based first)
[ ] 28. Test with WhatsApp sandbox
```

---

## 9. DEPENDENCIES

### Frontend (`package.json`)
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "@supabase/supabase-js": "^2",
    "axios": "^1",
    "recharts": "^2",
    "lucide-react": "^0.383.0",
    "zustand": "^4",
    "tailwindcss": "^3"
  }
}
```

### Backend (`requirements.txt`)
```
django>=4.2
djangorestframework>=3.14
python-jose[cryptography]>=3.3   # JWT decoding
PyJWT>=2.8
supabase>=2.0                    # Supabase Python client
python-dotenv>=1.0
requests>=2.31                   # WhatsApp API calls
psycopg2-binary>=2.9             # PostgreSQL adapter
django-cors-headers>=4.3         # CORS for React frontend
```

---

## 10. IMPORTANT AGENT NOTES

1. **Never call Supabase Admin API from the frontend.** Admin operations (invite user, delete user) must go through Django with the service role key.
2. **All file binaries go to Supabase Storage.** Django only stores and serves file metadata.
3. **Soft delete only.** Never hard delete documents or profiles. Set `is_deleted = true`.
4. **Every significant action must write to `audit_logs`.** Use Django signals where possible.
5. **The navigation and role system must come from config files**, not hardcoded conditionals.
6. **WhatsApp webhook GET must return the verify token challenge** without auth validation.
7. **Build each module so it can be extracted** into a new project as a folder with minimal changes.
8. **Use `VITE_` prefix for all React env variables** when using Vite.

---

*Document version: 1.0 | Generated for Montnexus V1 | March 2026*
