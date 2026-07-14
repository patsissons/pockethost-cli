import pc from 'picocolors'
import { instanceUrlFor, type TemplateData } from '../core/plan.js'
import type { WizardAnswers } from '../wizard/answers.js'

export interface SummaryContext {
  answers: WizardAnswers
  templateData: TemplateData
  deployed: boolean
}

/** The final outro: URLs, credentials guidance, and external-setup steps. */
export function buildSummary({
  answers,
  templateData,
  deployed,
}: SummaryContext): string {
  const lines: string[] = []
  const pm = templateData.pm

  const externalFrontend =
    answers.framework === 'nextjs' && answers.nextMode === 'ssr'

  if (deployed && answers.instanceName) {
    const url = instanceUrlFor(answers.instanceName)
    if (externalFrontend) {
      lines.push(pc.green(`Your backend is live: ${url}`))
      lines.push(
        '(SSR mode: the frontend deploys to an external host — see below.)',
      )
    } else {
      lines.push(pc.green(`Your app is live: ${url}`))
    }
    lines.push(
      `Admin UI: ${url}/_/ (log in with your pockethost.io credentials — Admin Sync)`,
    )
  } else if (answers.instanceName) {
    lines.push(`Deploy when ready: ${pm.run} build && phio deploy`)
  } else {
    lines.push('No instance linked yet. When ready:')
    lines.push(`  1. Create one at https://pockethost.io/instances/new`)
    lines.push(
      `  2. phio link <instance-name>   (npm install -g phio tsx if missing)`,
    )
    lines.push(`  3. ${pm.run} build && phio deploy`)
  }

  lines.push('')
  lines.push('Next steps:')
  lines.push(`  cd ${answers.targetDir}`)
  lines.push(`  ${pm.run} dev`)

  if (externalFrontend) {
    const backendUrl = answers.instanceName
      ? instanceUrlFor(answers.instanceName)
      : 'https://<instance>.pockethost.io'
    lines.push('')
    lines.push(pc.bold('Frontend hosting (Next.js SSR mode):'))
    lines.push('  1. Push this repo and import it into Vercel or Cloudflare.')
    lines.push(
      `  2. Set NEXT_PUBLIC_POCKETBASE_URL=${backendUrl} in the host's env settings.`,
    )
    lines.push(
      '  3. Backend changes deploy separately with phio deploy (pb_migrations, pb_hooks).',
    )
    lines.push(
      '  Optional: CNAME db.<your-domain> → the instance for a same-site backend subdomain ' +
        '(PocketBase CORS is permissive by default).',
    )
  }

  if (answers.oauthProviders.length > 0) {
    lines.push('')
    lines.push(pc.bold('OAuth setup (per provider):'))
    const redirect = answers.instanceName
      ? `${instanceUrlFor(answers.instanceName)}/api/oauth2-redirect`
      : 'https://<instance>.pockethost.io/api/oauth2-redirect'
    for (const provider of answers.oauthProviders) {
      const upper = provider.toUpperCase()
      lines.push(
        `  ${provider}: create OAuth credentials with redirect URI ${redirect}, then add ` +
          `${upper}_CLIENT_ID and ${upper}_CLIENT_SECRET as Secrets in the PocketHost dashboard.`,
      )
    }
  }

  if (answers.authFactors.includes('otp')) {
    lines.push('')
    lines.push(
      'Email OTP needs outgoing email: configure SMTP for your instance ' +
        '(https://pockethost.io/docs/smtp).',
    )
  }

  if (answers.customDomain) {
    lines.push('')
    lines.push(pc.bold(`Custom domain (${answers.customDomain}):`))
    lines.push(
      `  1. Add a CNAME record: ${answers.customDomain} → ${answers.instanceName ?? '<instance>'}.pockethost.io`,
    )
    lines.push(
      '  2. Enable the custom domain on your instance in the PocketHost dashboard ' +
        '(https://pockethost.io/docs/custom-domain).',
    )
  }

  lines.push('')
  lines.push(
    `CI deploys: set PHIO_USERNAME, PHIO_PASSWORD${answers.instanceName ? '' : ', PHIO_INSTANCE_NAME'} and run phio deploy.`,
  )

  return lines.join('\n')
}
