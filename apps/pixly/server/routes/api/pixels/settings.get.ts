export default defineEventHandler(async () => {
  return readPixelSettings(await getStoreId());
});
