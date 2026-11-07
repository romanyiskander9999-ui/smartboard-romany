-- Security correction: profile roles are managed only by a trusted administrator,
-- and students submit answers only through the server-side scoring RPC.
drop policy if exists "profile update self" on public.profiles;
drop policy if exists "students create own submissions" on public.submissions;
