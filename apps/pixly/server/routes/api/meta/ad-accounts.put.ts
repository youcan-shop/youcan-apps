export default defineEventHandler(async (event) => {
  const store = requireStore(event);
  const body = await readBody<{ selected?: unknown }>(event);

  if (!Array.isArray(body?.selected) || body.selected.some(id => typeof id !== 'string')) {
    throw createError({ statusCode: 422, statusMessage: 'selected must be a list of ad account IDs' });
  }

  const selected = body.selected as string[];

  await prisma.$transaction([
    prisma.metaAdAccount.updateMany({ where: { store }, data: { selected: false } }),
    prisma.metaAdAccount.updateMany({ where: { store, id: { in: selected } }, data: { selected: true } }),
    // Newly tracked accounts get their spend on the next load instead of after the sync interval
    prisma.metaConnection.update({ where: { store }, data: { spendSyncedAt: null } }),
  ]);

  return metaConnectionView(store);
});
