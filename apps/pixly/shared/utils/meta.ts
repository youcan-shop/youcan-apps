export type MetaAdAccountStatus = 'active' | 'disabled' | 'unsettled' | 'closed' | 'pending';

export interface MetaAdAccountView {
  id: string;
  name: string;
  currency: string;
  timezone: string | null;
  businessName: string | null;
  status: MetaAdAccountStatus;
  selected: boolean;
}

export interface MetaConnectionView {
  // false when the Meta app credentials are missing from the environment
  available: boolean;
  connected: boolean;
  account: {
    name: string | null;
    tokenType: 'system_user' | 'user';
    expiresAt: string | null;
    connectedAt: string;
  } | null;
  adAccounts: MetaAdAccountView[];
}

// https://developers.facebook.com/docs/marketing-api/reference/ad-account#fields (account_status)
export function metaAccountStatus(code: number): MetaAdAccountStatus {
  switch (code) {
    case 1:
    case 201:
      return 'active';
    case 2:
      return 'disabled';
    case 3:
    case 8:
    case 9:
      return 'unsettled';
    case 100:
    case 101:
    case 202:
      return 'closed';
    default:
      return 'pending';
  }
}
