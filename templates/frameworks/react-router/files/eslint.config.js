import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'pb_public/',
      'pb_data/',
      'pb_migrations/',
      'pb_hooks/',
      '.react-router/',
      'build/',
      'playwright-report/',
      'test-results/',
      'coverage/',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Route modules export meta/links alongside components, ui components
    // export variant helpers, and lib files export hooks with providers —
    // fast-refresh purity doesn't apply there.
    files: ['app/routes/**', 'app/root.tsx', 'app/components/ui/**', 'app/lib/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
