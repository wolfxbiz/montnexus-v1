# All CRM tables live in Supabase (public.patients, public.appointments, public.visit_records).
# Django does not define ORM models for these — all reads/writes go via the Supabase client.
# Schema is in docs/supabase_erp_schema.sql
