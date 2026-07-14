import path from 'node:path'
import * as clack from '@clack/prompts'
import {
  AUTH_FACTORS,
  DESIGN_SYSTEMS,
  FRAMEWORKS,
  mfaEligible,
  NEXT_MODES,
  OAUTH_PROVIDERS,
  PACKAGE_MANAGERS,
  type WizardAnswers,
} from './answers.js'
import { ANSWER_DEFAULTS, type PartialAnswers } from './flags.js'
import { validateAppName, validateCustomDomain } from './validate.js'

const FRAMEWORK_LABELS: Record<(typeof FRAMEWORKS)[number], string> = {
  'vite-react': 'React (Vite SPA) — recommended',
  sveltekit: 'SvelteKit (static adapter)',
  'react-router': 'React Router 7 (SPA mode)',
  nextjs: 'Next.js',
}

const FRAMEWORK_HINTS: Record<(typeof FRAMEWORKS)[number], string> = {
  'vite-react':
    'the default — simplest setup, fastest builds; pick this unless you have a reason not to',
  sveltekit: 'pick if you prefer Svelte or want the smallest bundles',
  'react-router':
    'pick for file-route conventions and typed routes while staying React',
  nextjs:
    'pick only if your team is Next-native or you need SSR (SSR needs external hosting)',
}

const DESIGN_LABELS: Record<(typeof DESIGN_SYSTEMS)[number], string> = {
  shadcn: 'shadcn/ui — recommended',
  daisyui: 'daisyUI',
  tailwind: 'Tailwind only',
}

const DESIGN_HINTS: Record<(typeof DESIGN_SYSTEMS)[number], string> = {
  shadcn: 'you own the component code; best ecosystem and AI-iteration story',
  daisyui:
    'pick for quick prototypes — themed components from CSS classes alone',
  tailwind: 'pick if you are bringing your own component library',
}

function bail(): never {
  clack.cancel('Cancelled.')
  process.exit(1)
}

function accept<T>(value: T | symbol): T {
  if (clack.isCancel(value)) bail()
  return value as T
}

/**
 * Fills any answers not provided via flags. In --yes mode unanswered prompts
 * take defaults; in --no-interactive mode missing required answers throw.
 */
export async function fillAnswers(
  partial: PartialAnswers,
  directoryArg: string | undefined,
): Promise<WizardAnswers> {
  const interactive =
    partial.interactive && !partial.yes && process.stdout.isTTY

  const fallbackName = directoryArg
    ? path.basename(path.resolve(directoryArg))
    : undefined

  let name = partial.name ?? fallbackName
  if (name === undefined || (!interactive && validateAppName(name))) {
    if (!interactive) {
      throw new Error(
        name === undefined
          ? 'Missing app name: pass a directory argument or --name'
          : `Invalid app name "${name}": ${validateAppName(name)}`,
      )
    }
    name = undefined
  }
  if (name === undefined) {
    name = accept(
      await clack.text({
        message: 'App name (also the suggested PocketHost instance name)',
        placeholder: 'my-app',
        validate: (value) => validateAppName(value ?? ''),
      }),
    )
  } else if (interactive && validateAppName(name)) {
    clack.log.warn(
      `"${name}" is not a valid app name: ${validateAppName(name)}`,
    )
    name = accept(
      await clack.text({
        message: 'App name (also the suggested PocketHost instance name)',
        placeholder: 'my-app',
        validate: (value) => validateAppName(value ?? ''),
      }),
    )
  }

  const framework =
    partial.framework ??
    (interactive
      ? accept(
          await clack.select({
            message: 'Web framework',
            options: FRAMEWORKS.map((value) => ({
              value,
              label: FRAMEWORK_LABELS[value],
              hint: FRAMEWORK_HINTS[value],
            })),
            initialValue: ANSWER_DEFAULTS.framework,
          }),
        )
      : ANSWER_DEFAULTS.framework)

  let nextMode = partial.nextMode
  if (framework === 'nextjs' && nextMode === undefined) {
    nextMode = interactive
      ? accept(
          await clack.select({
            message: 'Next.js deploy mode',
            options: [
              {
                value: NEXT_MODES[0],
                label: 'Static export — recommended',
                hint: 'deploys straight to PocketHost; pick unless you truly need SSR',
              },
              {
                value: NEXT_MODES[1],
                label: 'SSR — frontend on Vercel/Cloudflare',
                hint: 'only for SSR/ISR/server components; PocketHost serves the backend only',
              },
            ],
            initialValue: 'static' as const,
          }),
        )
      : 'static'
  }

  const design =
    partial.design ??
    (interactive
      ? accept(
          await clack.select({
            message: 'Design system',
            options: DESIGN_SYSTEMS.map((value) => ({
              value,
              label: DESIGN_LABELS[value],
              hint: DESIGN_HINTS[value],
            })),
            initialValue: ANSWER_DEFAULTS.design,
          }),
        )
      : ANSWER_DEFAULTS.design)

  const authFactors =
    partial.authFactors ??
    (interactive
      ? accept(
          await clack.multiselect({
            message:
              'Auth factors (space to toggle, enter to accept; none = no auth UI)',
            options: [
              {
                value: AUTH_FACTORS[0],
                label: 'Email + password — recommended',
                hint: 'works out of the box; the right default for almost every app',
              },
              {
                value: AUTH_FACTORS[1],
                label: 'Email OTP (one-time codes)',
                hint: 'add for passwordless login or MFA — requires SMTP on your instance',
              },
            ],
            initialValues: ANSWER_DEFAULTS.authFactors,
            required: false,
          }),
        )
      : ANSWER_DEFAULTS.authFactors)

  const oauthProviders =
    partial.oauthProviders ??
    (interactive
      ? accept(
          await clack.multiselect({
            message:
              'OAuth providers (skip is fine — each needs credentials from that provider, added later as PocketHost secrets)',
            options: OAUTH_PROVIDERS.map((value) => ({
              value,
              label: value,
              hint:
                value === 'google'
                  ? 'the highest-coverage provider if you only pick one'
                  : undefined,
            })),
            required: false,
          }),
        )
      : ANSWER_DEFAULTS.oauthProviders)

  let mfa = partial.mfa ?? false
  if (mfa && !mfaEligible({ authFactors, oauthProviders })) {
    throw new Error(
      '--mfa requires at least two auth methods (factors and/or OAuth)',
    )
  }
  if (
    partial.mfa === undefined &&
    interactive &&
    mfaEligible({ authFactors, oauthProviders })
  ) {
    mfa = accept(
      await clack.confirm({
        message:
          'Require multi-factor auth? (recommended only for sensitive data — users must pass two methods on every login)',
        initialValue: false,
      }),
    )
  }

  const packageManager =
    partial.packageManager ??
    (interactive
      ? accept(
          await clack.select({
            message: 'Package manager',
            options: [
              {
                value: PACKAGE_MANAGERS[0],
                label: 'pnpm — recommended',
                hint: 'fast, strict, and what the scaffolded CI is tuned for',
              },
              {
                value: PACKAGE_MANAGERS[1],
                label: 'bun',
                hint: 'pick if your team already runs bun everywhere',
              },
              {
                value: PACKAGE_MANAGERS[2],
                label: 'npm',
                hint: 'pick if you want zero extra tooling',
              },
            ],
            initialValue: ANSWER_DEFAULTS.packageManager,
          }),
        )
      : ANSWER_DEFAULTS.packageManager)

  let customDomain = partial.customDomain
  if (customDomain !== undefined) {
    const domainError = validateCustomDomain(customDomain)
    if (domainError)
      throw new Error(`Invalid --domain "${customDomain}": ${domainError}`)
  } else if (interactive) {
    const input = accept(
      await clack.text({
        message:
          'Custom domain (optional — skipping is recommended until you go to production; you can add one in the PocketHost dashboard any time)',
        placeholder: 'app.example.com',
        defaultValue: '',
        validate: (value) => (value ? validateCustomDomain(value) : undefined),
      }),
    )
    customDomain = input || undefined
  }

  const targetDir = path.resolve(directoryArg ?? name)

  return {
    name,
    targetDir,
    framework,
    nextMode,
    design,
    authFactors,
    oauthProviders,
    mfa,
    packageManager,
    instanceName: partial.instanceName,
    customDomain,
    install: partial.install,
    validate: partial.validate,
    deploy: partial.deploy,
    skipPhio: partial.skipPhio,
  }
}
