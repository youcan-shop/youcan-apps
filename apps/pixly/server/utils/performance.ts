import type { OrderAttribution } from '@prisma/client';
import type { CampaignPerformance, DailyMetrics, PerformanceMetrics, PerformancePeriod, PerformanceView, RecentAdOrder } from '~~/shared/utils/performance';
import { orderOutcome } from '~~/shared/utils/attribution';
import { dayKey, emptyMetrics, periodDates } from '~~/shared/utils/performance';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_ORDERS = 8;

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
 *
 * Every real order counts, whatever its delivery status: only canceled orders
 * are left out. Fake orders are already skipped when orders are synced.
 */
export async function buildPerformance(store: string, period: PerformancePeriod, now = new Date()): Promise<Omit<PerformanceView, 'sync' | 'storeUrl'>> {
  const accounts = await prisma.metaAdAccount.findMany({ where: { store, selected: true } });
  const timezone = accounts[0]?.timezone ?? 'UTC';

  const dates = periodDates(period, dayKey(now, timezone));
  const since = dates[0]!;
  const until = dates.at(-1)!;
  const dayIndex = new Map(dates.map((date, index) => [date, index]));
  const emptyDaily = (): DailyMetrics[] => dates.map(() => ({ spend: 0, orders: 0 }));

  const [spendRows, orders] = await Promise.all([
    prisma.metaCampaignSpend.findMany({
      where: { store, accountId: { in: accounts.map(account => account.id) }, date: { gte: since, lte: until } },
      orderBy: { date: 'asc' },
    }),
    prisma.orderAttribution.findMany({
      // A day of margin on each side for the timezone, trimmed by day below
      where: {
        store,
        platform: 'meta',
        orderedAt: { gte: new Date(Date.parse(`${since}T00:00:00Z`) - DAY_MS), lt: new Date(Date.parse(`${until}T00:00:00Z`) + 2 * DAY_MS) },
      },
      orderBy: { orderedAt: 'desc' },
    }),
  ]);

  const accountNames = new Map(accounts.map(account => [account.id, account.name]));
  const campaigns = new Map<string, CampaignPerformance>();
  const totals = emptyMetrics();
  const daily = emptyDaily();
  const unmatched = { ...emptyMetrics(), daily: emptyDaily() };

  function campaign(id: string, name: string, accountId: string | null): CampaignPerformance {
    let entry = campaigns.get(id);

    if (!entry) {
      entry = { id, name, accountName: accountId ? accountNames.get(accountId) ?? null : null, impressions: 0, clicks: 0, daily: emptyDaily(), ...emptyMetrics() };
      campaigns.set(id, entry);
    }

    return entry;
  }

  // Rows are oldest first, so the latest name of a renamed campaign wins
  for (const row of spendRows) {
    const entry = campaign(row.campaignId, row.campaignName, row.accountId);
    const index = dayIndex.get(row.date)!;

    entry.name = row.campaignName;
    entry.spend += row.spend;
    entry.impressions += row.impressions;
    entry.clicks += row.clicks;
    entry.daily[index]!.spend += row.spend;
    totals.spend += row.spend;
    daily[index]!.spend += row.spend;
  }

  const idsByName = new Map([...campaigns.values()].map(entry => [entry.name.trim().toLowerCase(), entry.id]));
  const recentOrders: RecentAdOrder[] = [];
  const inPeriod = orders
    .map(order => ({ order, index: dayIndex.get(dayKey(order.orderedAt, timezone)) }))
    .filter((item): item is { order: OrderAttribution; index: number } => item.index !== undefined);

  for (const { order, index } of inPeriod) {
    const id = order.campaignId ?? (order.utmCampaign ? idsByName.get(order.utmCampaign.trim().toLowerCase()) : undefined);
    // Orders from a campaign with no spend in the period (or in an untracked account) still get a row
    const entry = id ? campaign(id, campaigns.get(id)?.name ?? order.utmCampaign ?? `Campaign ${id}`, null) : null;
    const bucket: PerformanceMetrics & { daily: DailyMetrics[] } = entry ?? unmatched;
    const outcome = orderOutcome(order.confirmationStatus, order.shippingStatus);

    if (outcome === 'canceled') {
      totals.canceled++;
      bucket.canceled++;
    }
    else {
      totals.orders++;
      totals.revenue += order.total;
      daily[index]!.orders++;
      bucket.orders++;
      bucket.revenue += order.total;
      bucket.daily[index]!.orders++;
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
    period,
    dates,
    timezone,
    spendCurrency: currencies.size === 1 ? [...currencies][0]! : null,
    orderCurrency: mostCommon(inPeriod.map(({ order }) => order.currency)),
    totals,
    daily,
    campaigns: [...campaigns.values()].sort((a, b) => b.spend - a.spend || b.orders - a.orders),
    unmatched,
    recentOrders,
  };
}
