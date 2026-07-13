import path from 'node:path'
import {
  hasAuth,
  type OAuthProvider,
  type WizardAnswers,
} from '../wizard/answers.js'

/**
 * buildPlan is PURE: answers in, plan out. All filesystem/subprocess effects
 * live in engine.ts and steps/*. The full wizard matrix is unit-tested
 * through this function, so keep it side-effect free.
 */

export interface TemplateData {
  appName: string
  framework: WizardAnswers['framework']
  nextMode?: WizardAnswers['nextMode']
  design: WizardAnswers['design']
  auth: {
    enabled: boolean
    password: boolean
    otp: boolean
    mfa: boolean
    oauth: OAuthProvider[]
  }
  pm: {
    name: string
    /** Command prefix for running a script, e.g. `pnpm` / `npm run` / `bun run`. */
    run: string
    /** One-off package runner, e.g. `pnpm dlx` / `npx` / `bunx`. */
    dlx: string
    /** Local-binary runner, e.g. `pnpm exec` / `npx` / `bun x`. */
    exec: string
  }
  instanceName?: string
  /** https://<instance>.pockethost.io when an instance is chosen. */
  instanceUrl?: string
  /** What the app's PocketBase client should default to. */
  pocketbaseUrl: string
  customDomain?: string
}

export type CommitGroupKey =
  | 'gitignore'
  | 'tooling'
  | 'backend'
  | 'skeleton'
  | 'auth'
  | 'unit-tests'
  | 'e2e'
  | 'docs'

export interface CommitGroup {
  key: CommitGroupKey
  message: string
}

/** Commit order for scaffolded apps: one logical unit per commit. */
export const COMMIT_GROUPS: CommitGroup[] = [
  { key: 'gitignore', message: 'chore: populate .gitignore' },
  { key: 'tooling', message: 'chore: package.json and tooling configuration' },
  { key: 'backend', message: 'feat: pocketbase migrations and hooks' },
  { key: 'skeleton', message: 'feat: app skeleton' },
  { key: 'auth', message: 'feat: auth pages and pocketbase auth wiring' },
  { key: 'unit-tests', message: 'test: unit test setup' },
  { key: 'e2e', message: 'test: playwright e2e setup' },
  { key: 'docs', message: 'docs: README, AGENTS.md, CLAUDE.md' },
]

export type LayerKind = 'base' | 'framework' | 'design' | 'auth'

export interface PlannedLayer {
  kind: LayerKind
  /** Absolute path to the layer directory. */
  dir: string
}

export interface ScaffoldPlan {
  answers: WizardAnswers
  layers: PlannedLayer[]
  templateData: TemplateData
  commitGroups: CommitGroup[]
}

const PM_COMMANDS: Record<WizardAnswers['packageManager'], TemplateData['pm']> =
  {
    pnpm: { name: 'pnpm', run: 'pnpm', dlx: 'pnpm dlx', exec: 'pnpm exec' },
    bun: { name: 'bun', run: 'bun run', dlx: 'bunx', exec: 'bun x' },
    npm: { name: 'npm', run: 'npm run', dlx: 'npx', exec: 'npx' },
  }

export const LOCAL_POCKETBASE_URL = 'http://127.0.0.1:8090'

export function instanceUrlFor(instanceName: string): string {
  return `https://${instanceName}.pockethost.io`
}

export function buildTemplateData(answers: WizardAnswers): TemplateData {
  const instanceUrl = answers.instanceName
    ? instanceUrlFor(answers.instanceName)
    : undefined
  return {
    appName: answers.name,
    framework: answers.framework,
    nextMode:
      answers.framework === 'nextjs'
        ? (answers.nextMode ?? 'static')
        : undefined,
    design: answers.design,
    auth: {
      enabled: hasAuth(answers),
      password: answers.authFactors.includes('password'),
      otp: answers.authFactors.includes('otp'),
      mfa: answers.mfa,
      oauth: answers.oauthProviders,
    },
    pm: PM_COMMANDS[answers.packageManager],
    instanceName: answers.instanceName,
    instanceUrl,
    pocketbaseUrl: instanceUrl ?? LOCAL_POCKETBASE_URL,
    customDomain: answers.customDomain,
  }
}

export function buildPlan(
  answers: WizardAnswers,
  templatesRoot: string,
): ScaffoldPlan {
  const layers: PlannedLayer[] = [
    { kind: 'base', dir: path.join(templatesRoot, 'base') },
  ]

  if (answers.framework === 'nextjs') {
    const mode = answers.nextMode ?? 'static'
    layers.push(
      {
        kind: 'framework',
        dir: path.join(templatesRoot, 'frameworks', 'nextjs', 'shared'),
      },
      {
        kind: 'framework',
        dir: path.join(templatesRoot, 'frameworks', 'nextjs', mode),
      },
    )
  } else {
    layers.push({
      kind: 'framework',
      dir: path.join(templatesRoot, 'frameworks', answers.framework),
    })
  }

  layers.push({
    kind: 'design',
    dir: path.join(templatesRoot, 'design', answers.design, answers.framework),
  })

  if (hasAuth(answers)) {
    layers.push({
      kind: 'auth',
      dir: path.join(templatesRoot, 'features', 'auth', answers.framework),
    })
  }

  return {
    answers,
    layers,
    templateData: buildTemplateData(answers),
    commitGroups: COMMIT_GROUPS,
  }
}

/**
 * Assigns a scaffolded file to its commit group. Auth-layer files always land
 * in the auth commit; everything else is classified by path.
 */
export function commitGroupFor(
  layerKind: LayerKind,
  target: string,
): CommitGroupKey {
  if (target === '.gitignore') return 'gitignore'
  if (layerKind === 'auth') return 'auth'

  if (
    target === 'README.md' ||
    target === 'AGENTS.md' ||
    target === 'CLAUDE.md'
  )
    return 'docs'
  if (target.startsWith('pb_migrations/') || target.startsWith('pb_hooks/'))
    return 'backend'
  if (target === 'playwright.config.ts' || target.startsWith('e2e/'))
    return 'e2e'
  if (/\.(test|spec)\.[jt]sx?$/.test(target) || target.startsWith('tests/'))
    return 'unit-tests'

  const base = path.basename(target)
  const isRootConfig =
    !target.includes('/') &&
    (base === 'package.json' ||
      base === 'components.json' ||
      base.startsWith('tsconfig') ||
      base.startsWith('.') ||
      /\.config\.[jt]s$/.test(base) ||
      base === '.env.example')
  if (isRootConfig) return 'tooling'

  return 'skeleton'
}
