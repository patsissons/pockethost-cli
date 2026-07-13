import { Command } from 'commander'
import { execa } from 'execa'
import pc from 'picocolors'
import semver from 'semver'
import { createPhioClient, directRunner, dlxRunner } from '../phio/client.js'
import { templatesRoot } from '../utils/paths.js'

export type CheckStatus = 'ok' | 'warn' | 'fail'

export interface CheckResult {
  name: string
  status: CheckStatus
  detail: string
}

const ICONS: Record<CheckStatus, string> = {
  ok: pc.green('✓'),
  warn: pc.yellow('!'),
  fail: pc.red('✗'),
}

export function formatChecks(checks: CheckResult[]): string {
  const width = Math.max(...checks.map((c) => c.name.length))
  return checks
    .map((c) => `${ICONS[c.status]} ${c.name.padEnd(width)}  ${c.detail}`)
    .join('\n')
}

export function hasFailure(checks: CheckResult[]): boolean {
  return checks.some((c) => c.status === 'fail')
}

async function version(command: string, args: string[] = ['--version']): Promise<string | null> {
  try {
    const { stdout } = await execa(command, args)
    return stdout.split('\n')[0]?.trim() ?? null
  } catch {
    return null
  }
}

export async function runChecks(): Promise<CheckResult[]> {
  const checks: CheckResult[] = []

  const node = process.version
  checks.push(
    semver.satisfies(node, '>=24')
      ? { name: 'node', status: 'ok', detail: `${node} (phio-compatible)` }
      : semver.satisfies(node, '>=20')
        ? { name: 'node', status: 'warn', detail: `${node} — scaffolding works, but phio needs >=24` }
        : { name: 'node', status: 'fail', detail: `${node} — ph requires Node >=20` },
  )

  const git = await version('git')
  checks.push(
    git
      ? { name: 'git', status: 'ok', detail: git }
      : { name: 'git', status: 'fail', detail: 'not found — scaffolds cannot be committed' },
  )

  for (const pm of ['pnpm', 'bun', 'npm'] as const) {
    const v = await version(pm)
    checks.push(
      v
        ? { name: pm, status: 'ok', detail: v }
        : { name: pm, status: 'warn', detail: 'not installed' },
    )
  }

  try {
    templatesRoot()
    checks.push({ name: 'templates', status: 'ok', detail: 'bundled templates located' })
  } catch {
    checks.push({ name: 'templates', status: 'fail', detail: 'missing — broken installation' })
  }

  const phioVersion = await version('phio')
  const runner = phioVersion ? directRunner() : dlxRunner('pnpm')
  checks.push(
    phioVersion
      ? { name: 'phio', status: 'ok', detail: phioVersion }
      : {
          name: 'phio',
          status: 'warn',
          detail: 'not on PATH — will fall back to dlx (or: npm install -g phio)',
        },
  )

  try {
    const { loggedIn } = await createPhioClient(runner).whoami()
    checks.push(
      loggedIn
        ? { name: 'pockethost', status: 'ok', detail: 'logged in' }
        : { name: 'pockethost', status: 'warn', detail: 'not logged in — run `phio login`' },
    )
  } catch {
    checks.push({ name: 'pockethost', status: 'warn', detail: 'could not check login state' })
  }

  return checks
}

export function doctorCommand(): Command {
  return new Command('doctor')
    .description('Check the environment for scaffolding and deploying')
    .action(async () => {
      const checks = await runChecks()
      console.log(formatChecks(checks))
      if (hasFailure(checks)) process.exitCode = 1
    })
}
