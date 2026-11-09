<script setup lang="ts">
import { Alert } from '@youcan/celeste';
import { emptyMetrics, PERFORMANCE_RANGES } from '~~/shared/utils/performance';
import AdAccountsCard from '~/components/ads/AdAccountsCard.vue';
import CampaignTable from '~/components/ads/CampaignTable.vue';
import DailyChart from '~/components/ads/DailyChart.vue';
import MetaConnectHero from '~/components/ads/MetaConnectHero.vue';
import MetaConnectionCard from '~/components/ads/MetaConnectionCard.vue';
import PerformanceKpis from '~/components/ads/PerformanceKpis.vue';
import RecentAdOrders from '~/components/ads/RecentAdOrders.vue';

const {
  connection,
  loading,
  loadError,
  waiting,
  busy,
  load,
  connect,
  reopenLogin,
  cancelWaiting,
  disconnect,
  refreshAccounts,
  saveSelection,
} = useMetaConnection();

const { days, performance, loading: performanceLoading, error: performanceError, load: loadPerformance } = useAdPerformance();

onMounted(load);

const trackedCount = computed(() => connection.value?.adAccounts.filter(account => account.selected).length ?? 0);
const trackedIds = computed(() => connection.value?.adAccounts.filter(account => account.selected).map(account => account.id).join(',') ?? '');

// Loads once connected, and again when the tracked accounts change since their spend comes with them
watch([() => connection.value?.connected, trackedIds], ([connected]) => {
  if (connected) {
    loadPerformance();
  }
});

const syncNote = computed(() => {
  const sync = performance.value?.sync;

  if (!sync?.spendSyncedAt) {
    return null;
  }

  const minutes = Math.max(0, Math.round((Date.now() - new Date(sync.spendSyncedAt).getTime()) / 60000));

  return minutes < 1 ? 'Updated just now' : `Updated ${minutes} min ago`;
});

const steps = [
  { icon: 'i-celeste-meta-fill', title: 'Connect your ad accounts', text: 'Pixly reads daily spend for each campaign.' },
  { icon: 'i-celeste-links-line', title: 'Match orders to campaigns', text: 'Each order keeps the campaign the shopper clicked.' },
  { icon: 'i-celeste-truck-line', title: 'Follow every order', text: 'Confirmed, delivered or returned, straight from your store.' },
];
</script>

<template>
  <Alert
    v-if="loadError"
    state="error"
    variant="lighter"
    size="xs"
    class="col-span-full"
  >
    <template #title>
      Could not load your Facebook connection: {{ loadError }}
    </template>
  </Alert>

  <Alert
    v-if="connection && !connection.available"
    state="warning"
    variant="lighter"
    size="xs"
    class="col-span-full"
  >
    <template #title>
      The Facebook connection isn't set up on this app yet. Add META_APP_ID, META_APP_SECRET and META_LOGIN_CONFIG_ID to the app environment.
    </template>
  </Alert>

  <!-- Loading -->
  <div
    v-if="loading"
    class="p-8 border border-stroke-soft-200 rounded-20px bg-bg-white-0 gap-8 grid col-span-full grid-cols-1 shadow-regular-xs lg:grid-cols-2"
  >
    <div class="space-y-4">
      <div class="rounded-full bg-bg-weak-50 h-5 w-16 animate-pulse" />
      <div class="rounded-8px bg-bg-weak-50 h-7 w-3/4 animate-pulse" />
      <div class="rounded-8px bg-bg-weak-50 h-4 w-full animate-pulse" />
      <div class="rounded-8px bg-bg-weak-50 h-4 w-2/3 animate-pulse" />
    </div>
    <div class="rounded-16px bg-bg-weak-50 h-48 animate-pulse" />
  </div>

  <!-- Not connected -->
  <MetaConnectHero
    v-else-if="!connection?.connected"
    :available="connection?.available ?? false"
    :connecting="busy === 'connect'"
    :waiting="waiting"
    @connect="connect"
    @reopen="reopenLogin"
    @cancel="cancelWaiting"
  />

  <!-- Connected -->
  <template v-else>
    <header class="flex flex-wrap gap-4 col-span-full items-end justify-between">
      <div class="space-y-1">
        <h1 class="text-text-strong-950 title-h5-title">
          Ad performance
        </h1>
        <p class="text-text-sub-600 paragraph-sm">
          Your real cost per order, from the ad click to the delivered package.
        </p>
      </div>
      <div class="flex flex-wrap gap-3 items-center">
        <span v-if="syncNote" class="text-text-soft-400 flex gap-1 paragraph-xs items-center">
          <i
            class="text-14px"
            :class="performanceLoading ? 'i-celeste-loader-4-line animate-spin' : 'i-celeste-time-line'"
          />
          {{ syncNote }}
        </span>
        <div
          class="p-1 border border-stroke-soft-200 rounded-12px bg-bg-white-0 inline-flex gap-1 shadow-regular-xs"
          role="radiogroup"
          aria-label="Period"
        >
          <button
            v-for="range in PERFORMANCE_RANGES"
            :key="range"
            type="button"
            role="radio"
            :aria-checked="days === range"
            class="px-3 py-1 rounded-8px transition-colors label-sm"
            :class="days === range ? 'bg-bg-weak-50 text-text-strong-950 shadow-regular-xs' : 'text-text-sub-600 hover:text-text-strong-950'"
            @click="days = range"
          >
            {{ range }} days
          </button>
        </div>
      </div>
    </header>

    <div class="col-span-full space-y-3">
      <Alert
        v-if="performanceError"
        state="error"
        variant="lighter"
        size="xs"
      >
        <template #title>
          Could not load ad performance: {{ performanceError }}
        </template>
      </Alert>
      <Alert
        v-else-if="performance?.sync.spendError === 'expired'"
        state="warning"
        variant="lighter"
        size="xs"
      >
        <template #title>
          Your Facebook access expired, so spend stopped updating. Reconnect Facebook to resume.
        </template>
      </Alert>
      <Alert
        v-else-if="performance?.sync.spendError || performance?.sync.ordersError"
        state="warning"
        variant="lighter"
        size="xs"
      >
        <template #title>
          {{ performance?.sync.spendError ? 'Facebook' : 'Your store' }} didn't answer this time, so some numbers may be a few minutes old.
        </template>
      </Alert>
      <Alert
        v-if="performance && !performance.spendCurrency"
        state="information"
        variant="lighter"
        size="xs"
      >
        <template #title>
          Your tracked ad accounts use different currencies, so spend totals add them up as plain numbers.
        </template>
      </Alert>

      <PerformanceKpis :performance="performance" :loading="performanceLoading" />
    </div>

    <div class="col-span-8 space-y-4">
      <DailyChart
        v-if="performance"
        :daily="performance.daily"
        :spend-currency="performance.spendCurrency"
      />

      <CampaignTable
        :campaigns="performance?.campaigns ?? []"
        :unmatched="performance?.unmatched ?? emptyMetrics()"
        :spend-currency="performance?.spendCurrency ?? null"
        :loading="performanceLoading"
        :tracked-accounts="trackedCount"
        :store-url="performance?.storeUrl ?? null"
      />

      <AdAccountsCard
        :accounts="connection!.adAccounts"
        :refreshing="busy === 'refresh'"
        :saving="busy === 'save'"
        @save="saveSelection"
        @refresh="refreshAccounts"
        @reconnect="connect"
      />
    </div>

    <aside class="col-span-4 space-y-4">
      <MetaConnectionCard
        :account="connection!.account!"
        :disconnecting="busy === 'disconnect'"
        :connecting="busy === 'connect'"
        @disconnect="disconnect"
        @reconnect="connect"
      />

      <RecentAdOrders v-if="performance" :orders="performance.recentOrders" />

      <p
        v-if="waiting"
        class="text-text-sub-600 px-4 py-3 border border-stroke-soft-200 rounded-12px bg-bg-white-0 flex gap-2 paragraph-sm items-center"
      >
        <i class="i-celeste-loader-4-line text-16px animate-spin" />
        Finish reconnecting in the Facebook window.
      </p>

      <section class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-4">
        <h2 class="text-text-strong-950 label-md">
          How Pixly measures it
        </h2>
        <ol class="space-y-4">
          <li
            v-for="(step, index) in steps"
            :key="step.title"
            class="flex gap-3"
          >
            <span class="text-text-sub-600 border border-stroke-soft-200 rounded-full flex shrink-0 size-6 label-xs items-center justify-center">
              {{ index + 1 }}
            </span>
            <div>
              <p class="text-text-strong-950 label-sm">
                {{ step.title }}
              </p>
              <p class="text-text-sub-600 paragraph-xs">
                {{ step.text }}
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-3">
        <h2 class="text-text-strong-950 label-md">
          More platforms
        </h2>
        <div class="flex gap-3 items-center">
          <span class="text-static-white rounded-8px bg-[#000000] flex shrink-0 size-7 items-center justify-center">
            <i class="i-celeste-tiktok-fill text-14px" />
          </span>
          <span class="text-text-strong-950 flex-1 paragraph-sm">TikTok Ads</span>
          <span class="text-text-sub-600 px-2 py-0.5 rounded-full bg-bg-weak-50 paragraph-xs">Coming soon</span>
        </div>
      </section>
    </aside>
  </template>
</template>
