-- world.planets goes up to 16 now (PR #79); the simulation clamps to the same range.
create or replace function private.clean_game_options(p jsonb) returns jsonb
language sql immutable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'mode', case when p->>'mode' in ('coop', 'versus') then p->>'mode' end,
    'goal', case when p->>'goal' in ('endless', 'supernova') then p->>'goal' end,
    'invaders', case when p->>'invaders' in ('off', 'normal', 'strong') then p->>'invaders' end,
    'world', nullif(jsonb_strip_nulls(jsonb_build_object(
      'planets', case when jsonb_typeof(p->'world'->'planets') = 'number' then to_jsonb(least(16, greatest(1, round((p->'world'->>'planets')::numeric)))::int) end,
      'start', case when p->'world'->>'start' in ('temperate', 'arid', 'ice', 'ocean', 'lava', 'toxic', 'random') then p->'world'->'start' end,
      'sun', case when p->'world'->>'sun' in ('yellow', 'red', 'blue', 'white', 'random') then p->'world'->'sun' end,
      'size', case when p->'world'->>'size' in ('small', 'normal', 'large', 'random') then p->'world'->'size' end)), '{}'::jsonb)))
$$;
