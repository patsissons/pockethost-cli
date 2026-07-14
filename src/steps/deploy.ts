import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { execa } from 'execa'
import { commitFiles } from '../core/git.js'
import type { PhioClient } from '../phio/client.js'
import type { WizardAnswers } from '../wizard/answers.js'

export function isExternalFrontend(
  answers: Pick<WizardAnswers, 'framework' | 'nextMode'>,
): boolean {
  return answers.framework === 'nextjs' && answers.nextMode === 'ssr'
}

/**
 * Build → link → deploy. The build fills pb_public/, `phio link` writes
 * .phioconfig (committed — it holds only the instance name), and
 * `phio deploy` syncs pb_* to the instance over SFTP.
 *
 * Next.js SSR mode is the exception: `next build` is run as a compile sanity
 * check but produces no pb_public/, so a placeholder index.html is written —
 * the instance serves only the PocketBase backend and the real frontend
 * deploys to an external host.
 */
export async function buildApp(answers: WizardAnswers): Promise<void> {
  await execa(answers.packageManager, ['run', 'build'], {
    cwd: answers.targetDir,
    stdio: 'inherit',
  })

  if (isExternalFrontend(answers)) {
    const pbPublic = path.join(answers.targetDir, 'pb_public')
    await mkdir(pbPublic, { recursive: true })
    await writeFile(
      path.join(pbPublic, 'index.html'),
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${answers.name} backend</title>
  </head>
  <body>
    <p>
      This PocketHost instance serves only the PocketBase backend for
      ${answers.name}; the frontend is hosted externally.
    </p>
  </body>
</html>
`,
    )
  }
}

export async function linkAndDeploy(
  client: PhioClient,
  answers: WizardAnswers & { instanceName: string },
): Promise<string[]> {
  await client.link(answers.instanceName, answers.targetDir)
  // phio >=0.4 records links globally; commit .phioconfig only when a
  // project file was actually written (older phio versions).
  const warnings = existsSync(path.join(answers.targetDir, '.phioconfig'))
    ? await commitFiles(
        `chore: link pockethost instance ${answers.instanceName}`,
        ['.phioconfig'],
        { cwd: answers.targetDir },
      )
    : []
  await client.deploy(answers.targetDir)
  return warnings
}
