<script setup lang="ts">
import { Alert } from '@youcan/celeste';
import AdAccountsCard from '~/components/ads/AdAccountsCard.vue';
import MetaConnectHero from '~/components/ads/MetaConnectHero.vue';
import MetaConnectionCard from '~/components/ads/MetaConnectionCard.vue';

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

onMounted(load);

const trackedCount = computed(() => connection.value?.adAccounts.filter(account => account.selected).length ?? 0);

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
      <div class="text-text-sub-600 px-3 py-1.5 border border-stroke-soft-200 rounded-full bg-bg-white-0 paragraph-sm">
        <span class="text-text-strong-950 label-sm">{{ trackedCount }}</span>
        {{ trackedCount === 1 ? 'ad account' : 'ad accounts' }} tracked
      </div>
    </header>

    <div class="col-span-8 space-y-4">
      <section class="border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs overflow-hidden">
        <header class="px-5 py-4 border-b border-stroke-soft-200">
          <h2 class="text-text-strong-950 label-md">
            Campaigns
          </h2>
          <p class="text-text-sub-600 paragraph-sm">
            Spend, orders and cost per delivered order for each campaign.
          </p>
        </header>

        <div class="text-text-soft-400 px-5 py-2.5 border-b border-stroke-soft-200 bg-bg-weak-50 gap-4 grid-cols-[2fr_1fr_1fr_1fr_1fr] hidden uppercase subheading-xxs sm:grid">
          <span>Campaign</span>
          <span class="text-right">Spend</span>
          <span class="text-right">Orders</span>
          <span class="text-right">Delivered</span>
          <span class="text-right">Cost / delivered</span>
        </div>

        <div class="px-5 py-12 text-center flex flex-col gap-3 items-center">
          <span class="text-primary-base rounded-full bg-primary-alpha-10 flex size-11 items-center justify-center">
            <i class="i-celeste-bar-chart-box-line text-20px" />
          </span>
          <div class="max-w-400px space-y-1">
            <p class="text-text-strong-950 label-sm">
              Your campaigns will show up here
            </p>
            <p class="text-text-sub-600 paragraph-sm">
              {{ trackedCount
                ? 'Pixly is getting ready to pull daily spend from your tracked ad accounts. Campaigns appear here once the first sync runs.'
                : 'Select at least one ad account below so Pixly knows where to pull spend from.' }}
            </p>
          </div>
        </div>
      </section>

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
