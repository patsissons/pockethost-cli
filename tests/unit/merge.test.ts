import { describe, expect, it } from 'vitest'
import { mergePackageJson } from '../../src/core/merge.js'

describe('mergePackageJson', () => {
  it('composes fragments with stable ordering', () => {
    const result = mergePackageJson({
      name: 'demo',
      fragments: [
        {
          layerName: 'base',
          fragment: {
            scripts: { 'validate:quick': 'a', test: 'vitest run' },
            devDependencies: { vitest: '^4.0.0', prettier: '^3.0.0' },
          },
        },
        {
          layerName: 'vite-react',
          fragment: {
            scripts: { dev: 'vite', build: 'vite build' },
            dependencies: { react: '^19.0.0' },
          },
        },
      ],
    })

    expect(result.name).toBe('demo')
    expect(result.private).toBe(true)
    expect(Object.keys(result.scripts as object)).toEqual([
      'dev',
      'build',
      'test',
      'validate:quick',
    ])
    expect(Object.keys(result.devDependencies as object)).toEqual([
      'prettier',
      'vitest',
    ])
  })

  it('lets later fragments override scripts', () => {
    const result = mergePackageJson({
      name: 'demo',
      fragments: [
        { layerName: 'base', fragment: { scripts: { dev: 'echo base' } } },
        { layerName: 'framework', fragment: { scripts: { dev: 'vite' } } },
      ],
    })
    expect((result.scripts as Record<string, string>).dev).toBe('vite')
  })

  it('throws on conflicting dependency versions', () => {
    expect(() =>
      mergePackageJson({
        name: 'demo',
        fragments: [
          { layerName: 'a', fragment: { dependencies: { react: '^18.0.0' } } },
          { layerName: 'b', fragment: { dependencies: { react: '^19.0.0' } } },
        ],
      }),
    ).toThrow(/Conflicting dependencies for "react"/)
  })

  it('allows identical dependency versions from multiple layers', () => {
    const result = mergePackageJson({
      name: 'demo',
      fragments: [
        {
          layerName: 'a',
          fragment: { dependencies: { pocketbase: '^0.26.0' } },
        },
        {
          layerName: 'b',
          fragment: { dependencies: { pocketbase: '^0.26.0' } },
        },
      ],
    })
    expect((result.dependencies as Record<string, string>).pocketbase).toBe(
      '^0.26.0',
    )
  })

  it('merges extra top-level fields', () => {
    const result = mergePackageJson({
      name: 'demo',
      fragments: [
        { layerName: 'a', fragment: { extra: { engines: { node: '>=20' } } } },
      ],
    })
    expect(result.engines).toEqual({ node: '>=20' })
  })
})
