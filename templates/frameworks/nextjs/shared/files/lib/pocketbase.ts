import PocketBase from 'pocketbase'

// In static mode the app is served from pb_public by PocketBase itself, so
// the page origin IS the backend. The window guard matters: Next prerenders
// pages at build time where window does not exist. During development (and in
// SSR mode) NEXT_PUBLIC_POCKETBASE_URL wins.
const url =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8090')

export const pb = new PocketBase(url)
