export function openExternal(url: string, event?: MouseEvent) {
  if (window.top === window.self) {
    return;
  }

  event?.preventDefault();
  window.top!.postMessage({ type: 'QANTRA::NAV.REDIRECT.REMOTE', payload: [{ url, newContext: true }] }, '*');
}
