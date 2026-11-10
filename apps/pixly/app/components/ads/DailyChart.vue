<script setup lang="ts">
import type { DailyMetrics, PerformanceView } from '~~/shared/utils/performance';
import { BarChart, ChartCard, SegmentedControl, SegmentedControlItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@youcan/celeste';
import { costPer } from '~~/shared/utils/performance';

const props = defineProps<{
  performance: PerformanceView;
}>();

// The campaign the chart follows, 'all' for every campaign together
const campaignId = defineModel<string>('campaign', { default: 'all' });

type Metric = 'cost' | 'spend' | 'orders';

const METRICS: { id: Metric; label: string; caption: string }[] = [
  { id: 'cost', label: 'Cost per order', caption: 'On each day with orders: spend so far ÷ orders so far' },
  { id: 'spend', label: 'Spend', caption: 'Ad spend per day' },
  { id: 'orders', label: 'Orders', caption: 'Orders per day' },
];

const metric = ref<Metric>('cost');

const selected = computed(() => props.performance.campaigns.find(campaign => campaign.id === campaignId.value) ?? null);
const daily = computed<DailyMetrics[]>(() => selected.value?.daily ?? props.performance.daily);

const totals = computed(() => daily.value.reduce((sum, day) => ({ spend: sum.spend + day.spend, orders: sum.orders + day.orders }), { spend: 0, orders: 0 }));

const value = computed(() => {
  const { spend, orders } = totals.value;

  return {
    cost: formatMoney(costPer(spend, orders), props.performance.spendCurrency),
    spend: formatMoney(spend, props.performance.spendCurrency),
    orders: formatCount(orders),
  }[metric.value];
});

// Spend and orders rarely land on the same day (ads spend today, the shopper orders tomorrow),
// so cost per order is the running total: spend so far ÷ orders so far in the period
const data = computed(() => {
  let spend = 0;
  let orders = 0;

  return props.performance.dates.map((date, index) => {
    const day = daily.value[index]!;

    spend += day.spend;
    orders += day.orders;

    return {
      day: formatDay(date),
      // A bar only on days with orders, so each one marks a new cost per order. Other days show "—"
      value: metric.value === 'cost' ? (day.orders ? costPer(spend, orders) ?? 0 : 0) : day[metric.value],
    };
  });
});

const current = computed(() => METRICS.find(item => item.id === metric.value)!);
const label = computed(() => current.value.label);
const series = computed(() => [{ key: 'value', name: label.value }]);

function format(amount: number): string {
  if (metric.value === 'orders') {
    return formatCount(amount);
  }

  return metric.value === 'cost' && !amount ? '—' : formatMoney(amount, props.performance.spendCurrency);
}

function tick(amount: number): string {
  return metric.value === 'orders' ? formatCount(amount) : formatMoney(amount, props.performance.spendCurrency);
}
</script>

<template>
  <ChartCard
    :title="selected ? selected.name : 'All campaigns'"
    :value="value"
    :caption="`${current.caption} · ${performance.dates.length} days`"
    class="!rounded-16px"
  >
    <template #toolbar>
      <div class="flex flex-wrap gap-2 items-center">
        <Select v-model="campaignId">
          <SelectTrigger size="xs" class="w-48">
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              All campaigns
            </SelectItem>
            <SelectItem
              v-for="campaign in performance.campaigns"
              :key="campaign.id"
              :value="campaign.id"
            >
              {{ campaign.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <SegmentedControl
          :model-value="metric"
          aria-label="Metric"
          @update:model-value="value => value && (metric = value as Metric)"
        >
          <SegmentedControlItem
            v-for="item in METRICS"
            :key="item.id"
            :value="item.id"
          >
            {{ item.label }}
          </SegmentedControlItem>
        </SegmentedControl>
      </div>
    </template>

    <ClientOnly>
      <BarChart
        :data="data"
        :series="series"
        category="day"
        :format="format"
        :tick-format="tick"
        :dense="data.length > 14"
        legend="none"
        :aria-label="`${label} per day`"
      />
    </ClientOnly>
  </ChartCard>
</template>
