import { execa } from 'execa'
import { commitFiles } from '../core/git.js'
import type { PhioClient } from '../phio/client.js'
import type { WizardAnswers } from '../wizard/answers.js'

/**
 * Build → link → deploy. The build fills pb_public/, `phio link` writes
 * .phioconfig (committed — it holds only the instance name), and
 * `phio deploy` syncs pb_* to the instance over SFTP.
 */
export async function buildApp(answers: WizardAnswers): Promise<void> {
  await execa(answers.packageManager, ['run', 'build'], {
    cwd: answers.targetDir,
    stdio: 'inherit',
  })
}

export async function linkAndDeploy(
  client: PhioClient,
  answers: WizardAnswers & { instanceName: string },
): Promise<string[]> {
  await client.link(answers.instanceName, answers.targetDir)
  const warnings = await commitFiles(
    `chore: link pockethost instance ${answers.instanceName}`,
    ['.phioconfig'],
    { cwd: answers.targetDir },
  )
  await client.deploy(answers.targetDir)
  return warnings
}
