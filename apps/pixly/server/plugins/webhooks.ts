/* eslint-disable no-console */
import type { Order } from '~~/lib/youcan';

export default defineNitroPlugin(() => {
  defineWebhookHandler('order.created', async (payload) => {
    const order = payload as Order;

    console.log('[Webhook] New order received');
    console.table({
      Reference: order.ref,
      Total: `${order.total} ${order.currency}`,
    });
  });

  defineWebhookHandler('app.uninstalled', async (payload) => {
    const data = payload as { store_slug: string };

    console.log(`[Webhook] App uninstalled from store ${data.store_slug}. Clearing sessions.`);

    await prisma.session.updateMany({
      where: { store: data.store_slug },
      data: { accessToken: null },
    });

    await prisma.metaConnection.deleteMany({ where: { store: data.store_slug } });
    await prisma.orderAttribution.deleteMany({ where: { store: data.store_slug } });
    await prisma.orderSync.deleteMany({ where: { store: data.store_slug } });
  });
});
