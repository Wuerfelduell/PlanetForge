-- Coop options the host picks when creating a game (design 13.4): goal and invaders.
-- Stored next to the save, read by game-command when it creates the state.
alter table public.games add column if not exists options jsonb not null default '{}'::jsonb;

-- Only known values survive; anything else falls back to the simulation's defaults.
create or replace function private.clean_game_options(p jsonb) returns jsonb
language sql immutable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'goal', case when p->>'goal' in ('endless', 'supernova') then p->>'goal' end,
    'invaders', case when p->>'invaders' in ('off', 'normal', 'strong') then p->>'invaders' end))
$$;

-- New overload: p_options has no default, so calls without it still reach the old create_save.
create or replace function public.create_save(p_slot int, p_name text, p_display_name text, p_max_players int, p_options jsonb)
returns games language plpgsql security definer set search_path = public as $$
declare g games;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform private.free_slot_check(p_slot);
  insert into games(created_by, name, max_players, options)
    values (auth.uid(), left(p_name, 40), p_max_players, private.clean_game_options(coalesce(p_options, '{}'::jsonb)))
    returning * into g;
  insert into game_members(game_id, user_id, player_id, display_name, slot) values (g.id, auth.uid(), 'p1', left(p_display_name, 24), p_slot);
  return g;
end $$;
revoke all on function public.create_save(int, text, text, int, jsonb) from public, anon;
grant execute on function public.create_save(int, text, text, int, jsonb) to authenticated;

create or replace function public.load_game(p_game uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', g.id, 'version', g.version, 'state', g.state, 'clock_at', g.clock_at,
    'max_players', g.max_players, 'options', g.options,
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'player_id', m.player_id, 'display_name', m.display_name) order by m.player_id)
                           from game_members m where m.game_id = g.id and m.left_at is null), '[]'::jsonb))
  from games g where g.id = p_game and g.deleted_at is null;
$$;
