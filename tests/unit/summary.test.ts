import { describe, expect, it } from 'vitest'
import { buildTemplateData } from '../../src/core/plan.js'
import { buildSummary } from '../../src/steps/summary.js'
import type { WizardAnswers } from '../../src/wizard/answers.js'

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
    install: true,
    validate: true,
    deploy: true,
    skipPhio: false,
    ...overrides,
  }
}

function summarize(
  overrides: Partial<WizardAnswers>,
  deployed: boolean,
): string {
  const a = answers(overrides)
  return buildSummary({
    answers: a,
    templateData: buildTemplateData(a),
    deployed,
  })
}

describe('buildSummary', () => {
  it('shows the live URL and admin UI after a deploy', () => {
    const text = summarize({ instanceName: 'demo' }, true)
    expect(text).toContain('https://demo.pockethost.io')
    expect(text).toContain('https://demo.pockethost.io/_/')
  })

  it('gives link/deploy instructions when no instance was chosen', () => {
    const text = summarize({}, false)
    expect(text).toContain('phio link <instance-name>')
    expect(text).toContain('pockethost.io/instances/new')
  })

  it('emits per-provider OAuth setup with the redirect URI', () => {
    const text = summarize(
      { instanceName: 'demo', oauthProviders: ['google', 'github'] },
      true,
    )
    expect(text).toContain('https://demo.pockethost.io/api/oauth2-redirect')
    expect(text).toContain('GOOGLE_CLIENT_ID')
    expect(text).toContain('GITHUB_CLIENT_SECRET')
  })

  it('mentions SMTP when OTP is enabled', () => {
    const text = summarize({ authFactors: ['password', 'otp'] }, false)
    expect(text).toContain('pockethost.io/docs/smtp')
  })

  it('emits CNAME instructions for a custom domain', () => {
    const text = summarize(
      { instanceName: 'demo', customDomain: 'app.example.com' },
      true,
    )
    expect(text).toContain('app.example.com → demo.pockethost.io')
  })
})

describe('buildSummary (nextjs ssr mode)', () => {
  it('labels the instance as backend-only and adds frontend host steps', () => {
    const text = summarize(
      { framework: 'nextjs', nextMode: 'ssr', instanceName: 'demo' },
      true,
    )
    expect(text).toContain('Your backend is live: https://demo.pockethost.io')
    expect(text).toContain('Frontend hosting (Next.js SSR mode):')
    expect(text).toContain(
      'NEXT_PUBLIC_POCKETBASE_URL=https://demo.pockethost.io',
    )
  })

  it('does not add the ssr section for static mode', () => {
    const text = summarize(
      { framework: 'nextjs', nextMode: 'static', instanceName: 'demo' },
      true,
    )
    expect(text).toContain('Your app is live: https://demo.pockethost.io')
    expect(text).not.toContain('Frontend hosting')
  })
})
