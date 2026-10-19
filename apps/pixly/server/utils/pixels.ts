import type { PixelSettings } from '~~/shared/utils/pixels';

export async function getStoreId(): Promise<string> {
  const store = await youcan.store.info();

  return store.id;
}

export async function readPixelSettings(storeId: string): Promise<PixelSettings> {
  const metafields = await youcan.store.metafields.list('stores', storeId);
  const settings = emptyPixelSettings();

  for (const metafield of metafields) {
    if (metafield.namespace === PIXELS_NAMESPACE && metafield.key in settings && typeof metafield.value === 'string') {
      settings[metafield.key] = metafield.value;
    }
  }

  return settings;
}

export async function writePixelSettings(storeId: string, settings: PixelSettings): Promise<void> {
  const current = await readPixelSettings(storeId);

  await Promise.all(PIXEL_SETTING_KEYS.map(async (key) => {
    const value = settings[key] ?? '';

    if (value === current[key]) {
      return;
    }

    if (value) {
      await youcan.store.metafields.upsert('stores', storeId, {
        namespace: PIXELS_NAMESPACE,
        key,
        value,
        value_type: 'string',
      });

      return;
    }

    await youcan.store.metafields.deleteByKey('stores', storeId, PIXELS_NAMESPACE, key);
  }));
}
