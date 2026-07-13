import path from 'node:path'
import { Eta } from 'eta'
import prettier from 'prettier'

/**
 * npm mangles certain dotfiles inside published packages (`.gitignore`
 * becomes `.npmignore` or is stripped), so template files are stored with a
 * `_` prefix and renamed at scaffold time:
 *
 *   _gitignore      → .gitignore
 *   __literal       → _literal   (escape hatch for real underscore files)
 *
 * Files ending in `.eta` are rendered with eta and the suffix is stripped;
 * everything else is copied verbatim.
 */

const eta = new Eta({ autoEscape: false, autoTrim: false })

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.ico',
  '.jpg',
  '.jpeg',
  '.webp',
  '.woff',
  '.woff2',
])

export function isBinaryPath(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

/** Maps a stored template path to its final app-relative path. */
export function finalTargetPath(targetRel: string): {
  target: string
  isTemplate: boolean
} {
  const isTemplate = targetRel.endsWith('.eta')
  const stripped = isTemplate ? targetRel.slice(0, -'.eta'.length) : targetRel

  const dir = path.dirname(stripped)
  const base = path.basename(stripped)
  const renamed = base.startsWith('__')
    ? base.slice(1)
    : base.startsWith('_')
      ? `.${base.slice(1)}`
      : base

  return { target: path.normalize(path.join(dir, renamed)), isTemplate }
}

export function renderTemplate(content: string, data: object): string {
  return eta.renderString(content, data)
}

/**
 * Formats rendered content with the scaffolded app's own prettier config so
 * every scaffold is born `format:check`-clean. Template interpolation (app
 * names of varying length, conditional blocks) makes it impossible for the
 * stored templates to guarantee this themselves.
 */
export async function formatContent(
  target: string,
  content: string,
  prettierConfig: Record<string, unknown>,
): Promise<string> {
  const { inferredParser } = await prettier.getFileInfo(target)
  if (!inferredParser) return content
  return prettier.format(content, { ...prettierConfig, filepath: target })
}
