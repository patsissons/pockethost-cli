import { Command } from 'commander'
import * as clack from '@clack/prompts'
import pc from 'picocolors'
import { executePlan } from '../core/engine.js'
import { buildPlan } from '../core/plan.js'
import { installDependencies } from '../steps/install.js'
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
    const answers = await fillAnswers(partial, dir)

    if (!answers.skipPhio) {
      // Instance selection, linking, and deploy land with the phio
      // integration (P2). Until then everything runs scaffold-only.
      clack.log.warn(
        'phio integration is not wired up yet — running scaffold-only.',
      )
      answers.skipPhio = true
      answers.deploy = false
    }

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

    clack.outro(
      [
        pc.green('Done!'),
        '',
        `  cd ${answers.targetDir}`,
        `  ${plan.templateData.pm.run} dev`,
      ].join('\n'),
    )
  })

  return command
}
