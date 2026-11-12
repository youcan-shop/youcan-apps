<script setup lang="ts">
import type { PixelErrors, PixelField, PixelProvider, PixelSettings } from '~~/shared/utils/pixels';
import { Badge, HintText, Label, LinkButton, Switch, TextInput } from '@youcan/celeste';
import { openExternal } from '~/composables/use-external-link';

const props = defineProps<{
  provider: PixelProvider;
  settings: PixelSettings;
  saved: PixelSettings | null;
  errors: PixelErrors;
  loading: boolean;
}>();

const emit = defineEmits<{
  update: [key: string, value: string];
}>();

const enabled = computed(() => props.settings[props.provider.enabledKey] !== '0');

const status = computed(() => {
  const configured = !!props.saved?.[props.provider.idField.key];
  const savedEnabled = props.saved?.[props.provider.enabledKey] !== '0';

  if (configured && savedEnabled) {
    return { label: 'Active', state: 'success' as const };
  }
  if (configured) {
    return { label: 'Off', state: 'faded' as const };
  }

  return { label: 'Not set up', state: 'away' as const };
});

function setEnabled(value: boolean) {
  emit('update', props.provider.enabledKey, value ? '' : '0');
}

function fieldValue(field: PixelField): string {
  return props.settings[field.key] ?? '';
}
</script>

<template>
  <section class="border border-stroke-soft-200 rounded-16px bg-bg-white-0 shadow-regular-xs overflow-hidden">
    <header class="p-5 flex gap-4 items-start">
      <div
        class="rounded-12px flex shrink-0 size-11 items-center justify-center"
        :class="provider.brandClass"
      >
        <i :class="provider.icon" class="text-22px" />
      </div>

      <div class="flex-1 min-w-0 space-y-1">
        <div class="flex flex-wrap gap-2 items-center">
          <h2 class="text-text-strong-950 label-md">
            {{ provider.name }}
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
          {{ provider.tagline }}
        </p>
      </div>

      <div class="pt-1 flex gap-2 items-center">
        <span class="text-text-sub-600 hidden paragraph-xs sm:inline">
          {{ enabled ? 'On' : 'Off' }}
        </span>
        <Switch
          :model-value="enabled"
          :disabled="loading"
          :aria-label="`Track ${provider.name}`"
          @update:model-value="setEnabled"
        />
      </div>
    </header>

    <div v-if="loading" class="px-5 pb-5 space-y-3">
      <div class="rounded-10px bg-bg-weak-50 h-40px animate-pulse" />
    </div>

    <template v-else-if="enabled">
      <div class="px-5 py-5 border-t border-stroke-soft-200 space-y-5">
        <div class="space-y-1">
          <Label :for="provider.idField.key">
            {{ provider.idField.label }}
          </Label>
          <TextInput
            :id="provider.idField.key"
            :model-value="fieldValue(provider.idField)"
            :placeholder="provider.idField.placeholder"
            :has-error="!!errors[provider.idField.key]"
            size="sm"
            autocomplete="off"
            spellcheck="false"
            @update:model-value="value => emit('update', provider.idField.key, String(value ?? ''))"
          />
          <HintText
            :text="errors[provider.idField.key] ?? provider.idField.hint"
            :state="errors[provider.idField.key] ? 'error' : 'default'"
          />
        </div>

        <div v-if="provider.eventFields.length" class="space-y-3">
          <div>
            <h3 class="text-text-strong-950 label-sm">
              Conversion events
            </h3>
            <p class="text-text-sub-600 paragraph-xs">
              Optional. Leave an event empty to skip it.
            </p>
          </div>

          <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
            <div
              v-for="field in provider.eventFields"
              :key="field.key"
              class="space-y-1"
            >
              <Label :for="field.key">
                {{ field.label }}
              </Label>
              <TextInput
                :id="field.key"
                :model-value="fieldValue(field)"
                :placeholder="field.placeholder"
                :has-error="!!errors[field.key]"
                size="sm"
                autocomplete="off"
                spellcheck="false"
                @update:model-value="value => emit('update', field.key, String(value ?? ''))"
              />
              <HintText
                :text="errors[field.key] ?? field.hint"
                :state="errors[field.key] ? 'error' : 'default'"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5 items-center">
          <span class="text-text-sub-600 mr-1 paragraph-xs">Tracks</span>
          <span
            v-for="item in provider.tracks"
            :key="item"
            class="text-text-sub-600 px-2 py-0.5 border border-stroke-soft-200 rounded-full bg-bg-weak-50 paragraph-xs"
          >
            {{ item }}
          </span>
        </div>
      </div>
    </template>

    <div
      v-else
      class="text-text-sub-600 px-5 py-4 border-t border-stroke-soft-200 bg-bg-weak-50 paragraph-sm"
    >
      Tracking is off. Your IDs stay saved, so you can switch it back on anytime.
    </div>

    <footer class="px-5 py-3 border-t border-stroke-soft-200 bg-bg-weak-50 flex flex-wrap gap-3 items-center justify-between">
      <p class="text-text-sub-600 paragraph-xs">
        {{ provider.findIds }}
      </p>
      <LinkButton
        :href="provider.managerUrl"
        target="_blank"
        rel="noopener"
        intent="black"
        size="sm"
        underline
        @click="(event: MouseEvent) => openExternal(provider.managerUrl, event)"
      >
        Open {{ provider.managerName }}
        <i class="i-celeste-external-link-line" />
      </LinkButton>
    </footer>
  </section>
</template>
