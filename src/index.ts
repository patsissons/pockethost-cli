#!/usr/bin/env node
import pc from 'picocolors'
import { buildProgram } from './program.js'

try {
  await buildProgram().parseAsync()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\n${pc.red('✗')} ${message}`)
  process.exit(1)
}
