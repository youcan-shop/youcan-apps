<script setup lang="ts">
import type { TikTokConnectionView, TikTokErrors } from '~~/shared/utils/tiktok';
import { Alert, Badge, Button, FancyButton, HintText, Label, LinkButton, Switch, TextInput } from '@youcan/celeste';
import { TIKTOK_TRACKS, validateTikTokInput } from '~~/shared/utils/tiktok';
import { openExternal } from '~/composables/use-external-link';
import { describeApiError } from '~/composables/use-meta-connection';

const EVENTS_MANAGER_URL = 'https://ads.tiktok.com/i18n/events_manager';

const { $api } = useNuxtApp();
const qantra = useQantra();

const connection = ref<TikTokConnectionView | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const busy = ref<'save' | 'disconnect' | null>(null);
const confirmingDisconnect = ref(false);

const form = reactive({ pixelCode: '', accessToken: '', testEventCode: '', enabled: true });
const errors = ref<TikTokErrors>({});

function reset() {
  Object.assign(form, {
    pixelCode: connection.value?.pixelCode ?? '',
    accessToken: '',
    testEventCode: connection.value?.testEventCode ?? '',
    enabled: connection.value?.connected ? connection.value.enabled : true,
  });
  errors.value = {};
}

async function load() {
  try {
    connection.value = await $api<TikTokConnectionView>('/api/tiktok/connection');
    loadError.value = null;
    reset();
  }
  catch (error) {
    loadError.value = describeApiError(error);
  }
  finally {
    loading.value = false;
  }
}

onMounted(load);

const dirty = computed(() => {
  const saved = connection.value;

  return form.pixelCode.trim().toUpperCase() !== (saved?.pixelCode ?? '')
    || form.accessToken.trim() !== ''
    || form.testEventCode.trim().toUpperCase() !== (saved?.testEventCode ?? '')
    || (!!saved?.connected && form.enabled !== saved.enabled);
});

const status = computed(() => {
  const saved = connection.value;

  if (!saved?.connected) {
    return { label: 'Not set up', state: 'away' as const };
  }
  if (!saved.enabled) {
    return { label: 'Off', state: 'faded' as const };
  }
  if (saved.lastError) {
    return { label: 'Needs attention', state: 'warning' as const };
  }

  return { label: 'Active', state: 'success' as const };
});

const dateTime = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function update(key: keyof TikTokErrors, value: string) {
  (form as Record<string, unknown>)[key] = value;
  if (errors.value[key]) {
    const { [key]: _, ...rest } = errors.value;
    errors.value = rest;
  }
}

async function save() {
  const result = validateTikTokInput(form, !!connection.value?.connected);
  errors.value = result.errors;

  if (Object.keys(result.errors).length) {
    return;
  }

  busy.value = 'save';

  try {
    const saved = await $api<TikTokConnectionView>('/api/tiktok/connection', { method: 'PUT', body: result.input });
    connection.value = saved;
    reset();

    qantra.toast.show(saved.lastError
      ? { title: 'Saved with a problem', description: saved.lastError, type: 'error' }
      : { title: 'TikTok saved', description: form.enabled ? 'Events from your store are now sent to TikTok.' : 'Events are no longer sent to TikTok.', type: 'success' });
  }
  catch (error: any) {
    errors.value = error?.data?.data?.errors ?? {};
    qantra.toast.show({ title: 'Could not save', description: describeApiError(error), type: 'error' });
  }
  finally {
    busy.value = null;
  }
}

async function disconnect() {
  busy.value = 'disconnect';

  try {
    connection.value = await $api<TikTokConnectionView>('/api/tiktok/connection', { method: 'DELETE' });
    confirmingDisconnect.value = false;
    reset();
    qantra.toast.show({ title: 'TikTok removed', description: 'Your access token was deleted from Pixly.', type: 'success' });
  }
  catch (error) {
    qantra.toast.show({ title: 'Could not remove TikTok', description: describeApiError(error), type: 'error' });
  }
  finally {
    busy.value = null;
  }
}

const steps = [
  'In TikTok Events Manager, open your web pixel, or create one with "Events API" as the connection method.',
  'Copy the pixel ID shown under the pixel\'s name.',
  'Open Settings, then Events API, and generate an access token.',
  'Paste both here and save.',
];
</script>

<template>
  <header class="col-span-full space-y-1">
    <h1 class="text-text-strong-950 title-h5-title">
      TikTok Events API
    </h1>
    <p class="text-text-sub-600 paragraph-sm">
      Send your store's events to TikTok from Pixly's server, so ad blockers and browsers that block cookies don't hide your sales.
    </p>
  </header>

  <div class="col-span-full space-y-4 lg:col-span-8">
    <Alert
      v-if="loadError"
      state="error"
      variant="lighter"
      size="xs"
    >
      <template #title>
        Could not load your TikTok settings: {{ loadError }}
      </template>
    </Alert>

    <Alert
      v-if="connection?.connected && connection.lastError"
      state="warning"
      variant="lighter"
      size="xs"
    >
      <template #title>
        {{ connection.lastError }}
      </template>
    </Alert>

    <section class="border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs overflow-hidden">
      <header class="p-5 flex gap-4 items-start">
        <div class="text-static-white rounded-12px bg-[#000000] flex shrink-0 size-11 items-center justify-center">
          <i class="i-celeste-tiktok-fill text-22px" />
        </div>

        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex flex-wrap gap-2 items-center">
            <h2 class="text-text-strong-950 label-md">
              TikTok
            </h2>
            <Badge
              v-if="!loading"
              :label="status.label"
              :state="status.state"
              size="sm"
              type="dot"
              variant="lighter"
            />
          </div>
          <p class="text-text-sub-600 paragraph-sm">
            Server-side events for your TikTok ads.
          </p>
        </div>

        <div class="pt-1 flex gap-2 items-center">
          <span class="text-text-sub-600 hidden paragraph-xs sm:inline">
            {{ form.enabled ? 'On' : 'Off' }}
          </span>
          <Switch
            v-model="form.enabled"
            :disabled="loading"
            aria-label="Send events to TikTok"
          />
        </div>
      </header>

      <div v-if="loading" class="px-5 pb-5 space-y-3">
        <div class="rounded-10px bg-bg-weak-50 h-40px animate-pulse" />
        <div class="rounded-10px bg-bg-weak-50 h-40px animate-pulse" />
      </div>

      <div v-else class="px-5 py-5 border-t border-stroke-soft-200 space-y-5">
        <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <div class="space-y-1">
            <Label for="tiktok-pixel-code">
              Pixel ID
            </Label>
            <TextInput
              id="tiktok-pixel-code"
              :model-value="form.pixelCode"
              placeholder="C4ABCDEFGH1234567890"
              :has-error="!!errors.pixelCode"
              size="sm"
              autocomplete="off"
              spellcheck="false"
              @update:model-value="value => update('pixelCode', String(value ?? ''))"
            />
            <HintText
              :text="errors.pixelCode ?? 'Shown under the pixel name in Events Manager.'"
              :state="errors.pixelCode ? 'error' : 'default'"
            />
          </div>

          <div class="space-y-1">
            <Label for="tiktok-test-code">
              Test event code
            </Label>
            <TextInput
              id="tiktok-test-code"
              :model-value="form.testEventCode"
              placeholder="TEST12345"
              :has-error="!!errors.testEventCode"
              size="sm"
              autocomplete="off"
              spellcheck="false"
              @update:model-value="value => update('testEventCode', String(value ?? ''))"
            />
            <HintText
              :text="errors.testEventCode ?? 'Optional. Events go to the Test events tab only. Clear it when you\'re done.'"
              :state="errors.testEventCode ? 'error' : 'default'"
            />
          </div>
        </div>

        <div class="space-y-1">
          <Label for="tiktok-access-token">
            Access token
          </Label>
          <TextInput
            id="tiktok-access-token"
            type="password"
            :model-value="form.accessToken"
            :placeholder="connection?.connected ? 'Saved. Paste a new token to replace it.' : 'Paste the token from Events Manager'"
            :has-error="!!errors.accessToken"
            size="sm"
            autocomplete="off"
            spellcheck="false"
            @update:model-value="value => update('accessToken', String(value ?? ''))"
          />
          <HintText
            :text="errors.accessToken ?? 'Stored encrypted on Pixly\'s server. It never reaches your storefront.'"
            :state="errors.accessToken ? 'error' : 'default'"
          />
        </div>

        <div class="flex flex-wrap gap-1.5 items-center">
          <span class="text-text-sub-600 mr-1 paragraph-xs">Sends</span>
          <span
            v-for="item in TIKTOK_TRACKS"
            :key="item"
            class="text-text-sub-600 px-2 py-0.5 border border-stroke-soft-200 rounded-full bg-bg-weak-50 paragraph-xs"
          >
            {{ item }}
          </span>
        </div>
      </div>

      <footer class="px-5 py-3 border-t border-stroke-soft-200 bg-bg-weak-50 flex flex-wrap gap-3 items-center justify-between">
        <div class="flex gap-2 items-center">
          <template v-if="connection?.connected && !confirmingDisconnect">
            <Button
              size="sm"
              intent="error"
              variant="ghost"
              :disabled="!!busy"
              @click="confirmingDisconnect = true"
            >
              Remove
            </Button>
          </template>
          <template v-else-if="confirmingDisconnect">
            <span class="text-text-sub-600 paragraph-xs">Stop sending events and delete the token?</span>
            <Button
              size="sm"
              intent="error"
              variant="stroke"
              :disabled="!!busy"
              @click="disconnect"
            >
              Remove
            </Button>
            <Button
              size="sm"
              intent="neutral"
              variant="ghost"
              :disabled="!!busy"
              @click="confirmingDisconnect = false"
            >
              Keep
            </Button>
          </template>
        </div>

        <div class="flex gap-2">
          <Button
            v-if="dirty"
            size="sm"
            intent="neutral"
            variant="stroke"
            :disabled="!!busy"
            @click="reset"
          >
            Discard
          </Button>
          <FancyButton
            size="sm"
            intent="primary"
            class="relative"
            :disabled="loading || !!busy || (!dirty && !!connection?.connected)"
            @click="save"
          >
            <span :class="{ 'opacity-0': busy === 'save' }" class="pointer-events-none">
              Save
            </span>
            <div v-if="busy === 'save'" class="flex items-center inset-0 justify-center absolute">
              <i class="i-celeste-loader-4-line animate-spin" />
            </div>
          </FancyButton>
        </div>
      </footer>
    </section>
  </div>

  <aside class="col-span-full space-y-4 lg:col-span-4">
    <div
      v-if="connection?.connected"
      class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-3"
    >
      <h2 class="text-text-strong-950 label-md">
        Status
      </h2>
      <dl class="space-y-2.5">
        <div class="flex gap-3 justify-between">
          <dt class="text-text-sub-600 paragraph-sm">
            Last event sent
          </dt>
          <dd class="text-text-strong-950 label-sm">
            {{ connection.lastEventAt ? dateTime.format(new Date(connection.lastEventAt)) : 'None yet' }}
          </dd>
        </div>
        <div class="flex gap-3 justify-between">
          <dt class="text-text-sub-600 paragraph-sm">
            Storefront events
          </dt>
          <dd class="text-text-strong-950 label-sm">
            {{ connection.webPixel ? 'On' : 'Off' }}
          </dd>
        </div>
        <div class="flex gap-3 justify-between">
          <dt class="text-text-sub-600 paragraph-sm">
            Test mode
          </dt>
          <dd class="text-text-strong-950 label-sm">
            {{ connection.testEventCode ? 'On' : 'Off' }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-3">
      <div class="flex gap-3 items-center">
        <span class="text-text-strong-950 rounded-8px bg-bg-weak-50 flex shrink-0 size-7 items-center justify-center">
          <i class="i-celeste-key-2-line text-14px" />
        </span>
        <h2 class="text-text-strong-950 label-md">
          Get your pixel ID and token
        </h2>
      </div>
      <ol class="text-text-sub-600 pl-4 list-decimal paragraph-sm space-y-1.5">
        <li v-for="step in steps" :key="step">
          {{ step }}
        </li>
      </ol>
      <LinkButton
        :href="EVENTS_MANAGER_URL"
        target="_blank"
        rel="noopener"
        intent="black"
        size="sm"
        underline
        @click="(event: MouseEvent) => openExternal(EVENTS_MANAGER_URL, event)"
      >
        Open TikTok Events Manager
        <i class="i-celeste-external-link-line" />
      </LinkButton>
    </div>

    <div class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-3">
      <div class="flex gap-3 items-center">
        <span class="text-text-strong-950 rounded-8px bg-bg-weak-50 flex shrink-0 size-7 items-center justify-center">
          <i class="i-celeste-error-warning-line text-14px" />
        </span>
        <h2 class="text-text-strong-950 label-md">
          Avoid counting events twice
        </h2>
      </div>
      <p class="text-text-sub-600 paragraph-sm">
        If this pixel is also added in your seller area under Settings, Analytics & pixels, TikTok can't tell those events apart from Pixly's and counts both. Remove it there once events show up from Pixly.
      </p>
    </div>
  </aside>
</template>
