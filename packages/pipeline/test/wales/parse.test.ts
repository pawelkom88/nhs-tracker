import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { SchemaChangeError } from '../../src/errors.js';
import {
  parseWalesKeyMeasuresCsv,
  parseWalesThresholdCountsCsv,
  parseWalesCodedCsv,
} from '../../src/wales/parse.js';
import { KEY_MEASURES_DATASET_ID, THRESHOLD_COUNTS_DATASET_ID } from '../../src/wales/api.js';

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/wales');

describe('Wales CSV parser', () => {
  describe('Key Measures dataset (acd9529c)', () => {
    it('parses real committed fixture correctly', async () => {
      const csv = await fs.readFile(path.join(FIXTURES_DIR, 'acd9529c-data.csv'), 'utf-8');

      const rows = parseWalesKeyMeasuresCsv(csv);
      expect(rows.length).toBe(393);

      // Verify Cardiff and Vale (W11000029) Trauma & Orthopaedic (110) July 2026 (202607)
      const cav110July26 = rows.filter(
        (r) =>
          r.boardOnsCode === 'W11000029' && r.specialtyCode === '110' && r.dateCode === '202607',
      );

      expect(cav110July26).toEqual(
        expect.arrayContaining([
          {
            dataset: 'key_measures',
            dateCode: '202607',
            boardOnsCode: 'W11000029',
            specialtyCode: '110',
            measureCode: '1',
            value: 14090,
          },
          {
            dataset: 'key_measures',
            dateCode: '202607',
            boardOnsCode: 'W11000029',
            specialtyCode: '110',
            measureCode: '2',
            value: 45.9,
          },
          {
            dataset: 'key_measures',
            dateCode: '202607',
            boardOnsCode: 'W11000029',
            specialtyCode: '110',
            measureCode: '4',
            value: 29.5,
          },
        ]),
      );

      // Verify Powys (W11000024) Cardiology (320) has total and % < 26w but median is absent (suppressed)
      const powys320July26 = rows.filter(
        (r) =>
          r.boardOnsCode === 'W11000024' && r.specialtyCode === '320' && r.dateCode === '202607',
      );

      const totalMeasure = powys320July26.find((r) => r.measureCode === '1');
      const medianMeasure = powys320July26.find((r) => r.measureCode === '4');

      expect(totalMeasure?.value).toBe(161);
      expect(medianMeasure).toBeUndefined();
    });

    it('works with parseWalesCodedCsv and dataset UUID or kind', async () => {
      const csv = await fs.readFile(path.join(FIXTURES_DIR, 'acd9529c-data.csv'), 'utf-8');

      const rowsByUuid = parseWalesCodedCsv(KEY_MEASURES_DATASET_ID, csv);
      const rowsByKind = parseWalesCodedCsv('key_measures', csv);

      expect(rowsByUuid.length).toBe(393);
      expect(rowsByKind.length).toBe(393);
    });

    it('uses _reference columns and ignores label columns', () => {
      const validRow = [
        '"100"',
        '"100"',
        '"IGNORED LABEL"',
        '"1"',
        '"1"',
        '""',
        '"IGNORED DATE LABEL"',
        '"202607"',
        '"12345"',
        '""',
        '"IGNORED BOARD LABEL"',
        '"W11000029"',
        '"1"',
        '""',
        '"IGNORED SPECIALTY LABEL"',
        '"110"',
        '"1"',
        '""',
        '""',
      ].join(',');

      const header = [
        '"Data values"',
        '"Data values_sort"',
        '"Data description"',
        '"Data description_reference"',
        '"Data description_sort"',
        '"Data description_hierarchy"',
        '"Date"',
        '"Date_reference"',
        '"Date_sort"',
        '"Date_hierarchy"',
        '"Local health board provider"',
        '"Local health board provider_reference"',
        '"Local health board provider_sort"',
        '"Local health board provider_hierarchy"',
        '"Specialty"',
        '"Specialty_reference"',
        '"Specialty_sort"',
        '"Specialty_hierarchy"',
        '"Notes"',
      ].join(',');

      const csv = `${header}\n${validRow}`;
      const result = parseWalesKeyMeasuresCsv(csv);

      expect(result).toEqual([
        {
          dataset: 'key_measures',
          dateCode: '202607',
          boardOnsCode: 'W11000029',
          specialtyCode: '110',
          measureCode: '1',
          value: 100,
        },
      ]);
    });

    it('throws SchemaChangeError when header is missing a column', () => {
      const shortHeader =
        '"Data values","Data values_sort","Data description","Data description_reference"';
      expect(() => parseWalesKeyMeasuresCsv(`${shortHeader}\n1,1,Total,1`)).toThrow(
        SchemaChangeError,
      );
    });

    it('throws SchemaChangeError when header has modified column name', () => {
      const header = [
        '"Data values"',
        '"Data values_sort"',
        '"Data description"',
        '"Data description_reference"',
        '"Data description_sort"',
        '"Data description_hierarchy"',
        '"Date"',
        '"Date_reference"',
        '"Date_sort"',
        '"Date_hierarchy"',
        '"MODIFIED BOARD COLUMN"',
        '"Local health board provider_reference"',
        '"Local health board provider_sort"',
        '"Local health board provider_hierarchy"',
        '"Specialty"',
        '"Specialty_reference"',
        '"Specialty_sort"',
        '"Specialty_hierarchy"',
        '"Notes"',
      ].join(',');

      expect(() => parseWalesKeyMeasuresCsv(`${header}\n`)).toThrow(SchemaChangeError);
    });

    it('throws SchemaChangeError on unknown measure code', () => {
      const header = [
        '"Data values"',
        '"Data values_sort"',
        '"Data description"',
        '"Data description_reference"',
        '"Data description_sort"',
        '"Data description_hierarchy"',
        '"Date"',
        '"Date_reference"',
        '"Date_sort"',
        '"Date_hierarchy"',
        '"Local health board provider"',
        '"Local health board provider_reference"',
        '"Local health board provider_sort"',
        '"Local health board provider_hierarchy"',
        '"Specialty"',
        '"Specialty_reference"',
        '"Specialty_sort"',
        '"Specialty_hierarchy"',
        '"Notes"',
      ].join(',');

      const invalidRow = [
        '"100"',
        '"100"',
        '"Total"',
        '"999"', // Invalid measure code
        '"1"',
        '""',
        '"July 2026"',
        '"202607"',
        '"1"',
        '""',
        '"Board"',
        '"W11000029"',
        '"1"',
        '""',
        '"Spec"',
        '"110"',
        '"1"',
        '""',
        '""',
      ].join(',');

      expect(() => parseWalesKeyMeasuresCsv(`${header}\n${invalidRow}`)).toThrow(SchemaChangeError);
    });

    it('throws SchemaChangeError on non-numeric data value', () => {
      const header = [
        '"Data values"',
        '"Data values_sort"',
        '"Data description"',
        '"Data description_reference"',
        '"Data description_sort"',
        '"Data description_hierarchy"',
        '"Date"',
        '"Date_reference"',
        '"Date_sort"',
        '"Date_hierarchy"',
        '"Local health board provider"',
        '"Local health board provider_reference"',
        '"Local health board provider_sort"',
        '"Local health board provider_hierarchy"',
        '"Specialty"',
        '"Specialty_reference"',
        '"Specialty_sort"',
        '"Specialty_hierarchy"',
        '"Notes"',
      ].join(',');

      const invalidRow = [
        '"not-a-number"',
        '"100"',
        '"Total"',
        '"1"',
        '"1"',
        '""',
        '"July 2026"',
        '"202607"',
        '"1"',
        '""',
        '"Board"',
        '"W11000029"',
        '"1"',
        '""',
        '"Spec"',
        '"110"',
        '"1"',
        '""',
        '""',
      ].join(',');

      expect(() => parseWalesKeyMeasuresCsv(`${header}\n${invalidRow}`)).toThrow(SchemaChangeError);
    });
  });

  describe('Threshold Counts dataset (3ef3a1d8)', () => {
    it('parses real committed fixture correctly', async () => {
      const csv = await fs.readFile(path.join(FIXTURES_DIR, '3ef3a1d8-data.csv'), 'utf-8');

      const rows = parseWalesThresholdCountsCsv(csv);
      expect(rows.length).toBe(300);

      // Verify Cardiff and Vale (W11000029) Trauma & Orthopaedic (110) July 2026 (202607)
      const cav110July26 = rows.filter(
        (r) =>
          r.boardOnsCode === 'W11000029' && r.specialtyCode === '110' && r.dateCode === '202607',
      );

      expect(cav110July26).toEqual(
        expect.arrayContaining([
          {
            dataset: 'threshold_counts',
            dateCode: '202607',
            boardOnsCode: 'W11000029',
            specialtyCode: '110',
            measureCode: '52',
            value: 4341,
          },
          {
            dataset: 'threshold_counts',
            dateCode: '202607',
            boardOnsCode: 'W11000029',
            specialtyCode: '110',
            measureCode: 'TP',
            value: 14090,
          },
        ]),
      );
    });

    it('works with parseWalesCodedCsv and dataset UUID or kind', async () => {
      const csv = await fs.readFile(path.join(FIXTURES_DIR, '3ef3a1d8-data.csv'), 'utf-8');

      const rowsByUuid = parseWalesCodedCsv(THRESHOLD_COUNTS_DATASET_ID, csv);
      const rowsByKind = parseWalesCodedCsv('threshold_counts', csv);

      expect(rowsByUuid.length).toBe(300);
      expect(rowsByKind.length).toBe(300);
    });

    it('throws SchemaChangeError when stage_reference is not T', () => {
      const header = [
        '"Data values"',
        '"Data values_sort"',
        '"Data description"',
        '"Data description_reference"',
        '"Data description_sort"',
        '"Data description_hierarchy"',
        '"Date"',
        '"Date_reference"',
        '"Date_sort"',
        '"Date_hierarchy"',
        '"local health board provider"',
        '"local health board provider_reference"',
        '"local health board provider_sort"',
        '"local health board provider_hierarchy"',
        '"specialty"',
        '"specialty_reference"',
        '"specialty_sort"',
        '"specialty_hierarchy"',
        '"stage of pathway"',
        '"stage of pathway_reference"',
        '"stage of pathway_sort"',
        '"stage of pathway_hierarchy"',
        '"age group"',
        '"age group_reference"',
        '"age group_sort"',
        '"age group_hierarchy"',
        '"Notes"',
      ].join(',');

      const invalidRow = [
        '"100"',
        '"100"',
        '"Pathways waiting more than 52 weeks"',
        '"52"',
        '"1"',
        '""',
        '"July 2026"',
        '"202607"',
        '"1"',
        '""',
        '"Board"',
        '"W11000029"',
        '"1"',
        '""',
        '"Spec"',
        '"110"',
        '"1"',
        '""',
        '"Stage 1"',
        '"1"', // Invalid stage (expected 'T')
        '"1"',
        '""',
        '"Total"',
        '"T"',
        '""',
        '""',
        '""',
      ].join(',');

      expect(() => parseWalesThresholdCountsCsv(`${header}\n${invalidRow}`)).toThrow(
        SchemaChangeError,
      );
    });

    it('throws SchemaChangeError when age_reference is not T', () => {
      const header = [
        '"Data values"',
        '"Data values_sort"',
        '"Data description"',
        '"Data description_reference"',
        '"Data description_sort"',
        '"Data description_hierarchy"',
        '"Date"',
        '"Date_reference"',
        '"Date_sort"',
        '"Date_hierarchy"',
        '"local health board provider"',
        '"local health board provider_reference"',
        '"local health board provider_sort"',
        '"local health board provider_hierarchy"',
        '"specialty"',
        '"specialty_reference"',
        '"specialty_sort"',
        '"specialty_hierarchy"',
        '"stage of pathway"',
        '"stage of pathway_reference"',
        '"stage of pathway_sort"',
        '"stage of pathway_hierarchy"',
        '"age group"',
        '"age group_reference"',
        '"age group_sort"',
        '"age group_hierarchy"',
        '"Notes"',
      ].join(',');

      const invalidRow = [
        '"100"',
        '"100"',
        '"Pathways waiting more than 52 weeks"',
        '"52"',
        '"1"',
        '""',
        '"July 2026"',
        '"202607"',
        '"1"',
        '""',
        '"Board"',
        '"W11000029"',
        '"1"',
        '""',
        '"Spec"',
        '"110"',
        '"1"',
        '""',
        '"All Stages"',
        '"T"',
        '"1"',
        '""',
        '"Under 18"',
        '"17"', // Invalid age (expected 'T')
        '""',
        '""',
        '""',
      ].join(',');

      expect(() => parseWalesThresholdCountsCsv(`${header}\n${invalidRow}`)).toThrow(
        SchemaChangeError,
      );
    });
  });
});
