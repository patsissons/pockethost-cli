import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { execa } from 'execa'

export interface GitContext {
  cwd: string
  /** Extra environment (tests use GIT_CONFIG_* to pin identity/signing). */
  env?: NodeJS.ProcessEnv
}

async function git(args: string[], ctx: GitContext): Promise<void> {
  await execa('git', args, { cwd: ctx.cwd, env: ctx.env })
}

/**
 * The scaffolded repo's initial (root) commit is exactly one file: an empty
 * `.gitignore`. Layer files (including the real .gitignore contents) land in
 * modular commits afterwards.
 *
 * Returns warnings instead of throwing: a missing git identity or a failing
 * signer should degrade to "scaffold left uncommitted", not abort the wizard.
 */
export async function initRepoWithRootCommit(
  ctx: GitContext,
): Promise<string[]> {
  try {
    await git(['init', '-b', 'main'], ctx)
  } catch (error) {
    return [
      `git init failed; continuing without version control: ${describe(error)}`,
    ]
  }

  try {
    await writeFile(path.join(ctx.cwd, '.gitignore'), '')
    await git(['add', '.gitignore'], ctx)
    await git(['commit', '-m', 'chore: root commit (empty .gitignore)'], ctx)
  } catch (error) {
    return [
      `git root commit failed; files were scaffolded but not committed: ${describe(error)}`,
    ]
  }

  return []
}

export async function commitFiles(
  message: string,
  files: string[],
  ctx: GitContext,
): Promise<string[]> {
  if (files.length === 0) return []
  try {
    await git(['add', '--', ...files], ctx)
    await git(['commit', '-m', message], ctx)
    return []
  } catch (error) {
    return [`git commit "${message}" failed: ${describe(error)}`]
  }
}

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'stderr' in error && error.stderr) {
    return String(error.stderr).split('\n')[0] ?? String(error)
  }
  return error instanceof Error ? error.message : String(error)
}
