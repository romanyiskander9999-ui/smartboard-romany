-- Shared classroom roster and daily attendance for Smartboard.
-- Apply in the Supabase SQL Editor after the existing classrooms table exists.
create table if not exists public.classroom_roster (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_name text not null check (length(trim(student_name)) between 1 and 160),
  grade text not null default '',
  section text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_roster_class_student_unique unique (classroom_id, student_name),
  constraint classroom_roster_id_class_unique unique (id, classroom_id)
);

create table if not exists public.classroom_attendance (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  roster_id uuid not null,
  attendance_date date not null,
  status text not null check (status in ('present','absent','late','excused')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_attendance_roster_class_fk
    foreign key (roster_id, classroom_id)
    references public.classroom_roster(id, classroom_id) on delete cascade,
  constraint classroom_attendance_once_per_day unique (roster_id, attendance_date)
);

create index if not exists classroom_roster_class_active_idx
  on public.classroom_roster(classroom_id, active, student_name);
create index if not exists classroom_attendance_class_date_idx
  on public.classroom_attendance(classroom_id, attendance_date desc);

alter table public.classroom_roster enable row level security;
alter table public.classroom_attendance enable row level security;

drop policy if exists "Teachers manage their classroom roster" on public.classroom_roster;
create policy "Teachers manage their classroom roster"
on public.classroom_roster for all to authenticated
using (exists (
  select 1 from public.classrooms c
  where c.id = classroom_roster.classroom_id and c.teacher_id = auth.uid()
))
with check (exists (
  select 1 from public.classrooms c
  where c.id = classroom_roster.classroom_id and c.teacher_id = auth.uid()
));

drop policy if exists "Teachers manage their classroom attendance" on public.classroom_attendance;
create policy "Teachers manage their classroom attendance"
on public.classroom_attendance for all to authenticated
using (exists (
  select 1 from public.classrooms c
  where c.id = classroom_attendance.classroom_id and c.teacher_id = auth.uid()
))
with check (exists (
  select 1 from public.classrooms c
  where c.id = classroom_attendance.classroom_id and c.teacher_id = auth.uid()
));
