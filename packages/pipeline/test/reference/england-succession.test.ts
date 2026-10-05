import { describe, expect, it } from 'vitest';
import { reportingUnitId } from '@kyw/model/ids';
import { nhsRegionId, type ReportingUnit } from '@kyw/model/reference';
import { loadOdsReport } from '../../src/reference/ods/client.js';
import type { OdsSuccessionRow } from '../../src/reference/ods/columns.js';
import {
  buildEnglandSuccessionIndex,
  isSameEntityAcross,
  parseEnglandSuccessions,
  populateEnglandReportingUnitsSuccessions,
  populateEnglandReportingUnitSuccessions,
} from '../../src/reference/england/succession.js';

describe('England succession and Year-Earlier continuity', () => {
  describe('parseEnglandSuccessions', () => {
    it('normalises raw ODS succession rows to ISO format', () => {
      const rawRows: OdsSuccessionRow[] = [
        {
          predecessor: 'RAP',
          successor: 'RAL',
          effectiveDate: '20250101',
          hasForwardSuccession: false,
        },
      ];

      const records = parseEnglandSuccessions(rawRows);
      expect(records).toEqual([
        {
          predecessor: 'RAP',
          successor: 'RAL',
          effectiveDate: '2025-01-01',
        },
      ]);
    });

    it('ignores 5-character trust site codes', () => {
      const rawRows: OdsSuccessionRow[] = [
        {
          predecessor: 'RRK01',
          successor: 'RRK02',
          effectiveDate: '20200101',
          hasForwardSuccession: false,
        },
        {
          predecessor: 'RAP',
          successor: 'RAL',
          effectiveDate: '20250101',
          hasForwardSuccession: false,
        },
      ];

      const records = parseEnglandSuccessions(rawRows);
      expect(records).toEqual([
        {
          predecessor: 'RAP',
          successor: 'RAL',
          effectiveDate: '2025-01-01',
        },
      ]);
    });

    it('deduplicates identical records and skips invalid rows', () => {
      const rawRows: OdsSuccessionRow[] = [
        {
          predecessor: 'RAP',
          successor: 'RAL',
          effectiveDate: '20250101',
          hasForwardSuccession: false,
        },
        {
          predecessor: 'RAP',
          successor: 'RAL',
          effectiveDate: '20250101',
          hasForwardSuccession: false,
        },
        {
          predecessor: '',
          successor: 'RAL',
          effectiveDate: '20250101',
          hasForwardSuccession: false,
        },
        {
          predecessor: 'RAP',
          successor: 'RAL',
          effectiveDate: 'invalid-date',
          hasForwardSuccession: false,
        },
      ];

      const records = parseEnglandSuccessions(rawRows);
      expect(records).toHaveLength(1);
      expect(records[0]?.predecessor).toBe('RAP');
    });
  });

  describe('isSameEntityAcross and index lookups with real fixture data', () => {
    it('correctly evaluates Year-Earlier continuity on real succession fixtures', async () => {
      const succRows = await loadOdsReport('succ', { source: 'fixture' });
      const records = parseEnglandSuccessions(succRows);
      const index = buildEnglandSuccessionIndex(records);

      // RAL absorbed RAP on 2025-01-01
      // Across 2024-07-31 -> 2025-07-31: RAP joined inside window (2024-07-31, 2025-07-31] -> NOT same entity
      expect(index.isSameEntityAcross('RAL', '2024-07-31', '2025-07-31')).toBe(false);

      // Across 2025-07-31 -> 2026-07-31: RAP joined before older period (2025-01-01 <= 2025-07-31) -> IS same entity
      expect(index.isSameEntityAcross('RAL', '2025-07-31', '2026-07-31')).toBe(true);

      // RRK absorbed RR1 on 2018-04-02
      // Across 2017-07-31 -> 2018-07-31: RR1 joined inside window -> NOT same entity
      expect(index.isSameEntityAcross('RRK', '2017-07-31', '2018-07-31')).toBe(false);

      // Across 2019-07-31 -> 2020-07-31: no merger in window -> IS same entity
      expect(index.isSameEntityAcross('RRK', '2019-07-31', '2020-07-31')).toBe(true);

      // RVJ was absorbed by RA7 on 2026-07-01
      // Across 2025-07-31 -> 2026-07-31:
      // - RVJ has successor RA7 with effectiveDate <= 2026-07-31 -> NOT same entity
      expect(index.isSameEntityAcross('RVJ', '2025-07-31', '2026-07-31')).toBe(false);
      // - RA7 absorbed RVJ inside window (2025-07-31, 2026-07-31] -> NOT same entity
      expect(index.isSameEntityAcross('RA7', '2025-07-31', '2026-07-31')).toBe(false);

      // Unit with no succession rows (e.g. R1H Barts Health)
      expect(index.isSameEntityAcross('R1H', '2025-07-31', '2026-07-31')).toBe(true);
    });

    it('returns false if unit closed on or before newerPeriod', () => {
      const records = [
        {
          predecessor: 'OLD',
          successor: 'NEW',
          effectiveDate: '2020-01-01',
        },
      ];
      const index = buildEnglandSuccessionIndex(records);

      // Closed before newerPeriod
      expect(
        index.isSameEntityAcross('ACTIVE_NO_SUCC', '2025-07-31', '2026-07-31', '2026-05-01'),
      ).toBe(false);

      // Closed on newerPeriod
      expect(
        index.isSameEntityAcross('ACTIVE_NO_SUCC', '2025-07-31', '2026-07-31', '2026-07-31'),
      ).toBe(false);

      // Closes after newerPeriod
      expect(
        index.isSameEntityAcross('ACTIVE_NO_SUCC', '2025-07-31', '2026-07-31', '2026-08-01'),
      ).toBe(true);

      // No close date
      expect(index.isSameEntityAcross('ACTIVE_NO_SUCC', '2025-07-31', '2026-07-31', null)).toBe(
        true,
      );
    });

    it('handles standalone isSameEntityAcross function call', () => {
      const index = buildEnglandSuccessionIndex([
        { predecessor: 'A', successor: 'B', effectiveDate: '2025-03-01' },
      ]);

      const result = isSameEntityAcross('A', '2024-07-31', '2025-07-31', index);
      expect(result).toBe(false);
    });
  });

  describe('populateEnglandReportingUnitSuccessions', () => {
    it('populates predecessors and successors sorted by ID', () => {
      const index = buildEnglandSuccessionIndex([
        { predecessor: 'RAM', successor: 'RAL', effectiveDate: '1996-04-01' },
        { predecessor: 'RAP', successor: 'RAL', effectiveDate: '2025-01-01' },
        { predecessor: 'RVL', successor: 'RAL', effectiveDate: '2014-07-02' },
        { predecessor: 'RAP', successor: 'RAL', effectiveDate: '2025-01-01' },
      ]);

      const mockUnit: ReportingUnit<'england'> = {
        id: reportingUnitId('england', 'RAL'),
        officialCode: 'RAL',
        officialName: 'ROYAL FREE LONDON NHS FOUNDATION TRUST',
        displayName: 'Royal Free London NHS Foundation Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: '1991-04-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      };

      const populated = populateEnglandReportingUnitSuccessions(mockUnit, index);
      expect(populated.predecessors).toEqual([
        reportingUnitId('england', 'RAM'),
        reportingUnitId('england', 'RAP'),
        reportingUnitId('england', 'RVL'),
      ]);
      expect(populated.successors).toEqual([]);

      const mockPredUnit: ReportingUnit<'england'> = {
        id: reportingUnitId('england', 'RAP'),
        officialCode: 'RAP',
        officialName: 'NORTH MIDDLESEX UNIVERSITY HOSPITAL NHS TRUST',
        displayName: 'North Middlesex University Hospital NHS Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: '1991-04-01', to: '2025-01-01' },
        predecessors: [],
        successors: [],
        notes: [],
      };

      const populatedPred = populateEnglandReportingUnitSuccessions(mockPredUnit, index);
      expect(populatedPred.predecessors).toEqual([]);
      expect(populatedPred.successors).toEqual([reportingUnitId('england', 'RAL')]);
    });

    it('populates an array of reporting units', () => {
      const index = buildEnglandSuccessionIndex([
        { predecessor: 'RAP', successor: 'RAL', effectiveDate: '2025-01-01' },
      ]);

      const units: ReportingUnit<'england'>[] = [
        {
          id: reportingUnitId('england', 'RAL'),
          officialCode: 'RAL',
          officialName: 'ROYAL FREE LONDON NHS FOUNDATION TRUST',
          displayName: 'Royal Free London NHS Foundation Trust',
          kind: 'nhs-trust',
          nhsRegion: nhsRegionId('Y56'),
          hospitalSites: [],
          operational: { from: '1991-04-01', to: null },
          predecessors: [],
          successors: [],
          notes: [],
        },
      ];

      const result = populateEnglandReportingUnitsSuccessions(units, index);
      expect(result).toHaveLength(1);
      expect(result[0]?.predecessors).toEqual([reportingUnitId('england', 'RAP')]);
    });
  });
});
