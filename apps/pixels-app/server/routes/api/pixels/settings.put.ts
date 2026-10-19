export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { settings, errors } = validatePixelSettings(body ?? {});

  if (Object.keys(errors).length) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Invalid pixel settings',
      data: { errors },
    });
  }

  const storeId = await getStoreId();
  await writePixelSettings(storeId, settings);

  return readPixelSettings(storeId);
});
