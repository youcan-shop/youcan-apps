export const PIXELS_NAMESPACE = 'pixels-app-2';

export type PixelProviderId = 'x' | 'pinterest' | 'openai' | 'microsoft';

export interface PixelField {
  key: string;
  label: string;
  hint: string;
  placeholder: string;
  pattern: RegExp;
  patternError: string;
}

export interface PixelProvider {
  id: PixelProviderId;
  name: string;
  tagline: string;
  icon: string;
  brandClass: string;
  managerName: string;
  managerUrl: string;
  findIds: string;
  tracks: string[];
  enabledKey: string;
  idField: PixelField;
  eventFields: PixelField[];
}

const X_EVENT_PATTERN = /^tw-[a-z0-9]+-[a-z0-9]+$/i;
const X_EVENT_ERROR = 'Event IDs look like tw-xxxxx-yyyyy.';

export const PIXEL_PROVIDERS: PixelProvider[] = [
  {
    id: 'x',
    name: 'X (Twitter)',
    tagline: 'Measure and optimize your X ads.',
    icon: 'i-celeste-twitter-x-fill',
    brandClass: 'bg-[#0f1419] text-static-white',
    managerName: 'X Ads Manager',
    managerUrl: 'https://ads.x.com',
    findIds: 'In X Ads Manager, open Tools, then Events Manager. Create one event per action and copy its ID.',
    tracks: ['Page views', 'Product views', 'Add to cart', 'Checkout', 'Purchases'],
    enabledKey: 'x_enabled',
    idField: {
      key: 'pixel_id',
      label: 'Pixel ID',
      hint: 'Page views are tracked as soon as this is set.',
      placeholder: 'o1abc',
      pattern: /^[a-z0-9]{2,32}$/i,
      patternError: 'Pixel IDs only contain letters and numbers.',
    },
    eventFields: [
      { key: 'view_content_event_id', label: 'Product viewed', hint: 'Custom event in X.', placeholder: 'tw-xxxxx-yyyyy', pattern: X_EVENT_PATTERN, patternError: X_EVENT_ERROR },
      { key: 'add_to_cart_event_id', label: 'Add to cart', hint: 'Add to cart event in X.', placeholder: 'tw-xxxxx-yyyyy', pattern: X_EVENT_PATTERN, patternError: X_EVENT_ERROR },
      { key: 'initiate_checkout_event_id', label: 'Checkout started', hint: 'Custom event in X.', placeholder: 'tw-xxxxx-yyyyy', pattern: X_EVENT_PATTERN, patternError: X_EVENT_ERROR },
      { key: 'purchase_event_id', label: 'Purchase', hint: 'Purchase event in X.', placeholder: 'tw-xxxxx-yyyyy', pattern: X_EVENT_PATTERN, patternError: X_EVENT_ERROR },
    ],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    tagline: 'Track shoppers coming from your Pinterest ads.',
    icon: 'i-celeste-pinterest-fill',
    brandClass: 'bg-[#e60023] text-static-white',
    managerName: 'Pinterest Ads Manager',
    managerUrl: 'https://ads.pinterest.com',
    findIds: 'In Pinterest Ads Manager, open Ads, then Conversions, then Tag manager.',
    tracks: ['Page views', 'Product views', 'Add to cart', 'Purchases'],
    enabledKey: 'pinterest_enabled',
    idField: {
      key: 'pinterest_tag_id',
      label: 'Tag ID',
      hint: 'A number, usually 13 digits long.',
      placeholder: '2612345678901',
      pattern: /^\d{6,20}$/,
      patternError: 'Tag IDs only contain digits.',
    },
    eventFields: [],
  },
  {
    id: 'openai',
    name: 'OpenAI Ads',
    tagline: 'Measure conversions from your ads in ChatGPT.',
    icon: 'i-celeste-openai-fill',
    brandClass: 'bg-[#000000] text-static-white',
    managerName: 'OpenAI Ads Manager',
    managerUrl: 'https://ads.openai.com',
    findIds: 'In OpenAI Ads Manager, open Conversions, then the Data Source tab.',
    tracks: ['Page views', 'Product views', 'Add to cart', 'Checkout', 'Purchases'],
    enabledKey: 'openai_enabled',
    idField: {
      key: 'openai_pixel_id',
      label: 'Pixel ID',
      hint: 'Copy it exactly as shown in Ads Manager.',
      placeholder: 'Xk3PqR8mZt2vLn7wHs5yBa',
      pattern: /^[\w-]{6,64}$/,
      patternError: 'Pixel IDs only contain letters, numbers, dashes and underscores.',
    },
    eventFields: [],
  },
  {
    id: 'microsoft',
    name: 'Microsoft Ads',
    tagline: 'Track conversions from your Microsoft Advertising (Bing) ads.',
    icon: 'i-celeste-brand-microsoft-original',
    brandClass: 'bg-bg-white-0 border border-stroke-soft-200',
    managerName: 'Microsoft Advertising',
    managerUrl: 'https://ads.microsoft.com',
    findIds: 'In Microsoft Advertising, open Tools, then UET tag, and copy the tag ID.',
    tracks: ['Page views', 'Product views', 'Add to cart', 'Checkout', 'Purchases'],
    enabledKey: 'microsoft_enabled',
    idField: {
      key: 'microsoft_tag_id',
      label: 'UET tag ID',
      hint: 'A number, usually 8 or 9 digits long.',
      placeholder: '343012345',
      pattern: /^\d{4,12}$/,
      patternError: 'UET tag IDs only contain digits.',
    },
    eventFields: [],
  },
];

export const PIXEL_FIELDS: PixelField[] = PIXEL_PROVIDERS.flatMap(provider => [provider.idField, ...provider.eventFields]);

export const PIXEL_SETTING_KEYS: string[] = [
  ...PIXEL_FIELDS.map(field => field.key),
  ...PIXEL_PROVIDERS.map(provider => provider.enabledKey),
];

export type PixelSettings = Record<string, string>;

export type PixelErrors = Record<string, string>;

export function emptyPixelSettings(): PixelSettings {
  return Object.fromEntries(PIXEL_SETTING_KEYS.map(key => [key, '']));
}

export function isProviderEnabled(provider: PixelProvider, settings: PixelSettings | null | undefined): boolean {
  return settings?.[provider.enabledKey] !== '0';
}

export function isProviderConfigured(provider: PixelProvider, settings: PixelSettings | null | undefined): boolean {
  return !!settings?.[provider.idField.key];
}

export function isProviderActive(provider: PixelProvider, settings: PixelSettings | null | undefined): boolean {
  return isProviderConfigured(provider, settings) && isProviderEnabled(provider, settings);
}

export function validatePixelSettings(input: Record<string, unknown>): { settings: PixelSettings; errors: PixelErrors } {
  const settings = emptyPixelSettings();
  const errors: PixelErrors = {};

  for (const { key } of PIXEL_FIELDS) {
    const raw = input[key];
    settings[key] = typeof raw === 'string' ? raw.trim() : '';
  }

  for (const provider of PIXEL_PROVIDERS) {
    const raw = input[provider.enabledKey];
    settings[provider.enabledKey] = raw === '0' || raw === false || raw === 'false' ? '0' : '';

    for (const field of [provider.idField, ...provider.eventFields]) {
      if (settings[field.key] && !field.pattern.test(settings[field.key]!)) {
        errors[field.key] = field.patternError;
      }
    }

    const hasEvents = provider.eventFields.some(field => settings[field.key]);
    if (hasEvents && !settings[provider.idField.key]) {
      errors[provider.idField.key] = `Add the ${provider.idField.label.toLowerCase()} before setting up events.`;
    }
  }

  return { settings, errors };
}
