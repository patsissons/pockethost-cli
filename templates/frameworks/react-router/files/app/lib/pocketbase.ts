import PocketBase from 'pocketbase'

// In production the app is served from pb_public by PocketBase itself, so the
// page origin IS the backend. During development, point VITE_POCKETBASE_URL
// (see .env.example) at your instance or a local `pocketbase serve`.
// The typeof guard keeps react-router's SPA-fallback prerender (a one-off
// server render at build time) from touching window.
const url =
  import.meta.env.VITE_POCKETBASE_URL ||
  (typeof window === 'undefined'
    ? 'http://127.0.0.1:8090'
    : window.location.origin)

export const pb = new PocketBase(url)
