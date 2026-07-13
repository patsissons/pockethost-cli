import type { Config } from '@react-router/dev/config'

export default {
  // SPA mode: the build emits a static build/client that PocketBase serves
  // from pb_public (see scripts/pb-public.mjs).
  ssr: false,
} satisfies Config
