import { describe, expect, it } from 'vitest'
import { evaluateCondition } from '../../src/core/layers.js'

describe('evaluateCondition', () => {
  const data = {
    auth: { enabled: true, password: false, oauth: ['google'], factors: [] },
  }

  it('resolves truthy dot paths', () => {
    expect(evaluateCondition('auth.enabled', data)).toBe(true)
    expect(evaluateCondition('auth.password', data)).toBe(false)
  })

  it('treats non-empty arrays as truthy and empty arrays as falsy', () => {
    expect(evaluateCondition('auth.oauth', data)).toBe(true)
    expect(evaluateCondition('auth.factors', data)).toBe(false)
  })

  it('supports negation', () => {
    expect(evaluateCondition('!auth.password', data)).toBe(true)
  })

  it('is falsy for unknown paths', () => {
    expect(evaluateCondition('auth.missing.deep', data)).toBe(false)
  })
})
