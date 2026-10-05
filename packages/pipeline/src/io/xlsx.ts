import ExcelJS from 'exceljs';
import { normalizeSpaces } from './csv.js';

export interface ReadXlsxOptions {
  readonly trim?: boolean;
  readonly normalizeNonBreakingSpaces?: boolean;
}

export type XlsxCellValue = string | number | boolean | Date | null;

export interface XlsxSheetData {
  readonly name: string;
  readonly rowCount: number;
  readonly columnCount: number;
  readonly rows: readonly (readonly XlsxCellValue[])[];
}

export interface ParsedWorkbook {
  readonly sheetNames: readonly string[];
  getSheet(nameOrIndex: string | number): XlsxSheetData | undefined;
  getSheetRows(nameOrIndex: string | number): readonly (readonly XlsxCellValue[])[];
}

/**
 * Normalises an ExcelJS cell value, resolving formulas to their cached results.
 */
export function normalizeCellValue(
  rawVal: ExcelJS.CellValue,
  options: ReadXlsxOptions = {},
): XlsxCellValue {
  const trim = options.trim ?? true;
  const normSpaces = options.normalizeNonBreakingSpaces ?? true;

  if (rawVal === null || rawVal === undefined) {
    return null;
  }

  let valueToProcess: unknown = rawVal;

  // Handle formula cell: extract cached result
  if (typeof rawVal === 'object') {
    if ('formula' in rawVal && 'result' in rawVal) {
      valueToProcess = rawVal.result;
    } else if ('richText' in rawVal && Array.isArray(rawVal.richText)) {
      valueToProcess = rawVal.richText
        .map((t) => (typeof t.text === 'string' ? t.text : ''))
        .join('');
    } else if ('text' in rawVal && 'hyperlink' in rawVal) {
      valueToProcess = rawVal.text;
    }
  }

  if (valueToProcess === null || valueToProcess === undefined) {
    return null;
  }

  if (typeof valueToProcess === 'string') {
    let s = valueToProcess;
    if (normSpaces) {
      s = normalizeSpaces(s);
    }
    if (trim) {
      s = s.trim();
    }
    return s;
  }

  if (
    typeof valueToProcess === 'number' ||
    typeof valueToProcess === 'boolean' ||
    valueToProcess instanceof Date
  ) {
    return valueToProcess;
  }

  // Fallback for other objects (e.g. error objects like { error: '#N/A' })
  if (typeof valueToProcess === 'object' && 'error' in valueToProcess) {
    return null;
  }

  return JSON.stringify(valueToProcess);
}

/**
 * Loads an XLSX workbook from a file path or in-memory buffer.
 */
export async function readXlsx(
  input: string | Buffer | Uint8Array | ArrayBuffer,
  options: ReadXlsxOptions = {},
): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  type LoadBufferParam = Parameters<typeof workbook.xlsx.load>[0];

  if (typeof input === 'string') {
    await workbook.xlsx.readFile(input);
  } else if (Buffer.isBuffer(input)) {
    await workbook.xlsx.load(input as unknown as LoadBufferParam);
  } else if (input instanceof Uint8Array) {
    await workbook.xlsx.load(Buffer.from(input) as unknown as LoadBufferParam);
  } else {
    await workbook.xlsx.load(Buffer.from(input) as unknown as LoadBufferParam);
  }

  const sheetMap = new Map<string, XlsxSheetData>();
  const sheetList: XlsxSheetData[] = [];
  const sheetNames: string[] = [];

  workbook.eachSheet((worksheet) => {
    sheetNames.push(worksheet.name);

    const rows: XlsxCellValue[][] = [];
    let maxCols = 0;

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const rowValues: XlsxCellValue[] = [];
      const cellCount = row.cellCount;
      if (cellCount > maxCols) {
        maxCols = cellCount;
      }

      for (let colNumber = 1; colNumber <= cellCount; colNumber++) {
        const cell = row.getCell(colNumber);
        rowValues.push(normalizeCellValue(cell.value, options));
      }

      // Pad sparse rows up to rowNumber
      while (rows.length < rowNumber - 1) {
        rows.push([]);
      }
      rows.push(rowValues);
    });

    const sheetData: XlsxSheetData = {
      name: worksheet.name,
      rowCount: rows.length,
      columnCount: maxCols,
      rows,
    };

    sheetMap.set(worksheet.name, sheetData);
    sheetList.push(sheetData);
  });

  return {
    sheetNames,
    getSheet(nameOrIndex: string | number): XlsxSheetData | undefined {
      if (typeof nameOrIndex === 'number') {
        return sheetList[nameOrIndex];
      }
      return sheetMap.get(nameOrIndex);
    },
    getSheetRows(nameOrIndex: string | number): readonly (readonly XlsxCellValue[])[] {
      const sheet =
        typeof nameOrIndex === 'number' ? sheetList[nameOrIndex] : sheetMap.get(nameOrIndex);
      return sheet ? sheet.rows : [];
    },
  };
}
