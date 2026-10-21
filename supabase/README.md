# Supabase backend

Project `PlanetForge` (eu-west-1), `https://cpqegtakybjqhihevzwt.supabase.co`.

- `migrations/` – database schema: saves with 5 slots per player, members, RLS, private Realtime rooms `game:<id>`.
- `functions/game-command/` – the game authority. `logic.ts` (pure, unit tested) wraps the shared simulation from `src/sim`; `index.ts` does the I/O.

## Table grants

New tables in `public` get no Data API grants by default (Supabase, from 2026-10-30), also when migrations recreate the schema. Every migration that creates a table grants explicitly in the same file: nothing to `anon`, only what the client needs to `authenticated` (on top of RLS), `all` to `service_role`.

## Deploying game-command

The function imports `src/sim`, so it is deployed as one bundle:

```sh
npm run build:functions   # writes supabase/functions/game-command/dist/index.js
supabase functions deploy game-command   # or upload dist/index.js as entrypoint index.js
```

Redeploy whenever `src/sim` changes, otherwise server and client simulate different rules. The workflow `.github/workflows/deploy-functions.yml` does this on every push to main that touches the rules, once the repository secret `SUPABASE_ACCESS_TOKEN` is set.

## Clock (live mode)

The game clock only runs while someone is online. Each command, and a heartbeat every 20 s from one online client, advances sim time by the wall-clock gap since the last save, at most 60 s. Longer gaps count as a pause.

If nobody was online for 10 minutes (no command, no heartbeat), the next request first closes the lobby in the host's name; the host reopens it with `openLobby`. When the host kicks a player (`kickPlayer`), `save_game_state` ends that membership in the same transaction, which frees the kicked player's slot. Saves written by an older simulation version start over, because their shape is incompatible.

## Game options

`create_save` takes `p_options` (`goal`: `supernova`|`endless`, `invaders`: `off`|`normal`|`strong`); unknown keys and values are dropped and the simulation's defaults apply. They are stored in `games.options` and passed to `createGame` together with `max_players` whenever game-command creates the state, so a save that starts over after a version change keeps them.
