// Supabase Edge Function: the authority for every game. Runs the shared simulation from src/sim,
// saves the result with optimistic locking and broadcasts it to room game:<id> (see save_game_packed).
// Deployed as a bundle: `npm run build:functions` writes dist/index.js next to this file.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { pack, unpack } from "../../../src/net/pack";
import type { GameOptions } from "../../../src/sim/index";
import { parseRequest, step, userIdFromJwt, type Member } from "./logic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // Without it browsers repeat the preflight every few seconds, an extra round trip (~150 ms
  // in the function alone) before every second move. Chrome keeps it at most 2 hours.
  "Access-Control-Max-Age": "7200",
};

/**
 * Replies carry the whole state (~300-600 KB of JSON). Clients that ask for it (`packed: true`)
 * get the packed string that is saved anyway; others get the JSON, gzipped when they accept it.
 */
function json(req: Request, body: unknown, status = 200): Response {
  const text = JSON.stringify(body);
  const headers = { ...cors, "Content-Type": "application/json", Vary: "Accept-Encoding" };
  if (text.length < 1024 || !/\bgzip\b/.test(req.headers.get("Accept-Encoding") ?? "")) return new Response(text, { status, headers });
  const gzipped = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(gzipped, { status, headers: { ...headers, "Content-Encoding": "gzip" } });
}

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface LoadedGame {
  id: string;
  version: number;
  /** Null for saves written since games.packed exists; then `packed` holds it. */
  state: Parameters<typeof step>[0]["state"];
  packed?: string | null;
  clock_at: string | null;
  /** Missing until the options migration ran. */
  max_players?: number;
  options?: Pick<GameOptions, "mode" | "goal" | "invaders" | "world" | "factions" | "difficulty">;
  members: { user_id: string; player_id: string; display_name: string; people?: string | null }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // verify_jwt is on, so the gateway has already checked the token's signature and expiry.
  const userId = userIdFromJwt(req.headers.get("Authorization"));
  if (!userId) return json(req, { ok: false, error: "Nicht angemeldet" }, 401);

  const started = Date.now();
  const body = await req.json().catch(() => null);
  const request = parseRequest(body);
  if (!request) return json(req, { ok: false, error: "Ungültige Anfrage" }, 400);
  const wantsPacked = (body as { packed?: unknown }).packed === true;
  // Milliseconds per phase, logged once per request (function logs) to see where the time goes.
  const timing: Record<string, number> = {};
  let mark = started;
  const lap = (phase: string) => {
    const now = Date.now();
    timing[phase] = (timing[phase] ?? 0) + now - mark;
    mark = now;
  };
  const log = (attempts: number, size?: number) =>
    console.log(JSON.stringify({ perf: { ...timing, total: Date.now() - started }, kind: request.kind, cmds: request.kind === "commands" ? request.cmds.length : 1, attempts, packedKB: size && Math.round(size / 1024) }));

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error: loadError } = await admin.rpc("load_game", { p_game: request.gameId });
    lap("load");
    if (loadError) return json(req, { ok: false, error: loadError.message }, 500);
    const game = data as LoadedGame | null;
    if (!game) return json(req, { ok: false, error: "Spiel nicht gefunden" }, 404);
    const me = game.members.find((m) => m.user_id === userId);
    if (!me) return json(req, { ok: false, error: "Du bist nicht in diesem Spiel" }, 403);
    const members: Member[] = game.members.map((m) => ({ playerId: m.player_id, name: m.display_name, people: m.people }));

    const state = game.packed ? await unpack<NonNullable<LoadedGame["state"]>>(game.packed) : game.state;
    lap("unpack");
    const now = Date.now();
    const result = step({
      state,
      clockAt: game.clock_at ? Date.parse(game.clock_at) : null,
      members,
      playerId: me.player_id,
      request,
      now,
      options: { ...game.options, maxPlayers: game.max_players },
    });
    lap("step");
    if (!result.ok) {
      log(attempt + 1);
      if (wantsPacked && game.packed) return json(req, { ok: false, error: result.error, version: game.version, packed: game.packed });
      return json(req, { ok: false, error: result.error, version: game.version, state });
    }
    const packed = await pack(result.state);
    lap("pack");

    // Stored and broadcast packed (~40 KB instead of ~320 KB); games.state keeps only the players.
    const { data: version, error } = await admin.rpc("save_game_packed", {
      p_game: game.id,
      p_expected_version: game.version,
      p_players: result.state.players,
      p_clock_at: new Date(now).toISOString(),
      p_events: result.events,
      p_by: me.player_id,
      p_removed: result.removed,
      p_packed: packed,
    });
    lap("save");
    if (error) return json(req, { ok: false, error: error.message }, 500);
    if (version !== null) {
      log(attempt + 1, packed.length);
      if (wantsPacked) return json(req, { ok: true, version, packed, events: result.events, errors: result.errors });
      return json(req, { ok: true, version, state: result.state, events: result.events, errors: result.errors });
    }
    // Someone else saved in between: reload and run again.
  }
  log(5);
  return json(req, { ok: false, error: "Zu viele gleichzeitige Züge, bitte nochmal" }, 409);
});
