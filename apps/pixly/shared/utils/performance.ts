import type { OrderOutcome } from './attribution';

export const PERFORMANCE_PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This week' },
  { id: 'last_7', label: 'Last 7 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_30', label: 'Last 30 days' },
  { id: 'last_90', label: 'Last 90 days' },
] as const;

export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number]['id'];

export interface PerformanceMetrics {
  spend: number;
  // Real orders: canceled ones aren't counted, fake ones never reach Pixly
  orders: number;
  canceled: number;
  // Total of the real orders, in the store currency
  revenue: number;
}

export interface DailyMetrics {
  spend: number;
  orders: number;
}

export interface CampaignPerformance extends PerformanceMetrics {
  id: string;
  name: string;
  accountName: string | null;
  impressions: number;
  clicks: number;
  // Lines up with PerformanceView.dates
  daily: DailyMetrics[];
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
  period: PerformancePeriod;
  // YYYY-MM-DD days of the period in the ad account's timezone
  dates: string[];
  timezone: string;
  // null when the tracked ad accounts don't share one currency
  spendCurrency: string | null;
  // The storefront home page, used to build test links
  storeUrl: string | null;
  orderCurrency: string | null;
  totals: PerformanceMetrics;
  daily: DailyMetrics[];
  campaigns: CampaignPerformance[];
  // Facebook orders whose landing URL doesn't name a campaign Pixly knows
  unmatched: PerformanceMetrics & { daily: DailyMetrics[] };
  recentOrders: RecentAdOrder[];
  sync: {
    spendSyncedAt: string | null;
    ordersSyncedAt: string | null;
    spendError: 'expired' | 'failed' | null;
    ordersError: boolean;
  };
}

export function isPerformancePeriod(value: unknown): value is PerformancePeriod {
  return PERFORMANCE_PERIODS.some(period => period.id === value);
}

export function emptyMetrics(): PerformanceMetrics {
  return { spend: 0, orders: 0, canceled: 0, revenue: 0 };
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

function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

// Every day of a period, oldest first. Weeks start on Monday.
export function periodDates(period: PerformancePeriod, today: string): string[] {
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const [first, last] = {
    today: [today, today],
    yesterday: [shiftDay(today, -1), shiftDay(today, -1)],
    this_week: [shiftDay(today, -weekday), today],
    last_7: [shiftDay(today, -6), today],
    this_month: [`${today.slice(0, 8)}01`, today],
    last_30: [shiftDay(today, -29), today],
    last_90: [shiftDay(today, -89), today],
  }[period];

  const dates: string[] = [];

  for (let day = first; day <= last; day = shiftDay(day, 1)) {
    dates.push(day);
  }

  return dates;
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
