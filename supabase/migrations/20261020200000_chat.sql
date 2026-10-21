-- Game chat (design §8): one line of text, quick messages and pins, last 50 visible. Not part of
-- the game state: send_chat stores the message and broadcasts it as event "chat" on game:<id>.
create table public.chat_messages (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  player_id text not null,
  kind text not null default 'text' check (kind in ('text', 'quick', 'pin')),
  body text not null check (char_length(body) between 1 and 200),
  -- Pins: { planetId, segment } to jump to.
  pin jsonb check (pin is null or (jsonb_typeof(pin) = 'object' and octet_length(pin::text) <= 200)),
  created_at timestamptz not null default now()
);
create index chat_messages_game_idx on public.chat_messages(game_id, id desc);
alter table public.chat_messages enable row level security;
create policy "members read chat" on public.chat_messages
  for select to authenticated using (private.is_game_member(game_id));

create or replace function public.send_chat(p_game uuid, p_body text, p_kind text default 'text', p_pin jsonb default null)
returns public.chat_messages language plpgsql security definer set search_path = public as $$
declare pid text; msg chat_messages;
begin
  select m.player_id into pid from game_members m join games g on g.id = m.game_id
   where m.game_id = p_game and m.user_id = auth.uid() and m.left_at is null and g.deleted_at is null;
  if pid is null then raise exception 'not a member'; end if;
  if (select count(*) from chat_messages where game_id = p_game and player_id = pid and created_at > now() - interval '10 seconds') >= 8 then
    raise exception 'too many messages';
  end if;
  insert into chat_messages(game_id, player_id, kind, body, pin)
  values (p_game, pid, p_kind, left(trim(p_body), 200), p_pin) returning * into msg;
  perform realtime.send(to_jsonb(msg), 'chat', 'game:' || p_game, true);
  return msg;
end $$;

revoke all on function public.send_chat(uuid, text, text, jsonb) from public, anon;
grant execute on function public.send_chat(uuid, text, text, jsonb) to authenticated;
revoke all on public.chat_messages from anon;
grant select on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
