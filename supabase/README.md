# Supabase backend

Project `PlanetForge` (eu-west-1), `https://cpqegtakybjqhihevzwt.supabase.co`.

- `migrations/` – database schema: saves with 5 slots per player, members, RLS, private Realtime rooms `game:<id>`.
- `functions/game-command/` – the game authority. `logic.ts` (pure, unit tested) wraps the shared simulation from `src/sim`; `index.ts` does the I/O.

## Deploying game-command

The function imports `src/sim`, so it is deployed as one bundle:

```sh
npm run build:functions   # writes supabase/functions/game-command/dist/index.js
supabase functions deploy game-command   # or upload dist/index.js as entrypoint index.js
```

Redeploy whenever `src/sim` changes, otherwise server and client simulate different rules.

## Clock (live mode)

The game clock only runs while someone is online. Each command, and a heartbeat every 20 s from one online client, advances sim time by the wall-clock gap since the last save, at most 60 s. Longer gaps count as a pause.

If nobody was online for 10 minutes (no command, no heartbeat), the next request first closes the lobby in the host's name; the host reopens it with `openLobby`. When the host kicks a player (`kickPlayer`), `save_game_state` ends that membership in the same transaction, which frees the kicked player's slot. Saves written by an older simulation version start over, because their shape is incompatible.
