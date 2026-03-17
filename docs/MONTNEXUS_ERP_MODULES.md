# MONTNEXUS ERP MODULES — HEALTHCARE EDITION
> This document extends MONTNEXUS_SYSTEM_ARCH.md with four ERP modules built specifically for clinic operations. Read MONTNEXUS_SYSTEM_ARCH.md first. All foundation (auth, navigation, middleware, Supabase client, API client) is already built and must be reused — do not rebuild it.

---

## 0. AGENT INSTRUCTIONS

You are extending the existing Montnexus V1 system with four ERP modules tailored for healthcare clinics. The foundation (Supabase auth, Django middleware, React + Tailwind, config-driven navigation, audit logs) is already in place.

### Rules
- **Reuse everything from the foundation.** `useAuth`, `apiClient`, `ProtectedRoute`, `supabaseClient` are already built. Import them, never recreate.
- **Every module is its own folder** in `/frontend/src/features/` and its own Django app in `/backend/`.
- **Every write operation logs to `audit_logs`.** This is non-negotiable.
- **Patient is the central entity.** HR, Finance, and Inventory all reference patients or staff from the existing `profiles` table.
- **Soft delete everywhere.** `is_deleted = true`, never `DELETE FROM`.
- **Update `navigation.json`** to add new module routes after each module is built.
- Build modules strictly in the order defined in Section 7.

---

## 1. EXTENDED REPOSITORY STRUCTURE

Add the following to the existing `/montnexus-v1` repo:

```
/montnexus-v1
├── /backend
│   ├── /crm                          # MODULE 1: Patients & Appointments
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── signals.py
│   ├── /hr                           # MODULE 2: Staff HR & Leave
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── signals.py
│   ├── /finance                      # MODULE 3: Billing & Expenses
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── signals.py
│   └── /inventory                    # MODULE 4: Supplies & Assets
│       ├── models.py
│       ├── views.py
│       ├── serializers.py
│       ├── urls.py
│       └── signals.py
│
├── /frontend/src/features
│   ├── /crm                          # MODULE 1
│   │   ├── PatientsPage.jsx
│   │   ├── PatientCard.jsx
│   │   ├── PatientForm.jsx
│   │   ├── PatientProfile.jsx
│   │   ├── AppointmentsPage.jsx
│   │   ├── AppointmentCalendar.jsx
│   │   ├── AppointmentForm.jsx
│   │   └── AppointmentCard.jsx
│   ├── /hr                           # MODULE 2
│   │   ├── StaffPage.jsx
│   │   ├── StaffCard.jsx
│   │   ├── ShiftScheduler.jsx
│   │   ├── LeaveRequestForm.jsx
│   │   ├── LeaveApprovalPanel.jsx
│   │   └── AttendancePage.jsx
│   ├── /finance                      # MODULE 3
│   │   ├── BillingPage.jsx
│   │   ├── InvoiceForm.jsx
│   │   ├── InvoiceCard.jsx
│   │   ├── PaymentTracker.jsx
│   │   ├── ExpensePage.jsx
│   │   └── RevenueSummary.jsx
│   └── /inventory                    # MODULE 4
│       ├── InventoryPage.jsx
│       ├── ItemForm.jsx
│       ├── ItemCard.jsx
│       ├── StockAlertPanel.jsx
│       └── AssetPage.jsx
```

---

## 2. FULL DATABASE SCHEMA — ALL ERP MODULES

Run this in Supabase SQL editor after the base schema from MONTNEXUS_SYSTEM_ARCH.md.

```sql
-- ============================================================
-- MODULE 1: CRM — PATIENTS & APPOINTMENTS
-- ============================================================

CREATE TABLE public.patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT,
  email TEXT,
  address TEXT,
  blood_group TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_notes TEXT,                   -- General notes, allergies, conditions
  assigned_doctor_id UUID REFERENCES public.profiles(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id) NOT NULL,
  booked_by UUID REFERENCES public.profiles(id),  -- admin/staff who booked
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  status TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  type TEXT DEFAULT 'consultation'
    CHECK (type IN ('consultation', 'follow_up', 'procedure', 'emergency')),
  reason TEXT,
  notes TEXT,
  whatsapp_reminder_sent BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.visit_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id),
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id) NOT NULL,
  visit_date TIMESTAMPTZ DEFAULT NOW(),
  diagnosis TEXT,
  prescription TEXT,
  follow_up_date DATE,
  attachments TEXT[],                   -- Supabase storage paths
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for CRM
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view patients"
  ON public.patients FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage patients"
  ON public.patients FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage appointments"
  ON public.appointments FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view visit records"
  ON public.visit_records FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================
-- MODULE 2: HR — STAFF & LEAVE MANAGEMENT
-- ============================================================

CREATE TABLE public.staff_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) UNIQUE NOT NULL,
  employee_id TEXT UNIQUE,              -- e.g. MNT-001
  designation TEXT,                     -- e.g. 'Doctor', 'Nurse', 'Receptionist'
  department TEXT,
  joining_date DATE,
  employment_type TEXT DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time', 'part_time', 'contract')),
  salary NUMERIC(10, 2),
  annual_leave_quota INT DEFAULT 14,
  sick_leave_quota INT DEFAULT 7,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff_profiles(id) NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type TEXT DEFAULT 'regular'
    CHECK (shift_type IN ('regular', 'on_call', 'overtime')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff_profiles(id) NOT NULL,
  leave_type TEXT NOT NULL
    CHECK (leave_type IN ('annual', 'sick', 'emergency', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  reason TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  whatsapp_notified BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff_profiles(id) NOT NULL,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'late', 'on_leave', 'holiday')),
  notes TEXT,
  UNIQUE(staff_id, date)
);

-- RLS for HR
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view HR data"
  ON public.staff_profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage HR data"
  ON public.staff_profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Staff can view own leave requests"
  ON public.leave_requests FOR SELECT
  USING (
    staff_id IN (SELECT id FROM public.staff_profiles WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Staff can create own leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (
    staff_id IN (SELECT id FROM public.staff_profiles WHERE profile_id = auth.uid())
  );

CREATE POLICY "Admins can update leave requests"
  ON public.leave_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ============================================================
-- MODULE 3: FINANCE — BILLING & EXPENSES
-- ============================================================

CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,  -- e.g. INV-2026-001
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id),
  issued_by UUID REFERENCES public.profiles(id),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5, 2) DEFAULT 0,
  tax_amount NUMERIC(10, 2) GENERATED ALWAYS AS (subtotal * tax_percent / 100) STORED,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2),          -- Computed on save in Django
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT
    CHECK (payment_method IN ('cash', 'card', 'upi', 'insurance', 'other')),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,            -- e.g. 'Consultation Fee', 'Blood Test'
  quantity INT DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) NOT NULL,
  amount_paid NUMERIC(10, 2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT,
  reference_number TEXT,                -- UPI ref, card last 4, etc.
  recorded_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,               -- e.g. 'Supplies', 'Utilities', 'Salary'
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  paid_to TEXT,
  receipt_path TEXT,                    -- Supabase storage path
  recorded_by UUID REFERENCES public.profiles(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate invoice number function
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO next_num FROM public.invoices
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  RETURN 'INV-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- RLS for Finance
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage invoices"
  ON public.invoices FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage invoice items"
  ON public.invoice_items FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage payments"
  ON public.payments FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage expenses"
  ON public.expenses FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================
-- MODULE 4: INVENTORY — SUPPLIES & ASSETS
-- ============================================================

CREATE TABLE public.inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,               -- e.g. 'Medicine', 'Equipment', 'Consumable'
  sku TEXT UNIQUE,                      -- Stock keeping unit
  unit TEXT DEFAULT 'units',            -- e.g. 'tablets', 'ml', 'units'
  current_stock INT DEFAULT 0,
  minimum_stock INT DEFAULT 10,         -- Reorder alert threshold
  unit_cost NUMERIC(10, 2),
  supplier_name TEXT,
  supplier_contact TEXT,
  expiry_date DATE,                     -- For medicines
  storage_location TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.stock_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('restock', 'consume', 'adjustment', 'dispose')),
  quantity INT NOT NULL,                -- Positive for restock, negative for consume
  previous_stock INT,
  new_stock INT,
  reference TEXT,                       -- Invoice number, appointment ID, etc.
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,                        -- e.g. 'Medical Equipment', 'Furniture', 'IT'
  asset_tag TEXT UNIQUE,                -- Physical tag number
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC(10, 2),
  assigned_to UUID REFERENCES public.profiles(id),
  location TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'under_maintenance', 'retired', 'lost')),
  warranty_expiry DATE,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update stock on transaction
CREATE OR REPLACE FUNCTION update_stock_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.inventory_items
  SET 
    current_stock = current_stock + NEW.quantity,
    updated_at = NOW()
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_stock_transaction
  AFTER INSERT ON public.stock_transactions
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_transaction();

-- RLS for Inventory
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage inventory"
  ON public.inventory_items FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stock transactions"
  ON public.stock_transactions FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage assets"
  ON public.assets FOR ALL USING (auth.role() = 'authenticated');
```

---

## 3. UPDATED NAVIGATION CONFIG

Update `/frontend/src/config/navigation.json` to add ERP module routes:

```json
{
  "admin": [
    { "label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard" },
    { "label": "User Management", "path": "/users", "icon": "Users" },
    { "label": "Patients", "path": "/crm/patients", "icon": "HeartPulse", "group": "CRM" },
    { "label": "Appointments", "path": "/crm/appointments", "icon": "CalendarClock", "group": "CRM" },
    { "label": "Staff", "path": "/hr/staff", "icon": "UserCheck", "group": "HR" },
    { "label": "Leave", "path": "/hr/leave", "icon": "CalendarOff", "group": "HR" },
    { "label": "Attendance", "path": "/hr/attendance", "icon": "ClipboardCheck", "group": "HR" },
    { "label": "Billing", "path": "/finance/billing", "icon": "ReceiptText", "group": "Finance" },
    { "label": "Expenses", "path": "/finance/expenses", "icon": "Wallet", "group": "Finance" },
    { "label": "Inventory", "path": "/inventory", "icon": "Package", "group": "Inventory" },
    { "label": "Assets", "path": "/inventory/assets", "icon": "Wrench", "group": "Inventory" },
    { "label": "Documents", "path": "/docs", "icon": "FolderOpen" },
    { "label": "Analytics", "path": "/analytics", "icon": "BarChart2" },
    { "label": "Notifications", "path": "/notifications", "icon": "Bell" }
  ],
  "staff": [
    { "label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard" },
    { "label": "Patients", "path": "/crm/patients", "icon": "HeartPulse", "group": "CRM" },
    { "label": "Appointments", "path": "/crm/appointments", "icon": "CalendarClock", "group": "CRM" },
    { "label": "My Leave", "path": "/hr/leave", "icon": "CalendarOff", "group": "HR" },
    { "label": "Documents", "path": "/docs", "icon": "FolderOpen" },
    { "label": "Notifications", "path": "/notifications", "icon": "Bell" }
  ]
}
```

---

## 4. MODULE SPECIFICATIONS

---

### MODULE 1: CRM — PATIENTS & APPOINTMENTS

**Backend app:** `/backend/crm/`
**Frontend feature:** `/frontend/src/features/crm/`

#### Django Models Summary
- `Patient` — full patient record with assigned doctor
- `Appointment` — linked to patient + doctor, has status lifecycle
- `VisitRecord` — post-appointment clinical notes

#### API Endpoints

```
# Patients
GET    /api/crm/patients/              — list all (filterable by doctor, status)
POST   /api/crm/patients/              — create new patient
GET    /api/crm/patients/:id/          — single patient with visit history
PATCH  /api/crm/patients/:id/          — update patient
DELETE /api/crm/patients/:id/          — soft delete (is_deleted = true)

# Appointments
GET    /api/crm/appointments/          — list (filter: date, doctor_id, status)
POST   /api/crm/appointments/          — create appointment
PATCH  /api/crm/appointments/:id/      — update status or details
DELETE /api/crm/appointments/:id/      — soft delete

# Visit Records
GET    /api/crm/visits/?patient_id=    — visit history for a patient
POST   /api/crm/visits/               — create visit record after appointment

# WhatsApp reminder trigger
POST   /api/crm/appointments/:id/send-reminder/  — triggers WhatsApp to patient
```

#### Django Business Logic (`views.py`)

**Appointment creation:**
- Check for doctor scheduling conflicts (same doctor, overlapping time)
- Set `whatsapp_reminder_sent = false`
- Log to `audit_logs`: action `APPOINTMENT_CREATED`

**Status transition on PATCH:**
- `scheduled → confirmed → completed`
- When status → `completed`: prompt to create `VisitRecord`
- When status → `cancelled`: log reason, log audit

**Send reminder endpoint:**
- Call `WhatsAppService.send_template()` with patient phone
- Mark `whatsapp_reminder_sent = true`
- Log to `audit_logs`: action `REMINDER_SENT`

#### Frontend Components

**`PatientsPage.jsx`**
- Search bar (name, phone)
- Patient list with status indicators
- Button to add new patient → `PatientForm` modal
- Click patient → `PatientProfile` page

**`PatientProfile.jsx`**
- Full patient details (editable inline)
- Visit history timeline
- Upcoming appointments list
- "Book Appointment" button

**`AppointmentsPage.jsx`**
- Toggle: Calendar view / List view
- Filter by: doctor, date range, status
- Color-coded by status (scheduled=blue, confirmed=green, cancelled=red)
- Click appointment → detail modal with status update controls

**`AppointmentForm.jsx`**
- Fields: Patient (searchable dropdown), Doctor, Date, Time, Type, Duration, Reason
- Conflict warning if doctor is unavailable at selected time
- "Send WhatsApp confirmation" checkbox

**`AppointmentCalendar.jsx`**
- Weekly calendar view
- Each slot shows doctor's appointments
- Click empty slot → prefill `AppointmentForm` with that time

---

### MODULE 2: HR — STAFF & LEAVE MANAGEMENT

**Backend app:** `/backend/hr/`
**Frontend feature:** `/frontend/src/features/hr/`

#### API Endpoints

```
# Staff
GET    /api/hr/staff/                  — list all staff profiles
POST   /api/hr/staff/                  — create staff profile (links to profiles table)
GET    /api/hr/staff/:id/              — single staff with shifts + leave summary
PATCH  /api/hr/staff/:id/             — update staff details

# Shifts
GET    /api/hr/shifts/?staff_id=&date= — shifts for a staff or a date
POST   /api/hr/shifts/                 — create shift
PATCH  /api/hr/shifts/:id/            — update shift
DELETE /api/hr/shifts/:id/            — delete shift

# Leave Requests
GET    /api/hr/leave/                  — all leave requests (admin) / own (staff)
POST   /api/hr/leave/                  — submit leave request
PATCH  /api/hr/leave/:id/approve/      — admin approves (sets status + reviewed_by)
PATCH  /api/hr/leave/:id/reject/       — admin rejects with reason

# Attendance
GET    /api/hr/attendance/?staff_id=&month= — attendance for month
POST   /api/hr/attendance/             — mark attendance
PATCH  /api/hr/attendance/:id/        — correct attendance record

# Leave balance
GET    /api/hr/leave-balance/:staff_id/ — remaining leave quota
```

#### Django Business Logic

**Leave approval (`PATCH /api/hr/leave/:id/approve/`):**
- Update `status = approved`, `reviewed_by`, `reviewed_at`
- Trigger `WhatsAppService.send_message()` to staff phone → "Your leave has been approved"
- Trigger notification to admin → "Staff [name] on leave [dates]"
- Mark `whatsapp_notified = true`
- Log audit: `LEAVE_APPROVED`

**Leave balance calculation (`GET /api/hr/leave-balance/:id/`):**
- Query `staff_profiles` for quotas
- Sum approved leave days by type from `leave_requests`
- Return: `{ annual: { quota: 14, used: 3, remaining: 11 }, sick: {...} }`

**Conflict detection:**
- On shift creation: check if staff has approved leave on that date
- On leave approval: check if staff has shifts scheduled — warn admin

#### Frontend Components

**`StaffPage.jsx`**
- Staff cards with designation, department, contact
- Quick stats: shifts this week, leave balance
- Admin can add new staff (links existing profile to staff_profile)

**`ShiftScheduler.jsx`**
- Weekly grid: rows = staff, columns = days
- Drag or click to assign shift
- Color-coded by shift type
- Conflict indicators (leave overlap shown in red)

**`LeaveRequestForm.jsx`**
- Staff view: select type, date range, reason → submit
- Shows remaining balance before submitting

**`LeaveApprovalPanel.jsx`**
- Admin view: pending requests list
- Approve / Reject with one click
- Shows conflict warnings if shifts exist on leave dates

**`AttendancePage.jsx`**
- Monthly calendar per staff
- Status badges: present, absent, late, on_leave
- Admin can manually correct entries

---

### MODULE 3: FINANCE — BILLING & EXPENSES

**Backend app:** `/backend/finance/`
**Frontend feature:** `/frontend/src/features/finance/`

#### API Endpoints

```
# Invoices
GET    /api/finance/invoices/           — list (filter: status, patient, date)
POST   /api/finance/invoices/           — create invoice (auto-generates number)
GET    /api/finance/invoices/:id/       — invoice with items + payment history
PATCH  /api/finance/invoices/:id/       — update status or details
DELETE /api/finance/invoices/:id/       — soft delete

# Invoice Items
POST   /api/finance/invoices/:id/items/  — add item to invoice
DELETE /api/finance/invoices/:id/items/:item_id/  — remove item

# Payments
POST   /api/finance/payments/           — record a payment against invoice
GET    /api/finance/payments/?invoice_id= — payments for invoice

# Expenses
GET    /api/finance/expenses/           — list expenses (filter: category, date)
POST   /api/finance/expenses/           — log new expense
PATCH  /api/finance/expenses/:id/       — update expense
DELETE /api/finance/expenses/:id/       — soft delete

# Reports
GET    /api/finance/summary/            — daily/monthly revenue summary
GET    /api/finance/revenue/?month=     — revenue breakdown by month
```

#### Django Business Logic

**Invoice creation:**
- Auto-call `generate_invoice_number()` SQL function
- Calculate `total_amount = subtotal + tax_amount - discount_amount`
- Link to `appointment_id` if provided
- Log audit: `INVOICE_CREATED`

**Payment recording:**
- On `POST /api/finance/payments/`: sum all payments for invoice
- If total payments >= invoice total: set `payment_status = paid`
- If partial: set `payment_status = partial`
- Log audit: `PAYMENT_RECORDED`

**Revenue summary (`GET /api/finance/summary/`):**
```python
# Returns:
{
  "today": { "invoiced": 5000, "collected": 3500, "pending": 1500 },
  "this_month": { "invoiced": 85000, "collected": 72000, "pending": 13000 },
  "top_categories": [ { "category": "Consultation", "total": 45000 }, ... ],
  "expense_this_month": 32000,
  "net_this_month": 40000
}
```

#### Frontend Components

**`BillingPage.jsx`**
- Invoice list with status badges (paid=green, pending=yellow, overdue=red)
- Search by patient name or invoice number
- "New Invoice" button → `InvoiceForm`
- Summary bar: today's collection, pending amount

**`InvoiceForm.jsx`**
- Patient selector (searchable)
- Link to appointment (optional)
- Dynamic line items: add/remove rows (description, qty, unit price)
- Auto-calculated totals (subtotal, tax, discount, grand total)
- Payment method selector
- "Save as Draft" / "Issue Invoice" actions

**`InvoiceCard.jsx`**
- Invoice number, patient name, date, total, status
- "Record Payment" button → payment modal
- "View" → full invoice detail page
- Print/download invoice as PDF (use browser print)

**`PaymentTracker.jsx`**
- Payment history per invoice
- Running balance (amount due remaining)
- Record partial payment form

**`RevenueSummary.jsx`**
- Summary cards: today / this month / this year
- Bar chart: monthly revenue vs expenses (Recharts)
- Payment method breakdown (pie chart)

**`ExpensePage.jsx`**
- Expense list with category filter
- Add expense form: category, description, amount, date, receipt upload
- Monthly expense total

---

### MODULE 4: INVENTORY — SUPPLIES & ASSETS

**Backend app:** `/backend/inventory/`
**Frontend feature:** `/frontend/src/features/inventory/`

#### API Endpoints

```
# Inventory Items
GET    /api/inventory/items/            — list (filter: category, low_stock)
POST   /api/inventory/items/            — add new item
GET    /api/inventory/items/:id/        — item detail with transaction history
PATCH  /api/inventory/items/:id/        — update item details
DELETE /api/inventory/items/:id/        — soft delete

# Stock Transactions
POST   /api/inventory/transactions/     — restock or consume stock
GET    /api/inventory/transactions/?item_id= — transaction history

# Alerts
GET    /api/inventory/alerts/           — items below minimum_stock
GET    /api/inventory/expiring/         — items expiring within 30 days

# Assets
GET    /api/inventory/assets/           — list all assets
POST   /api/inventory/assets/           — register new asset
PATCH  /api/inventory/assets/:id/       — update status or assignment
DELETE /api/inventory/assets/:id/       — soft delete
```

#### Django Business Logic

**Stock transaction (`POST /api/inventory/transactions/`):**
- Record `previous_stock` before update
- DB trigger auto-updates `current_stock` in `inventory_items`
- If `new_stock < minimum_stock`: flag for alert
- Log audit: `STOCK_UPDATED`

**Low stock alerts (`GET /api/inventory/alerts/`):**
```python
# Query:
SELECT * FROM inventory_items
WHERE current_stock <= minimum_stock AND is_deleted = false
ORDER BY (current_stock - minimum_stock) ASC
```

**Expiry alerts (`GET /api/inventory/expiring/`):**
```python
# Query: items expiring within 30 days
SELECT * FROM inventory_items
WHERE expiry_date <= NOW() + INTERVAL '30 days'
  AND expiry_date >= NOW()
  AND is_deleted = false
ORDER BY expiry_date ASC
```

#### Frontend Components

**`InventoryPage.jsx`**
- Item list with current stock vs minimum stock indicator (progress bar)
- Category filter tabs: All / Medicine / Equipment / Consumable
- Red badge on items below minimum stock
- "Add Item" button → `ItemForm`
- "Restock" / "Consume" quick buttons per row

**`ItemForm.jsx`**
- Fields: Name, Category, SKU, Unit, Minimum Stock, Unit Cost, Supplier, Expiry Date, Location
- On submit: creates item or updates existing

**`ItemCard.jsx`**
- Stock level with color indicator (green=ok, yellow=low, red=critical)
- Last transaction date
- Quick restock / consume action buttons
- Click → item detail with transaction history

**`StockAlertPanel.jsx`**
- Dedicated panel showing all low-stock and expiring items
- Shown on admin dashboard as a widget
- One-click restock action

**`AssetPage.jsx`**
- Asset register table: name, tag, assigned to, status, warranty
- Status filter: active, under maintenance, retired
- Add asset form
- "Assign to Staff" action

---

## 5. CROSS-MODULE INTEGRATIONS

These connections must be built after all four modules are individually working:

### Appointment → Finance
When an appointment status → `completed`:
- Prompt admin: "Create invoice for this visit?"
- If yes: pre-fill `InvoiceForm` with patient, appointment_id, and a default "Consultation Fee" line item

### Leave → Appointment Conflict Warning
When a leave request is approved:
- Check if the staff member has any `scheduled` or `confirmed` appointments on those dates
- If yes: show admin a warning listing the conflicting appointments
- Admin must manually reassign or cancel those appointments

### Inventory → Visit Record
When creating a `VisitRecord`:
- Optional: "Supplies Used" multi-select from inventory
- On save: auto-create `stock_transactions` with `transaction_type = consume` for selected items

### Analytics Dashboard Extensions
Extend the existing `AnalyticsDashboard.jsx` with ERP widgets:
- Today's appointments count + status breakdown
- Pending leave requests count
- Outstanding invoices total
- Low stock items count (links to `StockAlertPanel`)

---

## 6. WHATSAPP AUTOMATION — ERP TRIGGERS

Extend the existing `whatsapp_service.py` to handle these new triggers:

| Trigger | Recipient | Message Template |
|---|---|---|
| Appointment booked | Patient | "Your appointment with Dr. [name] is confirmed for [date] at [time]." |
| Appointment reminder | Patient | "Reminder: Your appointment is tomorrow at [time]. Reply CONFIRM or CANCEL." |
| Appointment cancelled | Patient | "Your appointment on [date] has been cancelled. Please contact us to rebook." |
| Leave approved | Staff | "Your [type] leave from [start] to [end] has been approved." |
| Leave rejected | Staff | "Your leave request for [dates] was not approved. Reason: [reason]." |
| Low stock alert | Admin | "Stock alert: [item_name] is below minimum stock. Current: [qty] units." |
| Invoice issued | Patient | "Invoice [number] for ₹[amount] has been generated. Please contact us for payment." |

Each trigger: call `WhatsAppService`, mark `whatsapp_notified = true` on the record, write to `audit_logs`.

---

## 7. BUILD SEQUENCE — ERP MODULES

Follow this strictly. Do not start a phase before the previous is tested.

```
PHASE 7 — CRM FOUNDATION
[ ] 1.  Run CRM SQL schema in Supabase
[ ] 2.  Build Django /crm/ app: models, serializers, URLs
[ ] 3.  Build patient CRUD endpoints + conflict-free appointment endpoints
[ ] 4.  Build PatientsPage, PatientForm, PatientProfile
[ ] 5.  Build AppointmentsPage, AppointmentForm, AppointmentCalendar
[ ] 6.  Test: create patient → book appointment → update status → create visit record
[ ] 7.  Update navigation.json with CRM routes

PHASE 8 — CRM WHATSAPP INTEGRATION
[ ] 8.  Extend whatsapp_service.py with appointment templates
[ ] 9.  Build /api/crm/appointments/:id/send-reminder/ endpoint
[ ] 10. Test: book appointment → send WhatsApp confirmation to patient phone

PHASE 9 — HR MODULE
[ ] 11. Run HR SQL schema in Supabase
[ ] 12. Build Django /hr/ app: models, serializers, URLs
[ ] 13. Build all HR endpoints including leave balance calculation
[ ] 14. Build StaffPage, ShiftScheduler
[ ] 15. Build LeaveRequestForm (staff view) + LeaveApprovalPanel (admin view)
[ ] 16. Build AttendancePage
[ ] 17. Wire leave approval to WhatsApp notification
[ ] 18. Test: staff submits leave → admin approves → WhatsApp sent → balance updated
[ ] 19. Update navigation.json with HR routes

PHASE 10 — FINANCE MODULE
[ ] 20. Run Finance SQL schema in Supabase
[ ] 21. Build Django /finance/ app: models, serializers, URLs
[ ] 22. Build invoice auto-numbering and total calculation logic
[ ] 23. Build BillingPage, InvoiceForm, InvoiceCard, PaymentTracker
[ ] 24. Build ExpensePage
[ ] 25. Build RevenueSummary with Recharts charts
[ ] 26. Test: create invoice → add items → record partial payment → record full payment → status = paid
[ ] 27. Update navigation.json with Finance routes

PHASE 11 — INVENTORY MODULE
[ ] 28. Run Inventory SQL schema in Supabase
[ ] 29. Build Django /inventory/ app: models, serializers, URLs
[ ] 30. Build stock transaction endpoint + DB trigger verification
[ ] 31. Build InventoryPage, ItemForm, ItemCard, StockAlertPanel
[ ] 32. Build AssetPage
[ ] 33. Test: add item → consume stock → stock drops below minimum → alert appears
[ ] 34. Update navigation.json with Inventory routes

PHASE 12 — CROSS-MODULE INTEGRATION
[ ] 35. Build appointment → invoice pre-fill flow
[ ] 36. Build leave → appointment conflict check
[ ] 37. Build visit record → inventory consumption
[ ] 38. Extend AnalyticsDashboard with ERP summary widgets
[ ] 39. Full end-to-end test: patient visit → appointment → visit record → invoice → payment
```

---

## 8. IMPORTANT AGENT NOTES — ERP SPECIFIC

1. **Patient is the root entity.** Every module that touches a patient must use `patient_id` as the foreign key reference. Never duplicate patient data.
2. **Invoice numbers must never repeat.** Use the `generate_invoice_number()` SQL function. Never generate invoice numbers in Python.
3. **Stock levels are maintained by the DB trigger**, not by Python. The trigger on `stock_transactions` updates `inventory_items.current_stock` automatically. Your Django view just inserts the transaction record.
4. **Leave balance is calculated on the fly**, never stored. Always sum from `leave_requests` where `status = approved`.
5. **Appointment conflict check is mandatory.** Never allow double-booking a doctor at the same time.
6. **All WhatsApp triggers are fire-and-forget.** If WhatsApp fails, log the error but do not roll back the main action.
7. **Finance module never touches Supabase Storage directly.** Expense receipt uploads follow the same pattern as the existing Document Vault (upload to storage from frontend, save path to DB via Django).
8. **The `audit_logs` table from the base system must be used for every write action** across all four modules. Minimum fields: `actor_id`, `action`, `target_table`, `target_id`.
9. **Do not add new navigation groups** beyond CRM, HR, Finance, Inventory. The sidebar must remain clean and grouped.
10. **All date filtering in Django must use `DATE` comparisons**, not `TIMESTAMPTZ`, to avoid timezone issues with clinic local time.

---

*Document version: 1.0 | ERP Extension for Montnexus V1 — Healthcare | March 2026*
