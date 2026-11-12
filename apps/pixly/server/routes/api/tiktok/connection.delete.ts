export default defineEventHandler(async (event) => {
  await deleteTikTokConnection(requireStore(event), true);

  return tiktokConnectionView(requireStore(event));
});
