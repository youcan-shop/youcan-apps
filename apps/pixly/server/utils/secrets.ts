import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';

function secretKey(purpose: string): Buffer {
  const { youcanApiSecret } = useRuntimeConfig();

  return crypto.createHash('sha256').update(`${purpose}:${youcanApiSecret}`).digest();
}

// AES-256-GCM, for third-party tokens stored in the database.
export function sealSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey('seal'), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);

  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.');
}

export function openSecret(sealed: string): string {
  const [iv, tag, encrypted] = sealed.split('.').map(part => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey('seal'), iv!);
  decipher.setAuthTag(tag!);

  return Buffer.concat([decipher.update(encrypted!), decipher.final()]).toString('utf8');
}

export interface OAuthState {
  store: string;
  exp: number;
}

const STATE_TTL_MS = 15 * 60 * 1000;

export function signOAuthState(store: string): string {
  const payload = Buffer.from(JSON.stringify({
    store,
    exp: Date.now() + STATE_TTL_MS,
    nonce: crypto.randomBytes(8).toString('hex'),
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', secretKey('oauth-state')).update(payload).digest('base64url');

  return `${payload}.${signature}`;
}

export function readOAuthState(state: string): OAuthState | null {
  const [payload, signature] = state.split('.');

  if (!payload || !signature) {
    return null;
  }

  const expected = crypto.createHmac('sha256', secretKey('oauth-state')).update(payload).digest('base64url');

  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;

    return typeof data.store === 'string' && data.exp > Date.now() ? data : null;
  }
  catch {
    return null;
  }
}
