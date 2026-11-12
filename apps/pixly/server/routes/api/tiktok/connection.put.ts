export default defineEventHandler(async (event) => {
  const store = requireStore(event);
  const existing = await prisma.tikTokConnection.findUnique({ where: { store } });
  const { input, errors } = validateTikTokInput((await readBody(event)) ?? {}, !!existing);

  if (Object.keys(errors).length) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Invalid TikTok settings',
      data: { errors },
    });
  }

  return saveTikTokConnection(event, store, input);
});
