export default defineEventHandler(async (event) => {
  const store = requireStore(event);

  await syncCollectorUrlQuietly();

  return metaConnectionView(store);
});
