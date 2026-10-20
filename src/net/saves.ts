import { supabase } from "./supabase";

/** Every game a player is in (own or joined) takes one of these slots. */
export const SLOT_COUNT = 5;

export interface SaveSlot {
  id: string;
  slot: number;
  name: string;
  status: "lobby" | "running" | "finished";
  joinCode: string;
  lastPlayedAt: string;
  isHost: boolean;
  playerCount: number;
}

const errorText: Record<string, string> = {
  "game not found": "Kein Spiel mit diesem Code gefunden",
  "game full": "Das Spiel ist schon voll",
  "not your save": "Nur der Host kann diesen Spielstand entfernen",
  "not signed in": "Nicht angemeldet",
};

function fail(message: string): never {
  const known = Object.keys(errorText).find((k) => message.includes(k));
  if (known) throw new Error(errorText[known]);
  const slot = message.match(/slot (\d) is in use/);
  if (slot) throw new Error(`Platz ${slot[1]} ist schon belegt`);
  throw new Error(message);
}

export async function listSaves(): Promise<SaveSlot[]> {
  const { data, error } = await supabase().from("my_games").select("*").order("slot");
  if (error) fail(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    slot: r.slot,
    name: r.name,
    status: r.status,
    joinCode: r.join_code,
    lastPlayedAt: r.last_played_at,
    isHost: r.is_host,
    playerCount: Number(r.player_count),
  }));
}

export function firstFreeSlot(saves: SaveSlot[]): number | null {
  for (let s = 1; s <= SLOT_COUNT; s++) if (!saves.some((g) => g.slot === s)) return s;
  return null;
}

export async function createSave(slot: number, name: string, displayName: string): Promise<string> {
  const { data, error } = await supabase().rpc("create_save", { p_slot: slot, p_name: name, p_display_name: displayName });
  if (error) fail(error.message);
  return data.id;
}

export async function joinSave(code: string, slot: number, displayName: string): Promise<string> {
  const { data, error } = await supabase().rpc("join_save", { p_code: code, p_slot: slot, p_display_name: displayName });
  if (error) fail(error.message);
  return data.id;
}

export async function leaveGame(gameId: string): Promise<void> {
  const { error } = await supabase().rpc("leave_game", { p_game: gameId });
  if (error) fail(error.message);
}

export async function removeSave(gameId: string): Promise<void> {
  const { error } = await supabase().rpc("remove_save", { p_game: gameId });
  if (error) fail(error.message);
}

/** Link that opens the game and pre-fills the join code. */
export function inviteLink(code: string): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("join", code);
  return url.toString();
}
