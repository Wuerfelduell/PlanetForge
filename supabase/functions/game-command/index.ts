// Supabase Edge Function: the authority for every game. Runs the shared simulation from src/sim,
// saves the result with optimistic locking and broadcasts it to room game:<id> (see save_game_state).
// Deployed as a bundle: `npm run build:functions` writes dist/index.js next to this file.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseRequest, step, userIdFromJwt, type Member } from "./logic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface LoadedGame {
  id: string;
  version: number;
  state: Parameters<typeof step>[0]["state"];
  clock_at: string | null;
  /** Missing until the options migration ran. */
  max_players?: number;
  options?: { mode?: "coop" | "versus"; goal?: "endless" | "supernova"; invaders?: "off" | "normal" | "strong" };
  members: { user_id: string; player_id: string; display_name: string; people?: string | null }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // verify_jwt is on, so the gateway has already checked the token's signature and expiry.
  const userId = userIdFromJwt(req.headers.get("Authorization"));
  if (!userId) return json({ ok: false, error: "Nicht angemeldet" }, 401);

  const request = parseRequest(await req.json().catch(() => null));
  if (!request) return json({ ok: false, error: "Ungültige Anfrage" }, 400);

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error: loadError } = await admin.rpc("load_game", { p_game: request.gameId });
    if (loadError) return json({ ok: false, error: loadError.message }, 500);
    const game = data as LoadedGame | null;
    if (!game) return json({ ok: false, error: "Spiel nicht gefunden" }, 404);
    const me = game.members.find((m) => m.user_id === userId);
    if (!me) return json({ ok: false, error: "Du bist nicht in diesem Spiel" }, 403);
    const members: Member[] = game.members.map((m) => ({ playerId: m.player_id, name: m.display_name, people: m.people }));

    const now = Date.now();
    const result = step({
      state: game.state,
      clockAt: game.clock_at ? Date.parse(game.clock_at) : null,
      members,
      playerId: me.player_id,
      request,
      now,
      options: { ...game.options, maxPlayers: game.max_players },
    });
    if (!result.ok) return json({ ok: false, error: result.error, version: game.version, state: game.state });

    const { data: version, error } = await admin.rpc("save_game_state", {
      p_game: game.id,
      p_expected_version: game.version,
      p_state: result.state,
      p_clock_at: new Date(now).toISOString(),
      p_events: result.events,
      p_by: me.player_id,
      p_removed: result.removed,
    });
    if (error) return json({ ok: false, error: error.message }, 500);
    if (version !== null) return json({ ok: true, version, state: result.state, events: result.events });
    // Someone else saved in between: reload and run again.
  }
  return json({ ok: false, error: "Zu viele gleichzeitige Züge, bitte nochmal" }, 409);
});
