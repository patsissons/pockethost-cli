import { describe, expect, it } from 'vitest'
import { buildProgram } from '../../src/program.js'
import pkg from '../../package.json' with { type: 'json' }

describe('buildProgram', () => {
  it('names the binary ph', () => {
    expect(buildProgram().name()).toBe('ph')
  })

  it('reports the package version', () => {
    expect(buildProgram().version()).toBe(pkg.version)
  })

  it('registers the create command', () => {
    const names = buildProgram().commands.map((c) => c.name())
    expect(names).toContain('create')
  })
})
