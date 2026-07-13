import { Command } from 'commander'
import { createCommand } from './commands/create.js'
import pkg from '../package.json' with { type: 'json' }

export function buildProgram(): Command {
  const program = new Command()

  program
    .name('ph')
    .description('Scaffold deploy-ready PocketHost-backed web apps')
    .version(pkg.version)

  program.addCommand(createCommand())

  return program
}
