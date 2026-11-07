-- Smartboard cloud foundation
-- Apply once in Supabase SQL Editor. Uses Supabase Auth; never expose service_role keys in the browser.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'student' check (role in ('student','teacher','school_admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  grade text not null default '',
  join_code text not null unique default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.classroom_members (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(classroom_id, student_id)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject text not null default '',
  grade text not null default '',
  introduction text not null default '',
  content text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options)='array' and jsonb_array_length(options)>=2),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Answer keys are deliberately isolated from questions so students cannot read correct answers.
create table if not exists public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_option integer not null check (correct_option between 0 and 9)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  total integer not null default 0,
  submitted_at timestamptz not null default now(),
  unique(lesson_id, student_id)
);

create index if not exists idx_classrooms_teacher on public.classrooms(teacher_id);
create index if not exists idx_members_student on public.classroom_members(student_id);
create index if not exists idx_lessons_classroom on public.lessons(classroom_id);
create index if not exists idx_questions_lesson on public.questions(lesson_id, position);
create index if not exists idx_submissions_lesson on public.submissions(lesson_id);

create or replace function public.is_class_teacher(target_class uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.classrooms c where c.id=target_class and c.teacher_id=auth.uid()) $$;

create or replace function public.is_class_member(target_class uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.classroom_members m where m.classroom_id=target_class and m.student_id=auth.uid()) $$;

create or replace function public.join_class_by_code(code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare found_class uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into found_class from public.classrooms
  where join_code=upper(trim(code)) and is_active=true;
  if found_class is null then raise exception 'Invalid or inactive class code'; end if;
  insert into public.classroom_members(classroom_id,student_id)
  values(found_class,auth.uid()) on conflict do nothing;
  return found_class;
end;
$$;

create or replace function public.submit_lesson_answers(target_lesson uuid, submitted_answers jsonb)
returns table(score integer, total integer)
language plpgsql security definer set search_path = public
as $$
declare q record; selected integer; correct_count integer := 0; question_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(submitted_answers) <> 'array' then raise exception 'Answers must be an array'; end if;
  if not exists (
    select 1 from public.lessons l join public.classroom_members m on m.classroom_id=l.classroom_id
    where l.id=target_lesson and l.is_published=true and m.student_id=auth.uid()
  ) then raise exception 'Lesson unavailable'; end if;

  for q in
    select qu.id, k.correct_option
    from public.questions qu
    join public.question_keys k on k.question_id=qu.id
    where qu.lesson_id=target_lesson
  loop
    question_count := question_count + 1;
    select (a->>'selected_option')::integer into selected
    from jsonb_array_elements(submitted_answers) a
    where a->>'question_id'=q.id::text
    limit 1;
    if selected is not null and selected=q.correct_option then correct_count := correct_count + 1; end if;
  end loop;

  insert into public.submissions(lesson_id,student_id,answers,score,total)
  values(target_lesson,auth.uid(),submitted_answers,correct_count,question_count)
  on conflict(lesson_id,student_id) do update
    set answers=excluded.answers, score=excluded.score, total=excluded.total, submitted_at=now();

  return query select correct_count, question_count;
end;
$$;

alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.submissions enable row level security;

create policy "profiles read self or shared class" on public.profiles for select to authenticated
using (id=auth.uid() or exists (
  select 1 from public.classroom_members mine
  join public.classroom_members theirs on theirs.classroom_id=mine.classroom_id
  where mine.student_id=auth.uid() and theirs.student_id=profiles.id
) or exists(select 1 from public.classrooms c where c.teacher_id=auth.uid() and c.teacher_id=profiles.id));

create policy "profile update self" on public.profiles for update to authenticated
using (id=auth.uid()) with check (id=auth.uid() and role=(select p.role from public.profiles p where p.id=auth.uid()));

create policy "classroom teacher manages" on public.classrooms for all to authenticated
using (teacher_id=auth.uid()) with check (teacher_id=auth.uid());

create policy "members view own memberships or teacher views class" on public.classroom_members for select to authenticated
using (student_id=auth.uid() or public.is_class_teacher(classroom_id));

create policy "students view lessons in joined classes" on public.lessons for select to authenticated
using (public.is_class_teacher(classroom_id) or (is_published=true and public.is_class_member(classroom_id)));

create policy "teachers manage lessons" on public.lessons for all to authenticated
using (teacher_id=auth.uid() and public.is_class_teacher(classroom_id))
with check (teacher_id=auth.uid() and public.is_class_teacher(classroom_id));

create policy "students read published questions" on public.questions for select to authenticated
using (exists(select 1 from public.lessons l where l.id=lesson_id and (public.is_class_teacher(l.classroom_id) or (l.is_published and public.is_class_member(l.classroom_id)))));

create policy "teachers manage questions" on public.questions for all to authenticated
using (exists(select 1 from public.lessons l where l.id=lesson_id and l.teacher_id=auth.uid()))
with check (exists(select 1 from public.lessons l where l.id=lesson_id and l.teacher_id=auth.uid()));

create policy "teachers read answer keys" on public.question_keys for select to authenticated
using (exists(select 1 from public.questions q join public.lessons l on l.id=q.lesson_id where q.id=question_id and l.teacher_id=auth.uid()));

create policy "teachers manage answer keys" on public.question_keys for all to authenticated
using (exists(select 1 from public.questions q join public.lessons l on l.id=q.lesson_id where q.id=question_id and l.teacher_id=auth.uid()))
with check (exists(select 1 from public.questions q join public.lessons l on l.id=q.lesson_id where q.id=question_id and l.teacher_id=auth.uid()));

create policy "students create own submissions" on public.submissions for insert to authenticated
with check (student_id=auth.uid() and exists(select 1 from public.lessons l join public.classroom_members m on m.classroom_id=l.classroom_id where l.id=lesson_id and l.is_published and m.student_id=auth.uid()));

create policy "students and teachers view submissions" on public.submissions for select to authenticated
using (student_id=auth.uid() or exists(select 1 from public.lessons l where l.id=lesson_id and l.teacher_id=auth.uid()));

grant execute on function public.join_class_by_code(text) to authenticated;
grant execute on function public.submit_lesson_answers(uuid,jsonb) to authenticated;
