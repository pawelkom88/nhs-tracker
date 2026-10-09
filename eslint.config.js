import path from 'node:path';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { createNodeResolver, flatConfigs } from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier';
import nextPlugin from '@next/eslint-plugin-next';
import kywPlugin from './tools/eslint-plugin-kyw/src/index.js';

export default tseslint.config(
  {
    ignores: [
      '**/out/**',
      '**/.next/**',
      'data/**',
      'packages/pipeline/fixtures/**',
      'coverage/**',
      'dist/**',
      '**/*.d.ts',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx,mts,cts}'],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx,mts,cts}'],
  })),
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['vitest.config.ts', 'scripts/check-launch-content.ts'],
          defaultProject: 'tsconfig.base.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  flatConfigs.recommended,
  {
    settings: {
      'import-x/resolver-next': [
        createNodeResolver({
          extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
          extensionAlias: {
            '.js': ['.js', '.ts', '.tsx'],
            '.mjs': ['.mjs', '.mts'],
            '.cjs': ['.cjs', '.cts'],
          },
        }),
      ],
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'import-x/no-cycle': 'error',
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
            '**/*.test-d.ts',
            '**/e2e/**',
            '**/scripts/**',
            '**/*.config.ts',
            '**/*.config.js',
            'eslint.config.js',
          ],
          packageDir: [
            import.meta.dirname,
            path.resolve(import.meta.dirname, 'packages/model'),
            path.resolve(import.meta.dirname, 'packages/pipeline'),
            path.resolve(import.meta.dirname, 'apps/site'),
            path.resolve(import.meta.dirname, 'tools/eslint-plugin-kyw'),
          ],
        },
      ],
    },
  },
  // Next.js recommended rules
  {
    files: ['apps/site/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    settings: {
      next: {
        rootDir: 'apps/site',
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  // project guardrail rules (T-2.11)
  {
    files: ['apps/**/*.{ts,tsx,js,jsx,mjs,cjs}', 'packages/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    plugins: {
      kyw: kywPlugin,
    },
    rules: {
      'kyw/no-ranking-by-statistic': 'error',
    },
  },
  {
    files: ['packages/pipeline/src/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: [
            {
              target: './packages/pipeline/src/england',
              from: ['./packages/pipeline/src/wales', './packages/pipeline/src/scotland'],
              message:
                'Cross-nation imports between England, Wales, and Scotland are forbidden (ADR-0006).',
            },
            {
              target: './packages/pipeline/src/wales',
              from: ['./packages/pipeline/src/england', './packages/pipeline/src/scotland'],
              message:
                'Cross-nation imports between England, Wales, and Scotland are forbidden (ADR-0006).',
            },
            {
              target: './packages/pipeline/src/scotland',
              from: ['./packages/pipeline/src/england', './packages/pipeline/src/wales'],
              message:
                'Cross-nation imports between England, Wales, and Scotland are forbidden (ADR-0006).',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'apps/site/src/nations/**/*.{ts,tsx,js,jsx,mjs,cjs}',
      'apps/site/src/app/england/**/*.{ts,tsx,js,jsx,mjs,cjs}',
      'apps/site/src/app/wales/**/*.{ts,tsx,js,jsx,mjs,cjs}',
      'apps/site/src/app/scotland/**/*.{ts,tsx,js,jsx,mjs,cjs}',
    ],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: [
            {
              target: './apps/site/src/nations/england',
              from: [
                './apps/site/src/nations/wales',
                './apps/site/src/nations/scotland',
                './apps/site/src/app/wales',
                './apps/site/src/app/scotland',
                './apps/site/src/data/wales',
                './apps/site/src/data/scotland',
              ],
              message:
                'Cross-nation imports between England, Wales, and Scotland are forbidden (ADR-0006).',
            },
            {
              target: './apps/site/src/app/england',
              from: [
                './apps/site/src/nations/wales',
                './apps/site/src/nations/scotland',
                './apps/site/src/app/wales',
                './apps/site/src/app/scotland',
                './apps/site/src/data/wales',
                './apps/site/src/data/scotland',
              ],
              message:
                'Cross-nation imports between England, Wales, and Scotland are forbidden (ADR-0006).',
            },
            {
              target: './apps/site/src/nations/wales',
              from: [
                './apps/site/src/nations/england',
                './apps/site/src/nations/scotland',
                './apps/site/src/app/england',
                './apps/site/src/app/scotland',
                './apps/site/src/data/england',
                './apps/site/src/data/scotland',
              ],
              message:
                'Cross-nation imports between England, Wales, and Scotland are forbidden (ADR-0006).',
            },
            {
              target: './apps/site/src/app/wales',
              from: [
                './apps/site/src/nations/england',
                './apps/site/src/nations/scotland',
                './apps/site/src/app/england',
                './apps/site/src/app/scotland',
                './apps/site/src/data/england',
                './apps/site/src/data/scotland',
              ],
              message:
                'Cross-nation imports between England, Wales, and Scotland are forbidden (ADR-0006).',
            },
            {
              target: './apps/site/src/nations/scotland',
              from: [
                './apps/site/src/nations/england',
                './apps/site/src/nations/wales',
                './apps/site/src/app/england',
                './apps/site/src/app/wales',
                './apps/site/src/data/england',
                './apps/site/src/data/wales',
              ],
              message:
                'Cross-nation imports between England, Wales, and Scotland are forbidden (ADR-0006).',
            },
            {
              target: './apps/site/src/app/scotland',
              from: [
                './apps/site/src/nations/england',
                './apps/site/src/nations/wales',
                './apps/site/src/app/england',
                './apps/site/src/app/wales',
                './apps/site/src/data/england',
                './apps/site/src/data/wales',
              ],
              message:
                'Cross-nation imports between England, Wales, and Scotland are forbidden (ADR-0006).',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
