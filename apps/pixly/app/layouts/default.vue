<script lang="ts" setup>
import { Sonner } from '@youcan/celeste';

const tabs = [
  { to: '/', label: 'Pixels', icon: 'i-celeste-focus-3-line' },
  { to: '/tiktok', label: 'TikTok Events API', icon: 'i-celeste-tiktok-fill' },
  { to: '/ads', label: 'Ad performance', icon: 'i-celeste-line-chart-line' },
];
</script>

<template>
  <div class="p-4 bg-bg-weak-50 min-h-svh">
    <Sonner />
    <div class="mx-auto container space-y-6">
      <nav
        class="p-1 border border-stroke-soft-200 rounded-12px bg-bg-white-0 inline-flex gap-1 shadow-regular-xs"
        aria-label="Pixly sections"
      >
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="text-text-sub-600 px-3 py-1.5 rounded-8px flex gap-1.5 transition-colors label-sm items-center hover:text-text-strong-950 hover:bg-bg-weak-50"
          exact-active-class="!text-text-strong-950 !bg-bg-weak-50 shadow-regular-xs"
        >
          <i :class="tab.icon" class="text-16px" />
          {{ tab.label }}
        </NuxtLink>
      </nav>

      <div class="gap-6 grid grid-cols-1 lg:grid-cols-12">
        <slot />
      </div>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizelegibility;
  font-synthesis: none;
}

html,
body {
  margin: 0;
  padding: 0;
  color: var(--color-text-strong-950);
  font: var(--paragraph-sm);
}
</style>
