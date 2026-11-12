export default defineEventHandler(async (event) => {
  const store = requireStore(event);

  try {
    await syncOrderAttributions(store);
  }
  catch (error: any) {
    // Serve what's saved, the next request tries the sync again
    console.error('[attribution] order sync failed', store, error?.response?.status ?? error?.message);
  }

  return prisma.orderAttribution.findMany({
    where: { store },
    orderBy: { orderedAt: 'desc' },
    take: 50,
  });
});
