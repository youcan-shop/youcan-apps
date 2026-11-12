const MAX_BODY_BYTES = 16 * 1024;
const WINDOW_MS = 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 120;

const windows = new Map<string, { count: number; resetAt: number }>();

// The collect URL sits in the storefront's page source, so anyone can post to it
function limited(id: string): boolean {
  const now = Date.now();
  let window = windows.get(id);

  if (!window || window.resetAt < now) {
    if (windows.size > 50_000) {
      windows.clear();
    }

    window = { count: 0, resetAt: now + WINDOW_MS };
    windows.set(id, window);
  }

  return ++window.count > MAX_EVENTS_PER_WINDOW;
}

/**
 * Receives events from the Pixly web pixel. The pixel runs in a sandboxed worker
 * and posts plain text without credentials, so the browser sends it without a
 * CORS preflight and nothing is read from the response.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*');

  const key = getRouterParam(event, 'key') ?? '';
  const connection = key ? await findTikTokCollector(key) : null;

  if (!connection) {
    setResponseStatus(event, 404);

    return null;
  }

  if (limited(`${key}:${getRequestIP(event, { xForwardedFor: true }) ?? ''}`)) {
    setResponseStatus(event, 429);

    return null;
  }

  const raw = await readRawBody(event);
  let body: unknown = null;

  try {
    body = raw && raw.length <= MAX_BODY_BYTES ? JSON.parse(raw) : null;
  }
  catch {}

  const accepted = body !== null && await forwardCollectedEvent(event, connection, body);
  setResponseStatus(event, accepted ? 202 : 400);

  return null;
});
