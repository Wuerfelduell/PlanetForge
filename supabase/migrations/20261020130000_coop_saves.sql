-- PlanetForge coop backend (already applied to project cpqegtakybjqhihevzwt via the Supabase MCP;
-- this file is the consolidated current schema, for review and for setting up a fresh project).
--
-- Model: every game is a save owned by its host (created_by). Each player has 5 slots, and every
-- game they are in (own or joined) uses one. The game-command Edge Function is the only writer of
-- game state; clients read through RLS and receive updates on the private Realtime room game:<id>.

create schema if not exists private;
grant usage on schema private to authenticated;

create table public.games (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Neues Spiel' check (char_length(name) between 1 and 40),
  status text not null default 'lobby' check (status in ('lobby', 'running', 'finished')),
  max_players int not null default 4 check (max_players between 1 and 8),
  version int not null default 0,
  state jsonb,
  -- Wall-clock moment that state.simTime corresponds to (live mode clock).
  clock_at timestamptz,
  last_played_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_members (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id text not null,
  display_name text not null default 'Spieler' check (char_length(display_name) between 1 and 24),
  slot int check (slot between 1 and 5),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (game_id, user_id),
  unique (game_id, player_id)
);
create index game_members_user_idx on public.game_members(user_id);
create unique index game_members_user_slot_active on public.game_members(user_id, slot) where left_at is null and slot is not null;

alter table public.games enable row level security;
alter table public.game_members enable row level security;
-- Explicit Data API grants: new tables in public get none by default (Supabase, from 2026-10-30).
-- Clients only read (through RLS); all writes go through security definer functions.
revoke all on public.games, public.game_members from anon;
grant select on public.games, public.game_members to authenticated;
grant all on public.games, public.game_members to service_role;

create or replace function private.is_game_member(p_game uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.game_members m join public.games g on g.id = m.game_id
     where m.game_id = p_game and m.user_id = (select auth.uid()) and m.left_at is null and g.deleted_at is null);
$$;

create or replace function private.free_slot_check(p_slot int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_slot is null or p_slot not between 1 and 5 then raise exception 'slot must be 1-5'; end if;
  if exists (select 1 from game_members where user_id = auth.uid() and slot = p_slot and left_at is null) then
    raise exception 'slot % is in use', p_slot;
  end if;
end $$;

create policy "members read their games" on public.games
  for select to authenticated using (private.is_game_member(id));
create policy "members read co-members" on public.game_members
  for select to authenticated using (private.is_game_member(game_id));

-- Realtime: only members may receive and send on game:<uuid> (broadcast and presence).
create policy "members receive game channel" on realtime.messages
  for select to authenticated
  using (realtime.topic() ~ '^game:[0-9a-f-]{36}$' and private.is_game_member(substr(realtime.topic(), 6)::uuid));
create policy "members send on game channel" on realtime.messages
  for insert to authenticated
  with check (realtime.topic() ~ '^game:[0-9a-f-]{36}$' and private.is_game_member(substr(realtime.topic(), 6)::uuid));

create or replace function public.create_save(p_slot int, p_name text default 'Neues Spiel', p_display_name text default 'Spieler', p_max_players int default 4)
returns public.games language plpgsql security definer set search_path = public as $$
declare g games;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform private.free_slot_check(p_slot);
  insert into games(created_by, name, max_players) values (auth.uid(), left(p_name, 40), p_max_players) returning * into g;
  insert into game_members(game_id, user_id, player_id, display_name, slot) values (g.id, auth.uid(), 'p1', left(p_display_name, 24), p_slot);
  return g;
end $$;

-- Join (or rejoin) a friend's game into one of your free slots; also works while it is running.
create or replace function public.join_save(p_code text, p_slot int, p_display_name text default 'Spieler')
returns public.games language plpgsql security definer set search_path = public as $$
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
    -- Returning player keeps their player id and planets.
    update game_members set left_at = null, slot = p_slot where game_id = g.id and user_id = auth.uid();
    return g;
  end if;
  select count(*) into n from game_members where game_id = g.id and left_at is null;
  if n >= g.max_players then raise exception 'game full'; end if;
  select 'p' || i into pid from generate_series(1, 8) i
   where not exists (select 1 from game_members where game_id = g.id and player_id = 'p' || i) order by i limit 1;
  insert into game_members(game_id, user_id, player_id, display_name, slot) values (g.id, auth.uid(), pid, left(p_display_name, 24), p_slot);
  return g;
end $$;

-- A joined player leaves someone else's game (frees their slot); the host cannot.
create or replace function public.leave_game(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from games where id = p_game and created_by = auth.uid()) then raise exception 'host cannot leave, remove the save instead'; end if;
  update game_members set left_at = now() where game_id = p_game and user_id = auth.uid() and left_at is null;
end $$;

-- The host removes a save (soft delete); everyone's slot for it is freed.
create or replace function public.remove_save(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update games set deleted_at = now() where id = p_game and created_by = auth.uid() and deleted_at is null;
  if not found then raise exception 'not your save'; end if;
  update game_members set left_at = coalesce(left_at, now()) where game_id = p_game;
end $$;

-- Save menu: every slot the caller uses.
create or replace view public.my_games with (security_invoker = true) as
  select g.id, m.slot, g.name, g.status, g.join_code, g.last_played_at, g.created_by = (select auth.uid()) as is_host,
         (select count(*) from game_members x where x.game_id = g.id and x.left_at is null) as player_count
    from games g
    join game_members m on m.game_id = g.id and m.user_id = (select auth.uid()) and m.left_at is null
   where g.deleted_at is null;

-- game-command (service role): one round trip to load, one to save + broadcast.
create or replace function public.load_game(p_game uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', g.id, 'version', g.version, 'state', g.state, 'clock_at', g.clock_at,
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'player_id', m.player_id, 'display_name', m.display_name) order by m.player_id)
                           from game_members m where m.game_id = g.id and m.left_at is null), '[]'::jsonb))
  from games g where g.id = p_game and g.deleted_at is null;
$$;

create or replace function public.save_game_state(p_game uuid, p_expected_version int, p_state jsonb, p_clock_at timestamptz, p_events jsonb default '[]'::jsonb, p_by text default null)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update games
     set state = p_state, version = version + 1, clock_at = p_clock_at, last_played_at = now(), updated_at = now(),
         status = case when status = 'lobby' then 'running' else status end
   where id = p_game and version = p_expected_version and deleted_at is null
  returning version into v;
  if v is null then return null; end if;
  perform realtime.send(jsonb_build_object('version', v, 'state', p_state, 'events', p_events, 'by', p_by), 'state', 'game:' || p_game, true);
  return v;
end $$;

revoke all on function private.is_game_member(uuid) from public, anon;
revoke all on function private.free_slot_check(int) from public, anon;
grant execute on function private.is_game_member(uuid) to authenticated;
grant execute on function private.free_slot_check(int) to authenticated;
revoke all on function public.create_save(int, text, text, int) from public, anon;
revoke all on function public.join_save(text, int, text) from public, anon;
revoke all on function public.leave_game(uuid) from public, anon;
revoke all on function public.remove_save(uuid) from public, anon;
grant execute on function public.create_save(int, text, text, int) to authenticated;
grant execute on function public.join_save(text, int, text) to authenticated;
grant execute on function public.leave_game(uuid) to authenticated;
grant execute on function public.remove_save(uuid) to authenticated;
revoke all on function public.load_game(uuid) from public, anon, authenticated;
revoke all on function public.save_game_state(uuid, int, jsonb, timestamptz, jsonb, text) from public, anon, authenticated;
grant execute on function public.load_game(uuid) to service_role;
grant execute on function public.save_game_state(uuid, int, jsonb, timestamptz, jsonb, text) to service_role;
revoke all on public.my_games from anon;
grant select on public.my_games to authenticated;

-- Auth: "Allow anonymous sign-ins" must be enabled (Dashboard > Authentication > Sign In / Providers).
