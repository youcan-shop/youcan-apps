import type { PerformancePeriod, PerformanceView } from '~~/shared/utils/performance';
import { describeApiError } from '~/composables/use-meta-connection';

export function useAdPerformance() {
  const { $api } = useNuxtApp();

  const period = ref<PerformancePeriod>('last_30');
  const performance = ref<PerformanceView | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // A newer request wins, so switching periods quickly never shows an older period's numbers
  let latest = 0;

  async function load() {
    const request = ++latest;

    loading.value = true;
    try {
      const result = await $api<PerformanceView>('/api/ads/performance', { query: { period: period.value } });

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

  watch(period, load);

  return { period, performance, loading, error, load };
}
