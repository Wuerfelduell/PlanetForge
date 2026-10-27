-- A three-player state is ~300 KB of JSON, over Realtime's 256 KB broadcast limit on the free plan,
-- so every state broadcast failed (payload_size_exceeded) and co-players only caught up on their
-- next own request. game-command now also passes the state gzipped + base64 (src/net/pack.ts) and
-- the broadcast carries that instead; games.state stays plain jsonb.
create or replace function public.save_game_state(p_game uuid, p_expected_version int, p_state jsonb, p_clock_at timestamptz, p_events jsonb, p_by text, p_removed text[], p_packed text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update games
     set state = p_state, version = version + 1, clock_at = p_clock_at, last_played_at = now(), updated_at = now(),
         status = case when status = 'lobby' then 'running' else status end
   where id = p_game and version = p_expected_version and deleted_at is null
  returning version into v;
  if v is null then return null; end if;
  update game_members set left_at = now()
   where game_id = p_game and player_id = any(coalesce(p_removed, '{}')) and left_at is null
     and user_id <> (select created_by from games where id = p_game);
  perform realtime.send(jsonb_build_object('version', v, 'packed', p_packed, 'events', p_events, 'by', p_by), 'state', 'game:' || p_game, true);
  return v;
end $$;

revoke all on function public.save_game_state(uuid, int, jsonb, timestamptz, jsonb, text, text[], text) from public, anon, authenticated;
grant execute on function public.save_game_state(uuid, int, jsonb, timestamptz, jsonb, text, text[], text) to service_role;
