# Montnexus V1 — Build Progress

> Last updated: March 2026
> Status: Phase 14 Complete — Payments + WhatsApp live

This document is a chronological record of every phase built in Montnexus V1.

---

## Summary

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation + Authentication | Complete |
| 2 | Navigation + App Shell | Complete |
| 3 | Dashboard | Complete |
| 4 | User Management | Complete |
| 5 | Document Vault | Complete |
| 6 | Analytics | Complete |
| 7 | Messaging + WhatsApp + AI Chatbot | Complete |
| 8 | CRM — Patients + Appointments | Complete |
| 9 | HR — Staff, Shifts, Leave, Attendance | Complete |
| 10 | Finance — Invoices, Payments, Expenses | Complete |
| 11 | Inventory — Items, Stock, Alerts, Assets | Complete |
| 12 | Cross-Module Integrations + ERP Dashboard | Complete |
| 13 | WhatsApp Live Integration | Complete |
| 14 | Payment System (Razorpay + Offline) | Complete |

---

## Phase 1 — Foundation + Authentication

**What was built:**
- Django project scaffold (`core/`, `authentication/`, `users/`)
- React + Vite project scaffold with Tailwind CSS
- Supabase integration on both sides (frontend anon client, backend service role client)
- `SupabaseAuthMiddleware` — validates JWT on every Django request
- `AuthContext.jsx` — global auth state with role detection
- `LoginPage.jsx` — email/password + magic link login
- `ProtectedRoute.jsx` — auth and role guard
- `supabaseClient.js` — singleton Supabase client
- `apiClient.js` — Axios instance with JWT auto-attachment
- Supabase DB schema: `profiles`, `documents`, `audit_logs`, `on_auth_user_created` trigger
- `.env.example` files for both backend and frontend
- Base `DEVELOPER_GUIDE.md`

**Key decisions:**
- Django does not manage users — Supabase Auth is the identity provider
- No Django ORM models — all data in Supabase PostgreSQL accessed via Python client
- Two roles only: `admin` and `staff`
- JWT validated with shared secret (`SUPABASE_JWT_SECRET`) — later replaced with JWKS in Phase 12 fixes

---

## Phase 2 — Navigation + App Shell

**What was built:**
- `AppShell.jsx` — persistent layout wrapper (sidebar + topbar + content area)
- `Sidebar.jsx` — config-driven navigation, role-filtered, collapsible on mobile
- `TopBar.jsx` — header with page title, notification bell, user avatar, role badge
- `navigation.json` — nav item definitions per role (avoids hardcoded conditionals)
- `roles.json` — role definitions
- `App.jsx` root router with nested protected routes

**Key decisions:**
- Navigation is always derived from config, never hardcoded in components
- `lucide-react` as the single icon library; icons registered in `ICON_MAP` in `Sidebar.jsx`

---

## Phase 3 — Dashboard

**What was built:**
- `DashboardPage.jsx` — landing page after login
- Admin: 4 live stat cards (total users, active staff, documents, weekly actions), recent documents
- Staff: recent documents only + role-appropriate quick links
- Stats sourced from `GET /api/analytics/summary/`

---

## Phase 4 — User Management

**What was built:**
- `UserManagementPage.jsx` — admin-only user list
- `UserTable.jsx` — table with name, department, role badge, status, join date
- `InviteUserModal.jsx` — invite form (name, email, role, department)
- Django `POST /api/users/invite/` — calls Supabase Admin API server-side, emails invitation link
- Django `GET /api/users/` — returns all profiles

**Key decisions:**
- Invitations go through Django, never direct Supabase Admin from the frontend
- The `on_auth_user_created` DB trigger auto-creates the `profiles` row when the invited user accepts

---

## Phase 5 — Document Vault

**What was built:**
- `DocumentVault.jsx` — file list with search and category filter
- `FileUploader.jsx` — drag-and-drop uploader
- `FileCard.jsx` — file card with download (signed URL) and soft-delete
- Django `GET/POST /api/storage/files/` and `DELETE /api/storage/files/<id>/`
- Supabase Storage bucket `documents` (private, signed URLs for downloads)
- Two-step upload: binary to Supabase Storage, metadata to Django

**Key decisions:**
- File binaries never touch Django — only Supabase Storage
- Delete is always soft (`is_deleted = true`), never hard

---

## Phase 6 — Analytics

**What was built:**
- `AnalyticsDashboard.jsx` — admin analytics page
- `SummaryCards.jsx` — 4 aggregate stat cards
- `ActivityChart.jsx` — Recharts line chart of daily action counts (30-day window)
- Django `GET /api/analytics/summary/` and `GET /api/analytics/activity/`
- Activity data sourced from `audit_logs`

---

## Phase 7 — Messaging + WhatsApp + AI Chatbot

**What was built:**
- `NotificationPanel.jsx` — leave alert submission form
- `ChatbotWidget.jsx` — floating in-app chat widget
- Django `notifications` app:
  - `whatsapp_service.py` — standalone WhatsApp Business API wrapper (`send_message`, `send_template`, `parse_incoming`)
  - `ai_handler.py` — rule-based intent classifier (appointment / query / unknown)
  - `POST /api/notifications/notify/leave/` — sends WhatsApp alert to admin
  - `GET/POST /api/notifications/webhook/whatsapp/` — Meta webhook verification + incoming message handler

**Key decisions:**
- WhatsApp webhook is in `EXEMPT_PATHS` — no auth required (Meta does not send JWT)
- AI handler is rule-based, no external API calls — intentionally simple and fast

---

## Phase 8 — CRM Module

**What was built:**

**Backend (`/backend/crm/`):**
- Patients CRUD: `GET/POST /api/crm/patients/`, `GET/PATCH/DELETE /api/crm/patients/<id>/`
- Appointments CRUD: `GET/POST /api/crm/appointments/` (with `date_from`, `date_to`, `doctor_id`, `status` filters)
- Appointment update: `PATCH /api/crm/appointments/<id>/`
- Visit records: `GET/POST /api/crm/appointments/<id>/visit-records/`
- WhatsApp appointment reminder: `POST /api/crm/appointments/<id>/send-reminder/`

**Frontend (`/frontend/src/features/crm/`):**
- `PatientsPage.jsx` + `PatientForm.jsx` — patient list and CRUD
- `AppointmentsPage.jsx` + `AppointmentForm.jsx` — appointment list with filters and booking form
- `VisitRecordForm.jsx` + `VisitRecordList.jsx` — visit record management per appointment

**Supabase tables:** `patients`, `appointments`, `visit_records`

**Key issue resolved:**
- `appointments` has two FKs to `profiles` (`doctor_id` and `booked_by`). Supabase raises `APIError: Could not embed because more than one relationship was found`. Fix: use explicit FK hint `doctor:profiles!appointments_doctor_id_fkey(id, full_name)` in all appointment queries.

---

## Phase 9 — HR Module

**What was built:**

**Backend (`/backend/hr/`):**
- Staff profiles: `GET/POST /api/hr/staff/`, `GET/PATCH/DELETE /api/hr/staff/<id>/`
- Shifts: `GET/POST /api/hr/shifts/`
- Leave requests: `GET/POST /api/hr/leave/` (filter by `status=pending`), `PATCH /api/hr/leave/<id>/` (approve/reject)
- Attendance: `GET/POST /api/hr/attendance/`

**Frontend (`/frontend/src/features/hr/`):**
- `StaffPage.jsx` + `StaffForm.jsx` — staff list and CRUD
- `ShiftsPage.jsx` — shift roster with create
- `LeavePage.jsx` — leave request list; admin can approve/reject
- `AttendancePage.jsx` — attendance log

**Supabase tables:** `staff`, `shifts`, `leave_requests`, `attendance`

---

## Phase 10 — Finance Module

**What was built:**

**Backend (`/backend/finance/`):**
- Invoices: `GET/POST /api/finance/invoices/`, `GET/PATCH /api/finance/invoices/<id>/`
- Invoice line items: `GET/POST /api/finance/invoices/<id>/items/`
- Payments: `GET/POST /api/finance/invoices/<id>/payments/`
- Expenses: `GET/POST /api/finance/expenses/`
- Summary: `GET /api/finance/summary/` — returns `outstanding` (unpaid invoice total) and `total_revenue`

**Frontend (`/frontend/src/features/finance/`):**
- `BillingPage.jsx` — invoice list with status filter (draft/sent/paid)
- `InvoiceForm.jsx` — invoice builder with line items, tax, discount; accepts `defaultPatient` and `defaultAppointmentId` props
- `PaymentsPage.jsx` — payment records
- `ExpensesPage.jsx` — expense log

**Supabase tables:** `invoices`, `invoice_items`, `payments`, `expenses`

---

## Phase 11 — Inventory Module

**What was built:**

**Backend (`/backend/inventory/`):**
- Items: `GET/POST /api/inventory/items/`, `GET/PATCH /api/inventory/items/<id>/`
- Stock transactions: `GET/POST /api/inventory/transactions/` (types: `restock`, `consume`)
- Low stock alerts: `GET /api/inventory/alerts/` — returns flat array of items where `current_stock <= reorder_threshold`
- Assets: `GET/POST /api/inventory/assets/`

**Frontend (`/frontend/src/features/inventory/`):**
- `ItemsPage.jsx` — inventory item list with add/edit
- `StockPage.jsx` — transaction log (restock and consume entries)
- `AlertsPage.jsx` — low stock alert list
- `AssetsPage.jsx` — fixed asset register

**Supabase tables:** `inventory_items`, `stock_transactions`, `assets`

---

## Phase 12 — Cross-Module Integrations + ERP Dashboard

**What was built:**

### Integration 1 — Appointment → Invoice (CRM to Finance)

After a visit record is saved, `AppointmentsPage` shows an `InvoicePromptModal`:
- "Visit Recorded — create invoice?" with Skip and Create Invoice buttons
- "Create Invoice" renders `InvoiceForm` pre-filled with `defaultPatient` and `defaultAppointmentId`
- Enables a seamless clinical → billing workflow in a single session

Files changed: `frontend/src/features/crm/AppointmentsPage.jsx`

### Integration 2 — Visit Record → Inventory (CRM to Inventory)

`VisitRecordForm` now includes a "Supplies Used" section:
- Fetches inventory items on mount via `GET /api/inventory/items/`
- Dropdown to select an item, quantity input, remove button per row
- On visit record save: fires `POST /api/inventory/transactions/` for each supply with `transaction_type: consume` (fire-and-forget — does not block visit save)
- Automatically decrements stock when supplies are consumed during a visit

Files changed: `frontend/src/features/crm/VisitRecordForm.jsx`

### Integration 3 — ERP Quick-Stat Widgets (Analytics Dashboard)

`AnalyticsDashboard` now fetches 4 live ERP metrics in parallel with the existing analytics calls:
- **Today's Appointments** — count via `GET /api/crm/appointments/?date_from=today&date_to=today`
- **Pending Leave Requests** — count via `GET /api/hr/leave/?status=pending`
- **Outstanding Invoices (₹)** — total from `GET /api/finance/summary/`
- **Low Stock Items** — count from `GET /api/inventory/alerts/`

Each widget is a clickable card that navigates to the relevant module page.

Files changed: `frontend/src/features/analytics/AnalyticsDashboard.jsx`

---

## Infrastructure Fixes (applied during Phase 12 testing)

These bugs were discovered and fixed when running the system end-to-end for the first time.

### Fix 1 — JWT Algorithm: ES256 via JWKS

**Problem:** Django middleware was verifying JWTs using the legacy `SUPABASE_JWT_SECRET` string. Supabase had rotated the project's signing key from HS256 (shared secret) to ES256 (ECC P-256). All API calls returned `{"error": "Invalid token", "detail": "The specified alg value is not allowed"}`.

**Root cause:** Supabase Dashboard → Project Settings → API → JWT Settings showed ECC P-256 as the CURRENT KEY and Legacy HS256 as the PREVIOUS KEY. Tokens minted after the rotation are signed with ES256 — the old string-based verification cannot verify them.

**Fix:** Rewrote `backend/core/middleware.py` to use `PyJWKClient` from `PyJWT`. The client fetches the current public key from Supabase's JWKS endpoint (`https://<project>.supabase.co/auth/v1/.well-known/jwks.json`), caches it for 1 hour, and verifies the token signature. Accepts both ES256 and HS256 to stay compatible with any project configuration.

### Fix 2 — Axios Token Race Condition

**Problem:** The original `apiClient.js` used an `async` request interceptor that called `supabase.auth.getSession()` on every request. On first page load, components mounted and fired API calls before `getSession()` resolved, resulting in requests sent without the Authorization header and 401 errors.

**Fix:** Replaced the interceptor with token caching in `apiClient.defaults.headers.common['Authorization']`. Token is set immediately via `getSession()` on module load, and kept updated via `onAuthStateChange`. No async work happens in the request path.

### Fix 3 — CORS Port Mismatch

**Problem:** Vite's dev server auto-incremented to port 5174 when 5173 was busy, but `CORS_ALLOWED_ORIGINS` in Django only included 5173. Cross-origin preflight requests from port 5174 were rejected.

**Fix:** Added `http://localhost:5174` and `http://127.0.0.1:5174` to `CORS_ALLOWED_ORIGINS` in `backend/core/settings.py`.

### Fix 4 — Supabase FK Disambiguation

**Problem:** The `appointments` table has two foreign keys pointing to `profiles`: `doctor_id` and `booked_by`. Supabase's PostgREST embed syntax (`doctor:profiles(id, full_name)`) was ambiguous and threw `APIError: Could not embed because more than one relationship was found`.

**Fix:** Added the FK constraint name as a hint: `doctor:profiles!appointments_doctor_id_fkey(id, full_name)`. Applied to all three query locations in `backend/crm/views.py`.

### Fix 5 — Seed Script Unicode (Windows cp1252)

**Problem:** `scripts/seed.py` used Unicode characters (✓, ✗, •, ━, →, ₹, —) in print statements. On Windows, the default cp1252 encoding cannot encode these characters, causing `UnicodeEncodeError` when the script ran.

**Fix:** Replaced all Unicode characters in print statements with ASCII equivalents (`[OK]`, `[SKIP]`, `-`, `->`, `Rs`, `--`).

---

## Test Data

The seed script (`scripts/seed.py`) creates the following test data:

| Entity | Count | Details |
|---|---|---|
| Auth users | 3 | 2 doctors, 1 nurse — email/password logins |
| Patients | 5 | Mix of ages and genders |
| Appointments | 8 | Mix of statuses: scheduled, completed, cancelled |
| Visit records | 2 | Attached to completed appointments |
| Staff profiles | 3 | Linked to auth users |
| Shifts | 5 | Morning, afternoon, evening across the week |
| Leave requests | 3 | 1 approved, 1 pending, 1 rejected |
| Attendance records | 3 | Clock-in/out for recent days |
| Invoices | 3 | 1 paid, 1 sent (outstanding), 1 draft |
| Invoice items | Multiple | Consultation fees, procedure costs |
| Payments | 1 | Against the paid invoice |
| Expenses | 3 | Utilities, supplies, equipment |
| Inventory items | 6 | 4 normal stock, 2 low stock (triggers alerts) |
| Stock transactions | Multiple | Restock and consume entries |
| Assets | 3 | Ultrasound machine, examination table, ECG machine |

Run: `cd scripts && python seed.py`

---

## Current Architecture Diagram

```
Browser (React + Vite)
    |
    | HTTP + Authorization: Bearer <JWT>
    |
Django (DRF) ──── SupabaseAuthMiddleware (JWKS)
    |                    |
    |              Verifies ES256/HS256 JWT
    |              via Supabase JWKS endpoint
    |
    +── /api/auth/        authentication app
    +── /api/users/       users app
    +── /api/storage/     storage app
    +── /api/analytics/   users.analytics_views
    +── /api/notifications/ notifications app
    +── /api/crm/         crm app
    +── /api/hr/          hr app
    +── /api/finance/     finance app
    +── /api/inventory/   inventory app
         |
         | supabase-py (service role key)
         |
    Supabase PostgreSQL
         |
         +-- public.profiles
         +-- public.documents
         +-- public.audit_logs
         +-- public.patients
         +-- public.appointments
         +-- public.visit_records
         +-- public.staff
         +-- public.shifts
         +-- public.leave_requests
         +-- public.attendance
         +-- public.invoices
         +-- public.invoice_items
         +-- public.payments
         +-- public.expenses
         +-- public.inventory_items
         +-- public.stock_transactions
         +-- public.assets
         |
    Supabase Storage
         +-- documents (private bucket)
```

---

---

## Phase 13 — WhatsApp Live Integration

**What was done:**
- Connected real Meta WhatsApp Business API credentials to the system
- Configured `WHATSAPP_API_URL=https://graph.facebook.com/v22.0` (updated from v18.0 placeholder)
- Set `WHATSAPP_PHONE_ID` and `WHATSAPP_ACCESS_TOKEN` from Meta Developer Console
- Verified outbound messages working: test message delivered to registered recipient
- Registered test recipient number in Meta Developer sandbox
- Confirmed leave notifications, leave approval/rejection WhatsApp messages are live

**Key note:** Meta temporary access tokens expire every 24 hours. For production, generate a permanent token via Meta Business Manager → System Users.

---

## Phase 14 — Payment System (Razorpay + Offline)

**What was built:**

**Backend (`/backend/finance/`):**
- `razorpay_service.py` — standalone Razorpay wrapper (`create_order`, `verify_payment`, `fetch_payment`)
- `POST /api/finance/invoices/<id>/create-order/` — creates Razorpay order for the outstanding balance
- `POST /api/finance/payments/verify/` — verifies Razorpay payment signature, records payment, auto-updates invoice status
- `POST /api/finance/invoices/<id>/record-offline/` — records manual payments (cash, UPI, cheque, bank transfer)
- Invoice payment status auto-updates to `partial` or `paid` after any payment is recorded

**Frontend (`/frontend/src/features/finance/`):**
- `PaymentModal.jsx` — two-tab modal: **Pay Online** (Razorpay checkout widget) + **Record Offline** (form with method, amount, reference)
- **"Collect Payment"** button added to `InvoiceDetailModal` in `BillingPage.jsx` — visible on all unpaid/partial invoices
- Razorpay `checkout.js` script loaded globally in `frontend/index.html`

**Bug fix:**
- Leave request form was submitting empty `staff_id` — fixed by looking up the logged-in user's `staff_profiles` row by `profile.id` and passing it as `staffId` prop

**Environment variables added:**
- `RAZORPAY_KEY_ID` — use `rzp_test_...` for test mode, `rzp_live_...` for production
- `RAZORPAY_KEY_SECRET` — backend only, never exposed to frontend

---

*Montnexus V1 | Build Progress | March 2026*
