import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { PackageJsonFragment } from './merge.js'

/**
 * A template layer is a directory containing a `layer.json` manifest and a
 * `files/` tree (or custom mounts) that gets copied/rendered into the app.
 * Layers compose in plan order: base → framework → design → features.
 */
export interface LayerManifest {
  name: string
  /** Merged into the scaffolded app's package.json. */
  packageJson?: PackageJsonFragment
  /**
   * Layer-relative source dir → app-relative target dir.
   * Defaults to { "files": "." }.
   */
  mounts?: Record<string, string>
  /** App-relative target paths this layer is allowed to overwrite. */
  overrides?: string[]
}

export interface Layer {
  dir: string
  manifest: LayerManifest
}

export interface LayerFile {
  /** Absolute path of the source file inside the layer. */
  source: string
  /** App-relative path before render-time renaming (.eta strip, _ → .). */
  targetRel: string
}

export async function loadLayer(dir: string): Promise<Layer> {
  const manifestPath = path.join(dir, 'layer.json')
  let raw: string
  try {
    raw = await readFile(manifestPath, 'utf8')
  } catch {
    throw new Error(`Template layer is missing layer.json: ${dir}`)
  }
  const manifest = JSON.parse(raw) as LayerManifest
  if (!manifest.name)
    throw new Error(`layer.json must declare a name: ${manifestPath}`)
  return { dir, manifest }
}

export async function collectLayerFiles(layer: Layer): Promise<LayerFile[]> {
  const mounts = layer.manifest.mounts ?? { files: '.' }
  const collected: LayerFile[] = []

  for (const [sourceRel, targetBase] of Object.entries(mounts)) {
    const sourceRoot = path.join(layer.dir, sourceRel)
    const entries = await readdir(sourceRoot, {
      recursive: true,
      withFileTypes: true,
    })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const absolute = path.join(entry.parentPath, entry.name)
      const relToMount = path.relative(sourceRoot, absolute)
      collected.push({
        source: absolute,
        targetRel: path.normalize(path.join(targetBase, relToMount)),
      })
    }
  }

  return collected.sort((a, b) => a.targetRel.localeCompare(b.targetRel))
}
