/**
 * Deterministic package.json composition from layer fragments.
 *
 * - Scripts: later fragments intentionally override earlier ones (framework
 *   layers own `dev`/`build`; base owns the validate suite).
 * - Dependencies: two fragments pinning the SAME package to DIFFERENT
 *   versions is a template bug — fail loudly instead of silently picking one.
 * - Output ordering is stable so scaffolds are reproducible byte-for-byte.
 */

export interface PackageJsonFragment {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  extra?: Record<string, unknown>
}

export interface MergeInput {
  name: string
  packageManager?: string
  fragments: Array<{ layerName: string; fragment: PackageJsonFragment }>
}

const SCRIPT_ORDER = [
  'dev',
  'dev:e2e',
  'build',
  'preview',
  'start',
  'test',
  'test:watch',
  'test:e2e',
  'typegen',
  'typecheck',
  'lint',
  'format',
  'format:check',
  'validate:quick',
  'validate',
  'format-and-validate',
]

function sortScripts(scripts: Record<string, string>): Record<string, string> {
  const ordered: Record<string, string> = {}
  for (const key of SCRIPT_ORDER) {
    if (key in scripts) ordered[key] = scripts[key] as string
  }
  for (const key of Object.keys(scripts).sort()) {
    if (!(key in ordered)) ordered[key] = scripts[key] as string
  }
  return ordered
}

function sortKeys(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b)),
  )
}

function mergeDependencies(
  kind: 'dependencies' | 'devDependencies',
  fragments: MergeInput['fragments'],
): Record<string, string> {
  const merged: Record<string, string> = {}
  const owner: Record<string, string> = {}
  for (const { layerName, fragment } of fragments) {
    for (const [pkg, version] of Object.entries(fragment[kind] ?? {})) {
      const existing = merged[pkg]
      if (existing !== undefined && existing !== version) {
        throw new Error(
          `Conflicting ${kind} for "${pkg}": ${owner[pkg]} wants ${existing}, ${layerName} wants ${version}`,
        )
      }
      merged[pkg] = version
      owner[pkg] = layerName
    }
  }
  return sortKeys(merged)
}

export function mergePackageJson(input: MergeInput): Record<string, unknown> {
  const scripts: Record<string, string> = {}
  const extra: Record<string, unknown> = {}
  for (const { fragment } of input.fragments) {
    Object.assign(scripts, fragment.scripts)
    Object.assign(extra, fragment.extra)
  }

  const result: Record<string, unknown> = {
    name: input.name,
    version: '0.0.1',
    private: true,
    type: 'module',
  }
  if (input.packageManager) result.packageManager = input.packageManager
  result.scripts = sortScripts(scripts)
  result.dependencies = mergeDependencies('dependencies', input.fragments)
  result.devDependencies = mergeDependencies('devDependencies', input.fragments)
  for (const key of Object.keys(extra).sort()) result[key] = extra[key]
  return result
}
