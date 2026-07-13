import { Command } from 'commander'
import * as clack from '@clack/prompts'
import pc from 'picocolors'
import { executePlan } from '../core/engine.js'
import { buildPlan } from '../core/plan.js'
import { selectInstance } from '../phio/instance.js'
import { buildApp, linkAndDeploy } from '../steps/deploy.js'
import { installDependencies } from '../steps/install.js'
import { preflight } from '../steps/preflight.js'
import { buildSummary } from '../steps/summary.js'
import { validateApp } from '../steps/validate.js'
import { templatesRoot } from '../utils/paths.js'
import {
  flagsToPartialAnswers,
  registerCreateFlags,
  type CreateFlags,
} from '../wizard/flags.js'
import { fillAnswers } from '../wizard/prompts.js'

export function createCommand(): Command {
  const command = new Command('create')
    .description('Scaffold a new PocketHost-backed web app')
    .argument('[dir]', 'target directory for the new app')

  registerCreateFlags(command)

  command.action(async (dir: string | undefined, flags: CreateFlags) => {
    clack.intro(pc.bgCyan(pc.black(' ph create ')))

    const partial = flagsToPartialAnswers(flags)
    const interactive =
      partial.interactive && !partial.yes && process.stdout.isTTY
    const answers = await fillAnswers(partial, dir)

    // --- phio preflight + instance selection (before the plan is built so
    // the chosen instance URL lands in the scaffolded .env/README) ---------
    const pre = await preflight({
      packageManager: answers.packageManager,
      interactive,
      skipPhio: answers.skipPhio || !partial.linkInstance,
    })
    for (const warning of pre.warnings) clack.log.warn(warning)

    if (pre.phioReady && pre.client && partial.linkInstance) {
      answers.instanceName = await selectInstance(pre.client, answers.name, {
        interactive,
        requestedInstance: partial.instanceName,
      })
    }

    if (interactive) {
      const auth =
        [
          ...answers.authFactors,
          ...answers.oauthProviders.map((p) => `oauth:${p}`),
          ...(answers.mfa ? ['mfa'] : []),
        ].join(', ') || 'none'
      clack.note(
        [
          `App:        ${answers.name} → ${answers.targetDir}`,
          `Framework:  ${answers.framework}${answers.nextMode ? ` (${answers.nextMode})` : ''}`,
          `Design:     ${answers.design}`,
          `Auth:       ${auth}`,
          `PM:         ${answers.packageManager}`,
          `Instance:   ${answers.instanceName ?? 'none (link later)'}`,
          `Domain:     ${answers.customDomain ?? 'none'}`,
        ].join('\n'),
        'Ready to scaffold',
      )
      const go = await clack.confirm({
        message: 'Proceed?',
        initialValue: true,
      })
      if (clack.isCancel(go) || !go) {
        clack.cancel('Cancelled.')
        process.exit(1)
      }
    }

    // --- scaffold --------------------------------------------------------
    const spinner = clack.spinner()
    spinner.start(
      `Scaffolding ${answers.name} (${answers.framework} + ${answers.design})`,
    )
    const plan = buildPlan(answers, templatesRoot())
    const result = await executePlan(plan)
    spinner.stop(
      `Scaffolded ${result.files.length} files into ${answers.targetDir}`,
    )
    for (const warning of result.warnings) clack.log.warn(warning)

    // --- install + validate ------------------------------------------------
    if (answers.install) {
      clack.log.step(`Installing dependencies with ${answers.packageManager}…`)
      await installDependencies(answers)
    } else {
      clack.log.info('Skipped dependency installation (--no-install).')
    }

    if (answers.install && answers.validate) {
      clack.log.step(
        'Validating the scaffolded app (format + typecheck + lint + unit tests)…',
      )
      await validateApp(answers)
    } else if (!answers.validate) {
      clack.log.info('Skipped validation (--no-validate).')
    }

    // --- build + deploy ----------------------------------------------------
    let deployed = false
    if (
      answers.deploy &&
      answers.install &&
      pre.phioReady &&
      pre.client &&
      answers.instanceName
    ) {
      clack.log.step(`Building and deploying to ${answers.instanceName}…`)
      await buildApp(answers)
      const warnings = await linkAndDeploy(pre.client, {
        ...answers,
        instanceName: answers.instanceName,
      })
      for (const warning of warnings) clack.log.warn(warning)
      deployed = true
    } else if (answers.instanceName && !answers.deploy) {
      clack.log.info('Skipped deploy (--no-deploy).')
    }

    clack.outro(
      buildSummary({ answers, templateData: plan.templateData, deployed }),
    )
  })

  return command
}
