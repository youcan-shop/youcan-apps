<script setup lang="ts">
import type { CampaignPerformance, PerformanceMetrics } from '~~/shared/utils/performance';
import { Button, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@youcan/celeste';
import { campaignTestLink, costPer } from '~~/shared/utils/performance';
import { openExternal } from '~/composables/use-external-link';

const props = defineProps<{
  campaigns: CampaignPerformance[];
  unmatched: PerformanceMetrics;
  spendCurrency: string | null;
  orderCurrency: string | null;
  loading: boolean;
  trackedAccounts: number;
  storeUrl: string | null;
}>();

// The campaign the chart follows
const focused = defineModel<string>('campaign', { default: 'all' });

const qantra = useQantra();
const showUrlHelp = ref(false);
const openLink = ref<string | null>(null);
const testLinks = ref<Record<string, string>>({});

const META_URL_PARAMETERS = 'utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_id={{campaign.id}}';

const empty = computed(() => !props.campaigns.length && !props.unmatched.orders && !props.unmatched.canceled);

function focus(campaign: CampaignPerformance) {
  focused.value = focused.value === campaign.id ? 'all' : campaign.id;
}

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
</script>

<template>
  <section class="border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs overflow-hidden">
    <header class="px-5 py-4 flex flex-wrap gap-3 items-start justify-between">
      <div>
        <h2 class="text-text-strong-950 label-md">
          Campaigns
        </h2>
        <p class="text-text-sub-600 paragraph-sm">
          Spend from Facebook, orders from your store. Select a campaign to see it in the chart.
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

    <div v-if="showUrlHelp" class="px-5 py-4 border-t border-stroke-soft-200 bg-bg-weak-50 space-y-2">
      <p class="text-text-sub-600 paragraph-sm">
        Pixly reads the link each shopper landed on. Add these URL parameters to your ads in Ads Manager
        (Ad → Tracking → URL parameters) so every order names its campaign:
      </p>
      <code class="text-text-strong-950 px-3 py-2 border border-stroke-soft-200 rounded-8px bg-bg-white-0 block break-all paragraph-xs">{{ META_URL_PARAMETERS }}</code>
      <p class="text-text-sub-600 paragraph-xs">
        Every order counts as soon as it's placed. Canceled orders and orders YouCan flags as fake are left out.
      </p>
    </div>

    <Table class="min-w-640px">
      <TableHeader>
        <TableRow>
          <TableHead>Campaign</TableHead>
          <TableHead end>
            Spend
          </TableHead>
          <TableHead end>
            Clicks
          </TableHead>
          <TableHead end>
            Orders
          </TableHead>
          <TableHead end>
            Cost / order
          </TableHead>
          <TableHead end>
            Order value
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        <template v-if="loading && empty">
          <TableRow v-for="index in 3" :key="index">
            <TableCell colspan="6">
              <div class="rounded-full bg-bg-weak-50 h-4 w-full animate-pulse" />
            </TableCell>
          </TableRow>
        </template>

        <TableEmpty v-else-if="empty" :colspan="6">
          <div class="py-6 flex flex-col gap-3 items-center">
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
        </TableEmpty>

        <template v-else>
          <template v-for="campaign in campaigns" :key="campaign.id">
            <TableRow
              hoverable
              class="cursor-pointer"
              :class="focused === campaign.id ? '!bg-primary-alpha-10' : ''"
              :aria-selected="focused === campaign.id"
              @click="focus(campaign)"
            >
              <TableCell class="max-w-280px">
                <p class="text-text-strong-950 truncate label-sm" :title="campaign.name">
                  {{ campaign.name }}
                </p>
                <p class="text-text-soft-400 flex gap-2 paragraph-xs items-center">
                  <span class="truncate">{{ campaign.accountName ?? 'Untracked ad account' }} · ID {{ campaign.id }}</span>
                  <button
                    v-if="storeUrl"
                    type="button"
                    class="text-primary-base shrink-0 label-xs hover:underline"
                    :aria-expanded="openLink === campaign.id"
                    @click.stop="toggleTestLink(campaign)"
                  >
                    {{ openLink === campaign.id ? 'Hide test link' : 'Test link' }}
                  </button>
                </p>
              </TableCell>
              <TableCell end class="tabular-nums">
                {{ formatMoney(campaign.spend, spendCurrency) }}
              </TableCell>
              <TableCell end class="text-text-sub-600 tabular-nums">
                {{ formatCount(campaign.clicks) }}
              </TableCell>
              <TableCell end class="tabular-nums">
                {{ formatCount(campaign.orders) }}
                <p v-if="campaign.canceled" class="text-text-soft-400 paragraph-xs">
                  {{ campaign.canceled }} canceled
                </p>
              </TableCell>
              <TableCell end class="text-text-strong-950 label-sm tabular-nums">
                {{ formatMoney(costPer(campaign.spend, campaign.orders), spendCurrency) }}
              </TableCell>
              <TableCell end class="text-text-sub-600 tabular-nums">
                {{ campaign.orders ? formatMoney(campaign.revenue, orderCurrency) : '—' }}
              </TableCell>
            </TableRow>

            <TableRow v-if="openLink === campaign.id && testLinks[campaign.id]" class="bg-bg-weak-50">
              <TableCell colspan="6">
                <p class="text-text-sub-600 mb-2 paragraph-xs">
                  The link an ad of this campaign sends shoppers to. Open it in a private window and place an order: it shows up here within about 5 minutes.
                </p>
                <div class="flex gap-2 items-center">
                  <code class="text-text-strong-950 px-3 py-2 border border-stroke-soft-200 rounded-8px bg-bg-white-0 flex-1 min-w-0 select-all whitespace-normal break-all paragraph-xs">{{ testLinks[campaign.id] }}</code>
                  <Button
                    size="xs"
                    intent="neutral"
                    variant="stroke"
                    @click="copy(testLinks[campaign.id]!)"
                  >
                    Copy
                  </Button>
                  <Button
                    size="xs"
                    intent="neutral"
                    variant="stroke"
                    as="a"
                    :href="testLinks[campaign.id]"
                    target="_blank"
                    rel="noopener"
                    @click="openExternal(testLinks[campaign.id]!, $event)"
                  >
                    Open
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>

          <TableRow v-if="unmatched.orders || unmatched.canceled" class="text-text-sub-600 bg-bg-weak-50">
            <TableCell>
              <p class="label-sm">
                Campaign not in the link
              </p>
              <p class="paragraph-xs">
                Facebook orders without campaign URL parameters
              </p>
            </TableCell>
            <TableCell end>
              —
            </TableCell>
            <TableCell end>
              —
            </TableCell>
            <TableCell end class="tabular-nums">
              {{ formatCount(unmatched.orders) }}
            </TableCell>
            <TableCell end>
              —
            </TableCell>
            <TableCell end class="tabular-nums">
              {{ unmatched.orders ? formatMoney(unmatched.revenue, orderCurrency) : '—' }}
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </section>
</template>
