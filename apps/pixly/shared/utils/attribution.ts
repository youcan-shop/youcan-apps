// URL parameters the theme embed keeps from the landing page, mapped to OrderAttribution columns
export const ATTRIBUTION_PARAMS = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_term: 'utmTerm',
  utm_content: 'utmContent',
  utm_id: 'utmId',
  fbclid: 'fbclid',
  ttclid: 'ttclid',
  gclid: 'gclid',
  sccid: 'sccid',
  twclid: 'twclid',
  msclkid: 'msclkid',
} as const;

export type AttributionParam = keyof typeof ATTRIBUTION_PARAMS;

export type AttributionColumn = (typeof ATTRIBUTION_PARAMS)[AttributionParam];

export type AttributionPlatform = 'meta' | 'tiktok' | 'google' | 'snapchat' | 'x' | 'microsoft' | 'other';

export type AttributionParams = Partial<Record<AttributionColumn, string>>;

const SOURCE_PLATFORMS: Record<string, AttributionPlatform> = {
  fb: 'meta',
  ig: 'meta',
  an: 'meta',
  msg: 'meta',
  facebook: 'meta',
  instagram: 'meta',
  meta: 'meta',
  tiktok: 'tiktok',
  google: 'google',
  snapchat: 'snapchat',
  twitter: 'x',
  x: 'x',
  bing: 'microsoft',
  microsoft: 'microsoft',
};

export function attributionPlatform(params: AttributionParams): AttributionPlatform | null {
  if (params.fbclid) {
    return 'meta';
  }
  if (params.ttclid) {
    return 'tiktok';
  }
  if (params.gclid) {
    return 'google';
  }
  if (params.sccid) {
    return 'snapchat';
  }
  if (params.twclid) {
    return 'x';
  }
  if (params.msclkid) {
    return 'microsoft';
  }

  const source = params.utmSource?.trim().toLowerCase();

  if (!source) {
    return null;
  }

  return SOURCE_PLATFORMS[source] ?? 'other';
}

/**
 * Meta's default URL parameters put the campaign ID in utm_id and utm_campaign,
 * TikTok's put it in utm_id (utm_campaign holds the name). Only numeric IDs are
 * kept, so a hand-written utm_campaign like "summer_sale" isn't mistaken for one.
 */
export function attributionCampaignId(params: AttributionParams): string | null {
  for (const value of [params.utmId, params.utmCampaign]) {
    if (value && /^\d{6,25}$/.test(value.trim())) {
      return value.trim();
    }
  }

  return null;
}
