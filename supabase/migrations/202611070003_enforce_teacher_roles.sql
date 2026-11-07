-- Enforce teacher/admin roles for classroom authoring.
create or replace function public.has_teacher_role()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('teacher','school_admin')) $$;

drop policy if exists "classroom teacher manages" on public.classrooms;
create policy "classroom teacher manages" on public.classrooms for all to authenticated
using (teacher_id=auth.uid() and public.has_teacher_role())
with check (teacher_id=auth.uid() and public.has_teacher_role());

drop policy if exists "teachers manage lessons" on public.lessons;
create policy "teachers manage lessons" on public.lessons for all to authenticated
using (teacher_id=auth.uid() and public.has_teacher_role() and public.is_class_teacher(classroom_id))
with check (teacher_id=auth.uid() and public.has_teacher_role() and public.is_class_teacher(classroom_id));

drop policy if exists "teachers manage questions" on public.questions;
create policy "teachers manage questions" on public.questions for all to authenticated
using (public.has_teacher_role() and exists(select 1 from public.lessons l where l.id=lesson_id and l.teacher_id=auth.uid()))
with check (public.has_teacher_role() and exists(select 1 from public.lessons l where l.id=lesson_id and l.teacher_id=auth.uid()));

drop policy if exists "teachers manage answer keys" on public.question_keys;
create policy "teachers manage answer keys" on public.question_keys for all to authenticated
using (public.has_teacher_role() and exists(select 1 from public.questions q join public.lessons l on l.id=q.lesson_id where q.id=question_id and l.teacher_id=auth.uid()))
with check (public.has_teacher_role() and exists(select 1 from public.questions q join public.lessons l on l.id=q.lesson_id where q.id=question_id and l.teacher_id=auth.uid()));
