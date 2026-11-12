export default defineEventHandler(async (event) => {
  const store = requireStore(event);
  const token = await metaAccessToken(store);
  const graph = useMetaGraph();

  // Best effort: the seller can always remove Pixly from their Facebook business settings too.
  if (token && graph) {
    await graph.revoke(token).catch(error => console.warn('[meta] could not revoke token', error.message));
  }

  await prisma.metaConnection.deleteMany({ where: { store } });

  return metaConnectionView(store);
});
