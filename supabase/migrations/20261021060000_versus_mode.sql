-- Versus games (design 13): the host picks the mode when creating the save, like goal and invaders.
create or replace function private.clean_game_options(p jsonb) returns jsonb
language sql immutable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'mode', case when p->>'mode' in ('coop', 'versus') then p->>'mode' end,
    'goal', case when p->>'goal' in ('endless', 'supernova') then p->>'goal' end,
    'invaders', case when p->>'invaders' in ('off', 'normal', 'strong') then p->>'invaders' end))
$$;

-- The save menu shows which mode a slot plays.
create or replace view public.my_games with (security_invoker = true) as
  select g.id, m.slot, g.name, g.status, g.join_code, g.last_played_at, g.created_by = (select auth.uid()) as is_host,
         (select count(*) from game_members x where x.game_id = g.id and x.left_at is null) as player_count,
         coalesce(g.options->>'mode', 'coop') as mode
    from games g
    join game_members m on m.game_id = g.id and m.user_id = (select auth.uid()) and m.left_at is null
   where g.deleted_at is null;
