import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/', 'templates/', 'coverage/'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
)
