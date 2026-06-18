// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import AstroPWA from '@vite-pwa/astro';

// Adresse publique du site (URL Cloudflare Pages ; adapter si domaine custom)
const SITE = 'https://annabac.pages.dev';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  integrations: [
    sitemap(),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Annales Bac Congo',
        short_name: 'Annales Bac',
        description:
          'Sujets et corrigés du baccalauréat congolais, gratuits et accessibles hors-ligne.',
        lang: 'fr',
        theme_color: '#15803d',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Mise en cache pour consultation hors-ligne (pages + PDF visités)
        globPatterns: ['**/*.{html,js,css,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages' },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.pdf'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfs',
              expiration: { maxEntries: 50 },
            },
          },
        ],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
