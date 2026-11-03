import type { MetaConnectionView } from '~~/shared/utils/meta';
import { openExternal } from '~/composables/use-external-link';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export function describeApiError(error: any): string {
  return error?.data?.statusMessage ?? error?.data?.message ?? error?.statusMessage ?? error?.message ?? 'Unknown error';
}

export function useMetaConnection() {
  const { $api } = useNuxtApp();
  const qantra = useQantra();

  const connection = ref<MetaConnectionView | null>(null);
  const loading = ref(true);
  const loadError = ref<string | null>(null);
  const waiting = ref(false);
  const busy = ref<'connect' | 'disconnect' | 'refresh' | 'save' | null>(null);

  let loginUrl: string | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let pollStartedAt = 0;

  async function load() {
    try {
      connection.value = await $api<MetaConnectionView>('/api/meta/connection');
      loadError.value = null;
    }
    catch (error) {
      loadError.value = describeApiError(error);
    }
    finally {
      loading.value = false;
    }
  }

  function stopWaiting() {
    waiting.value = false;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function onConnected() {
    stopWaiting();
    qantra.toast.show({ title: 'Facebook connected', description: 'Pick the ad accounts you want Pixly to track.', type: 'success' });
  }

  // The login runs in another window, which can't always talk back to this iframe, so we poll.
  async function poll() {
    pollTimer = null;
    if (!waiting.value) {
      return;
    }

    await load();

    if (connection.value?.connected) {
      onConnected();

      return;
    }

    if (Date.now() - pollStartedAt > POLL_TIMEOUT_MS) {
      stopWaiting();

      return;
    }

    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
  }

  function openLogin(url: string, popup?: Window | null) {
    if (popup && !popup.closed) {
      popup.location.href = url;

      return;
    }

    const opened = window.open(url, 'pixly-meta', 'popup,width=600,height=760');

    if (!opened) {
      // Popups blocked by the seller area sandbox: ask the host to open a new tab instead.
      openExternal(url);
    }
  }

  async function connect() {
    // Open the window during the click so popup blockers allow it, then point it at Facebook.
    const popup = window.open('about:blank', 'pixly-meta', 'popup,width=600,height=760');
    busy.value = 'connect';

    try {
      ({ url: loginUrl } = await $api<{ url: string }>('/api/meta/connect', { method: 'POST' }));
      openLogin(loginUrl, popup);

      waiting.value = true;
      pollStartedAt = Date.now();
      pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    }
    catch (error) {
      popup?.close();
      qantra.toast.show({ title: 'Could not start the connection', description: describeApiError(error), type: 'error' });
    }
    finally {
      busy.value = null;
    }
  }

  function reopenLogin() {
    if (loginUrl) {
      openLogin(loginUrl);
    }
  }

  async function run(action: NonNullable<typeof busy.value>, request: () => Promise<MetaConnectionView>, success?: { title: string; description: string }) {
    busy.value = action;

    try {
      connection.value = await request();
      if (success) {
        qantra.toast.show({ ...success, type: 'success' });
      }

      return true;
    }
    catch (error) {
      qantra.toast.show({ title: 'Something went wrong', description: describeApiError(error), type: 'error' });

      return false;
    }
    finally {
      busy.value = null;
    }
  }

  function disconnect() {
    return run('disconnect', () => $api<MetaConnectionView>('/api/meta/connection', { method: 'DELETE' }), {
      title: 'Facebook disconnected',
      description: 'Pixly no longer has access to your ad accounts.',
    });
  }

  function refreshAccounts() {
    return run('refresh', () => $api<MetaConnectionView>('/api/meta/ad-accounts/refresh', { method: 'POST' }), {
      title: 'Ad accounts updated',
      description: 'The list now matches your Facebook access.',
    });
  }

  function saveSelection(selected: string[]) {
    return run('save', () => $api<MetaConnectionView>('/api/meta/ad-accounts', { method: 'PUT', body: { selected } }), {
      title: 'Selection saved',
      description: 'Pixly will track spend for these ad accounts.',
    });
  }

  function onMessage(event: MessageEvent) {
    if (event.origin === location.origin && event.data?.type === 'pixly:meta' && waiting.value) {
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
      poll();
    }
  }

  onMounted(() => window.addEventListener('message', onMessage));
  onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage);
    stopWaiting();
  });

  return {
    connection,
    loading,
    loadError,
    waiting,
    busy,
    load,
    connect,
    reopenLogin,
    cancelWaiting: stopWaiting,
    disconnect,
    refreshAccounts,
    saveSelection,
  };
}
