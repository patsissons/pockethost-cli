import * as clack from '@clack/prompts'
import { execa } from 'execa'
import type { PhioClient } from './client.js'

export const CREATE_INSTANCE_URL = 'https://pockethost.io/instances/new'

export async function openInBrowser(url: string): Promise<boolean> {
  const command =
    process.platform === 'darwin'
      ? ['open', url]
      : process.platform === 'win32'
        ? ['cmd', '/c', 'start', '', url]
        : ['xdg-open', url]
  try {
    await execa(command[0]!, command.slice(1))
    return true
  } catch {
    return false
  }
}

function bail(): never {
  clack.cancel('Cancelled.')
  process.exit(1)
}

function accept<T>(value: T | symbol): T {
  if (clack.isCancel(value)) bail()
  return value as T
}

/**
 * Instance creation has no API — PocketHost instances are created in the web
 * dashboard. The guided flow opens the browser, waits for the user, then
 * re-lists instances and picks up whatever appeared.
 */
export async function selectInstance(
  client: PhioClient,
  suggestedName: string,
  options: { interactive: boolean; requestedInstance?: string },
): Promise<string | undefined> {
  const existing = await client.list()

  if (options.requestedInstance) {
    if (existing.includes(options.requestedInstance))
      return options.requestedInstance
    throw new Error(
      `Instance "${options.requestedInstance}" not found on your account. ` +
        (existing.length > 0
          ? `Available: ${existing.join(', ')}`
          : 'No instances exist yet.'),
    )
  }

  if (!options.interactive) return undefined

  const choice = accept(
    await clack.select<string>({
      message: 'PocketHost instance to deploy to',
      options: [
        {
          value: '::create::',
          label: 'Create a new instance (opens the PocketHost dashboard)',
          hint: 'paid: ~$9.99/mo per instance, 7-day trial available',
        },
        ...existing.map((name) => ({ value: name, label: name })),
        { value: '::skip::', label: 'Skip — link and deploy later with phio' },
      ],
    }),
  )

  if (choice === '::skip::') return undefined
  if (choice !== '::create::') return choice

  clack.note(
    [
      `1. Your browser will open ${CREATE_INSTANCE_URL}`,
      `2. Create an instance — suggested name: ${suggestedName}`,
      '3. Come back here and continue',
    ].join('\n'),
    'Create your instance',
  )
  const opened = await openInBrowser(CREATE_INSTANCE_URL)
  if (!opened)
    clack.log.warn(
      `Could not open a browser — visit ${CREATE_INSTANCE_URL} yourself.`,
    )

  const before = new Set(existing)
  for (;;) {
    const ready = accept(
      await clack.confirm({
        message: 'Instance created — continue?',
        initialValue: true,
      }),
    )
    if (!ready) bail()

    const spinner = clack.spinner()
    spinner.start('Looking for your new instance…')
    const now = await client.list()
    const fresh = now.filter((name) => !before.has(name))
    spinner.stop(
      fresh.length > 0
        ? `Found: ${fresh.join(', ')}`
        : 'No new instance found yet.',
    )

    if (fresh.length === 1) return fresh[0]
    if (fresh.length > 1) {
      return accept(
        await clack.select({
          message: 'Multiple new instances found — which one?',
          options: fresh.map((name) => ({ value: name, label: name })),
        }),
      )
    }

    if (now.length > 0) {
      const fallback = accept(
        await clack.select<string>({
          message: 'Pick an instance (or retry after creating one)',
          options: [
            { value: '::retry::', label: 'Retry — I just created it' },
            ...now.map((name) => ({ value: name, label: name })),
            { value: '::skip::', label: 'Skip — link and deploy later' },
          ],
        }),
      )
      if (fallback === '::skip::') return undefined
      if (fallback !== '::retry::') return fallback
    }
  }
}
