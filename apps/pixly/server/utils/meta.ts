import type { H3Event } from 'h3';
import type { MetaGraph, MetaTokenResponse } from '~~/lib/meta/graph';
import type { MetaConnectionView } from '~~/shared/utils/meta';
import { metaGraph } from '~~/lib/meta/graph';
import { metaAccountStatus } from '~~/shared/utils/meta';

export function useMetaGraph(): MetaGraph | null {
  const config = useRuntimeConfig();

  if (!config.metaAppId || !config.metaAppSecret || !config.metaLoginConfigId) {
    return null;
  }

  return metaGraph({
    version: config.metaGraphVersion,
    appId: config.metaAppId,
    appSecret: config.metaAppSecret,
  });
}

export function requireMetaGraph(): MetaGraph {
  const graph = useMetaGraph();

  if (!graph) {
    throw createError({ statusCode: 503, statusMessage: 'Facebook connection is not configured on this app' });
  }

  return graph;
}

export function metaRedirectUri(event: H3Event): string {
  const appUrl = useRuntimeConfig().appUrl || getRequestURL(event).origin;

  return `${appUrl.replace(/\/$/, '')}/auth/meta/callback`;
}

export function requireStore(event: H3Event): string {
  const store = event.context.session?.store;

  if (!store) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: no store session' });
  }

  return store;
}

export async function saveMetaConnection(store: string, graph: MetaGraph, token: MetaTokenResponse): Promise<void> {
  let accessToken = token.access_token;
  let expiresIn = token.expires_in;

  // System-user tokens come back without an expiry. User tokens are short-lived until exchanged.
  const tokenType = expiresIn ? 'user' : 'system_user';

  if (tokenType === 'user') {
    const extended = await graph.extendUserToken(accessToken);
    accessToken = extended.access_token;
    expiresIn = extended.expires_in;
  }

  const me = await graph.me(accessToken);
  const data = {
    accessToken: sealSecret(accessToken),
    tokenType,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    metaUserId: me.id,
    metaUserName: me.name ?? null,
  };

  await prisma.metaConnection.upsert({
    where: { store },
    create: { store, ...data },
    update: data,
  });

  await syncMetaAdAccounts(store, graph, accessToken);
}

export async function syncMetaAdAccounts(store: string, graph: MetaGraph, accessToken: string): Promise<void> {
  const accounts = await graph.adAccounts(accessToken);
  const existing = await prisma.metaAdAccount.findMany({ where: { store } });
  const previous = new Map(existing.map(account => [account.id, account]));

  // First connection: track every active account so the seller doesn't start from an empty list.
  const firstSync = existing.length === 0;

  await prisma.$transaction([
    prisma.metaAdAccount.deleteMany({
      where: { store, id: { notIn: accounts.map(account => account.id) } },
    }),
    ...accounts.map((account) => {
      const data = {
        name: account.name,
        currency: account.currency,
        timezone: account.timezone_name ?? null,
        businessName: account.business?.name ?? null,
        status: account.account_status,
      };

      return prisma.metaAdAccount.upsert({
        where: { store_id: { store, id: account.id } },
        create: {
          store,
          id: account.id,
          ...data,
          selected: firstSync ? metaAccountStatus(account.account_status) === 'active' : false,
        },
        update: {
          ...data,
          selected: previous.get(account.id)?.selected ?? false,
        },
      });
    }),
  ]);
}

export async function metaAccessToken(store: string): Promise<string | null> {
  const connection = await prisma.metaConnection.findUnique({ where: { store } });

  return connection ? openSecret(connection.accessToken) : null;
}

export async function metaConnectionView(store: string): Promise<MetaConnectionView> {
  const available = useMetaGraph() !== null;
  const connection = await prisma.metaConnection.findUnique({
    where: { store },
    include: { adAccounts: { orderBy: { name: 'asc' } } },
  });

  if (!connection) {
    return { available, connected: false, account: null, adAccounts: [] };
  }

  return {
    available,
    connected: true,
    account: {
      name: connection.metaUserName,
      tokenType: connection.tokenType === 'user' ? 'user' : 'system_user',
      expiresAt: connection.expiresAt?.toISOString() ?? null,
      connectedAt: connection.createdAt.toISOString(),
    },
    adAccounts: connection.adAccounts.map(account => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      timezone: account.timezone,
      businessName: account.businessName,
      status: metaAccountStatus(account.status),
      selected: account.selected,
    })),
  };
}
