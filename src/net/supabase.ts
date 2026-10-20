import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public project URL and publishable key: safe to ship in the client, access is enforced by RLS.
const URL = import.meta.env.VITE_SUPABASE_URL ?? "https://cpqegtakybjqhihevzwt.supabase.co";
const KEY = import.meta.env.VITE_SUPABASE_KEY ?? "sb_publishable_vOv5alRnwowAeYJeBfYWdg_xrrOUvxP";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  client ??= createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

/** Signs in anonymously on first use; the session stays in this browser's storage. */
export async function ensureSignedIn(): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await sb.auth.signInAnonymously();
  if (error || !signedIn.user) throw new Error(error?.message ?? "Anmeldung fehlgeschlagen");
  return signedIn.user.id;
}
