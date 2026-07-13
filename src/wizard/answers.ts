export const FRAMEWORKS = [
  'vite-react',
  'sveltekit',
  'react-router',
  'nextjs',
] as const
export type Framework = (typeof FRAMEWORKS)[number]

export const NEXT_MODES = ['static', 'ssr'] as const
export type NextMode = (typeof NEXT_MODES)[number]

export const DESIGN_SYSTEMS = ['shadcn', 'daisyui', 'tailwind'] as const
export type DesignSystem = (typeof DESIGN_SYSTEMS)[number]

export const AUTH_FACTORS = ['password', 'otp'] as const
export type AuthFactor = (typeof AUTH_FACTORS)[number]

export const OAUTH_PROVIDERS = [
  'google',
  'github',
  'discord',
  'gitlab',
  'microsoft',
] as const
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

export const PACKAGE_MANAGERS = ['pnpm', 'bun', 'npm'] as const
export type PackageManager = (typeof PACKAGE_MANAGERS)[number]

/** Everything the wizard needs to know before scaffolding begins. */
export interface WizardAnswers {
  /** App name; also the default PocketHost instance-name suggestion. */
  name: string
  /** Absolute path of the directory to scaffold into. */
  targetDir: string
  framework: Framework
  /** Only meaningful when framework === 'nextjs'. */
  nextMode?: NextMode
  design: DesignSystem
  /** Empty array means no auth UI is scaffolded. */
  authFactors: AuthFactor[]
  oauthProviders: OAuthProvider[]
  mfa: boolean
  packageManager: PackageManager
  /** PocketHost instance to link/deploy to; undefined defers linking. */
  instanceName?: string
  /** Custom domain for CNAME/dashboard instructions; undefined skips. */
  customDomain?: string
  install: boolean
  validate: boolean
  deploy: boolean
  /** Scaffold-only mode: no phio preflight, link, or deploy. */
  skipPhio: boolean
}

/** True when any auth surface (factor or OAuth provider) is enabled. */
export function hasAuth(
  answers: Pick<WizardAnswers, 'authFactors' | 'oauthProviders'>,
): boolean {
  return answers.authFactors.length > 0 || answers.oauthProviders.length > 0
}

/**
 * PocketBase requires at least two distinct auth methods for MFA to make
 * sense; mirror that rule when deciding whether to even offer the prompt.
 */
export function mfaEligible(
  answers: Pick<WizardAnswers, 'authFactors' | 'oauthProviders'>,
): boolean {
  return (
    answers.authFactors.length + (answers.oauthProviders.length > 0 ? 1 : 0) >=
    2
  )
}
