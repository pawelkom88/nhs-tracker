import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SourceUnavailableError } from '../errors.js';
import { pipelineCacheDir } from '../io/paths.js';

export const DEFAULT_USER_AGENT =
  'KnowYourWait-pipeline (+https://github.com/know-your-wait/know-your-wait)';
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_BASE_DELAY_MS = 500;

export interface FetchToCacheOptions {
  readonly cacheDir?: string;
  readonly fetchImpl?: typeof fetch;
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly timeoutMs?: number;
  readonly userAgent?: string;
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: RequestInit['body'];
}

export interface CachedFetchResult {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly fetchedAt: string;
  readonly finalUrl: string;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fetches a remote URL and returns its text content.
 */
export async function fetchText(
  url: string,
  options: { readonly userAgent?: string; readonly fetchImpl?: typeof fetch } = {},
): Promise<string> {
  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const res = await fetchFn(url, {
    headers: {
      'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new SourceUnavailableError(`HTTP ${String(res.status)} from "${url}"`, {
      statusCode: res.status,
      url,
    });
  }

  return await res.text();
}

/**
 * Fetches a remote URL with retries and backoff, verifies integrity, and saves the payload to disk cache.
 */
export async function fetchToCache(
  url: string,
  options: FetchToCacheOptions = {},
): Promise<CachedFetchResult> {
  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const targetCacheDir = options.cacheDir ?? pipelineCacheDir();

  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    ...options.headers,
  };

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= maxRetries) {
    attempt += 1;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      let response: Response;
      const requestInit: RequestInit = {
        method: options.method ?? 'GET',
        headers,
        signal: controller.signal,
      };
      if (options.body !== undefined) {
        requestInit.body = options.body;
      }

      try {
        response = await fetchFn(url, requestInit);
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const status = response.status;
        if (isRetryableStatus(status)) {
          if (attempt <= maxRetries) {
            const backoff = baseDelayMs * Math.pow(2, attempt - 1);
            await delay(backoff);
            continue;
          }
          throw new SourceUnavailableError(
            `HTTP ${String(status)} from "${url}" after ${String(attempt)} attempts`,
            { statusCode: status, url },
          );
        }

        // Non-retryable error (e.g. 404, 403, 400)
        throw new SourceUnavailableError(`HTTP ${String(status)} from "${url}"`, {
          statusCode: status,
          url,
        });
      }

      // Successful response: extract buffer, compute sha256, and write to cache
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const fetchedAt = new Date().toISOString();
      const finalUrl = response.url || url;

      await fs.mkdir(targetCacheDir, { recursive: true });
      const cacheFilePath = path.join(targetCacheDir, `${sha256}.bin`);
      await fs.writeFile(cacheFilePath, buffer);

      return {
        path: cacheFilePath,
        sha256,
        bytes: buffer.length,
        fetchedAt,
        finalUrl,
      };
    } catch (err) {
      lastError = err;
      if (
        err instanceof SourceUnavailableError &&
        err.statusCode !== undefined &&
        !isRetryableStatus(err.statusCode)
      ) {
        throw err;
      }

      if (attempt <= maxRetries) {
        const backoff = baseDelayMs * Math.pow(2, attempt - 1);
        await delay(backoff);
        continue;
      }
      break;
    }
  }

  if (lastError instanceof SourceUnavailableError) {
    throw lastError;
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new SourceUnavailableError(
    `Failed to fetch "${url}" after ${String(maxRetries + 1)} attempts: ${message}`,
    { url },
  );
}
