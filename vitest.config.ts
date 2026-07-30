import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Tests unitaires des fonctions pures (sans Astro au runtime).
// `astro:content` est un module virtuel fourni par Astro au build : on le
// remplace par un stub léger pour pouvoir importer src/lib/data.ts hors d'Astro.
export default defineConfig({
  resolve: {
    alias: {
      'astro:content': fileURLToPath(new URL('./test/stubs/astro-content.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
