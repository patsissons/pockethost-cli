import { describe, expect, it } from 'vitest'
import { finalTargetPath, renderTemplate } from '../../src/core/render.js'

describe('finalTargetPath', () => {
  it('strips .eta and marks templates', () => {
    expect(finalTargetPath('README.md.eta')).toEqual({
      target: 'README.md',
      isTemplate: true,
    })
  })

  it('renames _ prefixed files to dotfiles', () => {
    expect(finalTargetPath('_gitignore')).toEqual({
      target: '.gitignore',
      isTemplate: false,
    })
    expect(finalTargetPath('_env.example.eta')).toEqual({
      target: '.env.example',
      isTemplate: true,
    })
  })

  it('unescapes double underscore to a literal underscore', () => {
    expect(finalTargetPath('__internal.ts')).toEqual({
      target: '_internal.ts',
      isTemplate: false,
    })
  })

  it('only renames the basename, not directories', () => {
    expect(finalTargetPath('src/_lib/_gitignore').target).toBe(
      'src/_lib/.gitignore',
    )
  })
})

describe('renderTemplate', () => {
  it('interpolates template data', () => {
    expect(renderTemplate('hello <%= it.appName %>', { appName: 'demo' })).toBe(
      'hello demo',
    )
  })

  it('supports conditionals', () => {
    const template = '<% if (it.auth.enabled) { %>auth<% } else { %>none<% } %>'
    expect(renderTemplate(template, { auth: { enabled: true } })).toBe('auth')
    expect(renderTemplate(template, { auth: { enabled: false } })).toBe('none')
  })

  it('does not HTML-escape values', () => {
    expect(
      renderTemplate('<%= it.cmd %>', { cmd: 'pnpm dlx shadcn@latest add' }),
    ).toBe('pnpm dlx shadcn@latest add')
  })
})
