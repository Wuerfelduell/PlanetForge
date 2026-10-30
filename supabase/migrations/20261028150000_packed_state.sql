-- Every move rewrote the whole ~320 KB jsonb state; on a small instance those writes stalled the
-- database for seconds to minutes (row lock waits behind slow commits). game-command now stores the
-- state gzipped + base64 (~40 KB, src/net/pack.ts) in games.packed and keeps only the players in
-- games.state, which is all my_games and taken_peoples read. Saves without packed load as before.
alter table public.games add column if not exists packed text;

create or replace function public.save_game_packed(p_game uuid, p_expected_version int, p_players jsonb, p_clock_at timestamptz, p_events jsonb, p_by text, p_removed text[], p_packed text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update games
     set packed = p_packed, state = jsonb_build_object('players', p_players), version = version + 1, clock_at = p_clock_at,
         last_played_at = now(), updated_at = now(),
         status = case when status = 'lobby' then 'running' else status end
   where id = p_game and version = p_expected_version and deleted_at is null
  returning version into v;
  if v is null then return null; end if;
  if coalesce(array_length(p_removed, 1), 0) > 0 then
    update game_members set left_at = now()
     where game_id = p_game and player_id = any(p_removed) and left_at is null
       and user_id <> (select created_by from games where id = p_game);
  end if;
  perform realtime.send(jsonb_build_object('version', v, 'packed', p_packed, 'events', p_events, 'by', p_by), 'state', 'game:' || p_game, true);
  return v;
end $$;
revoke all on function public.save_game_packed(uuid, int, jsonb, timestamptz, jsonb, text, text[], text) from public, anon, authenticated;
grant execute on function public.save_game_packed(uuid, int, jsonb, timestamptz, jsonb, text, text[], text) to service_role;

-- `state` only for saves written before packed existed.
create or replace function public.load_game(p_game uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', g.id, 'version', g.version, 'clock_at', g.clock_at,
    'state', case when g.packed is null then g.state end, 'packed', g.packed,
    'max_players', g.max_players, 'options', g.options,
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'player_id', m.player_id, 'display_name', m.display_name, 'people', m.people) order by m.player_id)
                           from game_members m where m.game_id = g.id and m.left_at is null), '[]'::jsonb))
  from games g where g.id = p_game and g.deleted_at is null;
$$;
revoke all on function public.load_game(uuid) from public, anon, authenticated;
grant execute on function public.load_game(uuid) to service_role;
