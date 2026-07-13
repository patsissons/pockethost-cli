import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { collectLayerFiles, evaluateCondition, loadLayer } from './layers.js'
import { mergePackageJson, type MergeInput } from './merge.js'
import { finalTargetPath, isBinaryPath, renderTemplate } from './render.js'
import { commitFiles, initRepoWithRootCommit } from './git.js'
import {
  COMMIT_GROUPS,
  commitGroupFor,
  type CommitGroupKey,
  type ScaffoldPlan,
} from './plan.js'

export interface EngineOptions {
  /** Create the git repo and modular commits (default true). */
  git?: boolean
  /** Extra env for git subprocesses (tests pin identity/signing here). */
  gitEnv?: NodeJS.ProcessEnv
}

export interface ScaffoldedFile {
  target: string
  group: CommitGroupKey
}

export interface ScaffoldResult {
  targetDir: string
  files: ScaffoldedFile[]
  warnings: string[]
}

interface PendingFile extends ScaffoldedFile {
  content: string | Buffer
}

export async function executePlan(
  plan: ScaffoldPlan,
  options: EngineOptions = {},
): Promise<ScaffoldResult> {
  const { targetDir } = plan.answers
  const useGit = options.git ?? true
  const warnings: string[] = []

  await ensureEmptyDir(targetDir)

  if (useGit) {
    warnings.push(
      ...(await initRepoWithRootCommit({
        cwd: targetDir,
        env: options.gitEnv,
      })),
    )
  }

  const pending = new Map<string, PendingFile>()
  const ownerByTarget = new Map<string, string>()
  const fragments: MergeInput['fragments'] = []

  for (const planned of plan.layers) {
    const layer = await loadLayer(planned.dir)
    if (layer.manifest.packageJson) {
      fragments.push({
        layerName: layer.manifest.name,
        fragment: layer.manifest.packageJson,
      })
    }

    const overrides = new Set(layer.manifest.overrides ?? [])
    for (const file of await collectLayerFiles(layer)) {
      const { target, isTemplate } = finalTargetPath(file.targetRel)

      const condition = layer.manifest.conditions?.[target]
      if (condition && !evaluateCondition(condition, plan.templateData))
        continue

      const owner = ownerByTarget.get(target)
      if (owner !== undefined && !overrides.has(target)) {
        throw new Error(
          `Layer "${layer.manifest.name}" writes ${target}, already written by "${owner}". ` +
            `Add it to the later layer's "overrides" in layer.json if intentional.`,
        )
      }
      ownerByTarget.set(target, layer.manifest.name)

      let content: string | Buffer
      if (isBinaryPath(file.source)) {
        content = await readFile(file.source)
      } else {
        const raw = await readFile(file.source, 'utf8')
        content = isTemplate ? renderTemplate(raw, plan.templateData) : raw
      }

      pending.set(target, {
        target,
        group: commitGroupFor(planned.kind, target),
        content,
      })
    }
  }

  const packageJson = mergePackageJson({ name: plan.answers.name, fragments })
  pending.set('package.json', {
    target: 'package.json',
    group: 'tooling',
    content: `${JSON.stringify(packageJson, null, 2)}\n`,
  })

  for (const file of pending.values()) {
    const absolute = path.join(targetDir, file.target)
    await mkdir(path.dirname(absolute), { recursive: true })
    await writeFile(absolute, file.content)
  }

  const files = [...pending.values()]
    .map(({ target, group }) => ({ target, group }))
    .sort((a, b) => a.target.localeCompare(b.target))

  if (useGit) {
    for (const group of COMMIT_GROUPS) {
      const groupFiles = files
        .filter((f) => f.group === group.key)
        .map((f) => f.target)
      warnings.push(
        ...(await commitFiles(group.message, groupFiles, {
          cwd: targetDir,
          env: options.gitEnv,
        })),
      )
    }
  }

  return { targetDir, files, warnings }
}

async function ensureEmptyDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
  const entries = await readdir(dir)
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${dir}`)
  }
}
