<script setup lang="ts">
import type { PixelErrors, PixelSettings } from '~~/shared/utils/pixels';
import { Alert, Button, FancyButton, LinkButton } from '@youcan/celeste';
import { emptyPixelSettings, isProviderActive, isProviderConfigured, PIXEL_PROVIDERS, PIXEL_SETTING_KEYS, validatePixelSettings } from '~~/shared/utils/pixels';
import PixelProviderCard from '~/components/PixelProviderCard.vue';

const { $api } = useNuxtApp();
const qantra = useQantra();

const { data: saved, pending: fetching, error: loadError, execute: loadSettings } = useApi<PixelSettings>('/api/pixels/settings', { server: false, immediate: false });

const connection = ref<'connecting' | 'connected' | 'failed'>('connecting');
const loading = computed(() => connection.value === 'connecting' || fetching.value);

onMounted(async () => {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));

  try {
    await Promise.race([qantra.sessionToken(), timeout]);
    connection.value = 'connected';
  }
  catch {
    connection.value = 'failed';

    return;
  }

  await loadSettings();
});

const form = reactive<PixelSettings>(emptyPixelSettings());
const errors = ref<PixelErrors>({});
const saving = ref(false);
const saveError = ref<string | null>(null);

function describeError(error: any): string {
  const reason = error?.data?.data?.reason;
  const message = error?.data?.message ?? error?.statusMessage ?? error?.message ?? 'Unknown error';

  return reason ? `${message}: ${reason}` : message;
}

function reset() {
  Object.assign(form, emptyPixelSettings(), saved.value ?? {});
  errors.value = {};
  saveError.value = null;
}

watch(saved, reset, { immediate: true });

function update(key: string, value: string) {
  form[key] = value;
  if (errors.value[key]) {
    const { [key]: _, ...rest } = errors.value;
    errors.value = rest;
  }
}

const dirty = computed(() => PIXEL_SETTING_KEYS.some(key => (form[key] ?? '').trim() !== (saved.value?.[key] ?? '')));
const activeCount = computed(() => PIXEL_PROVIDERS.filter(provider => isProviderActive(provider, saved.value)).length);

function providerStatus(provider: typeof PIXEL_PROVIDERS[number]) {
  if (isProviderActive(provider, saved.value)) {
    return { label: 'Active', dot: 'bg-success-base' };
  }
  if (isProviderConfigured(provider, saved.value)) {
    return { label: 'Off', dot: 'bg-faded-base' };
  }

  return { label: 'Not set up', dot: 'bg-stroke-sub-300' };
}

async function save() {
  const result = validatePixelSettings(form);
  errors.value = result.errors;

  if (Object.keys(result.errors).length) {
    qantra.toast.show({ title: 'Check your IDs', description: 'Some fields need fixing before you can save.', type: 'error' });

    return;
  }

  saving.value = true;
  saveError.value = null;

  try {
    saved.value = await $api<PixelSettings>('/api/pixels/settings', {
      method: 'PUT',
      body: result.settings,
    });

    qantra.toast.show({ title: 'Settings saved', description: 'Your pixels are updated on your store.', type: 'success' });
  }
  catch (error: any) {
    errors.value = error?.data?.data?.errors ?? {};
    saveError.value = Object.keys(errors.value).length ? null : describeError(error);
    qantra.toast.show({ title: 'Could not save', description: 'Check the highlighted fields and try again.', type: 'error' });
  }
  finally {
    saving.value = false;
  }
}
</script>

<template>
  <header class="flex flex-wrap gap-4 col-span-full items-end justify-between">
    <div class="space-y-1">
      <h1 class="title-h5 text-text-strong-950">
        Ad pixels
      </h1>
      <p class="text-text-sub-600 paragraph-sm">
        Connect your ad platforms to measure visits, carts and sales from your store.
      </p>
    </div>
    <div
      v-if="!loading && saved"
      class="text-text-sub-600 px-3 py-1.5 border border-stroke-soft-200 rounded-full bg-bg-white-0 paragraph-sm"
    >
      <span class="text-text-strong-950 label-sm">{{ activeCount }}</span> of {{ PIXEL_PROVIDERS.length }} platforms active
    </div>
  </header>

  <div class="pb-24 col-span-8 space-y-4">
    <Alert
      v-if="connection === 'failed'"
      state="error"
      variant="lighter"
      size="xs"
    >
      <template #title>
        The seller area didn't send a session token, so the app can't reach your store. Close the app and open it again from Apps.
      </template>
    </Alert>

    <Alert
      v-if="loadError"
      state="error"
      variant="lighter"
      size="xs"
    >
      <template #title>
        Could not load your current settings: {{ describeError(loadError) }}
      </template>
    </Alert>

    <Alert
      v-if="saveError"
      state="error"
      variant="lighter"
      size="xs"
    >
      <template #title>
        Could not save: {{ saveError }}
      </template>
    </Alert>

    <PixelProviderCard
      v-for="provider in PIXEL_PROVIDERS"
      :key="provider.id"
      :provider="provider"
      :settings="form"
      :saved="saved ?? null"
      :errors="errors"
      :loading="loading"
      @update="update"
    />
  </div>

  <aside class="col-span-4 space-y-4">
    <div class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-4">
      <h2 class="text-text-strong-950 label-md">
        Overview
      </h2>
      <ul class="space-y-3">
        <li
          v-for="provider in PIXEL_PROVIDERS"
          :key="provider.id"
          class="flex gap-3 items-center"
        >
          <span
            class="rounded-8px flex shrink-0 size-7 items-center justify-center"
            :class="provider.brandClass"
          >
            <i :class="provider.icon" class="text-14px" />
          </span>
          <span class="text-text-strong-950 flex-1 paragraph-sm">{{ provider.name }}</span>
          <span v-if="loading" class="rounded-full bg-bg-weak-50 h-4 w-16 animate-pulse" />
          <span v-else class="text-text-sub-600 flex gap-1.5 paragraph-xs items-center">
            <span class="rounded-full size-2" :class="providerStatus(provider).dot" />
            {{ providerStatus(provider).label }}
          </span>
        </li>
      </ul>
    </div>

    <div class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-3">
      <div class="flex gap-3 items-center">
        <span class="text-text-strong-950 rounded-8px bg-bg-weak-50 flex shrink-0 size-7 items-center justify-center">
          <i class="i-celeste-layout-top-line text-14px" />
        </span>
        <h2 class="text-text-strong-950 label-md">
          Turn on the app embed
        </h2>
      </div>
      <p class="text-text-sub-600 paragraph-sm">
        Pixels only load on themes where the "Ad pixels" embed is switched on. Do this once per theme.
      </p>
      <LinkButton
        href="youcan://admin/themes/manage-app-extensions"
        target="_blank"
        intent="black"
        size="sm"
        underline
      >
        Open app embeds
      </LinkButton>
    </div>

    <div class="p-5 border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs space-y-3">
      <div class="flex gap-3 items-center">
        <span class="text-text-strong-950 rounded-8px bg-bg-weak-50 flex shrink-0 size-7 items-center justify-center">
          <i class="i-celeste-lightbulb-line text-14px" />
        </span>
        <h2 class="text-text-strong-950 label-md">
          Testing tips
        </h2>
      </div>
      <ul class="text-text-sub-600 pl-4 list-disc paragraph-sm space-y-1.5">
        <li>Turn off ad blockers when testing, they block most pixels.</li>
        <li>Each platform's pixel helper extension shows events instantly.</li>
        <li>Dashboards can take 15 minutes or more to show new events.</li>
      </ul>
    </div>
  </aside>

  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="dirty && !loading"
      class="px-4 py-3 border-t border-stroke-soft-200 bg-bg-white-0 shadow-regular-md inset-x-0 bottom-0 fixed z-20"
    >
      <div class="mx-auto container flex gap-3 items-center justify-between">
        <span class="text-text-strong-950 flex gap-2 paragraph-sm items-center">
          <span class="bg-warning-base rounded-full size-2" />
          You have unsaved changes
        </span>
        <div class="flex gap-2">
          <Button
            size="sm"
            intent="neutral"
            variant="stroke"
            :disabled="saving"
            @click="reset"
          >
            Discard
          </Button>
          <FancyButton
            size="sm"
            intent="primary"
            class="relative"
            :disabled="saving || connection !== 'connected'"
            @click="save"
          >
            <span :class="{ 'opacity-0': saving }" class="pointer-events-none">
              Save
            </span>
            <div v-if="saving" class="flex items-center inset-0 justify-center absolute">
              <i class="i-celeste-loader-4-line animate-spin" />
            </div>
          </FancyButton>
        </div>
      </div>
    </div>
  </Transition>
</template>
