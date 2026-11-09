export type AttributionPlatform = 'meta' | 'tiktok' | 'google' | 'snapchat' | 'x' | 'microsoft' | 'other';

export const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'] as const;

export type UtmParam = (typeof UTM_PARAMS)[number];

export interface Attribution {
  platform: AttributionPlatform;
  campaignId: string | null;
  clickId: string | null;
  utm: Partial<Record<UtmParam, string>>;
}

// Added by the ad platforms themselves, even when the seller sets no UTMs
const CLICK_ID_PLATFORMS: Record<string, AttributionPlatform> = {
  fbclid: 'meta',
  ttclid: 'tiktok',
  gclid: 'google',
  gbraid: 'google',
  wbraid: 'google',
  sccid: 'snapchat',
  twclid: 'x',
  msclkid: 'microsoft',
};

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

function queryParams(landingUrl: string): Record<string, string> {
  const params: Record<string, string> = {};

  try {
    // ScCid is the casing Snapchat uses, so keys are compared lowercased
    new URL(landingUrl, 'https://store.invalid').searchParams.forEach((value, name) => {
      const key = name.toLowerCase();

      if (value.trim() && !(key in params)) {
        params[key] = value.trim();
      }
    });
  }
  catch {}

  return params;
}

/**
 * Google auto-tagging adds gad_campaignid. Meta's suggested URL parameters put the
 * campaign ID in utm_id and utm_campaign, TikTok's in utm_id. Only numeric values
 * count, so a hand-written utm_campaign like "summer_sale" isn't taken for an ID.
 */
function campaignId(params: Record<string, string>): string | null {
  return [params.gad_campaignid, params.utm_id, params.utm_campaign].find(value => value && /^\d{6,25}$/.test(value)) ?? null;
}

export function parseLandingUrl(landingUrl: string | null | undefined): Attribution | null {
  if (!landingUrl) {
    return null;
  }

  const params = queryParams(landingUrl);
  const clickParam = Object.keys(CLICK_ID_PLATFORMS).find(param => params[param]);
  const source = params.utm_source?.toLowerCase();

  let platform: AttributionPlatform | null = null;

  if (clickParam) {
    platform = CLICK_ID_PLATFORMS[clickParam]!;
  }
  else if (params.gad_campaignid) {
    platform = 'google';
  }
  else if (source) {
    platform = SOURCE_PLATFORMS[source] ?? 'other';
  }

  if (!platform) {
    return null;
  }

  const utm: Attribution['utm'] = {};

  for (const param of UTM_PARAMS) {
    if (params[param]) {
      utm[param] = params[param];
    }
  }

  return {
    platform,
    campaignId: campaignId(params),
    clickId: clickParam ? params[clickParam]! : null,
    utm,
  };
}

export type OrderOutcome = 'pending' | 'confirmed' | 'delivered' | 'returned' | 'canceled';

export const CANCELED_CONFIRMATIONS = ['canceled-by-seller', 'cancelled', 'invalid', 'rejected', 'expired', 'blocked'];
// Shipping statuses after which the order doesn't move anymore
export const FINAL_SHIPPING_STATUSES = ['delivered', 'returned', 'canceled'];

// Shipping statuses that mean the order left the confirmation stage
const SHIPPED_STATUSES = new Set(['fulfilled', 'shipped', 'processing', 'created', 'confirmed', 'pending-pickup', 'picked-up', 'in-company-hub', 'to-customer', 'delivery-failed']);

/**
 * Where an order ended up, from the confirmation_status and shipping_status slugs
 * of the YouCan order. Delivered and returned come from the shipping company,
 * so they win over whatever the confirmation status says.
 */
export function orderOutcome(confirmationStatus: string | null | undefined, shippingStatus: string | null | undefined): OrderOutcome {
  if (shippingStatus === 'delivered') {
    return 'delivered';
  }
  if (shippingStatus === 'returned') {
    return 'returned';
  }
  if (shippingStatus === 'canceled' || (confirmationStatus && CANCELED_CONFIRMATIONS.includes(confirmationStatus))) {
    return 'canceled';
  }
  if (confirmationStatus === 'confirmed' || (shippingStatus && SHIPPED_STATUSES.has(shippingStatus))) {
    return 'confirmed';
  }

  return 'pending';
}
