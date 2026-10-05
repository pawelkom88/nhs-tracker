import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { z } from 'zod';
import { describe, expect, test } from 'vitest';
import { ValidationError } from '../../src/errors.js';
import {
  canonicalJsonStringify,
  readJson,
  sortKeysRecursively,
  writeCanonicalJson,
} from '../../src/io/json.js';

describe('canonical JSON serialization', () => {
  test('recursively sorts object keys alphabetically', () => {
    const input = {
      z: 1,
      a: {
        d: 4,
        b: 2,
        c: [
          { y: 2, x: 1 },
          { b: 2, a: 1 },
        ],
      },
      m: 'middle',
    };

    const sorted = sortKeysRecursively(input);
    const keys = Object.keys(sorted);
    expect(keys).toEqual(['a', 'm', 'z']);

    const nestedKeys = Object.keys(sorted.a);
    expect(nestedKeys).toEqual(['b', 'c', 'd']);

    // Array order preserved, but objects inside array have sorted keys
    expect(Object.keys(sorted.a.c[0] as object)).toEqual(['x', 'y']);
    expect(Object.keys(sorted.a.c[1] as object)).toEqual(['a', 'b']);
  });

  test('produces byte-identical string regardless of key insertion order', () => {
    const objA = {
      zebra: 10,
      alpha: {
        foo: 'bar',
        baz: [1, 2, 3],
        inner: { b: 2, a: 1 },
      },
      beta: true,
    };

    const objB = {
      beta: true,
      alpha: {
        inner: { a: 1, b: 2 },
        baz: [1, 2, 3],
        foo: 'bar',
      },
      zebra: 10,
    };

    const strA = canonicalJsonStringify(objA);
    const strB = canonicalJsonStringify(objB);

    expect(strA).toBe(strB);
    expect(strA.endsWith('\n')).toBe(true);

    const bufA = Buffer.from(strA, 'utf-8');
    const bufB = Buffer.from(strB, 'utf-8');
    expect(bufA.equals(bufB)).toBe(true);
  });

  test('writeCanonicalJson and readJson roundtrip', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-json-test-'));
    const filePath = path.join(tmpDir, 'nested', 'test.json');

    const payload = {
      nation: 'england',
      count: 42,
      tags: ['a', 'b'],
    };

    await writeCanonicalJson(filePath, payload);

    // Verify file content is formatted with 2 spaces and ends with \n
    const rawContent = await fs.readFile(filePath, 'utf-8');
    expect(rawContent).toBe(
      '{\n  "count": 42,\n  "nation": "england",\n  "tags": [\n    "a",\n    "b"\n  ]\n}\n',
    );

    // Read without schema
    const loaded = await readJson<typeof payload>(filePath);
    expect(loaded).toEqual(payload);

    // Read with valid schema
    const testSchema = z.strictObject({
      nation: z.literal('england'),
      count: z.number(),
      tags: z.array(z.string()),
    });
    const validated = await readJson(filePath, testSchema);
    expect(validated).toEqual(payload);

    // Read with failing schema
    const invalidSchema = z.strictObject({
      nation: z.literal('wales'),
    });
    await expect(readJson(filePath, invalidSchema)).rejects.toThrow(ValidationError);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
