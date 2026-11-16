-- =============================================
-- SIGNAL X — Supabase Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- USERS TABLE
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,           -- store plain text or bcrypt hash
  role text not null check (role in ('STUDENT','FACULTY','HOD','STAFF','ADMIN')),
  department text                   -- e.g. IT_SUPPORT, HOSTEL, LIBRARIAN etc.
);

-- COMPLAINTS TABLE
create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  ticket_id text unique not null,
  user_id text not null,            -- username of submitter
  issue_text text not null,
  category text default 'General',
  status text default 'New' check (status in ('New','Under Review','Resolved')),
  created_at timestamptz default now(),
  assigned_role text not null       -- IT_SUPPORT | LAB_INCHARGE | LIBRARIAN | TRANSPORT | HOSTEL | OFFICE | FACULTY
);

-- =============================================
-- SEED DATA — All users (change passwords!)
-- =============================================
insert into users (username, password, role, department) values
  -- Students
  ('student1',   'pass123',  'STUDENT', null),
  ('student2',   'pass123',  'STUDENT', null),
  ('student3',   'pass123',  'STUDENT', null),

  -- Faculty
  ('faculty1',   'pass123',  'FACULTY', 'FACULTY'),
  ('faculty2',   'pass123',  'FACULTY', 'FACULTY'),

  -- HOD (supervisor — sees ALL department complaints)
  ('hod',        'pass123',  'HOD',     null),

  -- Department Staff (each sees only their dept)
  ('it_staff',   'pass123',  'STAFF',   'IT_SUPPORT'),
  ('lab_staff',  'pass123',  'STAFF',   'LAB_INCHARGE'),
  ('lib_staff',  'pass123',  'STAFF',   'LIBRARIAN'),
  ('transport',  'pass123',  'STAFF',   'TRANSPORT'),
  ('hostel',     'pass123',  'STAFF',   'HOSTEL'),
  ('office',     'pass123',  'STAFF',   'OFFICE'),

  -- Principal / Admin (sees everything)
  ('admin',      'admin123', 'ADMIN',   null)
on conflict (username) do nothing;

-- =============================================
-- LOGIN FLOW SUMMARY
-- =============================================
-- STUDENT    → /student   (sees own complaints only)
-- STAFF      → /staff     (sees only their dept complaints, can update status)
-- HOD        → /hod       (sees ALL complaints — read-only copy from all depts)
-- ADMIN      → /admin     (full control — all complaints, all depts)
--
-- When student submits → assigned_role set → staff of that dept sees it
-- HOD and ADMIN always see ALL complaints (acting as supervisor copies)
-- =============================================

-- =============================================
-- ROW LEVEL SECURITY (disable for dev/college)
-- =============================================
-- alter table users enable row level security;
-- alter table complaints enable row level security;
-- create policy "allow all" on users for all using (true) with check (true);
-- create policy "allow all" on complaints for all using (true) with check (true);

-- =============================================
-- EMOTIONAL ESCALATION COLUMNS
-- Run these in Supabase SQL Editor if the table already exists
-- =============================================
alter table complaints add column if not exists emotion_flag text default null;
alter table complaints add column if not exists escalated boolean default false;

-- Index for fast escalation queries
create index if not exists idx_complaints_escalated on complaints(escalated) where escalated = true;

-- =============================================
-- ALL FEATURE ADDITIONS (run in Supabase SQL Editor)
-- =============================================

-- Complaints: new columns
alter table complaints add column if not exists anonymous boolean default false;
alter table complaints add column if not exists attachment_url text;
alter table complaints add column if not exists rating int check (rating >= 1 and rating <= 5);
alter table complaints add column if not exists feedback_text text;
alter table complaints add column if not exists resolution_note text;
alter table complaints add column if not exists deadline timestamptz;
alter table complaints add column if not exists resolved_at timestamptz;

-- Internal comments thread per complaint
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null,
  user_id text not null,
  role text not null,
  message text not null,
  created_at timestamptz default now()
);

-- Announcements (Admin creates, all see)
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  priority text default 'normal' check (priority in ('normal','important','urgent')),
  created_by text not null,
  created_at timestamptz default now()
);

-- Audit log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  ticket_id text,
  details text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_comments_ticket on comments(ticket_id);
create index if not exists idx_announcements_date on announcements(created_at desc);
create index if not exists idx_audit_ticket on audit_log(ticket_id);
