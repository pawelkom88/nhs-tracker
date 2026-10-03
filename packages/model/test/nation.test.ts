import { describe, expect, it } from 'vitest';
import { isPublishingNation, PUBLISHING_NATIONS, type PublishingNation } from '../src/nation.js';
import {
  hospitalSiteId,
  nationScopedIdSchema,
  parseNationScopedId,
  reportingUnitId,
  specialtyId,
  statisticId,
  waitStageId,
} from '../src/ids.js';

describe('PublishingNation and HomeNation', () => {
  it('defines the three official publishing nations', () => {
    expect(PUBLISHING_NATIONS).toEqual(['england', 'wales', 'scotland']);
  });

  it('validates publishing nations via isPublishingNation', () => {
    expect(isPublishingNation('england')).toBe(true);
    expect(isPublishingNation('wales')).toBe(true);
    expect(isPublishingNation('scotland')).toBe(true);
    expect(isPublishingNation('northern-ireland')).toBe(false);
    expect(isPublishingNation('')).toBe(false);
    expect(isPublishingNation(123)).toBe(false);
    expect(isPublishingNation(null)).toBe(false);
  });
});

describe('ID constructors', () => {
  it('creates valid nation-scoped IDs for all kinds', () => {
    const rUnit = reportingUnitId('england', 'RGT');
    expect(rUnit).toBe('england:RGT');

    const hSite = hospitalSiteId('wales', '7A1A1');
    expect(hSite).toBe('wales:7A1A1');

    const spec = specialtyId('scotland', 'C1');
    expect(spec).toBe('scotland:C1');

    const stage = waitStageId('england', 'rtt-incomplete-pathway');
    expect(stage).toBe('england:rtt-incomplete-pathway');

    const stat = statisticId('england', 'median-ongoing-wait');
    expect(stat).toBe('england:median-ongoing-wait');
  });

  it('rejects empty official codes', () => {
    expect(() => reportingUnitId('england', '')).toThrow(TypeError);
  });

  it('rejects codes containing colons', () => {
    expect(() => reportingUnitId('england', 'bad:code')).toThrow(TypeError);
  });

  it('rejects invalid publishing nations', () => {
    expect(() => reportingUnitId('invalid' as unknown as PublishingNation, 'CODE')).toThrow(
      TypeError,
    );
  });
});

describe('parseNationScopedId', () => {
  it('correctly extracts nation and official code', () => {
    const parsed = parseNationScopedId('england:RGT');
    expect(parsed).toEqual({ nation: 'england', code: 'RGT' });

    const parsedStage = parseNationScopedId('scotland:stage-one');
    expect(parsedStage).toEqual({ nation: 'scotland', code: 'stage-one' });
  });

  it('throws on missing delimiter', () => {
    expect(() => parseNationScopedId('englandRGT')).toThrow(TypeError);
  });

  it('throws on unknown nation prefix', () => {
    expect(() => parseNationScopedId('uk:RGT')).toThrow(TypeError);
  });

  it('throws on invalid code in ID string', () => {
    expect(() => parseNationScopedId('england:')).toThrow(TypeError);
    expect(() => parseNationScopedId('england:foo:bar')).toThrow(TypeError);
  });
});

describe('nationScopedIdSchema', () => {
  const englandSpecialtySchema = nationScopedIdSchema('england', 'specialty');

  it('parses valid nation-scoped ID string', () => {
    const result = englandSpecialtySchema.parse('england:100');
    expect(result).toBe('england:100');
  });

  it('rejects IDs with mismatched nation prefix', () => {
    expect(() => englandSpecialtySchema.parse('wales:100')).toThrow();
    expect(() => englandSpecialtySchema.parse('scotland:100')).toThrow();
  });

  it('rejects IDs with empty code or extra colons', () => {
    expect(() => englandSpecialtySchema.parse('england:')).toThrow();
    expect(() => englandSpecialtySchema.parse('england:100:extra')).toThrow();
  });

  it('rejects non-string values', () => {
    expect(() => englandSpecialtySchema.parse(123)).toThrow();
    expect(() => englandSpecialtySchema.parse(null)).toThrow();
  });
});
