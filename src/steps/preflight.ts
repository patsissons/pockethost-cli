import * as clack from '@clack/prompts'
import semver from 'semver'
import {
  createPhioClient,
  resolveRunner,
  type PhioClient,
} from '../phio/client.js'
import type { PackageManager } from '../wizard/answers.js'

export interface PreflightResult {
  client?: PhioClient
  /** True when linking/deploying is possible this run. */
  phioReady: boolean
  warnings: string[]
}

const PHIO_NODE_RANGE = '>=24'

/**
 * Verifies phio is usable: Node version, binary resolution, and login state.
 * Degrades to scaffold-only (phioReady: false) rather than aborting — the
 * scaffold itself never requires phio.
 */
export async function preflight(options: {
  packageManager: PackageManager
  interactive: boolean
  skipPhio: boolean
}): Promise<PreflightResult> {
  const warnings: string[] = []

  if (options.skipPhio) return { phioReady: false, warnings }

  if (!semver.satisfies(process.version, PHIO_NODE_RANGE)) {
    warnings.push(
      `phio requires Node ${PHIO_NODE_RANGE} (you are on ${process.version}) — skipping deploy. ` +
        'Upgrade Node and run phio manually afterwards.',
    )
    return { phioReady: false, warnings }
  }

  const runner = await resolveRunner(options.packageManager)
  const client = createPhioClient(runner)

  const spinner = clack.spinner()
  spinner.start('Checking PocketHost login (phio whoami)…')
  let { loggedIn } = await client.whoami()
  spinner.stop(
    loggedIn ? 'Logged in to PocketHost.' : 'Not logged in to PocketHost.',
  )

  if (!loggedIn) {
    const ciAuth = Boolean(
      process.env.PHIO_USERNAME && process.env.PHIO_PASSWORD,
    )
    if (ciAuth) return { client, phioReady: true, warnings }

    if (!options.interactive) {
      warnings.push(
        'Not logged in to PocketHost and running non-interactively — skipping deploy. ' +
          'Set PHIO_USERNAME/PHIO_PASSWORD or run `phio login`, or pass --skip-phio to silence this.',
      )
      return { client, phioReady: false, warnings }
    }

    const wantsLogin = await clack.confirm({
      message: 'Log in to PocketHost now (runs `phio login`)?',
      initialValue: true,
    })
    if (clack.isCancel(wantsLogin) || !wantsLogin) {
      warnings.push(
        'Skipped PocketHost login — scaffold only; deploy later with phio.',
      )
      return { client, phioReady: false, warnings }
    }

    loggedIn = await client.login()
    if (!loggedIn) {
      warnings.push('PocketHost login failed — scaffolding without deploy.')
      return { client, phioReady: false, warnings }
    }
  }

  return { client, phioReady: true, warnings }
}
