import { parse } from 'csv-parse/sync';

export interface ReadCsvOptions {
  readonly columns?: boolean | readonly string[];
  readonly encoding?: 'utf8' | 'win1252' | 'windows-1252';
  readonly trim?: boolean;
  readonly normalizeNonBreakingSpaces?: boolean;
  readonly skipEmptyLines?: boolean;
  readonly delimiter?: string;
  readonly relaxColumnCount?: boolean;
}

/**
 * Normalises non-breaking spaces (\u00A0, \u202F, \u2007) to standard ASCII spaces (\u0020).
 */
export function normalizeSpaces(text: string): string {
  return text.replace(/[\u00A0\u202F\u2007]/g, ' ');
}

/**
 * Parses CSV content or raw buffer into structured rows.
 * Supports Windows-1252 and UTF-8 encodings, space normalisation, and column headers.
 */
export function readCsv<T = Record<string, string> | string[]>(
  input: string | Buffer | Uint8Array,
  options: ReadCsvOptions = {},
): T[] {
  const encoding = options.encoding ?? 'utf8';
  let rawText: string;

  if (typeof input === 'string') {
    rawText = input;
  } else {
    const decoder =
      encoding === 'win1252' || encoding === 'windows-1252'
        ? new TextDecoder('windows-1252')
        : new TextDecoder('utf-8');
    rawText = decoder.decode(input);
  }

  if (options.normalizeNonBreakingSpaces ?? true) {
    rawText = normalizeSpaces(rawText);
  }

  const columnsOption: boolean | string[] =
    options.columns === true
      ? true
      : Array.isArray(options.columns)
        ? Array.from(options.columns)
        : false;

  const parseOptions = {
    columns: columnsOption,
    trim: options.trim ?? true,
    skip_empty_lines: options.skipEmptyLines ?? true,
    delimiter: options.delimiter ?? ',',
    relax_column_count: options.relaxColumnCount ?? false,
    bom: true,
  };

  return parse(rawText, parseOptions) as T[];
}
