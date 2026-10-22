-- Execute once in the Supabase SQL Editor, on a new project.
-- This transaction creates one shared CAVC board, restricted to approved members.
begin;

create table public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.team_members enable row level security;
revoke all on public.team_members from anon, authenticated;
grant select on public.team_members to authenticated;
create policy "Members can verify their own membership"
  on public.team_members for select to authenticated
  using (user_id = (select auth.uid()));
-- No INSERT/UPDATE/DELETE policy: membership is managed only from the dashboard/SQL Editor.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  area text not null check (area in ('Academica','Mobilização','Eventos','APSM','Gestão')),
  idea text not null check (length(trim(idea)) > 0),
  intent text not null check (length(trim(intent)) > 0),
  due_date date not null,
  format text not null check (format in ('Feed','Carrossel','Story','Reels')),
  use_template boolean not null default false,
  template_name text not null default '' check (char_length(template_name) <= 200),
  owner text not null default '',
  canva_url text not null default '' check (
    canva_url = '' or canva_url ~* '^https://([a-z0-9-]+\.)*canva\.com(/[^[:space:]]*)?$'
  ),
  status smallint not null default 0 check (status between 0 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not use_template or length(trim(template_name)) > 0),
  check (status = 0 or length(trim(owner)) > 0)
);
create index posts_due_date_idx on public.posts(due_date);
alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select, delete on public.posts to authenticated;
grant insert (id,title,area,idea,intent,due_date,format,use_template,template_name,owner,canva_url,status) on public.posts to authenticated;
grant update (title,area,idea,intent,due_date,format,use_template,template_name,owner,canva_url,status) on public.posts to authenticated;

create policy "Team can read posts" on public.posts for select to authenticated
using (exists (select 1 from public.team_members where user_id = (select auth.uid())));
create policy "Team can create posts" on public.posts for insert to authenticated
with check (exists (select 1 from public.team_members where user_id = (select auth.uid())));
create policy "Team can update posts" on public.posts for update to authenticated
using (exists (select 1 from public.team_members where user_id = (select auth.uid())))
with check (exists (select 1 from public.team_members where user_id = (select auth.uid())));
create policy "Team can delete posts" on public.posts for delete to authenticated
using (exists (select 1 from public.team_members where user_id = (select auth.uid())));

create function public.set_post_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
create trigger set_post_updated_at before update on public.posts
for each row execute function public.set_post_updated_at();

commit;
