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
        name: 'Bac 242',
        short_name: 'Bac 242',
        description:
          'Sujets et corrigés du baccalauréat congolais, gratuits et accessibles hors-ligne.',
        lang: 'fr',
        theme_color: '#f6f8fb',
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
        // Tout le HTML/CSS/JS est précaché : le site se parcourt entièrement
        // hors-ligne. Les PDF sont mis en cache au fil des consultations.
        globPatterns: ['**/*.{html,js,css,svg,woff2}'],
        // Désactive le repli de navigation par défaut (sinon une NavigationRoute
        // sert une page précachée sans tenter le réseau, masquant la logique
        // ci-dessous et renvoyant un faux « hors-ligne » même en ligne).
        navigateFallback: null,
        runtimeCaching: [
          {
            // Navigations : réseau d'abord (contenu frais), repli sur le cache,
            // et en dernier recours la page « hors-ligne » précachée. Comme on
            // tente le réseau, une URL inexistante renvoie bien le vrai 404
            // quand on est en ligne — la page hors-ligne n'apparaît que si le
            // réseau échoue réellement.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              precacheFallback: { fallbackURL: '/offline' },
            },
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
