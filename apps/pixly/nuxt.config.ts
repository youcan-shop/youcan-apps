import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { defineNuxtConfig } from 'nuxt/config';
import { devGzip } from './lib/dev/gzip';

const prismaBrowser = join(dirname(createRequire(import.meta.url).resolve('@prisma/client/package.json')), '../../.prisma/client/index-browser.js');

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@unocss/nuxt', '@prisma/nuxt', '@nuxt/eslint'],

  css: [
    '@youcan/celeste-tokens/tokens.css',
    '@youcan/celeste/assets/celeste.css',
  ],

  runtimeConfig: {
    port: process.env.PORT,
    appUrl: process.env.APP_URL,
    youcanApiKey: process.env.YOUCAN_API_KEY,
    youcanApiUrl: process.env.YOUCAN_API_URL,
    youcanSellerAreaUrl: process.env.YOUCAN_SELLER_AREA_URL,
    youcanApiScopes: process.env.YOUCAN_API_SCOPES,
    youcanApiSecret: process.env.YOUCAN_API_SECRET,
  },

  routeRules: {
    '/**': {
      headers: {
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Content-Security-Policy': 'frame-ancestors https://seller-area.youcan.shop http://seller-area.dotshop.com https://seller-area.ycan.vip https://seller-area.testyoucan.shop',
      },
    },
    '/auth/bounce': {
      ssr: false,
    },
  },

  vite: {
    plugins: [devGzip()],
    resolve: {
      alias: {
        '.prisma/client/index-browser': prismaBrowser,
      },
    },
    server: {
      allowedHosts: true,
    },
    preview: {
      allowedHosts: true,
    },
    $server: {
      build: {
        rollupOptions: {
          external: [/\.prisma/],
        },
      },
    },
  },

  experimental: {
    appManifest: false,
  },

  nitro: {
    experimental: {
      asyncContext: true,
    },
  },
});
