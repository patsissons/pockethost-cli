import { describe, expect, it } from 'vitest'
import { formatChecks, hasFailure, type CheckResult } from '../../src/commands/doctor.js'

const checks: CheckResult[] = [
  { name: 'node', status: 'ok', detail: 'v25.0.0' },
  { name: 'git', status: 'fail', detail: 'not found' },
  { name: 'phio', status: 'warn', detail: 'not on PATH' },
]

describe('doctor', () => {
  it('formats checks with aligned names', () => {
    const output = formatChecks(checks)
    expect(output).toContain('node')
    expect(output).toContain('not found')
    expect(output.split('\n')).toHaveLength(3)
  })

  it('hasFailure is true only for fail status', () => {
    expect(hasFailure(checks)).toBe(true)
    expect(hasFailure(checks.filter((c) => c.status !== 'fail'))).toBe(false)
  })
})
