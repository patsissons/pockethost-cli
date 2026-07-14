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

  it('hooks never register routes PocketBase already owns (boot panic)', async () => {
    const { targetDir, result } = await scaffold({
      authFactors: ['password', 'otp'],
      oauthProviders: ['google'],
      mfa: true,
    })
    // duplicate route patterns panic the server at startup — a crash-looping
    // container was how we learned /api/health is built in
    const reserved = [
      '/api/health',
      '/api/collections',
      '/api/settings',
      '/api/logs',
      '/_/',
    ]
    for (const { target } of result.files.filter((f) =>
      f.target.startsWith('pb_hooks/'),
    )) {
      const source = await readFile(path.join(targetDir, target), 'utf8')
      const registrations = source.match(/routerAdd\([^)]*\)/g) ?? []
      for (const registration of registrations) {
        for (const route of reserved) {
          expect
            .soft(registration, `${target} registers reserved route ${route}`)
            .not.toContain(`'${route}'`)
        }
      }
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

  it('generates auth migration and oauth hook for the full auth matrix', async () => {
    const { targetDir, result } = await scaffold({
      authFactors: ['password', 'otp'],
      oauthProviders: ['google', 'github'],
      mfa: true,
    })
    const targets = result.files.map((f) => f.target)
    expect(targets).toContain('pb_migrations/1700000001_configure_auth.js')
    expect(targets).toContain('pb_hooks/oauth.pb.js')
    expect(targets).toContain('pb_hooks/admin.pb.js')

    for (const file of [
      'pb_migrations/1700000001_configure_auth.js',
      'pb_hooks/oauth.pb.js',
      'pb_hooks/admin.pb.js',
    ]) {
      await expect(
        execa('node', ['--check', path.join(targetDir, file)]),
      ).resolves.toBeDefined()
    }

    const env = await readFile(path.join(targetDir, '.env.example'), 'utf8')
    expect(env).toContain('GOOGLE_CLIENT_ID=')
    expect(env).toContain('GITHUB_CLIENT_SECRET=')

    const login = await readFile(
      path.join(targetDir, 'src/pages/LoginPage.tsx'),
      'utf8',
    )
    expect(login).toContain('one-time code')
    expect(login).toContain('MfaRequiredError')
  })

  it('omits the auth migration when no auth is selected', async () => {
    const { result } = await scaffold({ authFactors: [], oauthProviders: [] })
    const targets = result.files.map((f) => f.target)
    expect(targets).not.toContain('pb_migrations/1700000001_configure_auth.js')
    expect(targets).not.toContain('pb_hooks/oauth.pb.js')
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

describe('scaffold integration (sveltekit)', () => {
  it('produces the expected file tree with password auth', async () => {
    const { targetDir, result } = await scaffold({ framework: 'sveltekit' })

    expect(result.warnings).toEqual([])
    expect(result.files.map((f) => f.target)).toMatchSnapshot()

    const svelteConfig = await readFile(
      path.join(targetDir, 'svelte.config.js'),
      'utf8',
    )
    expect(svelteConfig).toContain("pages: 'pb_public'")
    expect(svelteConfig).toContain("fallback: 'index.html'")

    const appHtml = await readFile(path.join(targetDir, 'src/app.html'), 'utf8')
    expect(appHtml).toContain('<title>demo-app</title>')

    const prettierRc = JSON.parse(
      await readFile(path.join(targetDir, '.prettierrc'), 'utf8'),
    ) as { plugins?: string[] }
    expect(prettierRc.plugins).toContain('prettier-plugin-svelte')
  })

  it('svelte output is prettier-clean under the app config', async () => {
    const { targetDir, result } = await scaffold({
      framework: 'sveltekit',
      authFactors: ['password', 'otp'],
      oauthProviders: ['google'],
      mfa: true,
    })
    const config = JSON.parse(
      await readFile(path.join(targetDir, '.prettierrc'), 'utf8'),
    ) as Record<string, unknown>

    for (const { target } of result.files) {
      const content = await readFile(path.join(targetDir, target), 'utf8')
      let clean: boolean
      if (target.endsWith('.svelte')) {
        // prettier-plugin-svelte resolves from the CLI's node_modules here.
        clean = await prettier.check(content, {
          ...config,
          filepath: target,
          parser: 'svelte',
          plugins: ['prettier-plugin-svelte'],
        })
      } else {
        const { inferredParser } = await prettier.getFileInfo(target)
        if (!inferredParser) continue
        clean = await prettier.check(content, {
          ...config,
          plugins: [],
          filepath: target,
        })
      }
      expect.soft(clean, `${target} is not prettier-clean`).toBe(true)
    }
  })

  it('omits the register route for oauth-only auth', async () => {
    const { result } = await scaffold({
      framework: 'sveltekit',
      authFactors: [],
      oauthProviders: ['google'],
    })
    const targets = result.files.map((f) => f.target)
    expect(targets).toContain('src/routes/login/+page.svelte')
    expect(targets).not.toContain('src/routes/register/+page.svelte')
    expect(targets).toContain('src/lib/auth.svelte.ts')
  })
})

describe('scaffold integration (react-router)', () => {
  it('produces the expected file tree with password auth', async () => {
    const { targetDir, result } = await scaffold({ framework: 'react-router' })

    expect(result.warnings).toEqual([])
    expect(result.files.map((f) => f.target)).toMatchSnapshot()

    const rrConfig = await readFile(
      path.join(targetDir, 'react-router.config.ts'),
      'utf8',
    )
    expect(rrConfig).toContain('ssr: false')

    const root = await readFile(path.join(targetDir, 'app/root.tsx'), 'utf8')
    expect(root).toContain('<title>demo-app</title>')
    expect(root).toContain('AuthProvider')

    const routes = await readFile(path.join(targetDir, 'app/routes.ts'), 'utf8')
    expect(routes).toContain("route('login', 'routes/login.tsx')")
    expect(routes).toContain("route('register', 'routes/register.tsx')")

    const prettierIgnore = await readFile(
      path.join(targetDir, '.prettierignore'),
      'utf8',
    )
    expect(prettierIgnore).toContain('.react-router/')

    const pkg = JSON.parse(
      await readFile(path.join(targetDir, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> }
    expect(pkg.scripts.build).toContain('scripts/pb-public.mjs')
    expect(pkg.scripts.typegen).toContain('app/lib/pocketbase-types.ts')
  })

  it('react-router output is prettier-clean under the app config', async () => {
    const { targetDir, result } = await scaffold({
      framework: 'react-router',
      authFactors: ['password', 'otp'],
      oauthProviders: ['google'],
      mfa: true,
    })
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

  it('omits the register route for oauth-only auth', async () => {
    const { targetDir, result } = await scaffold({
      framework: 'react-router',
      authFactors: [],
      oauthProviders: ['google'],
    })
    const targets = result.files.map((f) => f.target)
    expect(targets).toContain('app/routes/login.tsx')
    expect(targets).not.toContain('app/routes/register.tsx')

    const routes = await readFile(path.join(targetDir, 'app/routes.ts'), 'utf8')
    expect(routes).not.toContain('register')
  })

  it('omits auth entirely when no auth is selected', async () => {
    const { targetDir, result } = await scaffold({
      framework: 'react-router',
      authFactors: [],
      oauthProviders: [],
    })
    const targets = result.files.map((f) => f.target)
    expect(targets).not.toContain('app/lib/auth.tsx')
    const root = await readFile(path.join(targetDir, 'app/root.tsx'), 'utf8')
    expect(root).not.toContain('AuthProvider')
  })
})

describe('scaffold integration (nextjs)', () => {
  it('static mode: expected tree, export config, and pb_public copy script', async () => {
    const { targetDir, result } = await scaffold({
      framework: 'nextjs',
      nextMode: 'static',
    })

    expect(result.warnings).toEqual([])
    expect(result.files.map((f) => f.target)).toMatchSnapshot()

    const nextConfig = await readFile(
      path.join(targetDir, 'next.config.ts'),
      'utf8',
    )
    expect(nextConfig).toContain("output: 'export'")
    expect(nextConfig).toContain('unoptimized: true')

    const pkg = JSON.parse(
      await readFile(path.join(targetDir, 'package.json'), 'utf8'),
    ) as {
      scripts: Record<string, string>
      devDependencies: Record<string, string>
    }
    expect(pkg.scripts.build).toContain('scripts/pb-public.mjs')
    expect(pkg.scripts.typegen).toContain('lib/pocketbase-types.ts')
    // eslint-config-next's plugin stack does not support eslint 10 yet
    expect(pkg.devDependencies.eslint).toMatch(/\^9\./)

    const prettierIgnore = await readFile(
      path.join(targetDir, '.prettierignore'),
      'utf8',
    )
    expect(prettierIgnore).toContain('.next/')

    const layout = await readFile(
      path.join(targetDir, 'app/layout.tsx'),
      'utf8',
    )
    expect(layout).toContain('AuthProvider')

    const env = await readFile(path.join(targetDir, '.env.example'), 'utf8')
    expect(env).toContain('NEXT_PUBLIC_POCKETBASE_URL=')
  })

  it('ssr mode: no export config, no copy script, ssr docs', async () => {
    const { targetDir, result } = await scaffold({
      framework: 'nextjs',
      nextMode: 'ssr',
    })

    expect(result.files.map((f) => f.target)).toMatchSnapshot()
    const targets = result.files.map((f) => f.target)
    expect(targets).not.toContain('scripts/pb-public.mjs')

    const nextConfig = await readFile(
      path.join(targetDir, 'next.config.ts'),
      'utf8',
    )
    expect(nextConfig).not.toContain("output: 'export'")

    const pkg = JSON.parse(
      await readFile(path.join(targetDir, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> }
    expect(pkg.scripts.build).toBe('next build')

    const readme = await readFile(path.join(targetDir, 'README.md'), 'utf8')
    expect(readme).toContain('SSR mode')
    expect(readme).toContain('NEXT_PUBLIC_POCKETBASE_URL=')

    const agents = await readFile(path.join(targetDir, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('external host')
  })

  it('nextjs output is prettier-clean under the app config', async () => {
    const { targetDir, result } = await scaffold({
      framework: 'nextjs',
      nextMode: 'static',
      authFactors: ['password', 'otp'],
      oauthProviders: ['google'],
      mfa: true,
    })
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

  it('omits the register page for oauth-only auth', async () => {
    const { targetDir, result } = await scaffold({
      framework: 'nextjs',
      nextMode: 'static',
      authFactors: [],
      oauthProviders: ['google'],
    })
    const targets = result.files.map((f) => f.target)
    expect(targets).toContain('app/login/page.tsx')
    expect(targets).not.toContain('app/register/page.tsx')

    const login = await readFile(
      path.join(targetDir, 'app/login/page.tsx'),
      'utf8',
    )
    expect(login).not.toContain('FormEvent')
  })

  it('omits auth entirely when no auth is selected', async () => {
    const { targetDir, result } = await scaffold({
      framework: 'nextjs',
      nextMode: 'static',
      authFactors: [],
      oauthProviders: [],
    })
    const targets = result.files.map((f) => f.target)
    expect(targets).not.toContain('lib/auth.tsx')
    expect(targets).not.toContain('components/HeaderNav.tsx')
    const layout = await readFile(
      path.join(targetDir, 'app/layout.tsx'),
      'utf8',
    )
    expect(layout).not.toContain('AuthProvider')
  })
})
