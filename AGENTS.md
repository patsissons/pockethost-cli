# Agent Working Rules

## Before every commit

After making changes from a prompt and BEFORE committing:

1. Author new tests covering the changes being made.
2. Update any documentation affected by the changes (README.md, this file, docs/).
3. Run `pnpm format-and-validate` and repair any regressions in-line.

## Git conventions

- The root commit is a single empty `.gitignore` (already done — never rewrite it).
- Small, modular commits: one logical unit per commit (config, feature, tests, docs).

## What this project is

`ph` is a CLI that scaffolds deploy-ready PocketHost-backed web apps. The flagship command is `ph create`, an interactive wizard (@clack/prompts) routed through commander. See the plan of record in the repo history and README for the full design.

Key architecture decisions:

- **Single package, embedded layered templates** under `templates/` (no delegation to create-vite/create-next-app). Layers compose in order: `base` → `frameworks/<fw>` → `design/<ds>/<fw>` → `features/auth/*`. Each layer has a `layer.json` manifest (package.json fragment, file mount points, conditions).
- `src/core/plan.ts` is a PURE function `buildPlan(answers) → ScaffoldPlan`; all effects live in `src/core/engine.ts` and `src/steps/*`. Keep it that way — the full wizard matrix is unit-tested through `buildPlan`.
- All phio subprocess interaction goes through `src/phio/client.ts` (the stub seam for tests). Never call phio directly elsewhere.
- Template files that npm would mangle in published packages are stored with `_` prefixes (`_gitignore`) and renamed by `src/core/render.ts`.
- Every wizard prompt has a 1:1 commander flag; `--yes`, `--no-interactive`, `--skip-phio`, `--no-install`, `--no-validate`, `--no-deploy` keep the CLI scriptable and testable offline.

## PocketHost facts that constrain design

- PocketHost hosts only `pb_public` (static), `pb_hooks`, `pb_migrations`. No SSR processes.
- Instance creation is dashboard-only; phio handles login/list/link/dev/deploy/logs.
- `pb_migrations` auto-run on instance startup; PocketBase auth config (password/OTP/MFA/OAuth2) is set via migrations; secrets come from PocketHost dashboard secrets via `$os.getenv`.
- PocketBase serves `index.html` fallback for extensionless paths (SPA routing works).

## Testing tiers

1. Unit (`tests/unit/`) — pure logic: plan building, validation, merging, migration generation. Every push.
2. Integration (`tests/integration/`) — real engine into tmp dirs (`--skip-phio --no-install --no-deploy`), tree snapshots. Every push.
3. Smoke (CI matrix) — scaffold + install + run the scaffolded app's `validate:quick`. Main/nightly.
4. Deep smoke — full matrix with Playwright. Weekly/pre-release.
