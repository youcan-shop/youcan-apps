<script setup lang="ts">
import type { CampaignPerformance, PerformanceMetrics } from '~~/shared/utils/performance';
import { campaignTestLink, costPer } from '~~/shared/utils/performance';
import { openExternal } from '~/composables/use-external-link';

const props = defineProps<{
  campaigns: CampaignPerformance[];
  unmatched: PerformanceMetrics;
  spendCurrency: string | null;
  loading: boolean;
  trackedAccounts: number;
  storeUrl: string | null;
}>();

const qantra = useQantra();
const openLink = ref<string | null>(null);
const testLinks = ref<Record<string, string>>({});

function toggleTestLink(campaign: CampaignPerformance) {
  if (openLink.value === campaign.id) {
    openLink.value = null;

    return;
  }

  // A fresh click ID per link, like Facebook gives each click
  testLinks.value[campaign.id] = campaignTestLink(props.storeUrl!, campaign);
  openLink.value = campaign.id;
}

async function copy(link: string) {
  try {
    await navigator.clipboard.writeText(link);
    qantra.toast.show({ title: 'Link copied', description: 'Open it in a private window, then place an order.', type: 'success' });
  }
  catch {
    qantra.toast.show({ title: 'Could not copy', description: 'Select the link and copy it by hand.', type: 'error' });
  }
}

const showUrlHelp = ref(false);

const META_URL_PARAMETERS = 'utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_id={{campaign.id}}';

const empty = computed(() => !props.campaigns.length && !props.unmatched.orders);
</script>

<template>
  <section class="border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs overflow-hidden">
    <header class="px-5 py-4 border-b border-stroke-soft-200 flex flex-wrap gap-3 items-start justify-between">
      <div>
        <h2 class="text-text-strong-950 label-md">
          Campaigns
        </h2>
        <p class="text-text-sub-600 paragraph-sm">
          Spend from Facebook, orders and deliveries from your store.
        </p>
      </div>
      <button
        type="button"
        class="text-text-sub-600 flex gap-1 label-xs items-center hover:text-text-strong-950"
        :aria-expanded="showUrlHelp"
        @click="showUrlHelp = !showUrlHelp"
      >
        <i class="i-celeste-information-line text-14px" />
        How orders are matched
      </button>
    </header>

    <div v-if="showUrlHelp" class="px-5 py-4 border-b border-stroke-soft-200 bg-bg-weak-50 space-y-2">
      <p class="text-text-sub-600 paragraph-sm">
        Pixly reads the link each shopper landed on. Add these URL parameters to your ads in Ads Manager
        (Ad → Tracking → URL parameters) so every order names its campaign:
      </p>
      <code class="text-text-strong-950 px-3 py-2 border border-stroke-soft-200 rounded-8px bg-bg-white-0 block break-all paragraph-xs">{{ META_URL_PARAMETERS }}</code>
      <p class="text-text-sub-600 paragraph-xs">
        Orders that only carry Facebook's click ID still count as Facebook orders, under "Campaign not in the link".
      </p>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-640px w-full border-collapse">
        <thead>
          <tr class="text-text-soft-400 bg-bg-weak-50 uppercase">
            <th class="font-normal px-5 py-2.5 text-left subheading-xxs">
              Campaign
            </th>
            <th class="font-normal px-3 py-2.5 text-right subheading-xxs">
              Spend
            </th>
            <th class="font-normal px-3 py-2.5 text-right subheading-xxs">
              Orders
            </th>
            <th class="font-normal px-3 py-2.5 text-right subheading-xxs">
              Delivered
            </th>
            <th class="font-normal px-3 py-2.5 text-right subheading-xxs">
              Cost / order
            </th>
            <th class="font-normal px-5 py-2.5 text-right subheading-xxs">
              Cost / delivered
            </th>
          </tr>
        </thead>

        <tbody v-if="loading && empty">
          <tr
            v-for="index in 3"
            :key="index"
            class="border-t border-stroke-soft-200"
          >
            <td class="px-5 py-3.5" colspan="6">
              <div class="rounded-full bg-bg-weak-50 h-4 w-full animate-pulse" />
            </td>
          </tr>
        </tbody>

        <tbody v-else-if="!empty" class="tabular-nums">
          <template v-for="campaign in campaigns" :key="campaign.id">
            <tr class="border-t border-stroke-soft-200 hover:bg-bg-weak-50">
              <td class="px-5 py-3 max-w-280px">
                <p class="text-text-strong-950 truncate label-sm" :title="campaign.name">
                  {{ campaign.name }}
                </p>
                <p class="text-text-sub-600 truncate paragraph-xs">
                  {{ campaign.accountName ?? 'Untracked ad account' }} · {{ formatCount(campaign.clicks) }} clicks
                </p>
                <p class="text-text-soft-400 flex gap-2 paragraph-xs items-center">
                  <span class="truncate">ID {{ campaign.id }}</span>
                  <button
                    v-if="storeUrl"
                    type="button"
                    class="text-primary-base shrink-0 label-xs hover:underline"
                    :aria-expanded="openLink === campaign.id"
                    @click="toggleTestLink(campaign)"
                  >
                    {{ openLink === campaign.id ? 'Hide test link' : 'Test link' }}
                  </button>
                </p>
              </td>
              <td class="text-text-strong-950 px-3 py-3 text-right paragraph-sm">
                {{ formatMoney(campaign.spend, spendCurrency) }}
              </td>
              <td class="text-text-strong-950 px-3 py-3 text-right paragraph-sm">
                {{ formatCount(campaign.orders) }}
              </td>
              <td class="px-3 py-3 text-right">
                <p class="text-text-strong-950 paragraph-sm">
                  {{ formatCount(campaign.delivered) }}
                </p>
                <p class="text-text-sub-600 paragraph-xs">
                  {{ formatPercent(campaign.delivered, campaign.orders) }}
                </p>
              </td>
              <td class="text-text-sub-600 px-3 py-3 text-right paragraph-sm">
                {{ formatMoney(costPer(campaign.spend, campaign.orders), spendCurrency) }}
              </td>
              <td class="text-text-strong-950 px-5 py-3 text-right label-sm">
                {{ formatMoney(costPer(campaign.spend, campaign.delivered), spendCurrency) }}
              </td>
            </tr>
            <tr v-if="openLink === campaign.id && testLinks[campaign.id]" class="bg-bg-weak-50">
              <td class="px-5 pb-4 pt-1" colspan="6">
                <p class="text-text-sub-600 mb-2 paragraph-xs">
                  The link an ad of this campaign sends shoppers to. Open it in a private window and place an order: it shows up here within about 5 minutes.
                </p>
                <div class="flex gap-2 items-center">
                  <code class="text-text-strong-950 px-3 py-2 border border-stroke-soft-200 rounded-8px bg-bg-white-0 flex-1 min-w-0 select-all break-all paragraph-xs">{{ testLinks[campaign.id] }}</code>
                  <button
                    type="button"
                    class="text-text-strong-950 px-3 py-2 border border-stroke-soft-200 rounded-8px bg-bg-white-0 shrink-0 label-xs hover:bg-bg-weak-50"
                    @click="copy(testLinks[campaign.id]!)"
                  >
                    Copy
                  </button>
                  <a
                    :href="testLinks[campaign.id]"
                    target="_blank"
                    rel="noopener"
                    class="text-text-strong-950 px-3 py-2 border border-stroke-soft-200 rounded-8px bg-bg-white-0 shrink-0 label-xs hover:bg-bg-weak-50"
                    @click="openExternal(testLinks[campaign.id]!, $event)"
                  >
                    Open
                  </a>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="unmatched.orders" class="text-text-sub-600 border-t border-stroke-soft-200 bg-bg-weak-50">
            <td class="px-5 py-3">
              <p class="label-sm">
                Campaign not in the link
              </p>
              <p class="paragraph-xs">
                Facebook orders without campaign URL parameters
              </p>
            </td>
            <td class="px-3 py-3 text-right paragraph-sm">
              —
            </td>
            <td class="px-3 py-3 text-right paragraph-sm">
              {{ formatCount(unmatched.orders) }}
            </td>
            <td class="px-3 py-3 text-right">
              <p class="paragraph-sm">
                {{ formatCount(unmatched.delivered) }}
              </p>
              <p class="paragraph-xs">
                {{ formatPercent(unmatched.delivered, unmatched.orders) }}
              </p>
            </td>
            <td class="px-3 py-3 text-right paragraph-sm">
              —
            </td>
            <td class="px-5 py-3 text-right paragraph-sm">
              —
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && empty" class="px-5 py-12 text-center flex flex-col gap-3 items-center">
      <span class="text-primary-base rounded-full bg-primary-alpha-10 flex size-11 items-center justify-center">
        <i class="i-celeste-bar-chart-box-line text-20px" />
      </span>
      <div class="max-w-400px space-y-1">
        <p class="text-text-strong-950 label-sm">
          No campaign activity in this period
        </p>
        <p class="text-text-sub-600 paragraph-sm">
          {{ trackedAccounts
            ? 'Campaigns show up here once they spend or bring an order. Try a longer period.'
            : 'Select at least one ad account below so Pixly knows where to pull spend from.' }}
        </p>
      </div>
    </div>
  </section>
</template>
