export default defineNuxtPlugin(() => {
  $fetch('/auth/session', { timeout: 15000 }).catch((error) => {
    console.error('[session] could not start a session', error);
  });
});
