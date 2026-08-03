import js from '@eslint/js'
import babelParser from '@babel/eslint-parser'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      parser: babelParser,
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          presets: [
            ['@babel/preset-react', { runtime: 'automatic' }],
            ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
          ],
        },
      },
      sourceType: 'module',
    },
    rules: {
      // TypeScript 7 is the source of truth for symbols and type-only usage.
      // Babel intentionally erases those nodes before ESLint analyzes the file.
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
])
