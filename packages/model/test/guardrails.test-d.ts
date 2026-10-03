import { describe, expectTypeOf, test } from 'vitest';
import type { PublishingNation, SingleNation } from '../src/nation.js';
import type {
  HospitalSiteId,
  ReportingUnitId,
  SpecialtyId,
  StatisticId,
  WaitStageId,
} from '../src/ids.js';
import type { PublicationDate, ReportingPeriod } from '../src/period.js';
import {
  exactSum,
  figureKey,
  type Figure,
  type FigureValue,
  type PublishedFigureValue,
  type SuppressedFigureValue,
} from '../src/figure.js';
import { releaseSchema, type Release, type ReleaseFile } from '../src/release.js';
import type {
  PublishedFile,
  PublishedFigure,
  PublishedNation,
  PublishedUnitSpecialty,
} from '../src/published.js';
import type { HospitalSite, NhsRegionId, ReferenceData, ReportingUnit } from '../src/reference.js';
import { englandDefinitions } from '../src/england/definitions.js';
import { walesDefinitions } from '../src/wales/definitions.js';
import { scotlandDefinitions } from '../src/scotland/definitions.js';

describe('T-2.10 Cross-nation type guardrails', () => {
  describe('SingleNation and wide PublishingNation resolve to never', () => {
    test('SingleNation resolves to never for union of nations or wide PublishingNation', () => {
      expectTypeOf<SingleNation<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<SingleNation<'england' | 'wales'>>().toEqualTypeOf<never>();
      expectTypeOf<SingleNation<'england' | 'scotland'>>().toEqualTypeOf<never>();
      expectTypeOf<SingleNation<'wales' | 'scotland'>>().toEqualTypeOf<never>();
    });

    test('SingleNation resolves to concrete nation for individual nations', () => {
      expectTypeOf<SingleNation<'england'>>().toEqualTypeOf<'england'>();
      expectTypeOf<SingleNation<'wales'>>().toEqualTypeOf<'wales'>();
      expectTypeOf<SingleNation<'scotland'>>().toEqualTypeOf<'scotland'>();
    });

    test('Domain types resolve to never when parameterised by wide PublishingNation or unions', () => {
      expectTypeOf<Figure<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<Figure<'england' | 'wales'>>().toEqualTypeOf<never>();

      expectTypeOf<Release<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<Release<'england' | 'scotland'>>().toEqualTypeOf<never>();

      expectTypeOf<ReleaseFile<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<ReleaseFile<'wales' | 'scotland'>>().toEqualTypeOf<never>();

      expectTypeOf<PublishedNation<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<PublishedNation<'england' | 'wales'>>().toEqualTypeOf<never>();

      expectTypeOf<PublishedFigure<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<PublishedFigure<'england' | 'scotland'>>().toEqualTypeOf<never>();

      expectTypeOf<PublishedUnitSpecialty<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<PublishedUnitSpecialty<'wales' | 'scotland'>>().toEqualTypeOf<never>();

      expectTypeOf<PublishedFile<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<PublishedFile<'england' | 'wales'>>().toEqualTypeOf<never>();

      expectTypeOf<ReferenceData<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<ReferenceData<'england' | 'scotland'>>().toEqualTypeOf<never>();

      expectTypeOf<ReportingUnit<PublishingNation>>().toEqualTypeOf<never>();
      expectTypeOf<HospitalSite<PublishingNation>>().toEqualTypeOf<never>();
    });
  });

  describe('Figure arrays and generic functions reject mixed nations', () => {
    test('Figure arrays cannot accept figures from another nation', () => {
      const englandFigures: Figure<'england'>[] = [];
      const walesFigure = {} as Figure<'wales'>;
      const scotlandFigure = {} as Figure<'scotland'>;

      // @ts-expect-error An array Figure<'england'>[] cannot receive a Figure<'wales'>
      englandFigures.push(walesFigure);

      // @ts-expect-error An array Figure<'england'>[] cannot receive a Figure<'scotland'>
      englandFigures.push(scotlandFigure);

      const walesFigures: Figure<'wales'>[] = [];
      const englandFigure = {} as Figure<'england'>;

      // @ts-expect-error An array Figure<'wales'>[] cannot receive a Figure<'england'>
      walesFigures.push(englandFigure);
    });

    test('exactSum cannot accept mixed-nation figures in one call', () => {
      const englandFig = {} as Figure<'england'>;
      const walesFig = {} as Figure<'wales'>;
      const scotlandFig = {} as Figure<'scotland'>;

      // @ts-expect-error exactSum cannot combine England and Wales figures
      exactSum([englandFig, walesFig]);

      // @ts-expect-error exactSum cannot combine England and Scotland figures
      exactSum([englandFig, scotlandFig]);

      // @ts-expect-error exactSum cannot combine Wales and Scotland figures
      exactSum([walesFig, scotlandFig]);
    });

    test('figureKey enforces nation matching on figure properties', () => {
      const engFig = {} as Figure<'england'>;
      const key = figureKey(engFig);
      expectTypeOf(key).toBeString();
    });

    test('schema factories require nation matching', () => {
      const engSchema = releaseSchema(englandDefinitions);
      expectTypeOf(engSchema).not.toEqualTypeOf<never>();

      const walesSchema = releaseSchema(walesDefinitions);
      expectTypeOf(walesSchema).not.toEqualTypeOf<never>();

      const scotlandSchema = releaseSchema(scotlandDefinitions);
      expectTypeOf(scotlandSchema).not.toEqualTypeOf<never>();
    });
  });

  describe('Nation-scoped IDs prevent cross-nation and cross-kind misuse', () => {
    test('SpecialtyId cannot be assigned across nations', () => {
      expectTypeOf<SpecialtyId<'wales'>>().not.toExtend<SpecialtyId<'england'>>();
      expectTypeOf<SpecialtyId<'scotland'>>().not.toExtend<SpecialtyId<'england'>>();
      expectTypeOf<SpecialtyId<'england'>>().not.toExtend<SpecialtyId<'wales'>>();

      const engSpecialty = {} as SpecialtyId<'england'>;
      // @ts-expect-error Cannot assign England SpecialtyId to Wales SpecialtyId
      const _walesSpecialty: SpecialtyId<'wales'> = engSpecialty;
      expectTypeOf(_walesSpecialty).toEqualTypeOf<SpecialtyId<'wales'>>();
    });

    test('ReportingUnitId cannot be assigned across nations', () => {
      expectTypeOf<ReportingUnitId<'scotland'>>().not.toExtend<ReportingUnitId<'england'>>();
      expectTypeOf<ReportingUnitId<'wales'>>().not.toExtend<ReportingUnitId<'england'>>();

      const engUnit = {} as ReportingUnitId<'england'>;
      // @ts-expect-error Cannot assign England ReportingUnitId to Scotland ReportingUnitId
      const _scotUnit: ReportingUnitId<'scotland'> = engUnit;
      expectTypeOf(_scotUnit).toEqualTypeOf<ReportingUnitId<'scotland'>>();
    });

    test('ID kinds cannot be cross-assigned within the same nation', () => {
      expectTypeOf<ReportingUnitId<'england'>>().not.toExtend<SpecialtyId<'england'>>();
      expectTypeOf<WaitStageId<'england'>>().not.toExtend<StatisticId<'england'>>();
      expectTypeOf<HospitalSiteId<'england'>>().not.toExtend<ReportingUnitId<'england'>>();
    });
  });

  describe('FigureValue and SuppressedFigureValue guardrails', () => {
    test('SuppressedFigureValue has no value property', () => {
      expectTypeOf<keyof SuppressedFigureValue>().toEqualTypeOf<'status' | 'provisional'>();

      const suppressed: SuppressedFigureValue = { status: 'suppressed', provisional: false };
      // @ts-expect-error Property 'value' does not exist on type 'SuppressedFigureValue'
      expectTypeOf(suppressed.value).toBeUndefined();
    });

    test('FigureValue cannot read value without narrowing to published status', () => {
      const fv = {} as FigureValue;

      // @ts-expect-error Property 'value' does not exist on FigureValue
      expectTypeOf(fv.value).toBeUndefined();

      if (fv.status === 'published') {
        expectTypeOf(fv.value).toBeNumber();
      }
    });

    test('PublishedFigureValue requires numeric value', () => {
      expectTypeOf<keyof PublishedFigureValue>().toEqualTypeOf<
        'status' | 'value' | 'provisional'
      >();
    });
  });

  describe('PublicationDate and ReportingPeriod branded guardrails', () => {
    test('PublicationDate cannot be passed where ReportingPeriod is expected', () => {
      expectTypeOf<PublicationDate>().not.toExtend<ReportingPeriod>();
      expectTypeOf<ReportingPeriod>().not.toExtend<PublicationDate>();

      const pd = {} as PublicationDate;
      // @ts-expect-error PublicationDate cannot be passed where ReportingPeriod is expected
      const _rp: ReportingPeriod = pd;
      expectTypeOf(_rp).toEqualTypeOf<ReportingPeriod>();
    });

    test('ReportingPeriod cannot be passed where PublicationDate is expected', () => {
      const rp = {} as ReportingPeriod;
      // @ts-expect-error ReportingPeriod cannot be passed where PublicationDate is expected
      const _pd: PublicationDate = rp;
      expectTypeOf(_pd).toEqualTypeOf<PublicationDate>();
    });

    test('Unbranded string cannot be passed where ReportingPeriod or PublicationDate is expected', () => {
      const rawString = '2026-01-31';

      // @ts-expect-error Unbranded string cannot be assigned to ReportingPeriod
      const _rp: ReportingPeriod = rawString;
      expectTypeOf(_rp).toEqualTypeOf<ReportingPeriod>();

      // @ts-expect-error Unbranded string cannot be assigned to PublicationDate
      const _pd: PublicationDate = rawString;
      expectTypeOf(_pd).toEqualTypeOf<PublicationDate>();
    });
  });

  describe('Reference data and metadata structural guardrails', () => {
    test('HospitalSite has no postcode, latitude, or longitude fields', () => {
      expectTypeOf<HospitalSite<'england'>>().not.toHaveProperty('postcode');
      expectTypeOf<HospitalSite<'england'>>().not.toHaveProperty('latitude');
      expectTypeOf<HospitalSite<'england'>>().not.toHaveProperty('longitude');

      expectTypeOf<HospitalSite<'wales'>>().not.toHaveProperty('postcode');
      expectTypeOf<HospitalSite<'scotland'>>().not.toHaveProperty('postcode');
    });

    test('nhsRegion exists only on ReportingUnit<"england">', () => {
      expectTypeOf<ReportingUnit<'england'>>().toHaveProperty('nhsRegion');
      expectTypeOf<ReportingUnit<'england'>['nhsRegion']>().toEqualTypeOf<NhsRegionId>();

      expectTypeOf<ReportingUnit<'wales'>>().not.toHaveProperty('nhsRegion');
      expectTypeOf<ReportingUnit<'scotland'>>().not.toHaveProperty('nhsRegion');
    });
  });
});
