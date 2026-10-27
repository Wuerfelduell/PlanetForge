/**
 * Gzip + base64 for game states on the wire. A full state is ~300 KB of JSON, more than a
 * Realtime broadcast may carry on the free plan (256 KB); packed it is about a tenth of that.
 * Used by game-command (Deno) and the client, both of which have CompressionStream.
 */
export async function pack(value: unknown): Promise<string> {
  const stream = new Blob([JSON.stringify(value)]).stream().pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export async function unpack<T>(packed: string): Promise<T> {
  const bytes = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text()) as T;
}
