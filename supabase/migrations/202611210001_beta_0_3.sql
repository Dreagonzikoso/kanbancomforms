-- Apply after supabase/schema.sql. Existing post values and timestamps are preserved.
begin;

create type public.team_role as enum ('secretario', 'diretoria', 'bixo');
alter table public.team_members
  add column username text,
  add column requested_role public.team_role,
  add column effective_role public.team_role;
create unique index team_members_username_key on public.team_members (username);

update public.team_members set effective_role = 'bixo';
insert into public.team_members (user_id)
select id from auth.users on conflict do nothing;

-- Signup metadata can request a role. Only server-side approval sets effective_role.
create function public.register_team_member() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  handle text := lower(trim(new.raw_user_meta_data->>'username'));
  requested text := new.raw_user_meta_data->>'requested_role';
begin
  if handle ~ '^[a-z0-9][a-z0-9._-]{2,39}$'
     and requested in ('secretario', 'diretoria', 'bixo')
     and new.email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     and new.email !~* '\.(invalid|test|example|localhost)$' then
    insert into public.team_members (user_id, username, requested_role)
    values (new.id, handle, requested::public.team_role);
  end if;
  return new;
end;
$$;
revoke all on function public.register_team_member() from public, anon, authenticated;
create trigger register_team_member after insert on auth.users
for each row execute function public.register_team_member();

create function public.my_team_role() returns public.team_role
language sql stable set search_path = '' as $$
  select effective_role from public.team_members where user_id = auth.uid();
$$;

create function public.team_directory()
returns table (user_id uuid, username text, email text, requested_role public.team_role, effective_role public.team_role)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(m.username, split_part(u.email, '@', 1), 'Membro'),
    case when m.effective_role is null then u.email end, m.requested_role, m.effective_role
  from public.team_members m join auth.users u on u.id = m.user_id
  where (select public.my_team_role()) is not null
    and ((m.effective_role = 'bixo' and u.email_confirmed_at is not null)
      or ((select public.my_team_role()) = 'secretario'
        and m.effective_role is null and u.email_confirmed_at is not null))
  order by 2;
$$;

create function public.approve_team_member(member_id uuid, approved_role public.team_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.my_team_role() is distinct from 'secretario'::public.team_role or approved_role is null then
    raise exception 'Approval denied' using errcode = '42501';
  end if;
  update public.team_members m set effective_role = approved_role
  where m.user_id = member_id and m.effective_role is null
    and exists (select 1 from auth.users u where u.id = m.user_id and u.email_confirmed_at is not null);
  if not found then
    raise exception 'No confirmed pending member' using errcode = 'PT409';
  end if;
end;
$$;

alter table public.posts
  add column created_by uuid,
  add column assigned_to uuid,
  add column assignment_state text,
  add constraint valid_assignment check (
    (assigned_to is null and assignment_state is null)
    or (assigned_to is not null and assignment_state is not null and assignment_state in ('pending', 'accepted'))
  );
alter table public.posts alter column created_by set default auth.uid();
-- Keep attribution and display names even when an account is removed.

drop policy "Team can read posts" on public.posts;
drop policy "Team can create posts" on public.posts;
drop policy "Team can update posts" on public.posts;
drop policy "Team can delete posts" on public.posts;
revoke insert (id,title,area,idea,intent,due_date,format,use_template,template_name,owner,canva_url,status),
  update (title,area,idea,intent,due_date,format,use_template,template_name,owner,canva_url,status)
  on public.posts from authenticated;
grant insert (id,title,area,idea,intent,due_date,format,use_template,template_name,canva_url),
  update (title,area,idea,intent,due_date,format,use_template,template_name,canva_url,status)
  on public.posts to authenticated;

create policy "Approved team reads board" on public.posts for select to authenticated
using ((select public.my_team_role()) is not null);
create policy "Management creates requests" on public.posts for insert to authenticated
with check ((select public.my_team_role()) in ('secretario', 'diretoria')
  and created_by = (select auth.uid()) and status = 0 and assigned_to is null and owner = '');
create policy "Management edits requests" on public.posts for update to authenticated
using ((select public.my_team_role()) = 'secretario'
  or ((select public.my_team_role()) = 'diretoria' and created_by = (select auth.uid())))
with check (assignment_state is distinct from 'pending' or status = 0);
create policy "Worker edits current work" on public.posts for update to authenticated
using ((select public.my_team_role()) = 'bixo'
  and assigned_to = (select auth.uid()) and assignment_state = 'accepted' and status = 1)
with check (assigned_to = (select auth.uid()) and assignment_state = 'accepted' and status in (1, 2));
create policy "Management deletes requests" on public.posts for delete to authenticated
using ((select public.my_team_role()) = 'secretario'
  or ((select public.my_team_role()) = 'diretoria' and created_by = (select auth.uid())));

-- Combine transition guards with the ownership policy. PostgreSQL permissive
-- policies OR their WITH CHECK predicates, so this guard must be restrictive.
create policy "Valid post transition" on public.posts as restrictive for update to authenticated
using (true)
with check (
  case when (select public.my_team_role()) = 'bixo'
    then assigned_to = (select auth.uid()) and assignment_state = 'accepted' and status in (1, 2)
    else assignment_state is distinct from 'pending' or status = 0
  end
);

create function public.change_post_assignment(
  post_id uuid, expected_updated_at timestamptz, action text, member_id uuid default null
)
returns public.posts language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_role public.team_role := public.my_team_role();
  post public.posts;
  assignee uuid;
  assignee_name text;
begin
  if actor_role is null then
    raise exception 'Assignment denied' using errcode = '42501';
  end if;
  select * into post from public.posts where id = post_id for update;
  if not found or post.updated_at is distinct from expected_updated_at then
    raise exception 'Post changed' using errcode = 'PT409';
  end if;

  if action in ('assign', 'unassign') and post.status = 0
     and (actor_role = 'secretario' or (actor_role = 'diretoria' and post.created_by = actor)) then
    if action = 'assign' and member_id is not null then
      assignee := member_id;
      post.assignment_state := 'pending';
    elsif action = 'unassign' then
      post.assignment_state := null;
    else
      raise exception 'Select an assignee' using errcode = '22023';
    end if;
  elsif actor_role = 'bixo' and post.status = 0 and (
    (action = 'claim' and post.assigned_to is null and post.owner = '')
    or (action in ('accept', 'decline') and post.assigned_to = actor and post.assignment_state = 'pending')
  ) then
    if action = 'decline' then
      post.assignment_state := null;
    else
      assignee := actor;
      post.assignment_state := 'accepted';
      post.status := 1;
    end if;
  else
    raise exception 'Assignment denied' using errcode = '42501';
  end if;

  if assignee is not null then
    select coalesce(m.username, split_part(u.email, '@', 1), 'Membro') into assignee_name
    from public.team_members m join auth.users u on u.id = m.user_id
    where m.user_id = assignee and m.effective_role = 'bixo' and u.email_confirmed_at is not null;
    if not found then
      raise exception 'Assignee unavailable' using errcode = 'PT409';
    end if;
  end if;
  update public.posts set assigned_to = assignee, assignment_state = post.assignment_state,
    owner = coalesce(assignee_name, ''), status = post.status
  where id = post_id returning * into post;
  return post;
end;
$$;

revoke all on function public.my_team_role(), public.team_directory(),
  public.approve_team_member(uuid, public.team_role),
  public.change_post_assignment(uuid, timestamptz, text, uuid) from public, anon, authenticated;
grant execute on function public.my_team_role(), public.team_directory(),
  public.approve_team_member(uuid, public.team_role),
  public.change_post_assignment(uuid, timestamptz, text, uuid) to authenticated;

commit;
