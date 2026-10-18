import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*', 'tools/*'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
