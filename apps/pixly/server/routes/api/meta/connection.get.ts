export default defineEventHandler(async (event) => {
  const store = requireStore(event);

  return metaConnectionView(store);
});
