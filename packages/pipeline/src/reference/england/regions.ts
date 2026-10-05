import { nhsRegionId, type NhsRegion } from '@kyw/model/reference';
import { SchemaChangeError } from '../../errors.js';

/**
 * England NHS Region definition including official ODS name and display name.
 *
 * @see GLOSSARY.md NHS Region
 * @see ADR-0006
 */
export interface EnglandNhsRegion extends NhsRegion {
  readonly officialName: string;
}

/**
 * The 7 official NHS England administrative/commissioning regions.
 * Used only to group English Reporting Units for browsing; never a comparison unit.
 *
 * @see GLOSSARY.md NHS Region
 * @see ADR-0006
 */
export const ENGLAND_NHS_REGIONS: readonly EnglandNhsRegion[] = [
  {
    id: nhsRegionId('Y56'),
    officialCode: 'Y56',
    officialName: 'LONDON COMMISSIONING REGION',
    name: 'London',
  },
  {
    id: nhsRegionId('Y58'),
    officialCode: 'Y58',
    officialName: 'SOUTH WEST COMMISSIONING REGION',
    name: 'South West',
  },
  {
    id: nhsRegionId('Y59'),
    officialCode: 'Y59',
    officialName: 'SOUTH EAST COMMISSIONING REGION',
    name: 'South East',
  },
  {
    id: nhsRegionId('Y60'),
    officialCode: 'Y60',
    officialName: 'MIDLANDS COMMISSIONING REGION',
    name: 'Midlands',
  },
  {
    id: nhsRegionId('Y61'),
    officialCode: 'Y61',
    officialName: 'EAST OF ENGLAND COMMISSIONING REGION',
    name: 'East of England',
  },
  {
    id: nhsRegionId('Y62'),
    officialCode: 'Y62',
    officialName: 'NORTH WEST COMMISSIONING REGION',
    name: 'North West',
  },
  {
    id: nhsRegionId('Y63'),
    officialCode: 'Y63',
    officialName: 'NORTH EAST AND YORKSHIRE COMMISSIONING REGION',
    name: 'North East and Yorkshire',
  },
] as const;

const REGION_BY_CODE = new Map<string, EnglandNhsRegion>();
for (const region of ENGLAND_NHS_REGIONS) {
  REGION_BY_CODE.set(region.officialCode, region);
  REGION_BY_CODE.set(region.id, region);
}

/**
 * Looks up an England NHS Region by official code (e.g. 'Y56') or ID ('england:Y56').
 * Throws SchemaChangeError on unknown codes to block downstream publishing.
 */
export function regionFor(code: string): EnglandNhsRegion {
  const region = REGION_BY_CODE.get(code);
  if (!region) {
    throw new SchemaChangeError(
      `Unknown England NHS Region code "${code}". A new or changed region requires manual verification.`,
      { code, knownCodes: ENGLAND_NHS_REGIONS.map((r) => r.officialCode) },
    );
  }
  return region;
}
