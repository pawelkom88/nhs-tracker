import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { SourceUnavailableError } from '../../src/errors.js';
import { DEFAULT_USER_AGENT, fetchToCache } from '../../src/http/fetch.js';

describe('HTTP fetchToCache client', () => {
  test('retries on 5xx/network errors with backoff and succeeds on 3rd attempt', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-fetch-test-'));
    let calls = 0;
    const recordedHeaders: unknown[] = [];

    const mockBody = 'id,name\n1,Test Trust';
    const mockSha256 = crypto
      .createHash('sha256')
      .update(Buffer.from(mockBody, 'utf-8'))
      .digest('hex');

    const fakeFetch: typeof fetch = (_input, init) => {
      calls += 1;
      if (init?.headers) {
        recordedHeaders.push(init.headers);
      }

      if (calls === 1) {
        return Promise.resolve(
          new Response('503 Service Unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
          }),
        );
      }
      if (calls === 2) {
        return Promise.resolve(
          new Response('500 Internal Server Error', {
            status: 500,
            statusText: 'Internal Server Error',
          }),
        );
      }

      return Promise.resolve(
        new Response(mockBody, {
          status: 200,
          headers: { 'Content-Type': 'text/csv' },
        }),
      );
    };

    const result = await fetchToCache('https://example.com/data.csv', {
      fetchImpl: fakeFetch,
      cacheDir: tmpDir,
      baseDelayMs: 5,
      maxRetries: 3,
    });

    expect(calls).toBe(3);
    expect(result.sha256).toBe(mockSha256);
    expect(result.bytes).toBe(Buffer.byteLength(mockBody, 'utf-8'));
    expect(result.finalUrl).toBe('https://example.com/data.csv');
    expect(result.path).toBe(path.join(tmpDir, `${mockSha256}.bin`));

    // Verify cache file written to disk
    const cachedBytes = await fs.readFile(result.path, 'utf-8');
    expect(cachedBytes).toBe(mockBody);

    // Verify User-Agent header
    expect(recordedHeaders[0]).toMatchObject({
      'User-Agent': DEFAULT_USER_AGENT,
    });

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('retries on 429 Too Many Requests', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-fetch-test-'));
    let calls = 0;

    const fakeFetch: typeof fetch = () => {
      calls += 1;
      if (calls === 1) {
        return Promise.resolve(new Response('Too Many Requests', { status: 429 }));
      }
      return Promise.resolve(new Response('OK', { status: 200 }));
    };

    const result = await fetchToCache('https://example.com/rate-limited', {
      fetchImpl: fakeFetch,
      cacheDir: tmpDir,
      baseDelayMs: 5,
    });

    expect(calls).toBe(2);
    expect(result.bytes).toBe(2);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('throws SourceUnavailableError immediately on 404 without retries', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-fetch-test-'));
    let calls = 0;

    const fakeFetch: typeof fetch = () => {
      calls += 1;
      return Promise.resolve(new Response('Not Found', { status: 404 }));
    };

    await expect(
      fetchToCache('https://example.com/missing.csv', {
        fetchImpl: fakeFetch,
        cacheDir: tmpDir,
        baseDelayMs: 5,
      }),
    ).rejects.toThrow(SourceUnavailableError);

    expect(calls).toBe(1);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
