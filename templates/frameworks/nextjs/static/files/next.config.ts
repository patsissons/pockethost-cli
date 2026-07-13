import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static export: the build lands in out/ and is copied to pb_public/,
  // which PocketBase serves directly. No server runtime features.
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
