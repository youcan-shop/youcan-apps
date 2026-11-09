<script setup lang="ts">
import type { OrderOutcome } from '~~/shared/utils/attribution';
import type { RecentAdOrder } from '~~/shared/utils/performance';

defineProps<{
  orders: RecentAdOrder[];
}>();

const OUTCOMES: Record<OrderOutcome, { label: string; dot: string }> = {
  pending: { label: 'Pending', dot: 'bg-stroke-sub-300' },
  confirmed: { label: 'Confirmed', dot: 'bg-state-information-base' },
  delivered: { label: 'Delivered', dot: 'bg-state-success-base' },
  returned: { label: 'Returned', dot: 'bg-state-warning-base' },
  canceled: { label: 'Canceled', dot: 'bg-state-error-base' },
};

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (minutes < 60) {
    return format.format(-minutes, 'minute');
  }
  if (minutes < 60 * 24) {
    return format.format(-Math.round(minutes / 60), 'hour');
  }

  return format.format(-Math.round(minutes / (60 * 24)), 'day');
}
</script>

<template>
  <section class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-3">
    <h2 class="text-text-strong-950 label-md">
      Latest Facebook orders
    </h2>

    <p v-if="!orders.length" class="text-text-sub-600 paragraph-sm">
      Orders placed after a click on a Facebook or Instagram ad show up here.
    </p>

    <ul v-else class="divide-stroke-soft-200 divide-y">
      <li
        v-for="order in orders"
        :key="order.ref"
        class="py-2.5 flex gap-3 items-center first:pt-0 last:pb-0"
      >
        <div class="flex-1 min-w-0">
          <p class="text-text-strong-950 label-sm">
            #{{ order.ref }}
            <span class="text-text-soft-400 paragraph-xs">· {{ timeAgo(order.orderedAt) }}</span>
          </p>
          <p class="text-text-sub-600 truncate paragraph-xs">
            {{ order.campaignName ?? 'Campaign not in the link' }}
          </p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-text-strong-950 paragraph-sm tabular-nums">
            {{ formatMoney(order.total, order.currency) }}
          </p>
          <p class="text-text-sub-600 flex gap-1.5 paragraph-xs items-center justify-end">
            <span class="rounded-full size-1.5" :class="OUTCOMES[order.outcome].dot" />
            {{ OUTCOMES[order.outcome].label }}
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>
