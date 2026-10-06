import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IntlMessageFormat } from 'intl-messageformat';
import type CommonMessages from '../../messages/en/common.json';

export type Messages = typeof CommonMessages;

export interface MessageNamespaces {
  common: Messages;
}

export type KnownNamespace = keyof MessageNamespaces;

export type MessageKey<N extends string> = N extends KnownNamespace
  ? keyof MessageNamespaces[N] & string
  : string;

const catalogCache = new Map<string, Record<string, unknown>>();
const formatterCache = new Map<string, IntlMessageFormat>();

function resolveMessagesDir(): string {
  const envDir = process.env.KYW_MESSAGES_DIR;
  if (envDir && envDir.trim().length > 0) {
    return path.isAbsolute(envDir) ? envDir : path.resolve(process.cwd(), envDir);
  }

  try {
    const currDir = path.dirname(fileURLToPath(import.meta.url));
    const candidate = path.resolve(currDir, '../../messages');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  } catch {
    // In environments where fileURLToPath is unavailable or mocked
  }

  const cwdCandidate = path.resolve(process.cwd(), 'messages');
  if (fs.existsSync(cwdCandidate)) {
    return cwdCandidate;
  }

  return path.resolve(process.cwd(), 'apps/site/messages');
}

function loadCatalog(locale: string, namespace: string): Record<string, unknown> {
  const cacheKey = `${locale}:${namespace}`;
  const cached = catalogCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const baseDir = resolveMessagesDir();
  const filePath = path.join(baseDir, locale, `${namespace}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[i18n] Message file not found for locale "${locale}" and namespace "${namespace}" at: ${filePath}`,
    );
  }

  let parsed: unknown;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`[i18n] Failed to parse JSON in "${filePath}": ${(err as Error).message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`[i18n] Message file "${filePath}" must export a JSON object`);
  }

  const catalog = parsed as Record<string, unknown>;
  catalogCache.set(cacheKey, catalog);
  return catalog;
}

function resolvePattern(catalog: Record<string, unknown>, key: string): string | undefined {
  if (key in catalog && typeof catalog[key] === 'string') {
    return catalog[key];
  }
  if (key.includes('.')) {
    const parts = key.split('.');
    let curr: unknown = catalog;
    for (const part of parts) {
      if (typeof curr === 'object' && curr !== null && part in curr) {
        curr = (curr as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    if (typeof curr === 'string') {
      return curr;
    }
  }
  return undefined;
}

/**
 * Server-side translation function using intl-messageformat.
 * Missing keys or missing message files throw an Error at build time.
 */
export function t<N extends string>(
  namespace: N,
  key: MessageKey<N>,
  values?: Record<string, unknown>,
  locale = 'en',
): string {
  const catalog = loadCatalog(locale, namespace);
  const pattern = resolvePattern(catalog, key);

  if (!pattern) {
    throw new Error(
      `[i18n] Missing message key "${key}" in namespace "${namespace}" for locale "${locale}"`,
    );
  }

  const cacheKey = `${locale}:${namespace}:${key}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new IntlMessageFormat(pattern, 'en-GB');
    formatterCache.set(cacheKey, formatter);
  }

  const result = formatter.format(values);
  return Array.isArray(result) ? result.join('') : String(result);
}

/**
 * Clears cached catalogs and compiled formatters.
 */
export function clearMessageCache(): void {
  catalogCache.clear();
  formatterCache.clear();
}
