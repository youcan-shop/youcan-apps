import { attributionCampaignId, attributionPlatform } from '~~/shared/utils/attribution';

// Called by the theme embed from the storefront thank-you page (sendBeacon, text/plain).
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*');

  const raw = await readRawBody(event, 'utf8');

  if (!raw || raw.length > 10_000) {
    setResponseStatus(event, 400);
    return null;
  }

  const beacon = parseAttributionBeacon(raw);

  if (!beacon) {
    setResponseStatus(event, 400);
    return null;
  }

  const session = await prisma.session.findFirst({
    where: { store: beacon.store, accessToken: { not: null } },
  });

  // Not installed, or the store hasn't opened the app since it lost its token
  if (!session) {
    setResponseStatus(event, 202);
    return null;
  }

  const existing = await prisma.orderAttribution.findUnique({
    where: { store_orderId: { store: beacon.store, orderId: beacon.orderId } },
    select: { orderId: true },
  });

  if (existing) {
    setResponseStatus(event, 204);
    return null;
  }

  // Make sure the order is real, so anyone can't write attributions for a store
  event.context.session = session;
  let verified = false;

  try {
    const order = await youcan.store.orders.get(beacon.orderId);
    verified = order?.id === beacon.orderId;
  }
  catch (error: any) {
    const status = error?.response?.status;

    if (status === 404 || status === 403 || status === 422) {
      setResponseStatus(event, 404);
      return null;
    }

    // API unreachable or token expired: keep it, flagged as unverified
    console.error('[attribution] could not verify order', beacon.store, beacon.orderId, status ?? error?.message);
  }

  await prisma.orderAttribution.upsert({
    where: { store_orderId: { store: beacon.store, orderId: beacon.orderId } },
    update: {},
    create: {
      store: beacon.store,
      orderId: beacon.orderId,
      platform: attributionPlatform(beacon.params),
      campaignId: attributionCampaignId(beacon.params),
      ...beacon.params,
      landingUrl: beacon.landingUrl,
      referrer: beacon.referrer,
      clickedAt: beacon.clickedAt,
      verified,
    },
  });

  setResponseStatus(event, 204);
  return null;
});
