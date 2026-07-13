import { execa } from 'execa'
import type { WizardAnswers } from '../wizard/answers.js'

/**
 * Runs the scaffolded app's own validate:quick (format check + typecheck +
 * lint + unit tests) to prove the scaffold is green before deploying. E2e is
 * excluded here — Playwright browsers may not be installed yet.
 */
export async function validateApp(answers: WizardAnswers): Promise<void> {
  await execa(answers.packageManager, ['run', 'validate:quick'], {
    cwd: answers.targetDir,
    stdio: 'inherit',
  })
}
