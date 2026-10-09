import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PublishingNation } from '@kyw/model/nation';
import type { Specialty } from '@kyw/model/reference';
import { ENGLAND_SPECIALTIES } from '../reference/england/specialties.js';
import { WALES_SPECIALTIES } from '../reference/wales/specialties.js';
import { SCOTLAND_SPECIALTIES } from '../reference/scotland/specialties.js';

export type AnySpecialty = Specialty<'england'> | Specialty<'wales'> | Specialty<'scotland'>;

export interface StubGenerationOptions {
  readonly contentDir?: string;
  readonly dryRun?: boolean;
}

export interface StubGenerationNationStats {
  readonly total: number;
  readonly created: number;
  readonly existing: number;
  readonly createdSlugs: readonly string[];
}

export interface StubGenerationResult {
  readonly england: StubGenerationNationStats;
  readonly wales: StubGenerationNationStats;
  readonly scotland: StubGenerationNationStats;
  readonly totalCreated: number;
  readonly totalExisting: number;
}

function findWorkspaceRoot(startDir: string): string | undefined {
  let curr = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
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

export function resolveContentDir(customDir?: string): string {
  if (customDir && customDir.trim().length > 0) {
    return path.resolve(customDir);
  }

  const envDir = process.env.KYW_CONTENT_DIR;
  if (envDir && envDir.trim().length > 0) {
    if (path.isAbsolute(envDir)) {
      return envDir;
    }
    const cwdCandidate = path.resolve(process.cwd(), envDir);
    if (fs.existsSync(cwdCandidate)) {
      return cwdCandidate;
    }
    const root = findWorkspaceRoot(process.cwd());
    if (root) {
      const rootCandidate = path.resolve(root, envDir);
      if (fs.existsSync(rootCandidate)) {
        return rootCandidate;
      }
    }
    return cwdCandidate;
  }

  const workspaceRoot = findWorkspaceRoot(process.cwd());
  if (workspaceRoot) {
    return path.resolve(workspaceRoot, 'content');
  }

  const candidate = path.resolve(process.cwd(), 'content');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return path.resolve(process.cwd(), '../../content');
}

export function formatSpecialtyStubMarkdown(
  nation: PublishingNation,
  specialty: AnySpecialty,
): string {
  return `---
kind: specialty
nation: ${nation}
specialtyId: ${specialty.id}
summary: ''
keywords: []
status: placeholder
---
`;
}

export const SPECIALTY_REGISTRIES = {
  england: ENGLAND_SPECIALTIES,
  wales: WALES_SPECIALTIES,
  scotland: SCOTLAND_SPECIALTIES,
} as const;

/**
 * Generates placeholder specialty content stubs for any missing specialties.
 * Never overwrites existing files.
 */
export async function generateSpecialtyStubs(
  options: StubGenerationOptions = {},
): Promise<StubGenerationResult> {
  const rootContentDir = resolveContentDir(options.contentDir);
  const dryRun = options.dryRun ?? false;

  const result: Record<PublishingNation, StubGenerationNationStats> = {
    england: { total: 0, created: 0, existing: 0, createdSlugs: [] },
    wales: { total: 0, created: 0, existing: 0, createdSlugs: [] },
    scotland: { total: 0, created: 0, existing: 0, createdSlugs: [] },
  };

  const nations: readonly PublishingNation[] = ['england', 'wales', 'scotland'];

  for (const nation of nations) {
    const specialties: readonly AnySpecialty[] = SPECIALTY_REGISTRIES[nation];
    const targetDir = path.join(rootContentDir, nation, 'specialties');

    if (!dryRun) {
      await fsp.mkdir(targetDir, { recursive: true });
    }

    let createdCount = 0;
    let existingCount = 0;
    const createdSlugs: string[] = [];

    for (const specialty of specialties) {
      const targetFilePath = path.join(targetDir, `${specialty.slug}.md`);
      const fileExists = fs.existsSync(targetFilePath);

      if (fileExists) {
        existingCount++;
      } else {
        const content = formatSpecialtyStubMarkdown(nation, specialty);
        if (!dryRun) {
          await fsp.writeFile(targetFilePath, content, 'utf-8');
        }
        createdCount++;
        createdSlugs.push(specialty.slug);
      }
    }

    result[nation] = {
      total: specialties.length,
      created: createdCount,
      existing: existingCount,
      createdSlugs,
    };
  }

  return {
    england: result.england,
    wales: result.wales,
    scotland: result.scotland,
    totalCreated: result.england.created + result.wales.created + result.scotland.created,
    totalExisting: result.england.existing + result.wales.existing + result.scotland.existing,
  };
}

// CLI Execution Entrypoint
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('/stubs.ts') ||
    process.argv[1].endsWith('/stubs.js'));

if (isDirectExecution) {
  generateSpecialtyStubs()
    .then((res) => {
      process.stdout.write(`Specialty content stub generation complete:\n`);
      process.stdout.write(
        `- England:  ${String(res.england.created)} created, ${String(res.england.existing)} existing (total ${String(res.england.total)})\n`,
      );
      process.stdout.write(
        `- Wales:    ${String(res.wales.created)} created, ${String(res.wales.existing)} existing (total ${String(res.wales.total)})\n`,
      );
      process.stdout.write(
        `- Scotland: ${String(res.scotland.created)} created, ${String(res.scotland.existing)} existing (total ${String(res.scotland.total)})\n`,
      );
      process.stdout.write(
        `Total: ${String(res.totalCreated)} created, ${String(res.totalExisting)} existing.\n`,
      );
    })
    .catch((err: unknown) => {
      const errMsg = err instanceof Error ? (err.stack ?? err.message) : String(err);
      process.stderr.write(`Error generating specialty stubs: ${errMsg}\n`);
      process.exit(1);
    });
}
