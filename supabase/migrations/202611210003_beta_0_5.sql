-- Apply after Beta 0.4. Posts and their existing attribution are left intact.
begin;

alter table public.team_members add column avatar_data text
  constraint valid_avatar_data check (
    octet_length(avatar_data) <= 49152
    and avatar_data ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'
  );

create function public.set_my_avatar(photo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.team_members set avatar_data = photo
  where user_id = auth.uid() and effective_role is not null;
  if not found then
    raise exception 'Profile update denied' using errcode = '42501';
  end if;
end;
$$;

create function public.board_member_profiles(member_ids uuid[])
returns table (user_id uuid, username text, avatar_data text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(m.username, nullif(split_part(u.email, '@', 1), ''), 'Membro'), m.avatar_data
  from public.team_members m join auth.users u on u.id = m.user_id
  where (select public.my_team_role()) is not null
    and m.effective_role is not null
    and m.user_id = any(member_ids);
$$;

revoke all on function public.set_my_avatar(text), public.board_member_profiles(uuid[]) from public, anon, authenticated;
grant execute on function public.set_my_avatar(text), public.board_member_profiles(uuid[]) to authenticated;

commit;
