export default defineEventHandler(async (event) => {
  return tiktokConnectionView(requireStore(event));
});
