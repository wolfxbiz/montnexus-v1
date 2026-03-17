# Auth Module — Montnexus Standalone Package

Drop this into any React + Django + Supabase project.
No other Montnexus module required.

---

## What this module gives you

- Email + password login
- Magic link login
- Global auth state (user, profile, role) via React Context
- JWT auto-attached to every Django API call
- Protected routes with role-based access control
- Django middleware that validates Supabase JWT on every request

---

## Files in this package

```
/auth
├── /frontend
│   ├── /lib
│   │   ├── supabaseClient.js     ← Supabase singleton
│   │   └── apiClient.js          ← Axios with auto JWT header
│   ├── /context
│   │   └── AuthContext.jsx       ← Global auth state provider
│   └── /features/auth
│       ├── LoginPage.jsx         ← Login UI (email + magic link)
│       ├── ProtectedRoute.jsx    ← Route guard component
│       └── useAuth.js            ← Auth hook
│
└── /backend
    ├── /authentication
    │   ├── __init__.py
    │   ├── views.py              ← GET /api/auth/verify/
    │   ├── utils.py              ← JWT decode helpers
    │   └── urls.py
    └── middleware.py             ← Supabase JWT validation middleware
```

---

## Installation — 3 steps

### Step 1 — Copy files into your project

**Frontend** — copy these into your React project:
```
src/lib/supabaseClient.js
src/lib/apiClient.js
src/context/AuthContext.jsx
src/features/auth/LoginPage.jsx
src/features/auth/ProtectedRoute.jsx
src/features/auth/useAuth.js
```

**Backend** — copy these into your Django project:
```
authentication/          ← entire folder
core/middleware.py       ← add to your core app
```

### Step 2 — Install dependencies

**Frontend:**
```bash
npm install @supabase/supabase-js axios react-router-dom
```

**Backend:**
```bash
pip install PyJWT python-dotenv supabase django-cors-headers
```

### Step 3 — Set environment variables

**Frontend `.env`:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:8000
```

**Backend `.env`:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

---

## Wire it up

### Django `settings.py`
```python
INSTALLED_APPS = [..., 'authentication']

MIDDLEWARE = [
    ...
    'core.middleware.SupabaseAuthMiddleware',  # add last
]

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')
```

### Django `urls.py`
```python
path('api/auth/', include('authentication.urls')),
```

### React `main.jsx`
```jsx
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
```

### React `App.jsx`
```jsx
import LoginPage from './features/auth/LoginPage'
import ProtectedRoute from './features/auth/ProtectedRoute'

<Routes>
  <Route path="/login" element={<LoginPage />} />

  {/* Any authenticated user */}
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />

  {/* Admin only */}
  <Route path="/admin" element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminPage />
    </ProtectedRoute>
  } />
</Routes>
```

---

## Supabase setup required

Run this SQL in your Supabase project once:

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

---

## Customising for a new client

| What to change | Where |
|---|---|
| Redirect after login | `LoginPage.jsx` line with `navigate('/dashboard')` |
| Roles (e.g. add 'manager') | Add to `profiles.role` check + `ProtectedRoute` usage |
| Login page branding | `LoginPage.jsx` — change title, colors |
| Exempt paths from JWT check | `middleware.py` → `EXEMPT_PATHS` list |

Nothing else needs to change. Credentials come from `.env` — the code is identical across every project.
