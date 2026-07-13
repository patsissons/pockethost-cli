import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Locates the packaged templates/ directory. It sits one level up from
 * dist/index.js in the published package and two levels up from this file
 * when running from source (src/utils/).
 */
export function templatesRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  for (const candidate of [
    path.join(here, '..', 'templates'),
    path.join(here, '..', '..', 'templates'),
  ]) {
    if (existsSync(path.join(candidate, 'base', 'layer.json')))
      return path.normalize(candidate)
  }
  throw new Error(
    'Could not locate the templates directory — broken installation?',
  )
}
