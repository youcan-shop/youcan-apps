import type { TikTokConnection } from '@prisma/client';
import type { H3Event } from 'h3';
import type { TikTokContent, TikTokEvent, TikTokEventName, TikTokProperties, TikTokUser } from '~~/lib/tiktok/events-api';
import type { Order } from '~~/lib/youcan';
import type { TikTokConnectionInput, TikTokConnectionView } from '~~/shared/utils/tiktok';
import crypto from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { TikTokApiError, trackTikTokEvents } from '~~/lib/tiktok/events-api';
import { client } from '~~/lib/youcan';
import { parseLandingUrl } from '~~/shared/utils/attribution';

// Events the web pixel may forward. Purchase only comes from the order webhook.
const COLLECTED_EVENTS: TikTokEventName[] = ['ViewContent', 'AddToCart', 'Search', 'InitiateCheckout', 'AddPaymentInfo'];
// TikTok drops web events older than 7 days
const MAX_EVENT_AGE_S = 7 * 24 * 60 * 60;
const STATUS_WRITE_INTERVAL_MS = 60 * 1000;
const VISITOR_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Client details are saved right after the order, so they can miss the first fetch
const CLIENT_DETAILS_RETRIES_MS = [10_000, 30_000, 60_000];

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function text(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}

function amount(value: unknown): number | undefined {
  const number = typeof value === 'string' ? Number.parseFloat(value) : value;

  return typeof number === 'number' && Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function hashEmail(email: unknown): string | undefined {
  const normalized = text(email, 320)?.toLowerCase();

  return normalized?.includes('@') ? sha256(normalized) : undefined;
}

// TikTok wants E.164 before hashing. Numbers typed without a country code are hashed as typed.
export function hashPhone(phone: unknown): string | undefined {
  const raw = text(phone, 32);
  if (!raw) {
    return undefined;
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length < 6) {
    return undefined;
  }

  if (raw.startsWith('+')) {
    return sha256(`+${digits}`);
  }

  return sha256(digits.startsWith('00') ? `+${digits.slice(2)}` : digits);
}

function collectUrl(event: H3Event, key: string): string {
  const appUrl = useRuntimeConfig().appUrl || getRequestURL(event).origin;

  return `${appUrl.replace(/\/$/, '')}/collect/${key}`;
}

function view(connection: TikTokConnection | null): TikTokConnectionView {
  return {
    connected: !!connection,
    pixelCode: connection?.pixelCode ?? null,
    testEventCode: connection?.testEventCode ?? null,
    enabled: connection?.enabled ?? false,
    webPixel: !!connection?.webPixelId,
    lastEventAt: connection?.lastEventAt?.toISOString() ?? null,
    lastError: connection?.lastError ?? null,
    lastErrorAt: connection?.lastErrorAt?.toISOString() ?? null,
  };
}

export async function tiktokConnectionView(store: string): Promise<TikTokConnectionView> {
  return view(await prisma.tikTokConnection.findUnique({ where: { store } }));
}

/**
 * Adds, updates or removes the app's web pixel so the storefront only runs it
 * while TikTok tracking is on. Returns the web pixel ID, or null when there's none.
 */
async function syncWebPixel(event: H3Event, connection: TikTokConnection): Promise<string | null> {
  const current = await youcan.store.webPixels.get();

  if (!connection.enabled) {
    if (current) {
      await youcan.store.webPixels.delete(current.id);
    }

    return null;
  }

  const settings = { endpoint: collectUrl(event, connection.collectKey) };

  if (!current) {
    return (await youcan.store.webPixels.create(settings)).id;
  }

  if (current.settings?.endpoint !== settings.endpoint) {
    await youcan.store.webPixels.update(current.id, settings);
  }

  return current.id;
}

export async function saveTikTokConnection(event: H3Event, store: string, input: TikTokConnectionInput): Promise<TikTokConnectionView> {
  const existing = await prisma.tikTokConnection.findUnique({ where: { store } });
  const info = await youcan.store.info();

  const data = {
    storeId: info.id,
    storeDomain: info.domain || null,
    pixelCode: input.pixelCode,
    accessToken: input.accessToken ? sealSecret(input.accessToken) : existing!.accessToken,
    testEventCode: input.testEventCode || null,
    enabled: input.enabled,
    lastError: null,
    lastErrorAt: null,
  };

  let connection = await prisma.tikTokConnection.upsert({
    where: { store },
    create: { store, collectKey: crypto.randomBytes(18).toString('base64url'), ...data },
    update: data,
  });

  let webPixelId: string | null = null;
  let lastError: string | null = null;

  try {
    webPixelId = await syncWebPixel(event, connection);
  }
  catch (error: any) {
    console.error('[tiktok] web pixel sync failed', store, error?.response?.status, error?.data ?? error?.message);
    lastError = `Couldn't turn on the storefront pixel, so only purchases are sent: ${error?.data?.detail ?? error?.data?.message ?? error?.message ?? 'unknown error'}`;
  }

  connection = await prisma.tikTokConnection.update({
    where: { store },
    data: { webPixelId, lastError, lastErrorAt: lastError ? new Date() : null },
  });

  return view(connection);
}

export async function deleteTikTokConnection(store: string, removeWebPixel: boolean): Promise<void> {
  if (removeWebPixel) {
    try {
      const current = await youcan.store.webPixels.get();
      if (current) {
        await youcan.store.webPixels.delete(current.id);
      }
    }
    catch (error: any) {
      console.error('[tiktok] web pixel removal failed', store, error?.response?.status, error?.data ?? error?.message);
    }
  }

  await prisma.tikTokConnection.deleteMany({ where: { store } });
  await prisma.tikTokVisitor.deleteMany({ where: { store } });
}

const lastStatusWrite = new Map<string, number>();
// Stores whose last saved status is an error, so the first success after it clears it right away
const failing = new Map<string, string>();

async function recordResult(store: string, error?: unknown): Promise<void> {
  // Every event would otherwise be a database write
  const throttled = Date.now() - (lastStatusWrite.get(store) ?? 0) < STATUS_WRITE_INTERVAL_MS;

  if (error) {
    const message = error instanceof TikTokApiError ? error.message : 'TikTok could not be reached';
    console.error('[tiktok] event rejected', store, (error as any)?.code, (error as any)?.message);

    if (throttled && failing.get(store) === message) {
      return;
    }

    failing.set(store, message);
    lastStatusWrite.set(store, Date.now());
    await prisma.tikTokConnection.updateMany({ where: { store }, data: { lastError: message, lastErrorAt: new Date() } });

    return;
  }

  if (throttled && !failing.has(store)) {
    return;
  }

  failing.delete(store);
  lastStatusWrite.set(store, Date.now());
  await prisma.tikTokConnection.updateMany({ where: { store }, data: { lastEventAt: new Date(), lastError: null, lastErrorAt: null } });
}

async function send(connection: TikTokConnection, events: TikTokEvent[]): Promise<void> {
  try {
    await trackTikTokEvents({
      pixelCode: connection.pixelCode,
      accessToken: openSecret(connection.accessToken),
      testEventCode: connection.testEventCode,
    }, events);
    await recordResult(connection.store);
  }
  catch (error) {
    await recordResult(connection.store, error);
  }
}

interface VisitorHints {
  ttp?: string;
  ttclid?: string;
  email?: string;
  phone?: string;
}

/**
 * Saves what's new about the shopper and returns everything known so far, so an
 * event sent before the shopper typed their email still gets it on the next one.
 */
async function rememberVisitor(store: string, clientId: string | undefined, hints: VisitorHints): Promise<VisitorHints> {
  if (!clientId) {
    return hints;
  }

  const known = await prisma.tikTokVisitor.findUnique({ where: { store_clientId: { store, clientId } } });
  const merged: VisitorHints = {
    ttp: hints.ttp ?? known?.ttp ?? undefined,
    ttclid: hints.ttclid ?? known?.ttclid ?? undefined,
    email: hints.email ?? known?.email ?? undefined,
    phone: hints.phone ?? known?.phone ?? undefined,
  };

  const changed = !known || (['ttp', 'ttclid', 'email', 'phone'] as const).some(key => (merged[key] ?? null) !== known[key]);

  if (changed) {
    const data = { ttp: merged.ttp ?? null, ttclid: merged.ttclid ?? null, email: merged.email ?? null, phone: merged.phone ?? null };

    await prisma.tikTokVisitor.upsert({
      where: { store_clientId: { store, clientId } },
      create: { store, clientId, ...data },
      update: data,
    });
  }

  if (Math.random() < 0.01) {
    await prisma.tikTokVisitor.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - VISITOR_TTL_MS) } } });
  }

  return merged;
}

function contents(items: unknown): TikTokContent[] | undefined {
  if (!Array.isArray(items)) {
    return undefined;
  }

  const list = items.slice(0, 50).flatMap((item: any) => {
    const id = text(item?.content_id, 64);

    return id
      ? [{ content_id: id, content_name: text(item.content_name, 200), price: amount(item.price), quantity: Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : undefined }]
      : [];
  });

  return list.length ? list : undefined;
}

function properties(input: any): TikTokProperties {
  const currency = text(input?.currency, 3)?.toUpperCase();
  const items = contents(input?.contents);

  return {
    contents: items,
    content_type: items ? 'product' : undefined,
    currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : undefined,
    value: amount(input?.value),
    query: text(input?.query, 200),
  };
}

/**
 * Takes an event posted by the web pixel, adds what only the server knows (the
 * shopper's IP, hashed contact details) and forwards it to TikTok. Returns false
 * when the event isn't one Pixly sends.
 */
export async function forwardCollectedEvent(event: H3Event, connection: TikTokConnection, body: any): Promise<boolean> {
  const name = body?.event as TikTokEventName;
  const eventId = text(body?.event_id, 100);
  const eventTime = Number.isInteger(body?.event_time) ? body.event_time as number : Math.floor(Date.now() / 1000);
  const now = Math.floor(Date.now() / 1000);

  if (!COLLECTED_EVENTS.includes(name) || !eventId || eventTime < now - MAX_EVENT_AGE_S || eventTime > now + 300) {
    return false;
  }

  const clientId = text(body.client_id, 100);
  const hints = await rememberVisitor(connection.store, clientId, {
    ttp: text(body.ttp, 200),
    ttclid: text(body.ttclid, 500),
    email: hashEmail(body.email),
    phone: hashPhone(body.phone),
  });

  const user: TikTokUser = {
    ip: getRequestIP(event, { xForwardedFor: true }),
    user_agent: getRequestHeader(event, 'user-agent') ?? text(body.user_agent, 500),
    external_id: clientId ? sha256(clientId) : undefined,
    ...hints,
  };

  await send(connection, [{
    event: name,
    event_id: eventId,
    event_time: eventTime,
    user,
    properties: properties(body.properties),
    page: { url: text(body.url, 2000), referrer: text(body.referrer, 2000) },
  }]);

  return true;
}

function purchaseContents(order: Order): TikTokContent[] {
  return (order.variants ?? []).map(line => ({
    content_id: String(line.variant?.product?.id ?? line.variant?.id ?? line.id),
    content_name: line.variant?.product?.name ?? undefined,
    price: amount(line.price),
    quantity: line.quantity,
  }));
}

/**
 * Sends a storefront order to TikTok as a Purchase. Orders without client details
 * were made by the seller in the admin or by a shopper without a visitor cookie,
 * so they're skipped.
 */
export async function sendTikTokPurchase(payload: Order & { store_id?: string }): Promise<void> {
  const connection = payload.store_id ? await prisma.tikTokConnection.findUnique({ where: { storeId: payload.store_id } }) : null;

  if (!connection?.enabled) {
    return;
  }

  const session = await prisma.session.findFirst({ where: { store: connection.store, accessToken: { not: null } } });

  if (!session?.accessToken) {
    await prisma.tikTokConnection.update({
      where: { store: connection.store },
      data: { lastError: 'Pixly lost access to your store. Open the app again to send purchases.', lastErrorAt: new Date() },
    });

    return;
  }

  const api = client({ token: session.accessToken, baseUrl: useRuntimeConfig().youcanApiUrl });
  let order = await api.store.orders.get(payload.id, { include: ['client_details', 'customer'] });

  for (const delay of CLIENT_DETAILS_RETRIES_MS) {
    if (order.client_details) {
      break;
    }

    await sleep(delay);
    order = await api.store.orders.get(payload.id, { include: ['client_details', 'customer'] });
  }

  const details = order.client_details;

  if (!details) {
    return;
  }

  const visitor = details.client_id
    ? await prisma.tikTokVisitor.findUnique({ where: { store_clientId: { store: connection.store, clientId: details.client_id } } })
    : null;
  const landing = parseLandingUrl(details.landing_url);
  const createdAt = Date.parse(order.created_at);
  let pageUrl: string | undefined;

  try {
    pageUrl = details.landing_url && connection.storeDomain ? new URL(details.landing_url, `https://${connection.storeDomain}`).href : undefined;
  }
  catch {}

  const user: TikTokUser = {
    ip: details.ip ?? undefined,
    user_agent: details.user_agent ?? undefined,
    external_id: details.client_id ? sha256(details.client_id) : undefined,
    ttp: visitor?.ttp ?? undefined,
    ttclid: visitor?.ttclid ?? (landing?.platform === 'tiktok' ? landing.clickId ?? undefined : undefined),
    email: hashEmail(order.customer?.email) ?? visitor?.email ?? undefined,
    phone: hashPhone(order.customer?.phone) ?? visitor?.phone ?? undefined,
  };

  const items = purchaseContents(order);

  await send(connection, [{
    event: 'Purchase',
    // Same ID the platform's own TikTok integration uses, so TikTok can drop duplicates
    event_id: order.id,
    event_time: Math.floor((Number.isNaN(createdAt) ? Date.now() : createdAt) / 1000),
    user,
    properties: {
      contents: items.length ? items : undefined,
      content_type: items.length ? 'product' : undefined,
      currency: order.currency,
      value: amount(order.total),
      order_id: order.ref,
    },
    page: { url: pageUrl, referrer: details.referrer ?? undefined },
  }]);
}

export async function findTikTokCollector(key: string): Promise<TikTokConnection | null> {
  const connection = await prisma.tikTokConnection.findUnique({ where: { collectKey: key } });

  return connection?.enabled ? connection : null;
}
