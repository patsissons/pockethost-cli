import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  globalIgnores([
    'pb_public/',
    'pb_data/',
    'pb_migrations/',
    'pb_hooks/',
    '.next/',
    'out/',
    'next-env.d.ts',
    'playwright-report/',
    'test-results/',
    'coverage/',
  ]),
  ...nextVitals,
  ...nextTs,
])
