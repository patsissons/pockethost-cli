import { describe, expect, it } from 'vitest'
import {
  dlxRunner,
  directRunner,
  parseInstanceList,
} from '../../src/phio/client.js'

describe('parseInstanceList', () => {
  it('extracts names from a plain list', () => {
    expect(parseInstanceList('my-app\nother-instance\n')).toEqual([
      'my-app',
      'other-instance',
    ])
  })

  it('extracts names from table-ish output with headers', () => {
    const output = [
      'Instances',
      '┌──────────────┬─────────┐',
      '│ name         │ version │',
      '├──────────────┼─────────┤',
      '│ my-app       │ 0.26    │',
      '│ blog-backend │ 0.26    │',
      '└──────────────┴─────────┘',
    ].join('\n')
    expect(parseInstanceList(output)).toEqual(['blog-backend', 'my-app'])
  })

  it('ignores ANSI color codes and noise words', () => {
    const output = 'name status\n[32mmy-app[0m running\n'
    expect(parseInstanceList(output)).toEqual(['my-app'])
  })

  it('returns empty for no instances', () => {
    expect(parseInstanceList('No instances found.\n')).toEqual([])
  })
})

describe('runners', () => {
  it('direct runner calls phio from PATH', () => {
    expect(directRunner().prefix).toEqual(['phio'])
  })

  it('pnpm dlx runner brings tsx along (phio bin execs tsx)', () => {
    expect(dlxRunner('pnpm').prefix).toEqual([
      'pnpm',
      '--package=phio',
      '--package=tsx',
      'dlx',
      'phio',
    ])
  })

  it('npm and bun fall back to npx', () => {
    expect(dlxRunner('npm').prefix[0]).toBe('npx')
    expect(dlxRunner('bun').prefix[0]).toBe('npx')
  })

  it('describes commands for user-facing instructions', () => {
    expect(directRunner().describe(['deploy'])).toBe('phio deploy')
  })
})
