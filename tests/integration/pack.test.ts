import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

interface PackFile {
  path: string
}

/**
 * npm mangles/strips certain files when packing (most famously .gitignore).
 * This guards the published artifact: templates must ship completely, with
 * dotfile templates stored under their `_` names.
 */
describe('npm pack', () => {
  it('includes dist, templates, and underscore-escaped dotfiles', async () => {
    await execa('pnpm', ['build'], { cwd: repoRoot })
    const { stdout } = await execa('npm', ['pack', '--dry-run', '--json'], {
      cwd: repoRoot,
    })
    const [info] = JSON.parse(stdout) as Array<{ files: PackFile[] }>
    const files = info!.files.map((f) => f.path)

    expect(files).toContain('dist/index.js')
    expect(files).toContain('templates/base/layer.json')
    expect(files).toContain('templates/base/files/_gitignore')
    expect(files).toContain('templates/base/github/workflows/ci.yml.eta')
    expect(
      files.some((f) => f.startsWith('templates/frameworks/sveltekit/')),
    ).toBe(true)
    expect(files.some((f) => f.startsWith('templates/design/daisyui/'))).toBe(
      true,
    )
    expect(
      files.some((f) => f.startsWith('templates/features/auth/nextjs/')),
    ).toBe(true)

    // nothing named .gitignore may exist inside templates/ — npm would strip it
    expect(
      files.some(
        (f) => f.startsWith('templates/') && f.endsWith('/.gitignore'),
      ),
    ).toBe(false)
  }, 60000)
})
