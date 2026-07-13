import { Command } from 'commander'

export function createCommand(): Command {
  return new Command('create')
    .description('Scaffold a new PocketHost-backed web app')
    .argument('[dir]', 'target directory for the new app')
    .action(async (dir?: string) => {
      console.log(
        `ph create is under construction (target: ${dir ?? process.cwd()})`,
      )
      process.exitCode = 1
    })
}
