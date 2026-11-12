import type { Order } from '~~/lib/youcan';
import { CANCELED_CONFIRMATIONS, FINAL_SHIPPING_STATUSES, parseLandingUrl } from '~~/shared/utils/attribution';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
// YouCan only keeps an order's client details for 90 days
const BACKFILL_MS = 90 * 24 * 60 * 60 * 1000;
// Client details are saved right after the order, so the newest orders are checked again on the next sync
const RECHECK_MS = 10 * 60 * 1000;
const PAGE_SIZE = 50;
const MAX_PAGES = 20;
// Open orders are rechecked until they're delivered, returned or canceled, for up to 60 days
const STATUS_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;
const STATUS_RECHECK_MS = 30 * 60 * 1000;
const STATUS_CHECKS_PER_SYNC = 30;
const STATUS_CONCURRENCY = 5;

function orderState(order: Order) {
  return {
    total: Number(order.total) || 0,
    currency: order.currency ?? null,
    confirmationStatus: order.confirmation_status ?? null,
    shippingStatus: order.shipping_status ?? null,
    statusCheckedAt: new Date(),
  };
}

function attributionRow(store: string, order: Order) {
  const landingUrl = order.client_details?.landing_url;
  const attribution = parseLandingUrl(landingUrl);

  if (!landingUrl || !attribution) {
    return null;
  }

  return {
    store,
    orderId: order.id,
    orderRef: order.ref,
    platform: attribution.platform,
    campaignId: attribution.campaignId,
    clickId: attribution.clickId,
    utmSource: attribution.utm.utm_source ?? null,
    utmMedium: attribution.utm.utm_medium ?? null,
    utmCampaign: attribution.utm.utm_campaign ?? null,
    utmTerm: attribution.utm.utm_term ?? null,
    utmContent: attribution.utm.utm_content ?? null,
    utmId: attribution.utm.utm_id ?? null,
    landingUrl,
    referrer: order.client_details?.referrer ?? null,
    orderedAt: new Date(order.created_at),
    ...orderState(order),
  };
}

/**
 * Saves the ad campaign of every new order. Orders come newest first, so paging
 * stops at the first order older than where the last sync got to.
 */
export async function syncOrderAttributions(store: string): Promise<void> {
  const sync = await prisma.orderSync.findUnique({ where: { store } });
  const startedAt = Date.now();

  if (sync && startedAt - sync.syncedAt.getTime() < SYNC_INTERVAL_MS) {
    return;
  }

  const since = sync?.lastOrderAt ?? new Date(startedAt - BACKFILL_MS);
  const rows: NonNullable<ReturnType<typeof attributionRow>>[] = [];
  let newest = since;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, meta } = await youcan.store.orders.list({
      'include': ['client_details'],
      'limit': PAGE_SIZE,
      page,
      // Orders YouCan Radar flagged as fake at checkout aren't real sales
      'filters[0][field]': 'exclude_fake_orders',
      'filters[0][value]': 1,
    });
    const fresh = data.filter(order => new Date(order.created_at) >= since);

    for (const order of fresh) {
      const orderedAt = new Date(order.created_at);
      const row = attributionRow(store, order);

      newest = orderedAt > newest ? orderedAt : newest;
      row && rows.push(row);
    }

    if (fresh.length < data.length || page >= meta.pagination.total_pages) {
      break;
    }
  }

  const lastOrderAt = new Date(Math.max(since.getTime(), Math.min(newest.getTime(), startedAt - RECHECK_MS)));

  await prisma.$transaction([
    ...rows.map(row => prisma.orderAttribution.upsert({
      where: { store_orderId: { store, orderId: row.orderId } },
      create: row,
      update: row,
    })),
    prisma.orderSync.upsert({
      where: { store },
      create: { store, lastOrderAt, syncedAt: new Date(startedAt) },
      update: { lastOrderAt, syncedAt: new Date(startedAt) },
    }),
  ]);

  await refreshOrderStatuses(store);
}

/**
 * Confirmation and delivery happen days after the order, so ad orders that aren't
 * settled yet are fetched again, least recently checked first.
 */
async function refreshOrderStatuses(store: string): Promise<void> {
  const now = Date.now();
  const open = await prisma.orderAttribution.findMany({
    where: {
      store,
      orderedAt: { gte: new Date(now - STATUS_WINDOW_MS) },
      AND: [
        { OR: [{ statusCheckedAt: null }, { statusCheckedAt: { lt: new Date(now - STATUS_RECHECK_MS) } }] },
        // Rows saved before statuses were stored have none yet, so null counts as open
        { OR: [{ shippingStatus: null }, { shippingStatus: { notIn: FINAL_SHIPPING_STATUSES } }] },
        { OR: [{ confirmationStatus: null }, { confirmationStatus: { notIn: CANCELED_CONFIRMATIONS } }] },
      ],
    },
    orderBy: { statusCheckedAt: { sort: 'asc', nulls: 'first' } },
    select: { orderId: true },
    take: STATUS_CHECKS_PER_SYNC,
  });

  for (let i = 0; i < open.length; i += STATUS_CONCURRENCY) {
    await Promise.all(open.slice(i, i + STATUS_CONCURRENCY).map(async ({ orderId }) => {
      try {
        const order = await youcan.store.orders.get(orderId);

        await prisma.orderAttribution.update({
          where: { store_orderId: { store, orderId } },
          data: orderState(order),
        });
      }
      catch (error: any) {
        // A deleted order can't settle, so it stops being checked
        if (error?.response?.status === 404) {
          await prisma.orderAttribution.delete({ where: { store_orderId: { store, orderId } } });
        }
        else {
          // Moves it to the back of the queue so one failing order doesn't block the rest
          await prisma.orderAttribution.update({
            where: { store_orderId: { store, orderId } },
            data: { statusCheckedAt: new Date() },
          });
        }
      }
    }));
  }
}
