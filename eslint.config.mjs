import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: ['**/node_modules/**', '**/build/**', '*.mjs'],
  },
  js.configs.recommended,
  tseslint.configs.eslintRecommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'no-console': 'off',
      'no-debugger': 'error',
      'no-process-exit': 'off',
      'no-unused-vars': 'off',
    },
  },
  // prettier は最後に適用して、整形に関するルールの競合を無効化する
  eslintPluginPrettierRecommended,
  {
    rules: {
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          printWidth: 180,
        },
      ],
    },
  },
);
