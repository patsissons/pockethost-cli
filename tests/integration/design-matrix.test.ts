import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import prettier from 'prettier'
import { afterAll, describe, expect, it } from 'vitest'
import { executePlan } from '../../src/core/engine.js'
import { buildPlan } from '../../src/core/plan.js'
import { templatesRoot } from '../../src/utils/paths.js'
import {
  DESIGN_SYSTEMS,
  FRAMEWORKS,
  type Framework,
  type WizardAnswers,
} from '../../src/wizard/answers.js'

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

async function scaffold(overrides: Partial<WizardAnswers>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ph-design-'))
  cleanups.push(root)
  const targetDir = path.join(root, 'app')
  const answers: WizardAnswers = {
    name: 'demo-app',
    targetDir,
    framework: 'vite-react',
    design: 'shadcn',
    authFactors: ['password', 'otp'],
    oauthProviders: ['google'],
    mfa: true,
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

/** Files every design layer must provide so shared templates keep working. */
const UI_CONTRACT: Record<Framework, string[]> = {
  'vite-react': [
    'src/components/ui/button.tsx',
    'src/components/ui/input.tsx',
    'src/components/ui/label.tsx',
    'src/components/ui/card.tsx',
    'src/lib/utils.ts',
    'src/index.css',
  ],
  sveltekit: [
    'src/lib/components/ui/button.svelte',
    'src/lib/components/ui/input.svelte',
    'src/lib/components/ui/label.svelte',
    'src/lib/components/ui/card.svelte',
    'src/lib/components/ui/card-header.svelte',
    'src/lib/components/ui/card-title.svelte',
    'src/lib/components/ui/card-description.svelte',
    'src/lib/components/ui/card-content.svelte',
    'src/lib/utils.ts',
    'src/app.css',
  ],
  'react-router': [
    'app/components/ui/button.tsx',
    'app/components/ui/input.tsx',
    'app/components/ui/label.tsx',
    'app/components/ui/card.tsx',
    'app/lib/utils.ts',
    'app/app.css',
  ],
  nextjs: [
    'components/ui/button.tsx',
    'components/ui/input.tsx',
    'components/ui/label.tsx',
    'components/ui/card.tsx',
    'lib/utils.ts',
    'app/globals.css',
  ],
}

describe('design system × framework matrix', () => {
  for (const design of DESIGN_SYSTEMS) {
    for (const framework of FRAMEWORKS) {
      it(`${design} × ${framework} scaffolds the ui contract without conflicts`, async () => {
        const { result } = await scaffold({
          design,
          framework,
          nextMode: framework === 'nextjs' ? 'static' : undefined,
        })
        const targets = result.files.map((f) => f.target)
        for (const file of UI_CONTRACT[framework]) {
          expect
            .soft(targets, `${design}/${framework} missing ${file}`)
            .toContain(file)
        }
      })
    }
  }

  it('daisyui css loads the plugin and maps shared tokens', async () => {
    const { targetDir } = await scaffold({
      design: 'daisyui',
      framework: 'vite-react',
    })
    const css = await readFile(path.join(targetDir, 'src/index.css'), 'utf8')
    expect(css).toContain("@plugin 'daisyui'")
    expect(css).toContain('--color-background: var(--color-base-100)')
  })

  it.each([
    ['daisyui', 'vite-react'],
    ['tailwind', 'react-router'],
  ] as const)(
    '%s × %s scaffold is prettier-clean',
    async (design, framework) => {
      const { targetDir, result } = await scaffold({ design, framework })
      const config = JSON.parse(
        await readFile(path.join(targetDir, '.prettierrc'), 'utf8'),
      ) as Record<string, unknown>
      delete config.plugins

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
    },
  )
})
