import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'pipeline',
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    typecheck: {
      enabled: true,
      include: ['test/**/*.test-d.ts'],
    },
    coverage: {
      provider: 'v8',
    },
  },
});
