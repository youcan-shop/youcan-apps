import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { Buffer } from 'node:buffer';
import { gzipSync } from 'node:zlib';

const COMPRESSIBLE = /javascript|css|json|html|svg|text\//;

export function devGzip(): Plugin {
  return {
    name: 'pixels-app:dev-gzip',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== 'GET' || !req.url?.startsWith('/_nuxt/') || !/\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
          return next();
        }

        const chunks: Buffer[] = [];
        let head: unknown[] | null = null;
        const original = { writeHead: res.writeHead, write: res.write, end: res.end };

        const collect = (chunk: unknown, encoding?: unknown) => {
          if (chunk != null && typeof chunk !== 'function') {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string, typeof encoding === 'string' ? encoding as BufferEncoding : undefined));
          }
        };

        res.writeHead = ((...args: unknown[]) => {
          head = args;

          return res;
        }) as typeof res.writeHead;

        res.write = ((chunk: unknown, encoding?: unknown) => {
          collect(chunk, encoding);

          return true;
        }) as typeof res.write;

        res.end = ((chunk?: unknown, encoding?: unknown) => {
          collect(chunk, encoding);
          Object.assign(res, original);

          if (head) {
            const [status, maybeMessage, maybeHeaders] = head as [number, unknown, unknown];
            const headers = (typeof maybeMessage === 'object' ? maybeMessage : maybeHeaders) as Record<string, string | number | string[]> | undefined;

            res.statusCode = status;
            if (typeof maybeMessage === 'string') {
              res.statusMessage = maybeMessage;
            }
            for (const [name, value] of Object.entries(headers ?? {})) {
              res.setHeader(name, value);
            }
          }

          let body: Buffer = Buffer.concat(chunks);
          const type = String(res.getHeader('content-type') ?? '');

          if (res.statusCode === 200 && body.length > 1024 && !res.getHeader('content-encoding') && COMPRESSIBLE.test(type)) {
            body = gzipSync(body, { level: 6 });
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Vary', 'Accept-Encoding');
          }

          if (res.statusCode !== 204 && res.statusCode !== 304) {
            res.setHeader('Content-Length', body.length);
          }

          return res.end(body);
        }) as typeof res.end;

        next();
      });
    },
  };
}
