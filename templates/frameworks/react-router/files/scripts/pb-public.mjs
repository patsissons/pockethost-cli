// Copies the SPA build output into pb_public/, the directory PocketBase
// serves. Kept as a node script so the build works on any platform.
import { cpSync, rmSync } from 'node:fs'

rmSync('pb_public', { recursive: true, force: true })
cpSync('build/client', 'pb_public', { recursive: true })
console.log('Copied build/client -> pb_public')
