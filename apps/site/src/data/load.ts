import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { z } from 'zod';

/**
 * Error thrown when a data file cannot be read, parsed, or validated.
 * Always includes the offending file path for debugging and build failure reporting.
 */
export class DataLoaderError extends Error {
  constructor(
    public readonly filePath: string,
    message: string,
    public readonly issues?: readonly unknown[],
  ) {
    super(`[DataLoader] Failed to load "${filePath}": ${message}`);
    this.name = 'DataLoaderError';
  }
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

/**
 * Resolves the root directory containing data for all Publishing Nations.
 * Defaults to `<repo>/data`, or respects `process.env.KYW_DATA_DIR`.
 */
export function dataDir(): string {
  const envDir = process.env.KYW_DATA_DIR;
  if (envDir && envDir.trim().length > 0) {
    if (path.isAbsolute(envDir)) {
      return envDir;
    }
    // Resolve relative to cwd first, then workspace root
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
    return path.resolve(workspaceRoot, 'data');
  }

  // Fallback if running outside workspace
  const candidate = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return path.resolve(process.cwd(), '../../data');
}

/**
 * Reads a JSON file from disk and validates its content against an optional Zod schema.
 * Throws DataLoaderError containing the file path on I/O error, JSON syntax error, or schema validation failure.
 */
export async function readJson<T>(filePath: string, schema?: z.ZodType<T>): Promise<T> {
  let content: string;
  try {
    content = await fsp.readFile(filePath, 'utf-8');
  } catch (err) {
    throw new DataLoaderError(filePath, `Could not read file: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new DataLoaderError(filePath, `Invalid JSON syntax: ${(err as Error).message}`);
  }

  if (schema) {
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const issueDetails = result.error.issues
        .map((issue) => `[${issue.path.join('.') || 'root'}]: ${issue.message}`)
        .join('; ');
      throw new DataLoaderError(
        filePath,
        `Schema validation failed: ${issueDetails}`,
        result.error.issues,
      );
    }
    return result.data;
  }

  return parsed as T;
}
