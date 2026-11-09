<script setup lang="ts">
import type { DailyPerformance } from '~~/shared/utils/performance';
import { costPer } from '~~/shared/utils/performance';

const props = defineProps<{
  daily: DailyPerformance[];
  spendCurrency: string | null;
}>();

type Metric = 'spend' | 'orders' | 'delivered';

const METRICS: { id: Metric; label: string }[] = [
  { id: 'spend', label: 'Spend' },
  { id: 'orders', label: 'Orders' },
  { id: 'delivered', label: 'Delivered' },
];

const metric = ref<Metric>('spend');
const hovered = ref<number | null>(null);

function format(value: number, id: Metric = metric.value): string {
  return id === 'spend' ? formatMoney(value, props.spendCurrency) : formatCount(value);
}

// Rounds the top of the axis up to 1, 2 or 5 times a power of ten, so gridlines land on round numbers
function niceMax(value: number): number {
  if (value <= 0) {
    return metric.value === 'spend' ? 10 : 4;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find(factor => factor * magnitude >= value)!;

  return step * magnitude;
}

const max = computed(() => niceMax(Math.max(...props.daily.map(day => day[metric.value]))));
const ticks = computed(() => [1, 0.5].map(ratio => max.value * ratio));
const total = computed(() => props.daily.reduce((sum, day) => sum + day[metric.value], 0));

const labelIndexes = computed(() => {
  const last = props.daily.length - 1;

  return new Set([0, Math.round(last / 2), last]);
});

const hoveredDay = computed(() => (hovered.value === null ? null : props.daily[hovered.value] ?? null));

const tooltipStyle = computed(() => {
  if (hovered.value === null) {
    return {};
  }

  const position = ((hovered.value + 0.5) / props.daily.length) * 100;

  // Keeps the tooltip inside the card near the edges
  return position > 70 ? { right: `${100 - position}%` } : { left: `${position}%` };
});
</script>

<template>
  <section class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-4">
    <header class="flex flex-wrap gap-3 items-start justify-between">
      <div>
        <h2 class="text-text-strong-950 label-md">
          Daily {{ METRICS.find(item => item.id === metric)!.label.toLowerCase() }}
        </h2>
        <p class="text-text-sub-600 paragraph-sm">
          {{ format(total) }} over {{ daily.length }} days
        </p>
      </div>

      <div
        class="p-0.5 rounded-10px bg-bg-weak-50 inline-flex"
        role="radiogroup"
        aria-label="Metric"
      >
        <button
          v-for="item in METRICS"
          :key="item.id"
          type="button"
          role="radio"
          :aria-checked="metric === item.id"
          class="px-2.5 py-1 rounded-8px transition-colors label-xs"
          :class="metric === item.id ? 'bg-bg-white-0 text-text-strong-950 shadow-regular-xs' : 'text-text-sub-600 hover:text-text-strong-950'"
          @click="metric = item.id"
        >
          {{ item.label }}
        </button>
      </div>
    </header>

    <div class="pl-12 relative">
      <!-- Gridlines and their labels -->
      <div class="inset-y-0 left-12 right-0 absolute">
        <div
          v-for="tick in ticks"
          :key="tick"
          class="border-t border-stroke-soft-200 border-dashed left-0 right-0 absolute"
          :style="{ bottom: `${(tick / max) * 100}%` }"
        >
          <span class="text-text-soft-400 pr-2 text-right w-12 paragraph-xs right-full absolute tabular-nums -translate-y-1/2">
            {{ format(tick) }}
          </span>
        </div>
      </div>

      <div
        class="flex gap-0.5 h-48 items-end relative"
        @mouseleave="hovered = null"
      >
        <button
          v-for="(day, index) in daily"
          :key="day.date"
          type="button"
          class="flex flex-1 h-full min-w-0 items-end focus-visible:outline-none"
          :aria-label="`${formatDay(day.date)}: ${format(day[metric])}`"
          @mouseenter="hovered = index"
          @focus="hovered = index"
          @blur="hovered = null"
        >
          <span
            class="rounded-t-4px w-full transition-opacity"
            :class="[
              day[metric] > 0 ? 'bg-primary-base' : '',
              hovered !== null && hovered !== index ? 'opacity-40' : '',
            ]"
            :style="{ height: day[metric] > 0 ? `max(2px, ${(day[metric] / max) * 100}%)` : '0' }"
          />
        </button>

        <div
          v-if="hoveredDay"
          class="mb-2 px-3 py-2 border border-stroke-soft-200 rounded-10px bg-bg-white-0 min-w-44 pointer-events-none shadow-regular-md bottom-full absolute z-10 space-y-1"
          :style="tooltipStyle"
        >
          <p class="text-text-strong-950 label-xs">
            {{ formatDay(hoveredDay.date, { weekday: 'short',
                                            month: 'short',
                                            day: 'numeric' }) }}
          </p>
          <dl class="paragraph-xs space-y-0.5">
            <div
              v-for="item in METRICS"
              :key="item.id"
              class="flex gap-4 justify-between"
              :class="item.id === metric ? 'text-text-strong-950' : 'text-text-sub-600'"
            >
              <dt>{{ item.label }}</dt>
              <dd class="tabular-nums">
                {{ format(hoveredDay[item.id], item.id) }}
              </dd>
            </div>
            <div class="text-text-sub-600 pt-1 border-t border-stroke-soft-200 flex gap-4 justify-between">
              <dt>Cost / delivered</dt>
              <dd class="tabular-nums">
                {{ formatMoney(costPer(hoveredDay.spend, hoveredDay.delivered), spendCurrency) }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="mt-2 h-4 relative">
        <span
          v-for="index in labelIndexes"
          :key="index"
          class="text-text-soft-400 whitespace-nowrap paragraph-xs absolute"
          :class="index === 0 ? 'left-0' : index === daily.length - 1 ? 'right-0' : '-translate-x-1/2'"
          :style="index > 0 && index < daily.length - 1 ? { left: `${((index + 0.5) / daily.length) * 100}%` } : {}"
        >
          {{ formatDay(daily[index]!.date) }}
        </span>
      </div>
    </div>
  </section>
</template>
