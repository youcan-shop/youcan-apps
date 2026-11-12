export default defineEventHandler(async (event) => {
  const store = requireStore(event);
  const graph = requireMetaGraph();

  return {
    url: graph.loginUrl({
      redirectUri: metaRedirectUri(event),
      configId: useRuntimeConfig().metaLoginConfigId,
      state: signOAuthState(store),
    }),
  };
});
