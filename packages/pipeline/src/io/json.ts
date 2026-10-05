import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { z } from 'zod';
import { ValidationError } from '../errors.js';

/**
 * Recursively sorts all keys of plain objects in lexicographical order.
 * Arrays retain their original order.
 */
export function sortKeysRecursively<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    const sortedArray = value.map((item: unknown) => sortKeysRecursively(item));
    return sortedArray as unknown as T;
  }

  const entries = Object.entries(value);
  entries.sort(([keyA], [keyB]) => (keyA < keyB ? -1 : keyA > keyB ? 1 : 0));

  const sortedObj: Record<string, unknown> = {};
  for (const [key, val] of entries) {
    sortedObj[key] = sortKeysRecursively(val);
  }

  return sortedObj as T;
}

/**
 * Serialises a JavaScript value to canonical JSON:
 * - Recursively sorted object keys
 * - 2-space indentation
 * - Trailing newline
 * - Arrays preserve original element ordering
 */
export function canonicalJsonStringify(value: unknown): string {
  const sorted = sortKeysRecursively(value);
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

/**
 * Writes a value to a file formatted as canonical JSON.
 * Automatically creates parent directories if they do not exist.
 */
export async function writeCanonicalJson(filePath: string, value: unknown): Promise<void> {
  const content = canonicalJsonStringify(value);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${crypto.randomUUID()}.tmp`);
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, filePath);
}

/**
 * Reads a JSON file from disk and optionally validates it against a Zod schema.
 * Throws ValidationError if file content fails Zod schema validation.
 */
export async function readJson<T = unknown>(filePath: string, schema?: z.ZodType<T>): Promise<T> {
  const rawContent = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(rawContent) as unknown;

  if (schema) {
    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new ValidationError(
        `Failed schema validation for "${filePath}": ${result.error.message}`,
        result.error.issues,
      );
    }
    return result.data;
  }

  return parsed as T;
}
