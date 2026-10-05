import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PublishingNation } from '@kyw/model/nation';
import type { ReportingPeriod } from '@kyw/model/period';

function findWorkspaceRoot(startDir: string): string | undefined {
  let curr = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(curr, 'pnpm-workspace.yaml'))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) {
      break;
    }
    curr = parent;
  }
  return undefined;
}

/**
 * Returns the root directory of the Know Your Wait repository or a provided custom root.
 */
export function repoRoot(customRoot?: string): string {
  if (customRoot) {
    return path.resolve(customRoot);
  }
  const fileDir = path.dirname(fileURLToPath(import.meta.url));
  return findWorkspaceRoot(process.cwd()) ?? findWorkspaceRoot(fileDir) ?? process.cwd();
}

/**
 * Returns the path to the root `data/` directory.
 */
export function dataDir(customRoot?: string): string {
  return path.resolve(repoRoot(customRoot), 'data');
}

/**
 * Returns the path to the data directory for a specific publishing nation (e.g. `data/england`).
 */
export function nationDir(nation: PublishingNation, customRoot?: string): string {
  return path.resolve(dataDir(customRoot), nation);
}

/**
 * Returns the path to `data/<nation>/reference.json`.
 */
export function referencePath(nation: PublishingNation, customRoot?: string): string {
  return path.resolve(nationDir(nation, customRoot), 'reference.json');
}

/**
 * Returns the path to `data/<nation>/releases/`.
 */
export function releasesDir(nation: PublishingNation, customRoot?: string): string {
  return path.resolve(nationDir(nation, customRoot), 'releases');
}

/**
 * Returns the path to `data/<nation>/releases/<reportingPeriod>.json`.
 */
export function releasePath(
  nation: PublishingNation,
  reportingPeriod: ReportingPeriod | string,
  customRoot?: string,
): string {
  const fileName = reportingPeriod.endsWith('.json') ? reportingPeriod : `${reportingPeriod}.json`;
  return path.resolve(releasesDir(nation, customRoot), fileName);
}

/**
 * Returns the path to `data/<nation>/published.json`.
 */
export function publishedPath(nation: PublishingNation, customRoot?: string): string {
  return path.resolve(nationDir(nation, customRoot), 'published.json');
}

/**
 * Returns the path to `data/<nation>/state.json`.
 */
export function statePath(nation: PublishingNation, customRoot?: string): string {
  return path.resolve(nationDir(nation, customRoot), 'state.json');
}

/**
 * Returns the path to the local raw pipeline cache directory `packages/pipeline/.cache/`.
 */
export function pipelineCacheDir(customRoot?: string): string {
  return path.resolve(repoRoot(customRoot), 'packages', 'pipeline', '.cache');
}
