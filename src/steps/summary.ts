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

  if (deployed && answers.instanceName) {
    const url = instanceUrlFor(answers.instanceName)
    lines.push(pc.green(`Your app is live: ${url}`))
    lines.push(
      `Admin UI: ${url}/_/ (log in with your pockethost.io credentials — Admin Sync)`,
    )
  } else if (answers.instanceName) {
    lines.push(`Deploy when ready: ${pm.run} build && phio deploy`)
  } else {
    lines.push('No instance linked yet. When ready:')
    lines.push(`  1. Create one at https://pockethost.io/instances/new`)
    lines.push(
      `  2. phio link <instance-name>   (npm install -g phio if missing)`,
    )
    lines.push(`  3. ${pm.run} build && phio deploy`)
  }

  lines.push('')
  lines.push('Next steps:')
  lines.push(`  cd ${answers.targetDir}`)
  lines.push(`  ${pm.run} dev`)

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
