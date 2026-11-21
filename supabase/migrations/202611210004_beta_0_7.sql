-- Apply after Beta 0.5. Existing posts remain intact.
begin;

create or replace function public.require_post_acceptance() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 0 and new.status > 0 and (
    new.status = 1
    and new.assignment_state is not distinct from 'accepted'
    and new.assigned_to = auth.uid()
    and (
      (old.assignment_state = 'pending' and old.assigned_to = new.assigned_to)
      or (old.assignment_state is null and old.assigned_to is null and old.created_by = new.assigned_to)
    )
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
  elsif action = 'self' and post.status = 0 and post.assigned_to is null
    and post.created_by = actor and actor_role in ('secretario', 'diretoria') then
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

create function public.create_post_with_assignment(post_data jsonb, member_id uuid)
returns public.posts language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  role public.team_role := public.my_team_role();
  draft public.posts;
  post public.posts;
begin
  if actor is null or role is null or role not in ('secretario', 'diretoria') then
    raise exception 'Post creation denied' using errcode = '42501';
  end if;
  if member_id is null then
    raise exception 'An assignee is required' using errcode = '22023';
  end if;

  draft := jsonb_populate_record(null::public.posts, post_data);
  insert into public.posts (id, title, area, idea, intent, due_date, format,
    use_template, template_name, canva_url, created_by)
  values (draft.id, draft.title, draft.area, draft.idea, draft.intent, draft.due_date, draft.format,
    draft.use_template, draft.template_name, draft.canva_url, actor)
  returning * into post;

  return public.change_post_assignment(post.id, post.updated_at,
    case when member_id = actor then 'self' else 'assign' end, member_id);
end;
$$;

revoke all on function public.create_post_with_assignment(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.create_post_with_assignment(jsonb, uuid) to authenticated;

commit;
