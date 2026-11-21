-- Apply after Beta 0.7. Existing posts remain intact.
begin;

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
  elsif action = 'self' then
    if actor_role not in ('secretario', 'diretoria') or post.created_by is distinct from actor then
      raise exception 'Only the author can start their own post' using errcode = '42501';
    end if;
    if post.status <> 0 or post.assigned_to is not null then
      raise exception 'Post no longer available to self-assign' using errcode = 'PT409';
    end if;
    assignee := actor;
    post.assignment_state := 'accepted';
    post.status := 1;
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
    select coalesce(nullif(trim(m.username), ''), nullif(split_part(u.email, '@', 1), ''), 'Membro') into assignee_name
    from public.team_members m join auth.users u on u.id = m.user_id
    where m.user_id = assignee and m.effective_role is not null
      -- Self-assignment uses the authenticated, approved author as its identity.
      and (action = 'self' or u.email_confirmed_at is not null);
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
