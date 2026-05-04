import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // Plugin RGAA / WCAG : règles d'accessibilité statique sur le JSX.
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // ─── RGAA / a11y : strict ────────────────────────────────────────────
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      // - autofocus : utilisé sur RecruiterDashboard et Rgpd à la 1re ouverture
      //   pour les utilisateurs clavier-only (pas une violation RGAA réelle).
      'jsx-a11y/no-autofocus': 'off',

      // ─── Code legacy : warn pour ne pas bloquer la CI ────────────────────
      // À fixer progressivement dans des PR séparées (issue à créer).
      // Ces règles ne couvrent pas la conformité RGAA/RGPD/RGESN — elles
      // relèvent de la qualité du code TypeScript et React 19.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-useless-escape': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
