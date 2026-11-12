/* global register */
// Forwards storefront customer events to Pixly, which adds the shopper's IP and
// hashed contact details and sends them to the TikTok Events API. Purchases are
// sent by Pixly from the order webhook, so they're not forwarded from here.
const EVENTS = {
  product_viewed: 'ViewContent',
  product_added_to_cart: 'AddToCart',
  search_submitted: 'Search',
  checkout_started: 'InitiateCheckout',
  payment_info_submitted: 'AddPaymentInfo',
};

const CLICK_ID_KEY = 'pixly_ttclid';
// TikTok's longest click attribution window
const CLICK_ID_TTL_MS = 28 * 24 * 60 * 60 * 1000;

function content(variant, quantity, price = variant.price) {
  return {
    content_id: String(variant.product_id ?? variant.product?.id ?? variant.id),
    content_name: variant.product?.name,
    price: Number(price),
    quantity,
  };
}

function properties({ name, data }, currency) {
  if (name === 'product_viewed') {
    return { contents: [content(data.product_variant, 1)], currency, value: Number(data.product_variant.price) };
  }

  if (name === 'product_added_to_cart') {
    const { quantity, product_variant: variant } = data.cart_line;

    return { contents: [content(variant, quantity)], currency, value: Number(variant.price) * quantity };
  }

  if (name === 'search_submitted') {
    return { query: data.search_result?.query };
  }

  const checkout = data.checkout ?? {};

  return {
    contents: (checkout.line_items ?? []).map(line => content(line.product_variant, line.quantity, line.price)),
    currency: checkout.currency_code ?? currency,
    value: Number(checkout.total_price),
  };
}

// The ttclid is only in the landing page's URL, so it's kept for the pages after it
async function clickId(browser, href) {
  const fromUrl = new URL(href).searchParams.get('ttclid');

  if (fromUrl) {
    await browser.localStorage.setItem(CLICK_ID_KEY, JSON.stringify({ value: fromUrl, at: Date.now() }));

    return fromUrl;
  }

  const cookie = await browser.cookie.get('ttclid');

  if (cookie) {
    return cookie;
  }

  try {
    const saved = JSON.parse(await browser.localStorage.getItem(CLICK_ID_KEY));

    return saved && Date.now() - saved.at < CLICK_ID_TTL_MS ? saved.value : undefined;
  }
  catch {
    return undefined;
  }
}

register(({ analytics, browser, init, settings }) => {
  const currency = init.store?.currency_code;
  let email = init.customer?.email;
  let phone = init.customer?.phone;

  analytics.subscribe('all_standard_events', async (event) => {
    const checkout = event.data?.checkout;

    // Checkout events carry what the shopper typed, even when they're not logged in
    email = checkout?.email || email;
    phone = checkout?.phone || checkout?.shipping_address?.phone || phone;

    const { location, referrer } = event.context.document;
    // Read on every event, page views included, so the landing page's click ID is kept
    const ttclid = await clickId(browser, location.href);
    const name = EVENTS[event.name];

    if (!name || !settings.endpoint) {
      return;
    }

    const payload = {
      event: name,
      event_id: event.id,
      event_time: Math.floor(Date.parse(event.timestamp) / 1000),
      url: location.href,
      referrer: referrer || undefined,
      user_agent: event.context.navigator.user_agent,
      client_id: event.client_id,
      ttp: (await browser.cookie.get('_ttp')) || undefined,
      ttclid,
      email,
      phone,
      properties: properties(event, currency),
    };

    // Plain text without credentials needs no CORS preflight
    fetch(settings.endpoint, { method: 'POST', mode: 'no-cors', keepalive: true, body: JSON.stringify(payload) }).catch(() => {});
  });
});
