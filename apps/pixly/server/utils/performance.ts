import type { OrderAttribution } from '@prisma/client';
import type { CampaignPerformance, PerformanceMetrics, PerformanceRange, PerformanceView, RecentAdOrder } from '~~/shared/utils/performance';
import { orderOutcome } from '~~/shared/utils/attribution';
import { dayKey, emptyMetrics } from '~~/shared/utils/performance';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_ORDERS = 8;

function addOrder(metrics: PerformanceMetrics, order: OrderAttribution): void {
  const outcome = orderOutcome(order.confirmationStatus, order.shippingStatus);

  metrics.orders++;
  metrics.revenue += order.total;

  // Delivered and returned orders were confirmed first
  if (outcome === 'confirmed' || outcome === 'delivered' || outcome === 'returned') {
    metrics.confirmed++;
  }
  if (outcome === 'delivered') {
    metrics.delivered++;
    metrics.deliveredRevenue += order.total;
  }
  if (outcome === 'returned') {
    metrics.returned++;
  }
  if (outcome === 'canceled') {
    metrics.canceled++;
  }
}

function mostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();

  for (const value of values) {
    value && counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * Puts each Facebook order next to the campaign it came from. The landing URL's
 * utm_id (or a numeric utm_campaign) is the campaign ID; when the seller only
 * set utm_campaign={{campaign.name}}, the name is matched instead.
 */
export async function buildPerformance(store: string, days: PerformanceRange, now = new Date()): Promise<Omit<PerformanceView, 'sync' | 'storeUrl'>> {
  const accounts = await prisma.metaAdAccount.findMany({ where: { store, selected: true } });
  const timezone = accounts[0]?.timezone ?? 'UTC';

  const dates = Array.from({ length: days }, (_, i) => dayKey(new Date(now.getTime() - (days - 1 - i) * DAY_MS), timezone));
  const since = dates[0]!;
  const until = dates.at(-1)!;

  const [spendRows, orders] = await Promise.all([
    prisma.metaCampaignSpend.findMany({
      where: { store, accountId: { in: accounts.map(account => account.id) }, date: { gte: since, lte: until } },
      orderBy: { date: 'asc' },
    }),
    prisma.orderAttribution.findMany({
      // A day of margin for the timezone, trimmed by day below
      where: { store, platform: 'meta', orderedAt: { gte: new Date(now.getTime() - (days + 1) * DAY_MS) } },
      orderBy: { orderedAt: 'desc' },
    }),
  ]);

  const accountNames = new Map(accounts.map(account => [account.id, account.name]));
  const daily = new Map(dates.map(date => [date, { date, spend: 0, orders: 0, delivered: 0 }]));
  const campaigns = new Map<string, CampaignPerformance>();
  const totals = emptyMetrics();
  const unmatched = emptyMetrics();

  function campaign(id: string, name: string, accountId: string | null): CampaignPerformance {
    let entry = campaigns.get(id);

    if (!entry) {
      entry = { id, name, accountName: accountId ? accountNames.get(accountId) ?? null : null, impressions: 0, clicks: 0, ...emptyMetrics() };
      campaigns.set(id, entry);
    }

    return entry;
  }

  // Rows are oldest first, so the latest name of a renamed campaign wins
  for (const row of spendRows) {
    const entry = campaign(row.campaignId, row.campaignName, row.accountId);

    entry.name = row.campaignName;
    entry.spend += row.spend;
    entry.impressions += row.impressions;
    entry.clicks += row.clicks;
    totals.spend += row.spend;
    daily.get(row.date)!.spend += row.spend;
  }

  const idsByName = new Map([...campaigns.values()].map(entry => [entry.name.trim().toLowerCase(), entry.id]));
  const recentOrders: RecentAdOrder[] = [];
  const inRange = orders.filter(order => dayKey(order.orderedAt, timezone) >= since);

  for (const order of inRange) {
    const id = order.campaignId ?? (order.utmCampaign ? idsByName.get(order.utmCampaign.trim().toLowerCase()) : undefined);
    // Orders from a campaign with no spend in range (or in an untracked account) still get a row
    const entry = id ? campaign(id, campaigns.get(id)?.name ?? order.utmCampaign ?? `Campaign ${id}`, null) : null;
    const day = daily.get(dayKey(order.orderedAt, timezone));
    const outcome = orderOutcome(order.confirmationStatus, order.shippingStatus);

    addOrder(totals, order);
    addOrder(entry ?? unmatched, order);

    if (day) {
      day.orders++;
      day.delivered += outcome === 'delivered' ? 1 : 0;
    }

    if (recentOrders.length < RECENT_ORDERS) {
      recentOrders.push({
        ref: order.orderRef,
        orderedAt: order.orderedAt.toISOString(),
        campaignName: entry?.name ?? order.utmCampaign,
        total: order.total,
        currency: order.currency,
        outcome,
      });
    }
  }

  const currencies = new Set([...spendRows.map(row => row.currency), ...accounts.map(account => account.currency)]);

  return {
    range: { days, since, until, timezone },
    spendCurrency: currencies.size === 1 ? [...currencies][0]! : null,
    orderCurrency: mostCommon(inRange.map(order => order.currency)),
    totals,
    campaigns: [...campaigns.values()].sort((a, b) => b.spend - a.spend || b.orders - a.orders),
    unmatched,
    daily: [...daily.values()],
    recentOrders,
  };
}
