import { execa } from 'execa'
import type { WizardAnswers } from '../wizard/answers.js'

export async function installDependencies(
  answers: WizardAnswers,
): Promise<void> {
  await execa(answers.packageManager, ['install'], {
    cwd: answers.targetDir,
    stdio: 'inherit',
  })
}
