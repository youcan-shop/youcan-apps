import type { OrderOutcome } from './attribution';

export const PERFORMANCE_RANGES = [7, 30, 90] as const;

export type PerformanceRange = (typeof PERFORMANCE_RANGES)[number];

export interface PerformanceMetrics {
  spend: number;
  orders: number;
  confirmed: number;
  delivered: number;
  returned: number;
  canceled: number;
  // Order totals in the store currency
  revenue: number;
  deliveredRevenue: number;
}

export interface CampaignPerformance extends PerformanceMetrics {
  id: string;
  name: string;
  accountName: string | null;
  impressions: number;
  clicks: number;
}

export interface DailyPerformance {
  // YYYY-MM-DD in the ad account's timezone
  date: string;
  spend: number;
  orders: number;
  delivered: number;
}

export interface RecentAdOrder {
  ref: string;
  orderedAt: string;
  campaignName: string | null;
  total: number;
  currency: string | null;
  outcome: OrderOutcome;
}

export interface PerformanceView {
  range: { days: PerformanceRange; since: string; until: string; timezone: string };
  // null when the tracked ad accounts don't share one currency
  spendCurrency: string | null;
  // The storefront home page, used to build test links
  storeUrl: string | null;
  orderCurrency: string | null;
  totals: PerformanceMetrics;
  campaigns: CampaignPerformance[];
  // Facebook orders whose landing URL doesn't name a campaign Pixly knows
  unmatched: PerformanceMetrics;
  daily: DailyPerformance[];
  recentOrders: RecentAdOrder[];
  sync: {
    spendSyncedAt: string | null;
    ordersSyncedAt: string | null;
    spendError: 'expired' | 'failed' | null;
    ordersError: boolean;
  };
}

export function emptyMetrics(): PerformanceMetrics {
  return { spend: 0, orders: 0, confirmed: 0, delivered: 0, returned: 0, canceled: 0, revenue: 0, deliveredRevenue: 0 };
}

export function costPer(spend: number, count: number): number | null {
  return count > 0 ? spend / count : null;
}

// YYYY-MM-DD of an instant in a timezone, the way Meta dates its insights
export function dayKey(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
  catch {
    return date.toISOString().slice(0, 10);
  }
}

// The link a Facebook ad sends shoppers to, with the URL parameters Pixly matches orders on
export function campaignTestLink(storeUrl: string, campaign: { id: string; name: string }): string {
  const query = new URLSearchParams({
    utm_source: 'facebook',
    utm_medium: 'paid',
    utm_campaign: campaign.name,
    utm_id: campaign.id,
    fbclid: `pixly_test_${Date.now().toString(36)}`,
  });

  return `${storeUrl.replace(/\/$/, '')}/?${query}`;
}
