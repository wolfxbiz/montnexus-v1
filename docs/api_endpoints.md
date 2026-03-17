# Montnexus V1 — Django API Contracts

All endpoints require `Authorization: Bearer <supabase_jwt>` unless marked PUBLIC.

---

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/verify/` | Returns decoded JWT payload (health-check for auth) |

---

## Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/` | List all profiles (admin only) |
| POST | `/api/users/invite/` | Invite a new user via Supabase Admin API (admin only) |

### POST `/api/users/invite/`
```json
// Request
{ "email": "user@example.com", "full_name": "Jane Doe", "role": "staff", "department": "Clinic" }

// Response 201
{ "message": "Invitation sent to user@example.com" }
```

---

## Storage

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/storage/files/` | List all non-deleted documents |
| POST | `/api/storage/files/` | Save file metadata (after frontend uploads binary to Supabase Storage) |
| DELETE | `/api/storage/files/<id>/` | Soft-delete a document |

### POST `/api/storage/files/`
```json
// Request
{ "file_name": "contract.pdf", "file_path": "documents/uuid/contract.pdf", "file_size": 204800, "mime_type": "application/pdf", "category": "Contract", "tags": ["legal"] }

// Response 201 — the created document row
```

---

## Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/summary/` | Aggregate stats (admin only) |
| GET | `/api/analytics/activity/` | Daily action counts for last 30 days |

### GET `/api/analytics/summary/`
```json
// Response 200
{ "total_users": 12, "active_staff": 9, "total_documents": 34, "weekly_actions": 47 }
```

### GET `/api/analytics/activity/`
```json
// Response 200
[
  { "date": "2026-03-01", "actions": 12 },
  { "date": "2026-03-02", "actions": 7 }
]
```

---

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notifications/notify/leave/` | Send WhatsApp leave notification to admin |
| GET | `/api/notifications/webhook/whatsapp/` | WhatsApp webhook verification (PUBLIC) |
| POST | `/api/notifications/webhook/whatsapp/` | Incoming WhatsApp message handler (PUBLIC) |

### POST `/api/notifications/notify/leave/`
```json
// Request
{ "staff_id": "uuid", "leave_date": "2026-03-20", "admin_phone": "1234567890" }

// Response 200
{ "message": "Notification sent" }
```
