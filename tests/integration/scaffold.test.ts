import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execa } from 'execa'
import prettier from 'prettier'
import { afterAll, describe, expect, it } from 'vitest'
import { executePlan } from '../../src/core/engine.js'
import { buildPlan } from '../../src/core/plan.js'
import { templatesRoot } from '../../src/utils/paths.js'
import type { WizardAnswers } from '../../src/wizard/answers.js'

/** Pin identity and disable user config (incl. commit signing) for test repos. */
const gitEnv = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
}

const cleanups: string[] = []

afterAll(async () => {
  await Promise.all(
    cleanups.map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

async function scaffold(overrides: Partial<WizardAnswers> = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ph-scaffold-'))
  cleanups.push(root)
  const targetDir = path.join(root, 'app')
  const answers: WizardAnswers = {
    name: 'demo-app',
    targetDir,
    framework: 'vite-react',
    design: 'shadcn',
    authFactors: ['password'],
    oauthProviders: [],
    mfa: false,
    packageManager: 'pnpm',
    install: false,
    validate: false,
    deploy: false,
    skipPhio: true,
    ...overrides,
  }
  const plan = buildPlan(answers, templatesRoot())
  const result = await executePlan(plan, { gitEnv })
  return { targetDir, result }
}

describe('scaffold integration (vite-react)', () => {
  it('produces the expected file tree with password auth', async () => {
    const { targetDir, result } = await scaffold()

    expect(result.warnings).toEqual([])
    expect(result.files.map((f) => f.target)).toMatchSnapshot()

    const pkg = JSON.parse(
      await readFile(path.join(targetDir, 'package.json'), 'utf8'),
    )
    expect(pkg.name).toBe('demo-app')
    expect(pkg.scripts['format-and-validate']).toBe('run-s format validate')
    expect(pkg.dependencies.pocketbase).toBeDefined()
    expect(pkg.dependencies.react).toBeDefined()

    const readme = await readFile(path.join(targetDir, 'README.md'), 'utf8')
    expect(readme).toContain('# demo-app')
    expect(readme).not.toContain('<%')

    const html = await readFile(path.join(targetDir, 'index.html'), 'utf8')
    expect(html).toContain('<title>demo-app</title>')
  })

  it('creates the root commit as a single empty .gitignore, then modular commits', async () => {
    const { targetDir } = await scaffold()

    const { stdout: rootHash } = await execa(
      'git',
      ['rev-list', '--max-parents=0', 'HEAD'],
      {
        cwd: targetDir,
        env: gitEnv,
      },
    )
    const { stdout: rootSubject } = await execa(
      'git',
      ['show', '-s', '--format=%s', rootHash],
      {
        cwd: targetDir,
        env: gitEnv,
      },
    )
    const { stdout: rootFiles } = await execa(
      'git',
      ['show', '--format=', '--name-only', rootHash],
      { cwd: targetDir, env: gitEnv },
    )
    expect(rootSubject).toBe('chore: root commit (empty .gitignore)')
    expect(rootFiles.trim()).toBe('.gitignore')

    const { stdout: log } = await execa(
      'git',
      ['log', '--reverse', '--format=%s'],
      {
        cwd: targetDir,
        env: gitEnv,
      },
    )
    expect(log).toContain('chore: populate .gitignore')
    expect(log).toContain('feat: app skeleton')
    expect(log).toContain('feat: auth pages and pocketbase auth wiring')
    expect(log).toContain('docs: README, AGENTS.md, CLAUDE.md')

    const { stdout: status } = await execa('git', ['status', '--porcelain'], {
      cwd: targetDir,
      env: gitEnv,
    })
    expect(status).toBe('')
  })

  it('scaffolded output is prettier-clean under the app prettier config', async () => {
    const { targetDir, result } = await scaffold()
    const config = JSON.parse(
      await readFile(path.join(targetDir, '.prettierrc'), 'utf8'),
    ) as Record<string, unknown>

    for (const { target } of result.files) {
      const { inferredParser } = await prettier.getFileInfo(target)
      if (!inferredParser) continue
      const content = await readFile(path.join(targetDir, target), 'utf8')
      const clean = await prettier.check(content, {
        ...config,
        filepath: target,
      })
      expect.soft(clean, `${target} is not prettier-clean`).toBe(true)
    }
  })

  it('generated migrations and hooks are valid javascript', async () => {
    const { targetDir } = await scaffold()
    for (const file of [
      'pb_migrations/1700000000_create_posts.js',
      'pb_hooks/main.pb.js',
    ]) {
      await expect(
        execa('node', ['--check', path.join(targetDir, file)]),
      ).resolves.toBeDefined()
    }
  })

  it('omits auth files when no auth is selected', async () => {
    const { result } = await scaffold({ authFactors: [], oauthProviders: [] })
    const targets = result.files.map((f) => f.target)
    expect(targets).not.toContain('src/pages/LoginPage.tsx')
    expect(targets).not.toContain('src/lib/auth.tsx')
  })

  it('omits RegisterPage for oauth-only auth', async () => {
    const { targetDir, result } = await scaffold({
      authFactors: [],
      oauthProviders: ['google', 'github'],
    })
    const targets = result.files.map((f) => f.target)
    expect(targets).toContain('src/pages/LoginPage.tsx')
    expect(targets).not.toContain('src/pages/RegisterPage.tsx')

    const login = await readFile(
      path.join(targetDir, 'src/pages/LoginPage.tsx'),
      'utf8',
    )
    expect(login).toContain("onOAuth('google')")
    expect(login).toContain("onOAuth('github')")
    expect(login).not.toContain('FormEvent')
  })
})
