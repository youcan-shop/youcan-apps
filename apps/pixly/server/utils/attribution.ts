import type { AttributionParams } from '~~/shared/utils/attribution';
import { ATTRIBUTION_PARAMS } from '~~/shared/utils/attribution';

export const COLLECTOR_URL_KEY = 'collector_url';

export interface AttributionBeacon {
  store: string;
  orderId: string;
  params: AttributionParams;
  landingUrl: string | null;
  referrer: string | null;
  clickedAt: Date | null;
}

const MAX_CLICK_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, max) : null;
}

export function parseAttributionBeacon(raw: string): AttributionBeacon | null {
  let body: any;

  try {
    body = JSON.parse(raw);
  }
  catch {
    return null;
  }

  const store = text(body?.store, 100);
  const orderId = text(body?.order_id, 100);

  if (!store || !orderId) {
    return null;
  }

  const click = body.click && typeof body.click === 'object' ? body.click : {};
  const params: AttributionParams = {};

  for (const [param, column] of Object.entries(ATTRIBUTION_PARAMS)) {
    const value = text(click.params?.[param], 500);

    if (value) {
      params[column] = value;
    }
  }

  let clickedAt: Date | null = null;

  if (typeof click.at === 'number' && Number.isFinite(click.at)) {
    const age = Date.now() - click.at;

    if (age >= 0 && age <= MAX_CLICK_AGE_MS) {
      clickedAt = new Date(click.at);
    }
  }

  return {
    store,
    orderId,
    params,
    landingUrl: text(click.landing, 2000),
    referrer: text(click.referrer, 2000),
    clickedAt,
  };
}

const syncedCollectorUrls = new Map<string, string>();

/**
 * The theme embed reads the collector URL from a store metafield, because the
 * app URL isn't known to Liquid and the dev tunnel changes on every restart.
 * Checked at most once per store per server process.
 */
export async function syncCollectorUrl(storeId: string, current?: string): Promise<void> {
  const appUrl = useRuntimeConfig().appUrl?.replace(/\/$/, '');

  if (!appUrl || syncedCollectorUrls.get(storeId) === appUrl) {
    return;
  }

  if (current === undefined) {
    const metafields = await youcan.store.metafields.list('stores', storeId);
    current = metafields.find(metafield => metafield.namespace === PIXELS_NAMESPACE && metafield.key === COLLECTOR_URL_KEY)?.value as string | undefined;
  }

  if (current !== appUrl) {
    await youcan.store.metafields.upsert('stores', storeId, {
      namespace: PIXELS_NAMESPACE,
      key: COLLECTOR_URL_KEY,
      value: appUrl,
      value_type: 'string',
    });
  }

  syncedCollectorUrls.set(storeId, appUrl);
}

export async function syncCollectorUrlQuietly(storeId?: string): Promise<void> {
  try {
    await syncCollectorUrl(storeId ?? await getStoreId());
  }
  catch (error) {
    console.error('[attribution] could not save the collector URL', error);
  }
}
