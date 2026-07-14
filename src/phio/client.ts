import { execa, type Options as ExecaOptions } from 'execa'
import type { PackageManager } from '../wizard/answers.js'

/**
 * All phio subprocess interaction goes through this module — it is the stub
 * seam for tests. phio is preferred from PATH (npm i -g phio); otherwise it
 * runs through the package manager's dlx runner. phio@0.4's bin wrapper execs
 * `tsx`, so dlx invocations must bring tsx along as a second package.
 */
export interface PhioRunner {
  /** argv prefix, e.g. ["phio"] or ["pnpm", "--package=phio", ...]. */
  prefix: string[]
  /** How to show a phio command to the user, e.g. "phio deploy". */
  describe(args: string[]): string
}

export function directRunner(): PhioRunner {
  return { prefix: ['phio'], describe: (args) => ['phio', ...args].join(' ') }
}

export function dlxRunner(pm: PackageManager): PhioRunner {
  const prefix =
    pm === 'pnpm'
      ? ['pnpm', '--package=phio', '--package=tsx', 'dlx', 'phio']
      : ['npx', '-y', '-p', 'phio', '-p', 'tsx', 'phio']
  return { prefix, describe: (args) => [...prefix, ...args].join(' ') }
}

export async function resolveRunner(pm: PackageManager): Promise<PhioRunner> {
  try {
    await execa('phio', ['--version'])
    return directRunner()
  } catch {
    return dlxRunner(pm)
  }
}

/**
 * phio resolves its project root as PHIO_PROJECT_DIR ?? INIT_CWD ?? cwd and
 * chdirs there. Package managers set INIT_CWD to where THEY were invoked, so
 * a spawn cwd alone gets silently overridden (phio would deploy the wrong
 * directory). Always pin PHIO_PROJECT_DIR when targeting a project.
 */
export function phioEnv(cwd?: string): NodeJS.ProcessEnv | undefined {
  return cwd ? { PHIO_PROJECT_DIR: cwd } : undefined
}

async function run(
  runner: PhioRunner,
  args: string[],
  options: ExecaOptions = {},
): Promise<{ stdout: string; exitCode: number }> {
  const [command, ...prefixArgs] = runner.prefix
  const result = await execa(command!, [...prefixArgs, ...args], {
    reject: false,
    env: phioEnv(typeof options.cwd === 'string' ? options.cwd : undefined),
    ...options,
  })
  return { stdout: String(result.stdout ?? ''), exitCode: result.exitCode ?? 1 }
}

export interface PhioClient {
  runner: PhioRunner
  whoami(): Promise<{ loggedIn: boolean; raw: string }>
  list(): Promise<string[]>
  /** Interactive; returns true when login succeeded. */
  login(): Promise<boolean>
  link(instance: string, cwd: string): Promise<void>
  deploy(cwd: string): Promise<void>
}

export function createPhioClient(runner: PhioRunner): PhioClient {
  return {
    runner,

    async whoami() {
      const { stdout } = await run(runner, ['whoami'])
      return { loggedIn: !/not logged in/i.test(stdout), raw: stdout }
    },

    async list() {
      const { stdout, exitCode } = await run(runner, ['list'])
      if (exitCode !== 0) throw new Error(`phio list failed:\n${stdout}`)
      return parseInstanceList(stdout)
    },

    async login() {
      const [command, ...prefixArgs] = runner.prefix
      const result = await execa(command!, [...prefixArgs, 'login'], {
        stdio: 'inherit',
        reject: false,
      })
      if (result.exitCode !== 0) return false
      const { loggedIn } = await this.whoami()
      return loggedIn
    },

    async link(instance, cwd) {
      const { stdout, exitCode } = await run(runner, ['link', instance], {
        cwd,
      })
      if (exitCode !== 0)
        throw new Error(`phio link ${instance} failed:\n${stdout}`)
    },

    async deploy(cwd) {
      const [command, ...prefixArgs] = runner.prefix
      const result = await execa(command!, [...prefixArgs, 'deploy'], {
        cwd,
        env: phioEnv(cwd),
        stdio: 'inherit',
        reject: false,
      })
      if (result.exitCode !== 0) {
        throw new Error(`phio deploy failed (exit ${result.exitCode})`)
      }
    },
  }
}

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\[[0-9;]*m/g
const INSTANCE_NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/
const NOISE_WORDS = new Set([
  'name',
  'instance',
  'instances',
  'version',
  'status',
  'true',
  'false',
])

/**
 * Extracts instance names from `phio list` output. The format is not
 * machine-readable, so this scans for subdomain-shaped tokens at line starts
 * while skipping table chrome and header words.
 */
export function parseInstanceList(stdout: string): string[] {
  const names = new Set<string>()
  for (const line of stdout.split('\n')) {
    const cleaned = line
      .replace(ANSI_PATTERN, '')
      .replace(/[│|┃]/g, ' ')
      .trim()
      // phio 0.4 prints instances as `- name (id)  (STATUS)` bullets
      .replace(/^[-*•]\s+/, '')
    const first = cleaned.split(/\s+/)[0]
    if (!first || NOISE_WORDS.has(first.toLowerCase())) continue
    if (INSTANCE_NAME_PATTERN.test(first)) names.add(first)
  }
  return [...names].sort()
}
