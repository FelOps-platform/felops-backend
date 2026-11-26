import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const noProcessEnv = [
  'error',
  {
    object: 'process',
    property: 'env',
    message:
      'Read typed runtime configuration from src/config/env.ts; only bootstrap files may read process.env.',
  },
];

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/scripts/**/*.mjs'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        globals: globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  {
    files: ['tests/**/*.ts', 'scripts/**/*.ts', 'scripts/**/*.mjs', '*.ts'],
    rules: {
      'no-console': ['warn', { allow: ['log', 'warn', 'error'] }],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-properties': noProcessEnv,
    },
  },
  {
    // Bootstrap-only exemptions: these files retrieve and validate the
    // configuration that every other module imports. Do not add call sites.
    files: ['src/config/env.ts', 'src/integrations/infisical/fetch-secrets.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    // Preserve the existing startup log in the process entry point; new
    // logging must use the shared Pino logger.
    files: ['src/server.ts'],
    rules: {
      'no-console': ['error', { allow: ['log'] }],
    },
  },
  {
    files: ['src/**/*.service.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['express', 'express/*'],
              message: 'Services must not depend on Express; keep HTTP concerns in controllers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.controller.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['drizzle-orm', 'drizzle-orm/*'],
              message: 'Controllers must not query the database; call a service or repository.',
            },
            {
              group: ['**/config/db', '**/config/db.js', '**/config/db/**'],
              message:
                'Controllers must not import the database client; call a service or repository.',
            },
          ],
        },
      ],
    },
  },
  prettier,
];
