import type { PerformanceRange, PerformanceView } from '~~/shared/utils/performance';
import { describeApiError } from '~/composables/use-meta-connection';

export function useAdPerformance() {
  const { $api } = useNuxtApp();

  const days = ref<PerformanceRange>(30);
  const performance = ref<PerformanceView | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // A newer request wins, so switching ranges quickly never shows an older range's numbers
  let latest = 0;

  async function load() {
    const request = ++latest;

    loading.value = true;
    try {
      const result = await $api<PerformanceView>('/api/ads/performance', { query: { days: days.value } });

      if (request === latest) {
        performance.value = result;
        error.value = null;
      }
    }
    catch (caught) {
      if (request === latest) {
        error.value = describeApiError(caught);
      }
    }
    finally {
      if (request === latest) {
        loading.value = false;
      }
    }
  }

  watch(days, load);

  return { days, performance, loading, error, load };
}
