# pockethost-cli

A TypeScript CLI (`ph`) that scaffolds deploy-ready [PocketHost](https://pockethost.io/)-backed web apps with a single interactive wizard.

`ph create` walks you through app name, framework, design system, auth methods, package manager, PocketHost instance, and custom domain — then scaffolds a batteries-included web app shell, installs and validates it, and deploys it to `https://<instance>.pockethost.io` via [phio](https://pockethost.io/docs/phio).

## Usage

```sh
pnpm dlx pockethost-cli create my-app   # or: npx pockethost-cli create my-app
```

Or install it globally for the `ph` binary:

```sh
npm install -g pockethost-cli
ph create my-app
```

(Running the unpublished tip also works: `npx github:patsissons/pockethost-cli create my-app` — a `prepare` script builds the CLI on install.)

Every prompt has a matching flag, so the wizard is fully scriptable:

```sh
ph create my-app --yes \
  --framework sveltekit --design daisyui \
  --auth password,otp --oauth google,github --mfa \
  --pm pnpm --instance my-app --domain app.example.com
```

Useful flags: `--yes` (accept defaults), `--skip-phio` (scaffold-only), `--no-install`, `--no-validate`, `--no-deploy`, `--no-instance`, `--no-interactive` (CI). Run `ph create --help` for the full list, and `ph doctor` to check your environment (node/git/package managers/phio/login state).

## What you get

- **Frameworks**: Vite React SPA, SvelteKit (static adapter), React Router 7 (SPA mode), Next.js (static export → PocketHost, or SSR → external host with PocketHost as backend)
- **Design systems**: shadcn/ui (vendored primitives + `components.json`), daisyUI, or plain Tailwind — all satisfy the same `components/ui` contract
- **Auth**: email+password, email OTP, MFA, and OAuth (google/github/discord/gitlab/microsoft) — configured via generated `pb_migrations` and an env-guarded `pb_hooks` bootstrap that reads PocketHost dashboard Secrets
- **Batteries**: TypeScript, Tailwind v4, Vitest unit tests, Playwright e2e, ESLint (flat) + Prettier, logger util, PocketBase client with production origin fallback, typed demo collection + `typegen` script, GitHub Actions CI (validate on PR, `phio deploy` on main), README/AGENTS.md/CLAUDE.md
- **Git hygiene**: root commit is an empty `.gitignore`, then one logical unit per commit; every scaffold is born `format:check`-clean

PocketHost instances are created in the [dashboard](https://pockethost.io/instances/new) (there is no API); the wizard opens it for you and picks up the new instance automatically via `phio list`.

## Which options should I pick?

Short version: **accept the defaults** (`--yes` gives you exactly this). Vite React + shadcn/ui + email/password + pnpm is the right answer for most apps, and every default is also the wizard's pre-selected choice. Deviate only when one of the reasons below applies to you.

### Framework — default: Vite React

| Pick…                         | When…                                                                                                                                                                                                                                              | Deploys to                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Vite React SPA** (default)  | You don't have a specific reason to pick something else. Simplest mental model, fastest builds, biggest ecosystem.                                                                                                                                 | PocketHost `pb_public`             |
| **React Router 7 (SPA mode)** | You want file-route conventions and typed routes while staying in React, or you expect to add server rendering on another host someday.                                                                                                            | PocketHost `pb_public`             |
| **SvelteKit (static)**        | You prefer Svelte, or bundle size is a priority.                                                                                                                                                                                                   | PocketHost `pb_public`             |
| **Next.js (static export)**   | Your team is Next-native and wants Next conventions without server features. Note: no image optimization, no server components at runtime.                                                                                                         | PocketHost `pb_public`             |
| **Next.js (SSR)**             | You genuinely need SSR/ISR/server components. This is the only choice that can't deploy entirely to PocketHost — the frontend lives on Vercel/Cloudflare and PocketHost serves the backend only. If you're unsure whether you need SSR, you don't. | External host + PocketHost backend |

### Design system — default: shadcn/ui

- **shadcn/ui** (default): you own the component source, the ecosystem is enormous, and it's the best fit for AI-assisted iteration. Pick this unless one of the two below is clearly you.
- **daisyUI**: prototypes and hobby apps — themed components from CSS classes alone, least code to touch.
- **Tailwind only**: you're bringing your own component library (MUI, Ark, etc.) and just want the utility layer plus working ui primitives to replace.

All three ship the same `components/ui` primitives, so switching later means swapping one directory, not rewriting pages.

### Auth — default: email + password

- **Email + password** (default): works immediately with zero external setup. Start here.
- **+ Email OTP**: add when you want passwordless login or plan to enable MFA. Requires [SMTP on your instance](https://pockethost.io/docs/smtp) before codes actually send.
- **+ OAuth providers**: add for lower-friction signup. Each provider needs credentials created on their console and stored as PocketHost secrets — the wizard prints exact per-provider instructions. If you only add one, make it Google.
- **MFA**: only for apps guarding sensitive data — it forces every user through two methods on every login. Requires two enabled methods (e.g. password + OTP).
- **None**: fine for tools with no user accounts; you still get the demo collection and typed client.

### Package manager — default: pnpm

pnpm unless you have a standing reason: it's fast, strict about lockfiles, and the scaffolded CI is tuned for it. Choose **bun** if your team already runs bun everywhere; choose **npm** if you want zero extra tooling on contributors' machines.

### Custom domain — default: skip

Skip it at scaffold time; `<instance>.pockethost.io` is fine for development. Add a domain in the PocketHost dashboard when you go to production — the wizard (and the docs it generates) print the CNAME instructions either way.

## Development (this repo)

Requires Node >= 20 (phio needs >= 24) and pnpm.

```sh
pnpm install
pnpm dev create /tmp/demo --yes --skip-phio   # run the CLI from source
```

| Script                     | What it does                                                    |
| -------------------------- | --------------------------------------------------------------- |
| `pnpm dev`                 | Run the CLI from source (`pnpm dev create my-app`)              |
| `pnpm build`               | Bundle `src/` to `dist/` with tsdown                            |
| `pnpm test`                | Unit + integration tests (vitest; scaffolds into tmp dirs)      |
| `pnpm validate:quick`      | format check + typecheck + lint + tests                         |
| `pnpm validate`            | `validate:quick` (plus e2e suites as they land)                 |
| `pnpm format-and-validate` | Prettier write, then `validate:quick` — run before every commit |

CI tiers: unit+integration on every push; a nightly smoke matrix scaffolds every framework and runs the scaffolded app's own validation; a weekly deep-smoke runs the full framework × design matrix including Playwright e2e. `tests/integration/pack.test.ts` guards the npm artifact (templates ship complete, dotfiles stored `_`-escaped).

### Releasing

1. Bump `version` in package.json and push to main — the **Draft release** workflow creates a draft GitHub release `v<version>` with generated notes.
2. Review and publish the release — the **Publish** workflow checks the tag matches package.json, runs the full validation suite, and publishes to npm with provenance.

Requires the `NPM_TOKEN` repository secret (an npm token with publish rights for `pockethost-cli`).

## Architecture (short version)

Templates are embedded layers composed in order `base → frameworks/<fw> → design/<ds>/<fw> → features/auth/<fw>`, each with a `layer.json` manifest (package.json fragment, mounts, conditions, overrides). `src/core/plan.ts` is a pure `answers → plan` function; `src/core/engine.ts` renders (eta), formats (prettier, in-memory), writes, and commits. All phio subprocess use goes through `src/phio/client.ts`. See AGENTS.md for working rules.
