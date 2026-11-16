# SignalX — React + Supabase

College complaint management system for Nehru Arts & Science College, Coimbatore.

---

## Setup Steps

### 1. Create Supabase Project
- Go to https://supabase.com and create a free project
- In the SQL Editor, paste and run the contents of `supabase_schema.sql`

### 2. Add your Supabase keys
Edit `.env` and replace the placeholders:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
Find these in Supabase → Settings → API

### 3. Install & Run
```bash
npm install
npm run dev
```
App runs at http://localhost:5173

---

## Default Login Credentials (from seed data)

| Role    | Username   | Password  |
|---------|------------|-----------|
| Student | student1   | pass123   |
| Faculty | faculty1   | pass123   |
| HOD     | hod        | pass123   |
| IT Dept | itsupport  | pass123   |
| Hostel  | hostel     | pass123   |
| Admin   | admin      | admin123  |

---

## Pages

| URL                | Role             |
|--------------------|------------------|
| `/`                | Login (all)      |
| `/change-password` | Any              |
| `/student`         | Student          |
| `/departments`     | Student          |
| `/faculty`         | Faculty/HOD/Staff|
| `/admin`           | Admin/Principal  |

---

## Features
- Role-based login (Student / Faculty / Admin)
- Auto-detect department from complaint keywords
- Submit complaints with manual or auto department selection
- Faculty/HOD see only their department's complaints
- Admin sees all complaints with search + department filter
- Status update: New → Under Review → Resolved
- Change password
