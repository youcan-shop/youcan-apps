import { ofetch } from 'ofetch';

const TRACK_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

export type TikTokEventName = 'ViewContent' | 'AddToCart' | 'Search' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase';

export interface TikTokContent {
  content_id: string;
  content_name?: string;
  price?: number;
  quantity?: number;
}

export interface TikTokUser {
  ip?: string;
  user_agent?: string;
  ttp?: string;
  ttclid?: string;
  // SHA-256 hashes
  external_id?: string;
  email?: string;
  phone?: string;
}

export interface TikTokProperties {
  contents?: TikTokContent[];
  content_type?: 'product';
  currency?: string;
  value?: number;
  query?: string;
  order_id?: string;
}

export interface TikTokEvent {
  event: TikTokEventName;
  // Unix seconds
  event_time: number;
  event_id: string;
  user: TikTokUser;
  properties: TikTokProperties;
  page?: { url?: string; referrer?: string };
}

export interface TikTokTrackOptions {
  pixelCode: string;
  accessToken: string;
  testEventCode?: string | null;
}

interface TikTokResponse {
  code: number;
  message: string;
  request_id?: string;
}

export class TikTokApiError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
  }
}

/**
 * Sends events to the TikTok Events API 2.0. TikTok answers 200 with a non-zero
 * code when it rejects a request, for example a wrong access token.
 */
export async function trackTikTokEvents(options: TikTokTrackOptions, events: TikTokEvent[]): Promise<void> {
  let response: TikTokResponse;

  try {
    response = await ofetch<TikTokResponse>(TRACK_URL, {
      method: 'POST',
      timeout: 10_000,
      headers: { 'Access-Token': options.accessToken, 'Content-Type': 'application/json' },
      body: {
        event_source: 'web',
        event_source_id: options.pixelCode,
        ...(options.testEventCode ? { test_event_code: options.testEventCode } : {}),
        data: events,
      },
    });
  }
  catch (error: any) {
    throw new TikTokApiError(error?.data?.message ?? error?.message ?? 'TikTok could not be reached', error?.data?.code);
  }

  if (response.code !== 0) {
    throw new TikTokApiError(response.message || `TikTok rejected the event (code ${response.code})`, response.code);
  }
}
