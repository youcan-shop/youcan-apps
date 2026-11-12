<script setup lang="ts">
import type { MetaConnectionView } from '~~/shared/utils/meta';
import { Button } from '@youcan/celeste';

const props = defineProps<{
  account: NonNullable<MetaConnectionView['account']>;
  disconnecting: boolean;
  connecting: boolean;
}>();

const emit = defineEmits<{
  disconnect: [];
  reconnect: [];
}>();

const confirming = ref(false);

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });

const expiresSoon = computed(() => {
  if (!props.account.expiresAt) {
    return false;
  }

  return new Date(props.account.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
});

const details = computed(() => [
  { icon: 'i-celeste-lock-line', label: 'Access', value: 'Read-only' },
  { icon: 'i-celeste-calendar-line', label: 'Connected', value: dateFormat.format(new Date(props.account.connectedAt)) },
  {
    icon: 'i-celeste-time-line',
    label: 'Expires',
    value: props.account.expiresAt ? dateFormat.format(new Date(props.account.expiresAt)) : 'Never',
  },
]);
</script>

<template>
  <section class="border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs overflow-hidden">
    <div class="p-5 space-y-4">
      <div class="flex gap-3 items-center">
        <span class="text-static-white rounded-12px bg-[#0866FF] flex shrink-0 size-10 items-center justify-center">
          <i class="i-celeste-meta-fill text-22px" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-text-strong-950 label-md">
            Facebook & Instagram
          </p>
          <p class="text-text-sub-600 truncate paragraph-xs">
            {{ account.name ? `Connected as ${account.name}` : 'Connected' }}
          </p>
        </div>
        <span class="text-state-success-dark px-2 py-0.5 rounded-full bg-state-success-lighter flex gap-1 label-xs items-center">
          <span class="rounded-full bg-state-success-base size-1.5" />
          Live
        </span>
      </div>

      <dl class="space-y-2.5">
        <div
          v-for="item in details"
          :key="item.label"
          class="flex gap-2 paragraph-sm items-center"
        >
          <i :class="item.icon" class="text-16px text-text-soft-400" />
          <dt class="text-text-sub-600 flex-1">
            {{ item.label }}
          </dt>
          <dd
            class="m-0 label-sm"
            :class="item.label === 'Expires' && expiresSoon ? 'text-state-warning-base' : 'text-text-strong-950'"
          >
            {{ item.value }}
          </dd>
        </div>
      </dl>

      <p
        v-if="expiresSoon"
        class="text-state-warning-dark px-3 py-2 rounded-10px bg-state-warning-lighter paragraph-xs"
      >
        Facebook access ends soon. Reconnect to keep your spend up to date.
      </p>
    </div>

    <footer class="px-5 py-3 border-t border-stroke-soft-200 bg-bg-weak-50">
      <div v-if="confirming" class="space-y-3">
        <p class="text-text-strong-950 paragraph-sm">
          Disconnect Facebook? Pixly stops pulling spend and forgets your ad accounts.
        </p>
        <div class="flex gap-2">
          <Button
            size="xs"
            intent="error"
            variant="fill"
            :disabled="disconnecting"
            @click="emit('disconnect')"
          >
            {{ disconnecting ? 'Disconnecting…' : 'Disconnect' }}
          </Button>
          <Button
            size="xs"
            intent="neutral"
            variant="stroke"
            :disabled="disconnecting"
            @click="confirming = false"
          >
            Keep connected
          </Button>
        </div>
      </div>

      <div v-else class="flex gap-2 items-center justify-between">
        <Button
          size="xs"
          intent="neutral"
          variant="ghost"
          :disabled="connecting"
          @click="emit('reconnect')"
        >
          <i class="i-celeste-refresh-line text-16px" />
          Reconnect
        </Button>
        <Button
          size="xs"
          intent="error"
          variant="ghost"
          @click="confirming = true"
        >
          <i class="i-celeste-link-unlink text-16px" />
          Disconnect
        </Button>
      </div>
    </footer>
  </section>
</template>
