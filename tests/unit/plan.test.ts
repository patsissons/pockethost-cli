import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildPlan,
  buildTemplateData,
  commitGroupFor,
  LOCAL_POCKETBASE_URL,
} from '../../src/core/plan.js'
import {
  DESIGN_SYSTEMS,
  FRAMEWORKS,
  PACKAGE_MANAGERS,
  type WizardAnswers,
} from '../../src/wizard/answers.js'

const TEMPLATES = '/templates'

function answers(overrides: Partial<WizardAnswers> = {}): WizardAnswers {
  return {
    name: 'demo',
    targetDir: '/tmp/demo',
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
}

describe('buildPlan', () => {
  it('composes layers in base → framework → design → auth order', () => {
    const plan = buildPlan(answers(), TEMPLATES)
    expect(plan.layers.map((l) => l.dir)).toEqual([
      path.join(TEMPLATES, 'base'),
      path.join(TEMPLATES, 'frameworks', 'vite-react'),
      path.join(TEMPLATES, 'design', 'shadcn', 'vite-react'),
      path.join(TEMPLATES, 'features', 'auth', 'vite-react'),
    ])
  })

  it('omits the auth layer when no auth is selected', () => {
    const plan = buildPlan(
      answers({ authFactors: [], oauthProviders: [] }),
      TEMPLATES,
    )
    expect(plan.layers.some((l) => l.kind === 'auth')).toBe(false)
  })

  it('adds shared + mode layers for nextjs', () => {
    const plan = buildPlan(
      answers({ framework: 'nextjs', nextMode: 'ssr' }),
      TEMPLATES,
    )
    const dirs = plan.layers
      .filter((l) => l.kind === 'framework')
      .map((l) => l.dir)
    expect(dirs).toEqual([
      path.join(TEMPLATES, 'frameworks', 'nextjs', 'shared'),
      path.join(TEMPLATES, 'frameworks', 'nextjs', 'ssr'),
    ])
  })

  it('builds a valid plan for the full framework × design × pm matrix', () => {
    for (const framework of FRAMEWORKS) {
      for (const design of DESIGN_SYSTEMS) {
        for (const packageManager of PACKAGE_MANAGERS) {
          const plan = buildPlan(
            answers({ framework, design, packageManager }),
            TEMPLATES,
          )
          expect(plan.layers.length).toBeGreaterThanOrEqual(3)
          expect(plan.templateData.design).toBe(design)
        }
      }
    }
  })
})

describe('buildTemplateData', () => {
  it('derives instance URLs', () => {
    const data = buildTemplateData(answers({ instanceName: 'my-app' }))
    expect(data.instanceUrl).toBe('https://my-app.pockethost.io')
    expect(data.pocketbaseUrl).toBe('https://my-app.pockethost.io')
  })

  it('falls back to the local pocketbase URL without an instance', () => {
    const data = buildTemplateData(answers())
    expect(data.instanceUrl).toBeUndefined()
    expect(data.pocketbaseUrl).toBe(LOCAL_POCKETBASE_URL)
  })

  it('maps package manager commands', () => {
    expect(buildTemplateData(answers({ packageManager: 'bun' })).pm).toEqual({
      name: 'bun',
      run: 'bun run',
      dlx: 'bunx',
    })
  })
})

describe('commitGroupFor', () => {
  it.each([
    ['.gitignore', 'base', 'gitignore'],
    ['package.json', 'base', 'tooling'],
    ['tsconfig.json', 'framework', 'tooling'],
    ['vite.config.ts', 'framework', 'tooling'],
    ['.env.example', 'base', 'tooling'],
    ['pb_migrations/001_init.js', 'base', 'backend'],
    ['pb_hooks/main.pb.js', 'base', 'backend'],
    ['src/main.tsx', 'framework', 'skeleton'],
    ['index.html', 'framework', 'skeleton'],
    ['src/lib/pocketbase.ts', 'auth', 'auth'],
    ['src/App.test.tsx', 'framework', 'unit-tests'],
    ['playwright.config.ts', 'framework', 'e2e'],
    ['e2e/smoke.spec.ts', 'framework', 'e2e'],
    ['README.md', 'base', 'docs'],
    ['AGENTS.md', 'base', 'docs'],
  ] as const)('%s from %s layer → %s', (target, kind, expected) => {
    expect(commitGroupFor(kind, target)).toBe(expected)
  })
})
