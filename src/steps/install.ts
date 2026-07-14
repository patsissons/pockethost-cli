import { existsSync } from 'node:fs'
import path from 'node:path'
import { execa } from 'execa'
import { commitFiles } from '../core/git.js'
import type { WizardAnswers } from '../wizard/answers.js'

const LOCKFILES = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'bun.lock',
  'bun.lockb',
]

/**
 * Installs dependencies, then commits the lockfile the package manager
 * produced — install runs after the modular scaffold commits, so without
 * this the scaffolded repo is left dirty.
 */
export async function installDependencies(
  answers: WizardAnswers,
): Promise<string[]> {
  await execa(answers.packageManager, ['install'], {
    cwd: answers.targetDir,
    stdio: 'inherit',
  })

  const lockfiles = LOCKFILES.filter((name) =>
    existsSync(path.join(answers.targetDir, name)),
  )
  if (lockfiles.length === 0) return []
  return commitFiles('chore: commit lockfile', lockfiles, {
    cwd: answers.targetDir,
  })
}
