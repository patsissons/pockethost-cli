import type { Command } from 'commander'
import {
  AUTH_FACTORS,
  DESIGN_SYSTEMS,
  FRAMEWORKS,
  NEXT_MODES,
  OAUTH_PROVIDERS,
  PACKAGE_MANAGERS,
  type AuthFactor,
  type DesignSystem,
  type Framework,
  type NextMode,
  type OAuthProvider,
  type PackageManager,
  type WizardAnswers,
} from './answers.js'

/**
 * Every wizard prompt has a 1:1 commander flag so the CLI is fully scriptable:
 * provided flags skip their prompt; --yes accepts defaults for the rest.
 */
export interface CreateFlags {
  name?: string
  framework?: string
  nextMode?: string
  design?: string
  auth?: string
  oauth?: string
  mfa?: boolean
  pm?: string
  instance?: string | boolean
  domain?: string
  yes?: boolean
  interactive?: boolean
  install?: boolean
  validate?: boolean
  deploy?: boolean
  skipPhio?: boolean
}

export function registerCreateFlags(command: Command): Command {
  return command
    .option(
      '--name <name>',
      'app name (defaults to the target directory basename)',
    )
    .option(
      '--framework <framework>',
      `web framework: ${FRAMEWORKS.join(' | ')}`,
    )
    .option(
      '--next-mode <mode>',
      `nextjs deploy mode: ${NEXT_MODES.join(' | ')}`,
    )
    .option('--design <design>', `design system: ${DESIGN_SYSTEMS.join(' | ')}`)
    .option(
      '--auth <factors>',
      `comma-separated auth factors: ${AUTH_FACTORS.join(', ')} (or "none")`,
    )
    .option(
      '--oauth <providers>',
      `comma-separated OAuth providers: ${OAUTH_PROVIDERS.join(', ')}`,
    )
    .option('--mfa', 'enable multi-factor auth (requires two auth methods)')
    .option('--pm <pm>', `package manager: ${PACKAGE_MANAGERS.join(' | ')}`)
    .option('--instance <name>', 'PocketHost instance to link and deploy to')
    .option('--no-instance', 'skip instance linking (deploy later with phio)')
    .option(
      '--domain <domain>',
      'custom domain (emits CNAME/dashboard instructions)',
    )
    .option('-y, --yes', 'accept defaults for unanswered prompts')
    .option(
      '--no-interactive',
      'never prompt; fail on missing required answers',
    )
    .option('--no-install', 'skip dependency installation')
    .option('--no-validate', "skip running the scaffolded app's validate:quick")
    .option('--no-deploy', 'skip build and deploy')
    .option(
      '--skip-phio',
      'scaffold-only mode: no phio preflight, link, or deploy',
    )
}

function parseChoice<T extends string>(
  flag: string,
  value: string | undefined,
  choices: readonly T[],
): T | undefined {
  if (value === undefined) return undefined
  if (!choices.includes(value as T)) {
    throw new Error(
      `Invalid ${flag} "${value}". Expected one of: ${choices.join(', ')}`,
    )
  }
  return value as T
}

function parseList<T extends string>(
  flag: string,
  value: string | undefined,
  choices: readonly T[],
): T[] | undefined {
  if (value === undefined) return undefined
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (items.length === 1 && items[0] === 'none') return []
  for (const item of items) {
    if (!choices.includes(item as T)) {
      throw new Error(
        `Invalid ${flag} entry "${item}". Expected: ${choices.join(', ')}`,
      )
    }
  }
  return [...new Set(items)] as T[]
}

/** Answers that arrived via flags; prompts fill in the rest. */
export interface PartialAnswers {
  name?: string
  framework?: Framework
  nextMode?: NextMode
  design?: DesignSystem
  authFactors?: AuthFactor[]
  oauthProviders?: OAuthProvider[]
  mfa?: boolean
  packageManager?: PackageManager
  instanceName?: string
  linkInstance: boolean
  customDomain?: string
  yes: boolean
  interactive: boolean
  install: boolean
  validate: boolean
  deploy: boolean
  skipPhio: boolean
}

export function flagsToPartialAnswers(flags: CreateFlags): PartialAnswers {
  return {
    name: flags.name,
    framework: parseChoice('--framework', flags.framework, FRAMEWORKS),
    nextMode: parseChoice('--next-mode', flags.nextMode, NEXT_MODES),
    design: parseChoice('--design', flags.design, DESIGN_SYSTEMS),
    authFactors: parseList('--auth', flags.auth, AUTH_FACTORS),
    oauthProviders: parseList('--oauth', flags.oauth, OAUTH_PROVIDERS),
    mfa: flags.mfa,
    packageManager: parseChoice('--pm', flags.pm, PACKAGE_MANAGERS),
    instanceName:
      typeof flags.instance === 'string' ? flags.instance : undefined,
    linkInstance: flags.instance !== false,
    customDomain: flags.domain,
    yes: flags.yes ?? false,
    interactive: flags.interactive ?? true,
    install: flags.install ?? true,
    validate: flags.validate ?? true,
    deploy: flags.deploy ?? true,
    skipPhio: flags.skipPhio ?? false,
  }
}

/** Defaults applied by --yes (and non-interactive mode). */
export const ANSWER_DEFAULTS = {
  framework: 'vite-react',
  design: 'shadcn',
  authFactors: ['password'] as AuthFactor[],
  oauthProviders: [] as OAuthProvider[],
  mfa: false,
  packageManager: 'pnpm',
} satisfies Partial<WizardAnswers>
