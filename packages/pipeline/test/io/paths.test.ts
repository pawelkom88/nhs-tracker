import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  dataDir,
  nationDir,
  pipelineCacheDir,
  publishedPath,
  referencePath,
  releasesDir,
  releasePath,
  repoRoot,
  statePath,
} from '../../src/io/paths.js';

describe('pipeline paths helper', () => {
  const customRoot = '/test/workspace';

  test('resolves repoRoot and dataDir', () => {
    expect(repoRoot(customRoot)).toBe('/test/workspace');
    expect(dataDir(customRoot)).toBe(path.join('/test/workspace', 'data'));
  });

  test('resolves nation-specific directories and files', () => {
    expect(nationDir('england', customRoot)).toBe(path.join('/test/workspace', 'data', 'england'));
    expect(referencePath('england', customRoot)).toBe(
      path.join('/test/workspace', 'data', 'england', 'reference.json'),
    );
    expect(releasesDir('wales', customRoot)).toBe(
      path.join('/test/workspace', 'data', 'wales', 'releases'),
    );
    expect(releasePath('scotland', '2026-07-31', customRoot)).toBe(
      path.join('/test/workspace', 'data', 'scotland', 'releases', '2026-07-31.json'),
    );
    expect(releasePath('england', '2026-07-31.json', customRoot)).toBe(
      path.join('/test/workspace', 'data', 'england', 'releases', '2026-07-31.json'),
    );
    expect(publishedPath('wales', customRoot)).toBe(
      path.join('/test/workspace', 'data', 'wales', 'published.json'),
    );
    expect(statePath('scotland', customRoot)).toBe(
      path.join('/test/workspace', 'data', 'scotland', 'state.json'),
    );
  });

  test('resolves pipelineCacheDir', () => {
    expect(pipelineCacheDir(customRoot)).toBe(
      path.join('/test/workspace', 'packages', 'pipeline', '.cache'),
    );
  });

  test('resolves repoRoot automatically to workspace root when no customRoot is passed', async () => {
    const root = repoRoot();
    expect(root).toBeDefined();
    const fs = await import('node:fs');
    expect(fs.existsSync(path.join(root, 'pnpm-workspace.yaml'))).toBe(true);
  });
});
