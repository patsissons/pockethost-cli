# pockethost-cli

A TypeScript CLI (`ph`) that scaffolds deploy-ready [PocketHost](https://pockethost.io/)-backed web apps with a single interactive wizard.

`ph create` walks you through app name, framework, design system, auth methods, package manager, and PocketHost instance selection, then scaffolds a batteries-included web app shell and deploys it to `https://<instance>.pockethost.io` via [phio](https://pockethost.io/docs/phio).

## Status

Under active development. The `create` command is not yet functional.

## Supported frameworks (planned)

| Framework                 | Deploys to                                            |
| ------------------------- | ----------------------------------------------------- |
| Vite React SPA            | PocketHost `pb_public`                                |
| SvelteKit (static)        | PocketHost `pb_public`                                |
| React Router 7 (SPA mode) | PocketHost `pb_public`                                |
| Next.js (static export)   | PocketHost `pb_public`                                |
| Next.js (SSR)             | External host (Vercel/Cloudflare); PocketHost backend |

## Setup

Requires Node >= 20 (phio itself requires Node >= 24) and pnpm.

```sh
pnpm install
```

## Scripts

| Script                     | What it does                                                    |
| -------------------------- | --------------------------------------------------------------- |
| `pnpm dev`                 | Run the CLI from source (`pnpm dev -- create my-app`)           |
| `pnpm build`               | Bundle `src/` to `dist/` with tsdown                            |
| `pnpm test`                | Run unit + integration tests (vitest)                           |
| `pnpm test:watch`          | Run tests in watch mode                                         |
| `pnpm typecheck`           | Type-check without emitting                                     |
| `pnpm lint`                | ESLint                                                          |
| `pnpm format`              | Prettier write                                                  |
| `pnpm format:check`        | Prettier check                                                  |
| `pnpm validate:quick`      | format check + typecheck + lint + unit tests                    |
| `pnpm validate`            | `validate:quick` (plus e2e suites as they land)                 |
| `pnpm format-and-validate` | Prettier write, then `validate:quick` — run before every commit |
