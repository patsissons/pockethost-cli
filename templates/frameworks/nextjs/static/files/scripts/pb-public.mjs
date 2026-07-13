// Copies the static export into pb_public/, the directory PocketBase
// serves. Kept as a node script so the build works on any platform.
import { cpSync, rmSync } from 'node:fs'

rmSync('pb_public', { recursive: true, force: true })
cpSync('out', 'pb_public', { recursive: true })
console.log('Copied out -> pb_public')
