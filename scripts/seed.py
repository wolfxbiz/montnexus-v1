"""
Montnexus V1 -- Mock Data Seed Script
Run from the project root:  python scripts/seed.py

Creates:
  - 2 doctor users + 1 staff/nurse user (Supabase Auth)
  - 5 patients
  - 8 appointments (today + future, mixed statuses)
  - 2 visit records
  - 3 staff profiles + shifts + leave requests + attendance
  - 3 invoices with line items + 1 payment
  - 3 expenses
  - 6 inventory items + stock transactions (2 low-stock)
  - 3 assets
"""

import os, sys, uuid
from datetime import date, timedelta, datetime
from dotenv import load_dotenv

# -- Load env -----------------------------------------------
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# -- Helpers ------------------------------------------------
def ok(label, data):
    print(f"  [OK] {label}")
    return data

def fail(label, err):
    print(f"  [ERR] {label}: {err}")
    sys.exit(1)

def today(offset=0):
    return str(date.today() + timedelta(days=offset))

def insert(table, row):
    r = sb.table(table).insert(row).execute()
    if not r.data:
        fail(f"INSERT {table}", "no data returned")
    return r.data[0]

def upsert(table, row, on_conflict=None):
    kwargs = {}
    if on_conflict:
        kwargs['on_conflict'] = on_conflict
    r = sb.table(table).upsert(row, **kwargs).execute()
    if not r.data:
        fail(f"UPSERT {table}", "no data returned")
    return r.data[0]

# -- 1. Get existing admin profile --------------------------
print("\n[1] Fetching admin profile?")
res = sb.table('profiles').select('id, full_name').eq('role', 'admin').limit(1).execute()
if not res.data:
    fail("profiles", "No admin profile found. Set up your admin user first via /login.")
admin = res.data[0]
ADMIN_ID = admin['id']
ok(f"Admin: {admin['full_name']} ({ADMIN_ID})", None)

# -- 2. Create auth users for doctors + nurse ---------------
print("\n[2] Creating test auth users?")

SEED_USERS = [
    {"email": "dr.sharma@montnexus.test",  "full_name": "Dr. Priya Sharma",  "role": "staff"},
    {"email": "dr.mehta@montnexus.test",   "full_name": "Dr. Arjun Mehta",   "role": "staff"},
    {"email": "nurse.anita@montnexus.test","full_name": "Anita Thomas",       "role": "staff"},
]

profile_ids = {}  # email -> UUID
for u in SEED_USERS:
    # Check if already exists
    existing = sb.table('profiles').select('id').ilike('full_name', u['full_name']).limit(1).execute()
    if existing.data:
        profile_ids[u['email']] = existing.data[0]['id']
        ok(f"Already exists: {u['full_name']}", None)
        continue

    try:
        created = sb.auth.admin.create_user({
            "email": u['email'],
            "password": "Montnexus@123",
            "email_confirm": True,
            "user_metadata": {"full_name": u['full_name'], "role": u['role']},
        })
        uid = created.user.id
    except Exception as e:
        # May already exist in auth but not profiles -- try to find by email
        print(f"  ! Auth create failed for {u['email']}: {e}")
        # Fall back: generate a UUID and manually insert profile
        # (works if FK constraint allows it -- it won't, so we skip gracefully)
        print(f"    -> Skipping {u['full_name']}")
        continue

    # Update profile (trigger creates it, but may not have role yet)
    sb.table('profiles').upsert({
        'id': uid,
        'full_name': u['full_name'],
        'role': u['role'],
        'is_active': True,
    }).execute()

    profile_ids[u['email']] = uid
    ok(f"Created: {u['full_name']} ({uid})", None)

# Build doctor IDs list (use admin as fallback doctor)
doctor_ids = list(profile_ids.values()) or [ADMIN_ID]
DR1 = doctor_ids[0] if len(doctor_ids) > 0 else ADMIN_ID
DR2 = doctor_ids[1] if len(doctor_ids) > 1 else ADMIN_ID
NURSE_ID = doctor_ids[2] if len(doctor_ids) > 2 else ADMIN_ID

# -- Preflight: verify ERP tables exist --------------------
print("\n[preflight] Checking ERP tables exist...")
REQUIRED_TABLES = ['patients', 'appointments', 'visit_records', 'staff_profiles',
                   'shifts', 'leave_requests', 'attendance', 'invoices',
                   'invoice_items', 'payments', 'expenses', 'inventory_items',
                   'stock_transactions', 'assets']
missing = []
for t in REQUIRED_TABLES:
    try:
        sb.table(t).select('id').limit(0).execute()
    except Exception:
        missing.append(t)

if missing:
    print(f"\n  [ERR] Missing tables: {', '.join(missing)}")
    print("\n  You need to run the ERP schema SQL in Supabase first:")
    print("  1. Go to Supabase Dashboard -> SQL Editor")
    print("  2. Run the contents of: docs/supabase_erp_schema.sql")
    print("  3. Then re-run this seed script")
    sys.exit(1)

print("  [OK] All ERP tables found")

# -- 3. Patients --------------------------------------------
print("\n[3] Creating patients?")

PATIENTS_DATA = [
    {"full_name": "Ravi Kumar",       "date_of_birth": "1985-03-12", "gender": "male",   "phone": "9876543210", "blood_group": "O+", "assigned_doctor_id": DR1},
    {"full_name": "Sunita Patel",     "date_of_birth": "1990-07-22", "gender": "female", "phone": "9812345678", "blood_group": "A+", "assigned_doctor_id": DR1},
    {"full_name": "Mohammed Farhan",  "date_of_birth": "1978-11-05", "gender": "male",   "phone": "9988776655", "blood_group": "B+", "assigned_doctor_id": DR2},
    {"full_name": "Kavitha Nair",     "date_of_birth": "2001-01-30", "gender": "female", "phone": "9123456780", "blood_group": "AB-","assigned_doctor_id": DR2},
    {"full_name": "Suresh Iyer",      "date_of_birth": "1965-09-14", "gender": "male",   "phone": "9009876543", "blood_group": "O-", "assigned_doctor_id": DR1},
]

patient_ids = []
for p in PATIENTS_DATA:
    existing = sb.table('patients').select('id').eq('phone', p['phone']).limit(1).execute()
    if existing.data:
        patient_ids.append(existing.data[0]['id'])
        ok(f"Already exists: {p['full_name']}", None)
    else:
        row = insert('patients', p)
        patient_ids.append(row['id'])
        ok(f"Patient: {p['full_name']}", None)

P1, P2, P3, P4, P5 = patient_ids

# -- 4. Appointments ----------------------------------------
print("\n[4] Creating appointments?")

APPOINTMENTS_DATA = [
    # Today
    {"patient_id": P1, "doctor_id": DR1, "booked_by": ADMIN_ID, "appointment_date": today(0),  "appointment_time": "09:00:00", "status": "confirmed",  "type": "consultation", "reason": "Annual checkup"},
    {"patient_id": P2, "doctor_id": DR1, "booked_by": ADMIN_ID, "appointment_date": today(0),  "appointment_time": "10:30:00", "status": "scheduled",  "type": "follow_up",    "reason": "BP follow-up"},
    {"patient_id": P3, "doctor_id": DR2, "booked_by": ADMIN_ID, "appointment_date": today(0),  "appointment_time": "11:00:00", "status": "completed",  "type": "consultation", "reason": "Diabetes review"},
    # Future
    {"patient_id": P4, "doctor_id": DR2, "booked_by": ADMIN_ID, "appointment_date": today(2),  "appointment_time": "14:00:00", "status": "scheduled",  "type": "procedure",    "reason": "Blood draw"},
    {"patient_id": P5, "doctor_id": DR1, "booked_by": ADMIN_ID, "appointment_date": today(3),  "appointment_time": "09:30:00", "status": "confirmed",  "type": "consultation", "reason": "General checkup"},
    # Past
    {"patient_id": P1, "doctor_id": DR1, "booked_by": ADMIN_ID, "appointment_date": today(-7), "appointment_time": "10:00:00", "status": "completed",  "type": "follow_up",    "reason": "Post-surgery review"},
    {"patient_id": P2, "doctor_id": DR2, "booked_by": ADMIN_ID, "appointment_date": today(-3), "appointment_time": "15:00:00", "status": "cancelled",  "type": "consultation", "reason": "Skin allergy"},
    {"patient_id": P3, "doctor_id": DR1, "booked_by": ADMIN_ID, "appointment_date": today(-1), "appointment_time": "11:30:00", "status": "no_show",    "type": "consultation", "reason": "Headache"},
]

appt_ids = []
for a in APPOINTMENTS_DATA:
    row = insert('appointments', a)
    appt_ids.append(row['id'])
    ok(f"Appt: {a['appointment_date']} {a['appointment_time'][:5]} -- {a['status']}", None)

# -- 5. Visit records (for completed appointments) ----------
print("\n[5] Creating visit records?")

VISITS = [
    {"appointment_id": appt_ids[2], "patient_id": P3, "doctor_id": DR2,
     "diagnosis": "Type 2 Diabetes -- HbA1c 7.2%, well controlled",
     "prescription": "Metformin 500mg twice daily. Continue current diet plan.",
     "follow_up_date": today(90)},
    {"appointment_id": appt_ids[5], "patient_id": P1, "doctor_id": DR1,
     "diagnosis": "Post-operative recovery normal. Wound healing well.",
     "prescription": "Amoxicillin 250mg for 5 days. Paracetamol for pain.",
     "follow_up_date": today(30)},
]

for v in VISITS:
    insert('visit_records', v)
    ok(f"Visit record for patient {v['patient_id'][:8]}?", None)

# -- 6. Staff profiles --------------------------------------
print("\n[6] Creating staff profiles?")

STAFF_DATA = [
    {"profile_id": DR1,    "employee_id": "EMP001", "designation": "Senior Physician",  "department": "General Medicine", "joining_date": "2020-01-15", "salary": 120000, "annual_leave_quota": 21, "sick_leave_quota": 10},
    {"profile_id": DR2,    "employee_id": "EMP002", "designation": "Physician",          "department": "Internal Medicine", "joining_date": "2021-06-01", "salary": 100000, "annual_leave_quota": 21, "sick_leave_quota": 10},
    {"profile_id": NURSE_ID,"employee_id": "EMP003", "designation": "Senior Nurse",      "department": "Nursing",           "joining_date": "2019-03-10", "salary": 45000,  "annual_leave_quota": 14, "sick_leave_quota": 7},
]

staff_ids = []
for s in STAFF_DATA:
    existing = sb.table('staff_profiles').select('id').eq('profile_id', s['profile_id']).limit(1).execute()
    if existing.data:
        staff_ids.append(existing.data[0]['id'])
        ok(f"Staff profile already exists for {s['employee_id']}", None)
    else:
        row = insert('staff_profiles', s)
        staff_ids.append(row['id'])
        ok(f"Staff profile: {s['employee_id']} -- {s['designation']}", None)

S1, S2, S3 = staff_ids

# -- 7. Shifts ----------------------------------------------
print("\n[7] Creating shifts?")

SHIFTS = [
    {"staff_id": S1, "shift_date": today(0), "start_time": "08:00", "end_time": "16:00", "shift_type": "regular",  "created_by": ADMIN_ID},
    {"staff_id": S2, "shift_date": today(0), "start_time": "12:00", "end_time": "20:00", "shift_type": "regular",  "created_by": ADMIN_ID},
    {"staff_id": S3, "shift_date": today(0), "start_time": "06:00", "end_time": "14:00", "shift_type": "regular",  "created_by": ADMIN_ID},
    {"staff_id": S1, "shift_date": today(1), "start_time": "08:00", "end_time": "16:00", "shift_type": "regular",  "created_by": ADMIN_ID},
    {"staff_id": S2, "shift_date": today(2), "start_time": "20:00", "end_time": "08:00", "shift_type": "on_call",  "created_by": ADMIN_ID},
]

for sh in SHIFTS:
    try:
        insert('shifts', sh)
        ok(f"Shift: {sh['shift_date']} {sh['start_time']}?{sh['end_time']} ({sh['shift_type']})", None)
    except Exception as e:
        print(f"  ! Shift insert: {e}")

# -- 8. Leave requests --------------------------------------
print("\n[8] Creating leave requests?")

LEAVES = [
    {"staff_id": S3, "leave_type": "annual",    "start_date": today(10), "end_date": today(12), "reason": "Family event", "status": "pending"},
    {"staff_id": S2, "leave_type": "sick",       "start_date": today(5),  "end_date": today(5),  "reason": "Fever",        "status": "pending"},
    {"staff_id": S1, "leave_type": "annual",     "start_date": today(-5), "end_date": today(-3), "reason": "Vacation",     "status": "approved", "reviewed_by": ADMIN_ID},
]

for lv in LEAVES:
    try:
        insert('leave_requests', lv)
        ok(f"Leave: {lv['leave_type']} {lv['start_date']} -- {lv['status']}", None)
    except Exception as e:
        print(f"  ! Leave insert: {e}")

# -- 9. Attendance ------------------------------------------
print("\n[9] Creating attendance records?")

ATTENDANCE = [
    {"staff_id": S1, "date": today(-2), "check_in": f"{today(-2)}T08:05:00Z", "check_out": f"{today(-2)}T16:10:00Z", "status": "present"},
    {"staff_id": S2, "date": today(-2), "check_in": f"{today(-2)}T12:15:00Z", "check_out": f"{today(-2)}T20:00:00Z", "status": "late"},
    {"staff_id": S3, "date": today(-2), "check_in": f"{today(-2)}T06:00:00Z", "check_out": f"{today(-2)}T14:05:00Z", "status": "present"},
    {"staff_id": S1, "date": today(-1), "check_in": f"{today(-1)}T07:55:00Z", "check_out": f"{today(-1)}T16:00:00Z", "status": "present"},
    {"staff_id": S2, "date": today(-1), "status": "absent"},
    {"staff_id": S3, "date": today(-1), "check_in": f"{today(-1)}T06:00:00Z", "check_out": f"{today(-1)}T14:00:00Z", "status": "present"},
]

for att in ATTENDANCE:
    try:
        upsert('attendance', att, on_conflict='staff_id,date')
        ok(f"Attendance: {att['date']} S{ATTENDANCE.index(att)+1} -- {att['status']}", None)
    except Exception as e:
        print(f"  ! Attendance: {e}")

# -- 10. Invoices -------------------------------------------
print("\n[10] Creating invoices?")

def next_invoice_number():
    r = sb.rpc('generate_invoice_number', {}).execute()
    return r.data

INV_DATA = [
    {"patient_id": P3, "appointment_id": appt_ids[2], "issue_date": today(-7), "due_date": today(7),
     "subtotal": 1500, "tax_percent": 18, "discount_amount": 0, "payment_method": "upi",
     "payment_status": "paid", "issued_by": ADMIN_ID,
     "items": [{"description": "Consultation Fee", "quantity": 1, "unit_price": 1000},
               {"description": "HbA1c Test",        "quantity": 1, "unit_price": 500}]},
    {"patient_id": P1, "appointment_id": appt_ids[5], "issue_date": today(-7), "due_date": today(0),
     "subtotal": 3500, "tax_percent": 18, "discount_amount": 200, "payment_method": "cash",
     "payment_status": "partial", "issued_by": ADMIN_ID,
     "items": [{"description": "Post-Op Consultation", "quantity": 1, "unit_price": 1500},
               {"description": "Dressing Change",       "quantity": 4, "unit_price": 500}]},
    {"patient_id": P2, "issue_date": today(-2), "due_date": today(15),
     "subtotal": 800, "tax_percent": 0, "discount_amount": 0, "payment_method": "card",
     "payment_status": "pending", "issued_by": ADMIN_ID,
     "items": [{"description": "Consultation Fee", "quantity": 1, "unit_price": 800}]},
]

invoice_ids = []
for inv in INV_DATA:
    items = inv.pop('items')
    inv_num = next_invoice_number()
    tax_amt = inv['subtotal'] * inv['tax_percent'] / 100
    total = inv['subtotal'] + tax_amt - inv['discount_amount']
    row = insert('invoices', {**inv, "invoice_number": inv_num, "total_amount": round(total, 2)})
    invoice_ids.append(row['id'])
    ok(f"Invoice {inv_num} -- {inv['payment_status']} -- ?{total}", None)

    for item in items:
        insert('invoice_items', {"invoice_id": row['id'], **item})

# -- 11. Payment for the paid invoice ----------------------
print("\n[11] Creating payments?")

insert('payments', {
    "invoice_id": invoice_ids[0],
    "amount_paid": 1770,  # 1500 + 18% tax
    "payment_method": "upi",
    "reference_number": "UPI123456789",
    "recorded_by": ADMIN_ID,
    "notes": "Full payment received"
})
ok("Payment: ?1770 for INV-paid (upi)", None)

insert('payments', {
    "invoice_id": invoice_ids[1],
    "amount_paid": 2000,
    "payment_method": "cash",
    "reference_number": None,
    "recorded_by": ADMIN_ID,
    "notes": "Partial payment"
})
ok("Payment: ?2000 for INV-partial (cash)", None)

# -- 12. Expenses -------------------------------------------
print("\n[12] Creating expenses?")

EXPENSES = [
    {"category": "Medical Supplies",  "description": "Surgical gloves -- 10 boxes",  "amount": 4500,  "expense_date": today(-10), "paid_to": "MedSupply Co.",      "recorded_by": ADMIN_ID},
    {"category": "Utilities",         "description": "Electricity bill -- March",     "amount": 12000, "expense_date": today(-5),  "paid_to": "State Electricity",  "recorded_by": ADMIN_ID},
    {"category": "Equipment Repair",  "description": "ECG machine calibration",      "amount": 3500,  "expense_date": today(-2),  "paid_to": "BioMed Services",    "recorded_by": ADMIN_ID},
]

for ex in EXPENSES:
    insert('expenses', ex)
    ok(f"Expense: {ex['category']} -- ?{ex['amount']}", None)

# -- 13. Inventory items ------------------------------------
print("\n[13] Creating inventory items?")

INV_ITEMS = [
    {"name": "Surgical Gloves (L)",  "category": "PPE",           "sku": "SKU-001", "unit": "box",    "current_stock": 25, "minimum_stock": 20, "unit_cost": 450,  "supplier_name": "MedSupply Co."},
    {"name": "Paracetamol 500mg",    "category": "Medication",    "sku": "SKU-002", "unit": "strips", "current_stock": 8,  "minimum_stock": 50, "unit_cost": 12,   "supplier_name": "PharmaLink",    "expiry_date": today(180)},
    {"name": "Amoxicillin 250mg",    "category": "Medication",    "sku": "SKU-003", "unit": "strips", "current_stock": 3,  "minimum_stock": 30, "unit_cost": 25,   "supplier_name": "PharmaLink",    "expiry_date": today(90)},
    {"name": "Disposable Syringes",  "category": "Consumables",   "sku": "SKU-004", "unit": "pcs",    "current_stock": 200,"minimum_stock": 100,"unit_cost": 5,    "supplier_name": "MedSupply Co."},
    {"name": "Bandage Roll",         "category": "Consumables",   "sku": "SKU-005", "unit": "rolls",  "current_stock": 60, "minimum_stock": 30, "unit_cost": 35,   "supplier_name": "MedSupply Co."},
    {"name": "Hand Sanitizer 500ml", "category": "Hygiene",       "sku": "SKU-006", "unit": "bottles","current_stock": 15, "minimum_stock": 10, "unit_cost": 180,  "supplier_name": "CleanCare Ltd."},
]

item_ids = []
for item in INV_ITEMS:
    existing = sb.table('inventory_items').select('id').eq('sku', item['sku']).limit(1).execute()
    if existing.data:
        item_ids.append(existing.data[0]['id'])
        ok(f"Already exists: {item['name']}", None)
    else:
        # Insert with current_stock=0 first, then restock via transaction (triggers stock update)
        init_stock = item.pop('current_stock')
        row = insert('inventory_items', {**item, 'current_stock': 0})
        item_ids.append(row['id'])

        # Restock transaction -- DB trigger updates current_stock
        insert('stock_transactions', {
            "item_id": row['id'],
            "transaction_type": "restock",
            "quantity": init_stock,
            "previous_stock": 0,
            "new_stock": init_stock,
            "notes": "Initial stock (seed data)",
            "performed_by": ADMIN_ID,
        })
        ok(f"Inventory: {item['name']} -- stock: {init_stock}", None)

# -- 14. Assets ---------------------------------------------
print("\n[14] Creating assets?")

ASSETS = [
    {"name": "ECG Machine",      "category": "Medical Equipment", "asset_tag": "AST-001", "serial_number": "ECG-2021-00X",
     "purchase_date": "2021-03-10", "purchase_cost": 95000, "assigned_to": DR1,
     "location": "Examination Room 1", "status": "active",    "warranty_expiry": today(365)},
    {"name": "Ultrasound Unit",  "category": "Medical Equipment", "asset_tag": "AST-002", "serial_number": "USG-2020-007",
     "purchase_date": "2020-07-15", "purchase_cost": 180000, "assigned_to": DR2,
     "location": "Radiology", "status": "under_maintenance",  "warranty_expiry": today(-30)},
    {"name": "Reception Laptop", "category": "IT Equipment",      "asset_tag": "AST-003", "serial_number": "DELL-5480-SN9",
     "purchase_date": "2022-01-01", "purchase_cost": 55000, "assigned_to": ADMIN_ID,
     "location": "Reception", "status": "active",             "warranty_expiry": today(730)},
]

for asset in ASSETS:
    existing = sb.table('assets').select('id').eq('asset_tag', asset['asset_tag']).limit(1).execute()
    if existing.data:
        ok(f"Already exists: {asset['name']}", None)
    else:
        insert('assets', asset)
        ok(f"Asset: {asset['name']} -- {asset['status']}", None)

# -- Done ---------------------------------------------------
print("\n-------------------------------------------")
print("  Seed complete!\n")
print("  Test credentials:")
print("    Admin:   your existing login")
print("    Doctor:  dr.sharma@montnexus.test  / Montnexus@123")
print("    Doctor:  dr.mehta@montnexus.test   / Montnexus@123")
print("    Staff:   nurse.anita@montnexus.test / Montnexus@123")
print("\n  What was seeded:")
print("    - 5 patients")
print("    - 8 appointments (today + past + future)")
print("    - 2 visit records")
print("    - 3 staff profiles + shifts + leave + attendance")
print("    - 3 invoices + payments")
print("    - 3 expenses")
print("    - 6 inventory items (2 low stock -> alerts!)")
print("    - 3 assets (1 under maintenance, 1 expired warranty)")
print("-------------------------------------------\n")
