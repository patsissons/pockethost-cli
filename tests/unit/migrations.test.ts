import { describe, expect, it } from 'vitest'
import {
  generateAuthMigration,
  generateOAuthHook,
} from '../../src/auth/migrations.js'

describe('generateAuthMigration', () => {
  it('enables the selected factors', () => {
    const source = generateAuthMigration({
      enabled: true,
      password: true,
      otp: true,
      mfa: true,
      oauth: [],
    })
    expect(source).toContain('users.passwordAuth.enabled = true')
    expect(source).toContain('users.otp.enabled = true')
    expect(source).toContain('users.mfa.enabled = true')
    expect(source).toMatchSnapshot()
  })

  it('disables password auth for otp-only', () => {
    const source = generateAuthMigration({
      enabled: true,
      password: false,
      otp: true,
      mfa: false,
      oauth: [],
    })
    expect(source).toContain('users.passwordAuth.enabled = false')
  })
})

describe('generateOAuthHook', () => {
  it('wires env-guarded providers', () => {
    const source = generateOAuthHook(['google', 'github'])
    expect(source).toContain("name: 'google'")
    expect(source).toContain("idVar: 'GOOGLE_CLIENT_ID'")
    expect(source).toContain("secretVar: 'GITHUB_CLIENT_SECRET'")
    expect(source).toContain('onBootstrap')
    expect(source).toMatchSnapshot()
  })
})
