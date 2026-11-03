<script setup lang="ts">
import type { MetaAdAccountStatus, MetaAdAccountView } from '~~/shared/utils/meta';
import { Badge, Button, Checkbox, FancyButton } from '@youcan/celeste';

const props = defineProps<{
  accounts: MetaAdAccountView[];
  refreshing: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [selected: string[]];
  refresh: [];
  reconnect: [];
}>();

const selected = ref(new Set<string>());

function reset() {
  selected.value = new Set(props.accounts.filter(account => account.selected).map(account => account.id));
}

watch(() => props.accounts, reset, { immediate: true });

const dirty = computed(() => {
  const saved = props.accounts.filter(account => account.selected).map(account => account.id);

  return saved.length !== selected.value.size || saved.some(id => !selected.value.has(id));
});

function toggle(id: string, value: boolean) {
  const next = new Set(selected.value);

  if (value) {
    next.add(id);
  }
  else {
    next.delete(id);
  }
  selected.value = next;
}

const STATUS_BADGES: Record<Exclude<MetaAdAccountStatus, 'active'>, { label: string; state: 'error' | 'warning' | 'faded' | 'away' }> = {
  disabled: { label: 'Disabled', state: 'error' },
  unsettled: { label: 'Payment issue', state: 'warning' },
  closed: { label: 'Closed', state: 'faded' },
  pending: { label: 'In review', state: 'away' },
};

function initials(name: string): string {
  const words = name.split(/\s+/).filter(word => /^[\p{L}\p{N}]/u.test(word));

  return words.slice(0, 2).map(word => word[0]!.toUpperCase()).join('') || '?';
}
</script>

<template>
  <section class="border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs overflow-hidden">
    <header class="px-5 py-4 flex gap-4 items-center justify-between">
      <div>
        <h2 class="text-text-strong-950 label-md">
          Ad accounts
        </h2>
        <p class="text-text-sub-600 paragraph-sm">
          Choose which accounts Pixly pulls spend from.
          <span v-if="accounts.length" class="text-text-strong-950">{{ selected.size }} of {{ accounts.length }} tracked.</span>
        </p>
      </div>
      <Button
        size="xs"
        intent="neutral"
        variant="stroke"
        :disabled="refreshing"
        @click="emit('refresh')"
      >
        <i :class="refreshing ? 'i-celeste-loader-4-line animate-spin' : 'i-celeste-refresh-line'" class="text-16px" />
        Refresh
      </Button>
    </header>

    <div
      v-if="!accounts.length"
      class="px-5 py-10 text-center border-t border-stroke-soft-200 flex flex-col gap-3 items-center"
    >
      <span class="text-text-sub-600 rounded-full bg-bg-weak-50 flex size-11 items-center justify-center">
        <i class="i-celeste-briefcase-line text-20px" />
      </span>
      <div class="max-w-360px space-y-1">
        <p class="text-text-strong-950 label-sm">
          No ad accounts shared yet
        </p>
        <p class="text-text-sub-600 paragraph-sm">
          When you connect, pick at least one ad account on the Facebook screen. You can reconnect to change what you shared.
        </p>
      </div>
      <Button
        size="xs"
        intent="neutral"
        variant="stroke"
        @click="emit('reconnect')"
      >
        Reconnect Facebook
      </Button>
    </div>

    <ul v-else class="border-t border-stroke-soft-200 divide-stroke-soft-200 divide-y">
      <li v-for="account in accounts" :key="account.id">
        <label
          :for="`ad-account-${account.id}`"
          class="px-5 py-3.5 flex gap-3.5 cursor-pointer transition-colors items-center hover:bg-bg-weak-50"
        >
          <Checkbox
            :id="`ad-account-${account.id}`"
            :model-value="selected.has(account.id)"
            @update:model-value="value => toggle(account.id, value === true)"
          />
          <span class="text-text-sub-600 rounded-10px bg-bg-weak-50 flex shrink-0 size-9 label-xs items-center justify-center">
            {{ initials(account.name) }}
          </span>
          <span class="flex-1 min-w-0">
            <span class="flex gap-2 items-center">
              <span class="text-text-strong-950 truncate label-sm">{{ account.name }}</span>
              <Badge
                v-if="account.status !== 'active'"
                :label="STATUS_BADGES[account.status].label"
                :state="STATUS_BADGES[account.status].state"
                size="sm"
                variant="lighter"
              />
            </span>
            <span class="text-text-sub-600 block truncate paragraph-xs">
              <template v-if="account.businessName">{{ account.businessName }} · </template>{{ account.id.replace(/^act_/, '') }}
            </span>
          </span>
          <span class="text-text-sub-600 text-right shrink-0 hidden paragraph-xs sm:block">
            <span class="text-text-strong-950 block label-xs">{{ account.currency }}</span>
            {{ account.timezone ?? '' }}
          </span>
        </label>
      </li>
    </ul>

    <footer
      v-if="dirty"
      class="px-5 py-3 border-t border-stroke-soft-200 bg-bg-weak-50 flex gap-3 items-center justify-between"
    >
      <span class="text-text-sub-600 flex gap-2 paragraph-sm items-center">
        <span class="rounded-full bg-state-warning-base size-2" />
        Unsaved selection
      </span>
      <div class="flex gap-2">
        <Button
          size="xs"
          intent="neutral"
          variant="stroke"
          :disabled="saving"
          @click="reset"
        >
          Discard
        </Button>
        <FancyButton
          size="xs"
          intent="primary"
          :disabled="saving"
          @click="emit('save', [...selected])"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </FancyButton>
      </div>
    </footer>
  </section>
</template>
