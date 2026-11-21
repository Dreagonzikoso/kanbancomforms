-- Apply after Beta 0.3. Historical rows are left intact.
begin;

create or replace function public.team_directory()
returns table (user_id uuid, username text, email text, requested_role public.team_role, effective_role public.team_role)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(m.username, split_part(u.email, '@', 1), 'Membro'),
    case when m.effective_role is null then u.email end, m.requested_role, m.effective_role
  from public.team_members m join auth.users u on u.id = m.user_id
  where u.email_confirmed_at is not null
    and (select public.my_team_role()) in ('secretario', 'diretoria')
    and ((m.effective_role is not null and m.user_id <> auth.uid())
      or ((select public.my_team_role()) = 'secretario' and m.effective_role is null))
  order by 2;
$$;

drop policy "Worker edits current work" on public.posts;
drop policy "Valid post transition" on public.posts;
create policy "Assignee edits accepted work" on public.posts for update to authenticated
using ((select public.my_team_role()) is not null
  and assigned_to = (select auth.uid()) and assignment_state = 'accepted' and status = 1)
with check (assigned_to = (select auth.uid()) and assignment_state = 'accepted' and status in (1, 2));

-- Restrictive because the management and assignee policies above are permissive.
create policy "Valid post transition" on public.posts as restrictive for update to authenticated
using (true)
with check (
  (assignment_state is distinct from 'pending' or status = 0)
  and ((select public.my_team_role()) = 'secretario'
    or ((select public.my_team_role()) = 'diretoria' and created_by = (select auth.uid()))
    or (assigned_to = (select auth.uid()) and assignment_state = 'accepted' and status in (1, 2)))
);

create function public.require_post_acceptance() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 0 and new.status > 0 and (
    new.status = 1
    and old.assignment_state is not distinct from 'pending'
    and new.assignment_state is not distinct from 'accepted'
    and old.assigned_to = auth.uid()
    and new.assigned_to = old.assigned_to
  ) is not true then
    raise exception 'The assigned member must accept first' using errcode = '23514';
  end if;
  if old.status <> 1 and new.status = 1 and new.assignment_state is distinct from 'accepted' then
    raise exception 'An accepted assignment is required' using errcode = '23514';
  end if;
  if old.status > 0 and new.status = 0 and old.assignment_state = 'accepted' then
    new.assigned_to := null;
    new.assignment_state := null;
    new.owner := '';
  end if;
  return new;
end;
$$;
revoke all on function public.require_post_acceptance() from public, anon, authenticated;
create trigger require_post_acceptance before update on public.posts
for each row execute function public.require_post_acceptance();

create or replace function public.change_post_assignment(
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
    if action = 'assign' and member_id is not null and member_id <> actor then
      assignee := member_id;
      post.assignment_state := 'pending';
    elsif action = 'unassign' then
      post.assignment_state := null;
    else
      raise exception 'Choose another approved member' using errcode = '42501';
    end if;
  elsif action in ('accept', 'decline') and post.status = 0
    and post.assigned_to = actor and post.assignment_state = 'pending' then
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
    where m.user_id = assignee and m.effective_role is not null and u.email_confirmed_at is not null;
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

commit;
