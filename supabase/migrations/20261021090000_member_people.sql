-- Seb: every player picks their people (Volk) when creating or joining a save.
-- null = let the simulation pick the first free one. Ids follow PEOPLE_IDS in src/sim/content.ts.
alter table public.game_members add column if not exists people text;
alter table public.game_members add constraint game_members_people_check check (people is null or people in (
  'burrowbeavers', 'quillfolk', 'axolings', 'shellguards', 'dunehoppers', 'starowls',
  'tideotters', 'hornbeetles', 'frostseals', 'swapcoons', 'glowsnails', 'echobats'));

-- Peoples already in use in a game: chosen by an active member or already playing in the saved state
-- (players who left keep their people there, so they find it again when they come back).
create or replace function private.taken_peoples(p_game uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select m.people as x from game_members m where m.game_id = p_game and m.left_at is null and m.people is not null
    union all
    select p->>'people' from games g, jsonb_array_elements(coalesce(g.state->'players', '[]'::jsonb)) p
     where g.id = p_game and p->>'people' is not null
  ) t
$$;
revoke all on function private.taken_peoples(uuid) from public, anon, authenticated;

create or replace function private.check_people(p_game uuid, p_people text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_people is null then return; end if;
  if p_people = any(private.taken_peoples(p_game)) then raise exception 'people taken'; end if;
end $$;
revoke all on function private.check_people(uuid, text) from public, anon, authenticated;

-- New overload with the people; the older ones stay for clients that haven't updated yet.
create or replace function public.create_save(p_slot int, p_name text, p_display_name text, p_max_players int, p_options jsonb, p_people text)
returns games language plpgsql security definer set search_path = public as $$
declare g games;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform private.free_slot_check(p_slot);
  insert into games(created_by, name, max_players, options)
    values (auth.uid(), left(p_name, 40), p_max_players, private.clean_game_options(coalesce(p_options, '{}'::jsonb)))
    returning * into g;
  insert into game_members(game_id, user_id, player_id, display_name, slot, people)
    values (g.id, auth.uid(), 'p1', left(p_display_name, 24), p_slot, p_people);
  return g;
end $$;
revoke all on function public.create_save(int, text, text, int, jsonb, text) from public, anon;
grant execute on function public.create_save(int, text, text, int, jsonb, text) to authenticated;

create or replace function public.join_save(p_code text, p_slot int, p_display_name text, p_people text)
returns games language plpgsql security definer set search_path = public as $$
declare g games; n int; pid text; m game_members; was_member boolean;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from games where join_code = upper(trim(p_code)) and deleted_at is null for update;
  if not found then raise exception 'game not found'; end if;
  select * into m from game_members where game_id = g.id and user_id = auth.uid();
  was_member := found;
  if was_member and m.left_at is null then return g; end if;
  perform private.free_slot_check(p_slot);
  if was_member then
    -- Returning player keeps their player id, planets and people.
    update game_members set left_at = null, slot = p_slot where game_id = g.id and user_id = auth.uid();
    return g;
  end if;
  select count(*) into n from game_members where game_id = g.id and left_at is null;
  if n >= g.max_players then raise exception 'game full'; end if;
  perform private.check_people(g.id, p_people);
  select 'p' || i into pid from generate_series(1, 8) i
   where not exists (select 1 from game_members where game_id = g.id and player_id = 'p' || i) order by i limit 1;
  insert into game_members(game_id, user_id, player_id, display_name, slot, people)
    values (g.id, auth.uid(), pid, left(p_display_name, 24), p_slot, p_people);
  return g;
end $$;
revoke all on function public.join_save(text, int, text, text) from public, anon;
grant execute on function public.join_save(text, int, text, text) to authenticated;

-- For the people picker before joining: whoever has the invite code may see which peoples are gone.
create or replace function public.taken_peoples(p_code text) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into gid from games where join_code = upper(trim(p_code)) and deleted_at is null;
  if not found then raise exception 'game not found'; end if;
  return private.taken_peoples(gid);
end $$;
revoke all on function public.taken_peoples(text) from public, anon;
grant execute on function public.taken_peoples(text) to authenticated;

create or replace function public.load_game(p_game uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', g.id, 'version', g.version, 'state', g.state, 'clock_at', g.clock_at,
    'max_players', g.max_players, 'options', g.options,
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'player_id', m.player_id, 'display_name', m.display_name, 'people', m.people) order by m.player_id)
                           from game_members m where m.game_id = g.id and m.left_at is null), '[]'::jsonb))
  from games g where g.id = p_game and g.deleted_at is null;
$$;
revoke all on function public.load_game(uuid) from public, anon, authenticated;
grant execute on function public.load_game(uuid) to service_role;

-- The save menu shows the player's people: the one they play in the saved state, else their pick
-- (null when they didn't pick and the game hasn't started yet).
create or replace view public.my_games with (security_invoker = true) as
  select g.id, m.slot, g.name, g.status, g.join_code, g.last_played_at, g.created_by = (select auth.uid()) as is_host,
         (select count(*) from game_members x where x.game_id = g.id and x.left_at is null) as player_count,
         coalesce(g.options->>'mode', 'coop') as mode,
         coalesce((select p->>'people' from jsonb_array_elements(coalesce(g.state->'players', '[]'::jsonb)) p
                    where p->>'id' = m.player_id limit 1), m.people) as people
    from games g
    join game_members m on m.game_id = g.id and m.user_id = (select auth.uid()) and m.left_at is null
   where g.deleted_at is null;
revoke all on public.my_games from anon;
grant select on public.my_games to authenticated;
