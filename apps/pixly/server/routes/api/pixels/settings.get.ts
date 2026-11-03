export default defineEventHandler(async () => {
  const storeId = await getStoreId();

  await syncCollectorUrlQuietly(storeId);

  return readPixelSettings(storeId);
});
