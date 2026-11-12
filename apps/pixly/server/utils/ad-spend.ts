import { dayKey } from '~~/shared/utils/performance';

const SPEND_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const BACKFILL_DAYS = 90;
// Meta keeps adjusting the last few days of spend, so they're pulled again on every sync
const RESYNC_DAYS = 3;

/**
 * Pulls daily spend per campaign for the tracked ad accounts. A day range is
 * replaced as a whole, so campaigns that stopped spending don't keep old rows.
 */
export async function syncMetaSpend(store: string): Promise<void> {
  const connection = await prisma.metaConnection.findUnique({
    where: { store },
    include: { adAccounts: { where: { selected: true } } },
  });
  const graph = useMetaGraph();
  const startedAt = Date.now();

  if (!connection || !graph || (connection.spendSyncedAt && startedAt - connection.spendSyncedAt.getTime() < SPEND_SYNC_INTERVAL_MS)) {
    return;
  }

  const token = openSecret(connection.accessToken);

  for (const account of connection.adAccounts) {
    const timezone = account.timezone ?? 'UTC';
    // Accounts that were just selected have nothing saved yet, so they get the full backfill
    const hasSpend = await prisma.metaCampaignSpend.count({ where: { store, accountId: account.id }, take: 1 });
    const days = hasSpend && connection.spendSyncedAt ? RESYNC_DAYS : BACKFILL_DAYS;
    const since = dayKey(new Date(startedAt - (days - 1) * DAY_MS), timezone);
    const until = dayKey(new Date(startedAt), timezone);

    const insights = await graph.campaignInsights(token, account.id, { since, until });

    await prisma.$transaction([
      prisma.metaCampaignSpend.deleteMany({ where: { store, accountId: account.id, date: { gte: since, lte: until } } }),
      prisma.metaCampaignSpend.createMany({
        data: insights.map(row => ({
          store,
          accountId: account.id,
          campaignId: row.campaign_id,
          date: row.date_start,
          campaignName: row.campaign_name,
          spend: Number(row.spend) || 0,
          impressions: Number(row.impressions) || 0,
          clicks: Number(row.clicks) || 0,
          currency: account.currency,
        })),
      }),
    ]);
  }

  await prisma.metaConnection.update({ where: { store }, data: { spendSyncedAt: new Date(startedAt) } });
}
