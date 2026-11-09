<script setup lang="ts">
import type { PerformanceView } from '~~/shared/utils/performance';
import { costPer } from '~~/shared/utils/performance';

const props = defineProps<{
  performance: PerformanceView | null;
  loading: boolean;
}>();

const tiles = computed(() => {
  const view = props.performance;

  if (!view) {
    return [];
  }

  const { totals, spendCurrency } = view;
  const costPerDelivered = costPer(totals.spend, totals.delivered);

  return [
    {
      label: 'Ad spend',
      icon: 'i-celeste-wallet-3-line',
      value: spendCurrency ? formatMoney(totals.spend, spendCurrency) : formatMoney(totals.spend, null),
      detail: `${view.campaigns.filter(campaign => campaign.spend > 0).length} campaigns with spend`,
    },
    {
      label: 'Orders from Facebook',
      icon: 'i-celeste-shopping-bag-3-line',
      value: formatCount(totals.orders),
      detail: `${formatCount(totals.confirmed)} confirmed · ${formatPercent(totals.confirmed, totals.orders)}`,
    },
    {
      label: 'Delivered',
      icon: 'i-celeste-truck-line',
      value: formatCount(totals.delivered),
      detail: `${formatPercent(totals.delivered, totals.orders)} of orders · ${formatCount(totals.returned)} returned`,
    },
    {
      label: 'Cost per delivered order',
      icon: 'i-celeste-price-tag-3-line',
      value: formatMoney(costPerDelivered, spendCurrency),
      detail: `${formatMoney(costPer(totals.spend, totals.orders), spendCurrency)} per order placed`,
      highlight: true,
    },
  ];
});
</script>

<template>
  <div class="gap-3 grid grid-cols-2 xl:grid-cols-4">
    <template v-if="loading && !performance">
      <div
        v-for="index in 4"
        :key="index"
        class="p-4 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-3"
      >
        <div class="rounded-full bg-bg-weak-50 h-4 w-24 animate-pulse" />
        <div class="rounded-8px bg-bg-weak-50 h-7 w-20 animate-pulse" />
        <div class="rounded-full bg-bg-weak-50 h-3 w-32 animate-pulse" />
      </div>
    </template>

    <div
      v-for="tile in tiles"
      v-else
      :key="tile.label"
      class="p-4 border rounded-16px shadow-regular-xs space-y-2"
      :class="tile.highlight ? 'border-primary-alpha-16 bg-primary-alpha-10' : 'border-stroke-soft-200 bg-bg-white-0'"
    >
      <div class="text-text-sub-600 flex gap-1.5 label-xs items-center">
        <i :class="tile.icon" class="text-14px" />
        {{ tile.label }}
      </div>
      <p class="text-text-strong-950 title-h5-title tabular-nums">
        {{ tile.value }}
      </p>
      <p class="text-text-sub-600 paragraph-xs">
        {{ tile.detail }}
      </p>
    </div>
  </div>
</template>
