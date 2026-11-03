import { MetaGraphError } from '~~/lib/meta/graph';

interface CallbackResult {
  ok: boolean;
  title: string;
  message: string;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const result = await handleCallback(event, query);

  setHeader(event, 'Content-Type', 'text/html; charset=utf-8');
  setHeader(event, 'Cache-Control', 'no-store');

  return renderPage(result);
});

async function handleCallback(event: Parameters<typeof metaRedirectUri>[0], query: Record<string, unknown>): Promise<CallbackResult> {
  if (query.error) {
    const cancelled = query.error === 'access_denied';

    return {
      ok: false,
      title: cancelled ? 'Connection cancelled' : 'Facebook returned an error',
      message: cancelled
        ? 'Nothing was shared with Pixly. You can close this window and try again whenever you\'re ready.'
        : String(query.error_description ?? query.error),
    };
  }

  const state = typeof query.state === 'string' ? readOAuthState(query.state) : null;

  if (!state) {
    return {
      ok: false,
      title: 'This link has expired',
      message: 'Go back to Pixly and click "Continue with Facebook" again.',
    };
  }

  if (typeof query.code !== 'string' || !query.code) {
    return {
      ok: false,
      title: 'Something went wrong',
      message: 'Facebook didn\'t send an authorization code. Go back to Pixly and try again.',
    };
  }

  try {
    const graph = requireMetaGraph();
    const token = await graph.exchangeCode(query.code, metaRedirectUri(event));
    await saveMetaConnection(state.store, graph, token);
  }
  catch (error) {
    console.error('[meta] callback failed', state.store, error);

    return {
      ok: false,
      title: 'Could not connect Facebook',
      message: error instanceof MetaGraphError
        ? error.message
        : 'An unexpected error happened. Go back to Pixly and try again.',
    };
  }

  return {
    ok: true,
    title: 'Facebook is connected',
    message: 'You can close this window. Your ad accounts are now showing in Pixly.',
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[char]!);
}

function renderPage({ ok, title, message }: CallbackResult): string {
  const icon = ok
    ? '<path d="M20 6 9 17l-5-5" />'
    : '<path d="M12 8v5" /><path d="M12 16.5h.01" />';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Pixly</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100svh; display: grid; place-items: center; padding: 24px;
      background: #f7f7f7; color: #171717;
      font: 14px/20px Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      width: 100%; max-width: 400px; padding: 32px; text-align: center;
      background: #fff; border: 1px solid #ebebeb; border-radius: 20px;
      box-shadow: 0 16px 32px -12px rgba(14, 18, 27, .1);
    }
    .icon {
      width: 48px; height: 48px; margin: 0 auto 20px; display: grid; place-items: center; border-radius: 999px;
      background: ${ok ? '#e0faec' : '#ffebec'}; color: ${ok ? '#1fc16b' : '#fb3748'};
    }
    h1 { margin: 0 0 8px; font-size: 18px; line-height: 24px; font-weight: 600; letter-spacing: -.015em; }
    p { margin: 0; color: #5c5c5c; }
    button {
      margin-top: 24px; width: 100%; height: 40px; border-radius: 10px; border: 1px solid #ebebeb;
      background: #fff; color: #171717; font: inherit; font-weight: 500; cursor: pointer;
    }
    button:hover { background: #f7f7f7; }
    .hint { margin-top: 12px; font-size: 12px; color: #a3a3a3; }
  </style>
</head>
<body>
  <main class="card">
    <div class="icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
    </div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <button type="button" onclick="window.close()">Close window</button>
    ${ok ? '<p class="hint">This window closes by itself.</p>' : ''}
  </main>
  <script>
    try { window.opener && window.opener.postMessage({ type: 'pixly:meta', ok: ${ok} }, location.origin); } catch (e) {}
    ${ok ? 'setTimeout(function () { window.close(); }, 1500);' : ''}
  </script>
</body>
</html>`;
}
