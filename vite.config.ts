import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Chemins relatifs : le site fonctionne quel que soit le sous-dossier d'hébergement.
  base: './',
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
