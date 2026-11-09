import type { PerformanceRange, PerformanceView } from '~~/shared/utils/performance';
import { MetaGraphError } from '~~/lib/meta/graph';
import { PERFORMANCE_RANGES } from '~~/shared/utils/performance';

export default defineEventHandler(async (event): Promise<PerformanceView> => {
  const store = requireStore(event);
  const days = Number(getQuery(event).days ?? 30) as PerformanceRange;

  if (!PERFORMANCE_RANGES.includes(days)) {
    throw createError({ statusCode: 422, statusMessage: `days must be one of ${PERFORMANCE_RANGES.join(', ')}` });
  }

  // Both syncs are throttled and best effort: what's already saved is served when they fail
  const [orders, spend] = await Promise.allSettled([syncOrderAttributions(store), syncMetaSpend(store)]);

  if (orders.status === 'rejected') {
    console.error('[performance] order sync failed', store, orders.reason?.response?.status ?? orders.reason?.message);
  }
  if (spend.status === 'rejected') {
    console.error('[performance] spend sync failed', store, spend.reason?.message);
  }

  const [performance, connection, orderSync, storeUrl] = await Promise.all([
    buildPerformance(store, days),
    prisma.metaConnection.findUnique({ where: { store }, select: { spendSyncedAt: true } }),
    prisma.orderSync.findUnique({ where: { store } }),
    youcan.store.info().then(info => (info.domain ? (/^https?:\/\//.test(info.domain) ? info.domain : `https://${info.domain}`) : null), () => null),
  ]);

  const spendError = spend.status === 'rejected'
    ? (spend.reason instanceof MetaGraphError && spend.reason.code === 190 ? 'expired' : 'failed')
    : null;

  return {
    ...performance,
    storeUrl,
    sync: {
      spendSyncedAt: connection?.spendSyncedAt?.toISOString() ?? null,
      ordersSyncedAt: orderSync?.syncedAt.toISOString() ?? null,
      spendError,
      ordersError: orders.status === 'rejected',
    },
  };
});
