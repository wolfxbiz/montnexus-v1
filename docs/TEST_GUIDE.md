# Montnexus V1 — Full Test Guide

> Version: 1.0 | March 2026
> Run this guide end-to-end before any client demo or deployment.
> Estimated time: 2–3 hours for a full pass.

---

## Before You Start

### Prerequisites
- Backend running at `http://localhost:8000`
- Frontend running at `http://localhost:5173` or `5174`
- Seed data loaded (`cd scripts && python seed.py`)
- Two browser windows ready (one for Admin, one for Staff)

### Test Accounts (from seed script)

| Name | Email | Password | Role |
|---|---|---|---|
| Dr. Arjun Mehta | arjun.mehta@clinic.com | Test@1234 | Admin |
| Dr. Priya Sharma | priya.sharma@clinic.com | Test@1234 | Staff (Doctor) |
| Anita Thomas | anita.thomas@clinic.com | Test@1234 | Staff (Nurse) |

> If seed script hasn't been run, create users manually via User Management.

---

## Test Notation

- **[PASS]** — Feature works as expected
- **[FAIL]** — Feature broken, note the error
- **[SKIP]** — Skipped (e.g. needs WhatsApp credentials)

---

## Module 1 — Authentication

### 1.1 Login (Admin)
1. Open `http://localhost:5174`
2. Enter email: `arjun.mehta@clinic.com`, password: `Test@1234`
3. Click **Sign In**

**Expected:**
- Redirected to `/dashboard`
- Top bar shows "Dr. Arjun Mehta" and "Admin" badge
- Sidebar shows all modules including User Management and Analytics

**Check:** [ ] Login succeeds [ ] Name shows correctly [ ] Admin badge visible [ ] All nav items visible

---

### 1.2 Login (Staff)
1. Open a second browser (incognito or different browser)
2. Login as `priya.sharma@clinic.com` / `Test@1234`

**Expected:**
- Redirected to `/dashboard`
- "Staff" badge shown
- Sidebar does NOT show User Management, Analytics, Staff, Billing, Assets

**Check:** [ ] Login succeeds [ ] Staff badge visible [ ] Admin-only pages hidden from nav

---

### 1.3 Wrong password
1. Try logging in with a wrong password

**Expected:** Error message shown, stay on login page

**Check:** [ ] Error shown [ ] Not redirected

---

### 1.4 Session persistence
1. Log in as admin
2. Refresh the page (F5)

**Expected:** Still logged in, no redirect to login

**Check:** [ ] Session persists after refresh

---

### 1.5 Logout
1. Click **Sign out** at the bottom of the sidebar
2. Try accessing `http://localhost:5174/dashboard` directly

**Expected:** Redirected to `/login`

**Check:** [ ] Logout works [ ] Protected route redirects correctly

---

## Module 2 — Dashboard

### 2.1 Admin Dashboard
*(Logged in as Admin)*

1. Go to `/dashboard`

**Expected:**
- Greeting: "Good morning/afternoon, [name]"
- 4 stat cards: Total Users, Active Staff, Documents, Actions This Week
- Numbers should not be 0 (seed data should populate them)
- Recent Documents section (may show empty if no docs uploaded)
- Quick Actions: Document Vault, Notifications, User Management, Analytics

**Check:** [ ] Greeting shows [ ] Stat cards load [ ] Numbers visible [ ] Quick actions clickable

---

### 2.2 Staff Dashboard
*(Logged in as Staff)*

1. Go to `/dashboard`

**Expected:**
- Greeting visible
- No stat cards (staff don't see admin stats)
- Recent Documents visible
- Quick Actions show only staff-permitted actions (no User Management)

**Check:** [ ] Greeting shows [ ] No stat cards [ ] Correct quick actions

---

## Module 3 — User Management *(Admin only)*

### 3.1 View Users
1. Click **User Management** in sidebar
2. Check the users table

**Expected:** List of all users with name, role badge, department, status, join date

**Check:** [ ] Users list loads [ ] Role badges correct [ ] Seed users visible

---

### 3.2 Invite New User
1. Click **+ Invite User**
2. Fill in: Full Name: `Test User`, Email: `testuser@clinic.com`, Role: `staff`, Department: `Reception`
3. Click **Send Invite**

**Expected:** Success message. Supabase sends an invite email to that address.

**Check:** [ ] Form submits [ ] Success message shown

---

### 3.3 Staff cannot access User Management
*(Switch to Staff browser)*
1. Navigate to `http://localhost:5174/users`

**Expected:** Redirected to `/unauthorized`

**Check:** [ ] Access blocked [ ] Unauthorized page shown

---

## Module 4 — Analytics *(Admin only)*

### 4.1 Analytics Dashboard
1. Click **Analytics** in sidebar

**Expected:**
- Summary cards: Total Users, Active Staff, Documents, Weekly Actions
- Activity chart (line graph) showing last 30 days
- 4 ERP widgets: Today's Appointments, Pending Leave, Outstanding Invoices, Low Stock Items

**Check:** [ ] Summary cards load [ ] Chart renders [ ] ERP widgets show numbers

---

### 4.2 ERP Widget Navigation
1. Click **Today's Appointments** widget

**Expected:** Navigates to `/crm/appointments`

2. Click **Pending Leave** widget

**Expected:** Navigates to `/hr/leave`

3. Click **Outstanding Invoices** widget

**Expected:** Navigates to `/finance/billing`

4. Click **Low Stock Items** widget

**Expected:** Navigates to `/inventory/alerts`

**Check:** [ ] All 4 widgets navigate correctly

---

## Module 5 — CRM: Patients

### 5.1 View Patients
1. Click **Patients** in sidebar

**Expected:** List of patients from seed data (5 patients)

**Check:** [ ] Patients load [ ] Names, phone, age visible

---

### 5.2 Search Patients
1. Type a patient name in the search box (e.g. "Ravi")

**Expected:** List filters in real time

**Check:** [ ] Search filters correctly

---

### 5.3 Add New Patient
1. Click **+ New Patient**
2. Fill in: Name: `Test Patient`, Phone: `9988776655`, DOB: `1990-01-15`, Gender: `Male`
3. Click **Save**

**Expected:** Patient added, appears in list

**Check:** [ ] Form submits [ ] Patient appears in list

---

### 5.4 Edit Patient
1. Click on any patient
2. Edit their phone number
3. Save

**Expected:** Updated phone shows in list

**Check:** [ ] Edit works [ ] Changes saved

---

## Module 6 — CRM: Appointments

### 6.1 View Appointments
1. Click **Appointments** in sidebar

**Expected:** List of appointments from seed (8 appointments)

**Check:** [ ] Appointments load [ ] Status badges visible (scheduled/completed/cancelled)

---

### 6.2 Filter Appointments
1. Filter by status: **Completed**

**Expected:** Only completed appointments shown

2. Filter by today's date

**Expected:** Only today's appointments shown (may be 0)

**Check:** [ ] Status filter works [ ] Date filter works

---

### 6.3 Book New Appointment
1. Click **+ New Appointment**
2. Select patient: any from dropdown
3. Select doctor: any from dropdown
4. Set date/time: tomorrow, 10:00 AM
5. Add notes: "Routine checkup"
6. Click **Save**

**Expected:** Appointment appears in list with "Scheduled" status

**Check:** [ ] Form submits [ ] Appointment visible in list

---

### 6.4 Send WhatsApp Reminder *(requires WhatsApp credentials)*
1. Click on a scheduled appointment
2. Click **Send Reminder**

**Expected:** "Reminder sent" confirmation

**Check:** [ ] Button works [ ] Confirmation shown [ ] Message received on WhatsApp (if credentials set)

---

### 6.5 Record Visit + Invoice Prompt (Phase 12 Integration)
1. Find a **Scheduled** appointment
2. Click **Record Visit**
3. Fill in diagnosis and notes
4. Under **Supplies Used**: add 1 item (e.g. Gloves, qty 2)
5. Click **Save Visit**

**Expected:**
- Visit saved
- Prompt appears: "Visit Recorded — create invoice?"

6. Click **Create Invoice**

**Expected:** Invoice form opens pre-filled with patient name and appointment ID

**Check:** [ ] Visit saves [ ] Prompt appears [ ] Invoice form pre-filled [ ] Inventory decremented

---

## Module 7 — HR: Staff

### 7.1 View Staff *(Admin only)*
1. Click **Staff** in sidebar

**Expected:** Staff list from seed data (3 staff)

**Check:** [ ] Staff list loads [ ] Department and role visible

---

### 7.2 Add Staff Profile
1. Click **+ Add Staff**
2. Fill in details: Department: `Cardiology`, designation: `Doctor`, hire date: today
3. Save

**Expected:** New staff entry appears

**Check:** [ ] Form submits [ ] Staff appears in list

---

## Module 8 — HR: Shifts

### 8.1 View Shifts
1. Click **Shifts** in sidebar

**Expected:** Shift roster from seed (5 shifts)

**Check:** [ ] Shifts load [ ] Time and staff name visible

---

### 8.2 Create Shift
1. Click **+ Add Shift**
2. Select staff, set date, start time: 09:00, end time: 17:00
3. Save

**Expected:** Shift appears in roster

**Check:** [ ] Shift created [ ] Visible in list

---

## Module 9 — HR: Leave

### 9.1 View Leave Requests *(Admin)*
1. Click **Leave** in sidebar
2. Check tabs: Pending, Approved, Rejected, All

**Expected:** Seed data shows 3 leave requests: 1 pending, 1 approved, 1 rejected

**Check:** [ ] All tabs work [ ] Correct counts per tab

---

### 9.2 Approve Leave *(Admin)*
1. Find a **Pending** leave request
2. Click **Approve**

**Expected:** Leave moves to Approved tab, status badge changes

**Check:** [ ] Approve works [ ] Status updates [ ] Moves to correct tab

---

### 9.3 Reject Leave *(Admin)*
1. Find another pending leave request
2. Click **Reject**

**Expected:** Moves to Rejected tab

**Check:** [ ] Reject works [ ] Status updates

---

### 9.4 Submit Leave Request *(Staff)*
*(Switch to Staff browser)*
1. Click **My Leave** in sidebar
2. Click **+ Request Leave**
3. Select type: Sick, dates: next week (3 days), reason: "Medical appointment"
4. Click **Submit Request**

**Expected:** Leave request created with Pending status

**Check:** [ ] Form submits [ ] Appears in list with Pending status

---

## Module 10 — HR: Attendance

### 10.1 View Attendance
1. Click **Attendance** in sidebar

**Expected:** Attendance log from seed data

**Check:** [ ] Records load [ ] Date and clock-in/out times visible

---

### 10.2 Log Attendance
1. Click **+ Log Attendance**
2. Select staff, date: today, clock-in: 09:00, clock-out: 17:00
3. Save

**Expected:** New attendance record appears

**Check:** [ ] Record saved [ ] Visible in log

---

## Module 11 — Finance: Billing

### 11.1 View Invoices
1. Click **Billing** in sidebar

**Expected:** Invoice list from seed (3 invoices: 1 paid, 1 sent, 1 draft)

**Check:** [ ] Invoices load [ ] Status badges correct [ ] Amounts visible

---

### 11.2 Filter Invoices
1. Click **Paid** filter tab

**Expected:** Only paid invoices shown

2. Click **Pending** filter

**Expected:** Only unpaid/sent invoices

**Check:** [ ] Filters work correctly

---

### 11.3 Create Invoice
1. Click **+ New Invoice**
2. Select patient from dropdown
3. Add line item: Description: "Consultation", qty: 1, rate: 500
4. Add another: "Blood Test", qty: 1, rate: 300
5. Apply tax: 18%
6. Click **Save**

**Expected:** Invoice created with correct total (800 + 18% = 944), status: Draft

**Check:** [ ] Invoice created [ ] Line items correct [ ] Tax calculated [ ] Total correct

---

### 11.4 Record Offline Payment
1. Find an unpaid invoice
2. Click **Collect Payment**
3. Select **Record Offline** tab
4. Method: Cash, Amount: full amount, Reference: "CASH-001"
5. Click **Record Payment**

**Expected:** Invoice status changes to Paid

**Check:** [ ] Payment recorded [ ] Invoice marked paid [ ] Amount correct

---

### 11.5 Online Payment via Razorpay *(requires Razorpay keys)*
1. Find an unpaid invoice
2. Click **Collect Payment**
3. Select **Pay Online** tab
4. Click **Pay with Razorpay**

**Expected:** Razorpay checkout widget opens with correct amount

**Check:** [ ] Razorpay widget opens [ ] Amount pre-filled [ ] Payment flow completes (use test card)

> Razorpay test card: `4111 1111 1111 1111`, expiry: any future, CVV: any 3 digits

---

## Module 12 — Finance: Expenses

### 12.1 View Expenses
1. Click **Expenses** in sidebar

**Expected:** Expense list from seed (3 expenses)

**Check:** [ ] Expenses load [ ] Category and amount visible

---

### 12.2 Add Expense
1. Click **+ Add Expense**
2. Category: Supplies, Amount: 1500, Description: "Surgical gloves bulk order", Date: today
3. Save

**Expected:** Expense appears in list

**Check:** [ ] Expense saved [ ] Visible in list

---

## Module 13 — Finance: Revenue

### 13.1 Revenue Summary
1. Click **Revenue** in sidebar

**Expected:**
- Total revenue figure
- Outstanding amount
- Chart or summary breakdown

**Check:** [ ] Revenue loads [ ] Numbers match invoices

---

## Module 14 — Inventory: Items

### 14.1 View Items
1. Click **Inventory** in sidebar

**Expected:** 6 inventory items from seed (4 normal, 2 low stock)

**Check:** [ ] Items load [ ] Unit and current stock visible

---

### 14.2 Add Item
1. Click **+ Add Item**
2. Name: `Surgical Mask`, Unit: `box`, Current Stock: `50`, Reorder Threshold: `10`
3. Save

**Expected:** Item appears in list

**Check:** [ ] Item created [ ] Stock level correct

---

### 14.3 Restock Item
1. Find any item
2. Click **Restock** / add transaction
3. Type: Restock, Quantity: 20, Notes: "Monthly restock"
4. Save

**Expected:** Item's current stock increases by 20

**Check:** [ ] Stock updated [ ] Transaction logged

---

## Module 15 — Inventory: Stock Alerts

### 15.1 View Low Stock Alerts
1. Click **Stock Alerts** in sidebar

**Expected:** 2 low stock items from seed (items where current_stock <= reorder_threshold)

**Check:** [ ] Alerts load [ ] Low stock items shown [ ] Threshold visible

---

## Module 16 — Inventory: Assets

### 16.1 View Assets *(Admin only)*
1. Click **Assets** in sidebar

**Expected:** 3 assets from seed (Ultrasound machine, Examination table, ECG machine)

**Check:** [ ] Assets load [ ] Purchase date and value visible

---

### 16.2 Add Asset
1. Click **+ Add Asset**
2. Name: `Dental Chair`, Category: `Equipment`, Purchase date: today, Value: 85000
3. Save

**Expected:** Asset appears in register

**Check:** [ ] Asset saved [ ] Visible in list

---

## Module 17 — Document Vault

### 17.1 Upload Document
1. Click **Documents** in sidebar
2. Drag and drop a PDF file onto the upload zone (or click to browse)

**Expected:**
- Upload progress bar shows
- File appears in document list after upload
- No "row-level security" error

> If you see an RLS error, run the storage policies SQL from the DEVELOPER_GUIDE first.

**Check:** [ ] Upload succeeds [ ] File appears in list [ ] No RLS error

---

### 17.2 Search Documents
1. Type part of the filename in the search bar

**Expected:** Results filter in real time

**Check:** [ ] Search works

---

### 17.3 Download Document
1. Click **Download** on any document

**Expected:** File downloads or opens in new tab

**Check:** [ ] Download works

---

### 17.4 Delete Document
1. Click **Delete** on any document

**Expected:** Document removed from list (soft delete — not permanently destroyed)

**Check:** [ ] Document removed from view

---

## Module 18 — Notifications (WhatsApp)

### 18.1 Send Leave Notification
1. Click **Notifications** in sidebar
2. Select a leave date
3. Enter Admin Phone: `918137871221` (your registered test number)
4. Click **Send WhatsApp Notification**

**Expected:** "Notification sent successfully" green message

**Check:** [ ] Success message shown [ ] WhatsApp message received

---

## Module 19 — Role Access Control

Run these checks to confirm security boundaries:

| Action | Admin | Staff | Expected |
|---|---|---|---|
| Visit `/users` | Allow | Block | Staff → `/unauthorized` |
| Visit `/analytics` | Allow | Block | Staff → `/unauthorized` |
| Visit `/hr/staff` | Allow | Block | Staff → `/unauthorized` |
| Visit `/finance/billing` | Allow | Block | Staff → `/unauthorized` |
| Visit `/inventory/assets` | Allow | Block | Staff → `/unauthorized` |
| Visit `/crm/patients` | Allow | Allow | Both can access |
| Visit `/hr/leave` | Allow | Allow | Both can access |
| Visit `/inventory` | Allow | Allow | Both can access |

**Check:** [ ] All admin-only routes blocked for staff [ ] Shared routes accessible to both

---

## Module 20 — Cross-Module Integrations

### 20.1 Appointment → Invoice flow
1. Book a new appointment
2. Record a visit for it
3. When prompted "Create Invoice?" → click Create Invoice
4. Verify patient and appointment ID are pre-filled in the invoice form

**Check:** [ ] Prompt appears [ ] Invoice form pre-filled correctly

---

### 20.2 Visit → Inventory consume flow
1. Record a visit
2. Add 2 items under Supplies Used (e.g. Gloves qty 3, Syringes qty 2)
3. Save visit
4. Go to Inventory → check the stock levels of those items

**Expected:** Stock decremented by the quantities used

**Check:** [ ] Gloves stock reduced by 3 [ ] Syringes stock reduced by 2

---

### 20.3 Analytics ERP widgets reflect live data
1. Create a new appointment for today
2. Go to Analytics
3. Check "Today's Appointments" widget

**Expected:** Count increased by 1

**Check:** [ ] Widget reflects new appointment

---

## Final Checklist

Before marking the system ready for demo:

- [ ] All modules load without errors
- [ ] Seed data visible in all modules
- [ ] Admin/Staff role boundaries enforced
- [ ] Document upload working (RLS policies applied)
- [ ] WhatsApp notifications working
- [ ] Invoice creation + payment flow working
- [ ] Cross-module integrations working (Appointment→Invoice, Visit→Inventory)
- [ ] No console errors in browser DevTools
- [ ] App works on mobile screen size (resize browser to 390px width)

---

## Common Issues & Fixes

| Error | Cause | Fix |
|---|---|---|
| `401 Unauthorized` on all API calls | JWT not attached or expired | Refresh page; check if session exists in localStorage |
| `new row violates row-level security` | Storage bucket policies missing | Run storage RLS SQL from DEVELOPER_GUIDE |
| `staff_id: Must be a valid UUID` | Leave form not finding staff profile | Check staff profile exists for logged-in user |
| `Could not embed — ambiguous relationship` | FK hint missing in backend query | Add `!fkey_name` hint to Supabase select query |
| WhatsApp `401 Unauthorized` | Token expired (24h limit) | Regenerate token in Meta Developer Console |
| Appointments not loading | Supabase FK ambiguity | Fixed in `crm/views.py` — check backend is restarted |
| Django `502 Bad Gateway` | Multiple Django processes running | Kill all on port 8000, restart once |

---

*Montnexus V1 | Test Guide v1.0 | March 2026*
