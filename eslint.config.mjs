import { FlatCompat } from '@eslint/eslintrc';
import eslintConfigPrettier from 'eslint-config-prettier';
import js from '@eslint/js';
import typeScriptESLint from '@typescript-eslint/eslint-plugin';
import typeScriptESLintParser from '@typescript-eslint/parser';
import globals from 'globals';

const compat = new FlatCompat();

export default [
  {
    ignores: ['**/node_modules/**', '**/build/**', 'webpack.config.ts', '*.mjs'],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  ...compat.extends('plugin:@typescript-eslint/eslint-recommended', 'plugin:prettier/recommended', 'prettier'),
  {
    plugins: {
      typeScriptESLint,
    },
    languageOptions: {
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        ...globals.browser,
      },
      parser: typeScriptESLintParser,
      parserOptions: {
        sourceType: 'module',
        project: './tsconfig.json',
        ecmaVersion: 2015,
      },
    },
    settings: {},
    rules: {
      'no-console': 'off',
      'no-debugger': 'error',
      'node/no-deprecated-api': 'off',
      'node/no-unpublished-import': 'off',
      'node/no-unpublished-require': 'off',
      'node/no-unsupported-features/es-syntax': 'off',
      'no-process-exit': 'off',
      'node/no-missing-import': 'off',
      'no-unused-vars': 'off',
      'prettier/prettier': [
        'error',
        {
          'singleQuote': true,
          'printWidth': 180,
        }
      ],
    },
  },
];