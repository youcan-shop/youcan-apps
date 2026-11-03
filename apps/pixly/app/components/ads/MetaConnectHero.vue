<script setup lang="ts">
import { Badge } from '@youcan/celeste';

defineProps<{
  available: boolean;
  connecting: boolean;
  waiting: boolean;
}>();

const emit = defineEmits<{
  connect: [];
  reopen: [];
  cancel: [];
}>();

const benefits = [
  {
    icon: 'i-celeste-wallet-3-line',
    title: 'Spend for every campaign',
    text: 'Pulled daily from your ad accounts, with read-only access.',
  },
  {
    icon: 'i-celeste-truck-line',
    title: 'Real orders, not pixel guesses',
    text: 'See which orders were confirmed, delivered or returned.',
  },
  {
    icon: 'i-celeste-hand-coin-line',
    title: 'True cost per delivered order',
    text: 'No more exporting orders and fixing numbers by hand.',
  },
];

const sample = [
  { name: 'Summer sale · Broad', spend: '4,820', orders: 142, delivered: 88, cost: '55' },
  { name: 'Retargeting · 7 days', spend: '2,150', orders: 96, delivered: 71, cost: '30' },
  { name: 'New collection · Lookalike', spend: '5,510', orders: 119, delivered: 55, cost: '100' },
];
</script>

<template>
  <section class="border border-stroke-soft-200 rounded-20px bg-bg-white-0 grid col-span-full grid-cols-1 shadow-regular-xs overflow-hidden lg:grid-cols-2">
    <div class="p-6 flex flex-col gap-6 lg:p-8">
      <div class="space-y-3">
        <Badge
          label="New"
          state="feature"
          variant="lighter"
          size="sm"
        />
        <h1 class="text-text-strong-950 text-balance title-h5-title">
          Know what every order really costs you
        </h1>
        <p class="text-text-sub-600 max-w-460px paragraph-md">
          Connect your Facebook ad accounts. Pixly puts each campaign's spend next to the orders it brought, and shows which of them were actually delivered.
        </p>
      </div>

      <ul class="space-y-4">
        <li
          v-for="benefit in benefits"
          :key="benefit.title"
          class="flex gap-3"
        >
          <span class="text-text-strong-950 border border-stroke-soft-200 rounded-10px bg-bg-white-0 flex shrink-0 size-9 shadow-regular-xs items-center justify-center">
            <i :class="benefit.icon" class="text-18px" />
          </span>
          <div>
            <p class="text-text-strong-950 label-sm">
              {{ benefit.title }}
            </p>
            <p class="text-text-sub-600 paragraph-sm">
              {{ benefit.text }}
            </p>
          </div>
        </li>
      </ul>

      <div class="mt-auto pt-2">
        <div
          v-if="waiting"
          class="p-4 border border-stroke-soft-200 rounded-12px bg-bg-weak-50 flex gap-3 items-start"
        >
          <i class="i-celeste-loader-4-line text-20px text-[#0866FF] mt-0.5 shrink-0 animate-spin" />
          <div class="flex-1 space-y-1">
            <p class="text-text-strong-950 label-sm">
              Waiting for Facebook
            </p>
            <p class="text-text-sub-600 paragraph-sm">
              Finish connecting in the window that opened. This page updates by itself.
            </p>
            <div class="pt-1 flex gap-4">
              <button
                type="button"
                class="text-text-strong-950 underline-offset-3 label-sm hover:underline"
                @click="emit('reopen')"
              >
                Open the window again
              </button>
              <button
                type="button"
                class="text-text-sub-600 underline-offset-3 label-sm hover:underline"
                @click="emit('cancel')"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div v-else class="space-y-3">
          <button
            type="button"
            class="text-static-white px-5 rounded-10px bg-[#0866FF] inline-flex gap-2 h-11 w-full transition-colors label-md items-center justify-center hover:bg-[#0759D6] disabled:opacity-60 sm:w-auto disabled:cursor-not-allowed"
            :disabled="!available || connecting"
            @click="emit('connect')"
          >
            <i :class="connecting ? 'i-celeste-loader-4-line animate-spin' : 'i-celeste-meta-fill'" class="text-20px" />
            Continue with Facebook
          </button>
          <p class="text-text-sub-600 flex gap-1.5 paragraph-xs items-center">
            <i class="i-celeste-lock-line text-14px" />
            Read-only access. Pixly can't create, edit or pay for your ads.
          </p>
        </div>
      </div>
    </div>

    <div class="p-6 border-t border-stroke-soft-200 bg-bg-weak-50 flex items-center relative overflow-hidden lg:p-8 lg:border-l lg:border-t-0" aria-hidden="true">
      <div class="border border-stroke-soft-200 rounded-16px bg-bg-white-0 w-full shadow-regular-md">
        <div class="px-4 py-3 border-b border-stroke-soft-200 flex items-center justify-between">
          <span class="text-text-strong-950 label-sm">Campaigns · last 30 days</span>
          <span class="text-text-soft-400 uppercase subheading-xxs">Example</span>
        </div>

        <div class="p-4 gap-3 grid grid-cols-3">
          <div class="p-3 rounded-10px bg-bg-weak-50">
            <p class="text-text-sub-600 paragraph-xs">
              Spend
            </p>
            <p class="text-text-strong-950 label-lg">
              12,480 <span class="text-text-soft-400 label-xs">MAD</span>
            </p>
          </div>
          <div class="p-3 rounded-10px bg-bg-weak-50">
            <p class="text-text-sub-600 paragraph-xs">
              Delivered
            </p>
            <p class="text-text-strong-950 label-lg">
              214 <span class="text-text-soft-400 label-xs">of 357</span>
            </p>
          </div>
          <div class="p-3 rounded-10px bg-state-success-lighter">
            <p class="text-state-success-dark paragraph-xs">
              Cost / delivered
            </p>
            <p class="text-state-success-dark label-lg">
              58 <span class="opacity-70 label-xs">MAD</span>
            </p>
          </div>
        </div>

        <table class="w-full">
          <thead>
            <tr class="text-text-soft-400 uppercase">
              <th class="px-4 pb-2 text-left subheading-xxs">
                Campaign
              </th>
              <th class="px-2 pb-2 text-right subheading-xxs">
                Spend
              </th>
              <th class="px-2 pb-2 text-right subheading-xxs">
                Delivered
              </th>
              <th class="px-4 pb-2 text-right subheading-xxs">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sample"
              :key="row.name"
              class="border-t border-stroke-soft-200 paragraph-xs"
            >
              <td class="text-text-strong-950 px-4 py-2.5 max-w-0 truncate">
                {{ row.name }}
              </td>
              <td class="text-text-sub-600 px-2 py-2.5 text-right tabular-nums">
                {{ row.spend }}
              </td>
              <td class="text-text-sub-600 px-2 py-2.5 text-right tabular-nums">
                {{ row.delivered }}<span class="text-text-soft-400">/{{ row.orders }}</span>
              </td>
              <td class="text-text-strong-950 px-4 py-2.5 text-right label-xs tabular-nums">
                {{ row.cost }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
