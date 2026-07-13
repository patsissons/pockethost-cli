import { describe, expect, it } from 'vitest'
import {
  validateAppName,
  validateCustomDomain,
} from '../../src/wizard/validate.js'

describe('validateAppName', () => {
  it.each(['my-app', 'app2', 'a1', 'todo-list-3'])('accepts %s', (name) => {
    expect(validateAppName(name)).toBeUndefined()
  })

  it.each([
    ['', 'empty'],
    ['a', 'too short'],
    ['My-App', 'uppercase'],
    ['1app', 'leading digit'],
    ['-app', 'leading hyphen'],
    ['app-', 'trailing hyphen'],
    ['my--app', 'consecutive hyphens'],
    ['my_app', 'underscore'],
    ['my.app', 'dot'],
    ['a'.repeat(41), 'too long'],
  ])('rejects %s (%s)', (name) => {
    expect(validateAppName(name)).toBeDefined()
  })
})

describe('validateCustomDomain', () => {
  it.each(['app.example.com', 'example.com', 'db.my-site.io'])(
    'accepts %s',
    (domain) => {
      expect(validateCustomDomain(domain)).toBeUndefined()
    },
  )

  it.each([
    ['', 'empty'],
    ['https://example.com', 'URL scheme'],
    ['example', 'bare label'],
    ['example.com/path', 'path'],
    ['example.com:8080', 'port'],
    ['-bad.example.com', 'leading hyphen label'],
  ])('rejects %s (%s)', (domain) => {
    expect(validateCustomDomain(domain)).toBeDefined()
  })
})

describe('answers helpers', async () => {
  const { hasAuth, mfaEligible } = await import('../../src/wizard/answers.js')

  it('hasAuth is false with no factors or providers', () => {
    expect(hasAuth({ authFactors: [], oauthProviders: [] })).toBe(false)
  })

  it('hasAuth is true with only oauth providers', () => {
    expect(hasAuth({ authFactors: [], oauthProviders: ['google'] })).toBe(true)
  })

  it('mfaEligible requires two distinct methods', () => {
    expect(mfaEligible({ authFactors: ['password'], oauthProviders: [] })).toBe(
      false,
    )
    expect(
      mfaEligible({ authFactors: ['password', 'otp'], oauthProviders: [] }),
    ).toBe(true)
    expect(
      mfaEligible({ authFactors: ['password'], oauthProviders: ['google'] }),
    ).toBe(true)
    expect(
      mfaEligible({ authFactors: [], oauthProviders: ['google', 'github'] }),
    ).toBe(false)
  })
})
