import type { FetchError } from 'ofetch';
import crypto from 'node:crypto';
import { ofetch } from 'ofetch';

export interface MetaGraphOptions {
  version: string;
  appId: string;
  appSecret: string;
}

export interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface MetaUser {
  id: string;
  name?: string;
}

export interface MetaAdAccountNode {
  id: string;
  name: string;
  currency: string;
  timezone_name?: string;
  account_status: number;
  business?: { id: string; name: string };
}

interface MetaPage<T> {
  data: T[];
  paging?: { next?: string };
}

export class MetaGraphError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: number,
  ) {
    super(message);
    this.name = 'MetaGraphError';
  }
}

const MAX_PAGES = 20;

export function metaGraph(options: MetaGraphOptions) {
  const base = `https://graph.facebook.com/${options.version}`;

  // https://developers.facebook.com/docs/graph-api/securing-requests#appsecret_proof
  function appSecretProof(token: string): string {
    return crypto.createHmac('sha256', options.appSecret).update(token).digest('hex');
  }

  async function request<T>(url: string, init: { method?: 'GET' | 'DELETE'; query?: Record<string, string>; token?: string } = {}): Promise<T> {
    const query = { ...init.query };

    if (init.token) {
      query.access_token = init.token;
      query.appsecret_proof = appSecretProof(init.token);
    }

    try {
      return await ofetch<T>(url.startsWith('https://') ? url : `${base}${url}`, {
        method: init.method ?? 'GET',
        query,
        timeout: 15000,
      });
    }
    catch (error) {
      const fetchError = error as FetchError;
      const graphError = fetchError.data?.error;

      throw new MetaGraphError(graphError?.message ?? fetchError.message, fetchError.status, graphError?.code);
    }
  }

  return {
    // Facebook Login for Business: the configuration decides the token type, assets and permissions.
    loginUrl({ redirectUri, configId, state }: { redirectUri: string; configId: string; state: string }): string {
      const query = new URLSearchParams({
        client_id: options.appId,
        config_id: configId,
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
        override_default_response_type: 'true',
      });

      return `https://www.facebook.com/${options.version}/dialog/oauth?${query}`;
    },

    exchangeCode(code: string, redirectUri: string): Promise<MetaTokenResponse> {
      return request<MetaTokenResponse>('/oauth/access_token', {
        query: {
          client_id: options.appId,
          client_secret: options.appSecret,
          redirect_uri: redirectUri,
          code,
        },
      });
    },

    // Swaps a short-lived user token for a ~60 day one. System-user tokens don't need this.
    extendUserToken(token: string): Promise<MetaTokenResponse> {
      return request<MetaTokenResponse>('/oauth/access_token', {
        query: {
          grant_type: 'fb_exchange_token',
          client_id: options.appId,
          client_secret: options.appSecret,
          fb_exchange_token: token,
        },
      });
    },

    me(token: string): Promise<MetaUser> {
      return request<MetaUser>('/me', { token, query: { fields: 'id,name' } });
    },

    async adAccounts(token: string): Promise<MetaAdAccountNode[]> {
      const accounts: MetaAdAccountNode[] = [];
      let page = await request<MetaPage<MetaAdAccountNode>>('/me/adaccounts', {
        token,
        query: {
          fields: 'id,name,currency,timezone_name,account_status,business{id,name}',
          limit: '100',
        },
      });

      for (let i = 0; i < MAX_PAGES; i++) {
        accounts.push(...page.data);

        if (!page.paging?.next) {
          break;
        }
        page = await request<MetaPage<MetaAdAccountNode>>(page.paging.next);
      }

      return accounts;
    },

    async revoke(token: string): Promise<void> {
      await request('/me/permissions', { method: 'DELETE', token });
    },
  };
}

export type MetaGraph = ReturnType<typeof metaGraph>;
