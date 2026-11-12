export interface TikTokConnectionView {
  connected: boolean;
  pixelCode: string | null;
  testEventCode: string | null;
  enabled: boolean;
  // False when the web pixel couldn't be registered on the store, so only purchases are sent
  webPixel: boolean;
  lastEventAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

export interface TikTokConnectionInput {
  pixelCode: string;
  // Empty keeps the saved token
  accessToken: string;
  testEventCode: string;
  enabled: boolean;
}

export type TikTokErrors = Partial<Record<keyof TikTokConnectionInput, string>>;

export const TIKTOK_TRACKS = ['Product views', 'Searches', 'Add to cart', 'Checkout started', 'Payment info', 'Purchases'];

export function validateTikTokInput(input: Record<string, unknown>, hasToken: boolean): { input: TikTokConnectionInput; errors: TikTokErrors } {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const data: TikTokConnectionInput = {
    pixelCode: text(input.pixelCode).toUpperCase(),
    accessToken: text(input.accessToken),
    testEventCode: text(input.testEventCode).toUpperCase(),
    enabled: input.enabled !== false,
  };
  const errors: TikTokErrors = {};

  if (!/^[A-Z0-9]{10,32}$/.test(data.pixelCode)) {
    errors.pixelCode = 'Pixel IDs only contain letters and numbers, like C4ABCDEFGH1234567890.';
  }

  if (!data.accessToken && !hasToken) {
    errors.accessToken = 'Paste the access token generated for this pixel.';
  }
  else if (data.accessToken && !/^\w{20,}$/.test(data.accessToken)) {
    errors.accessToken = 'This doesn\'t look like a TikTok access token.';
  }

  if (data.testEventCode && !/^[A-Z0-9]{4,20}$/.test(data.testEventCode)) {
    errors.testEventCode = 'Test codes look like TEST12345.';
  }

  return { input: data, errors };
}
