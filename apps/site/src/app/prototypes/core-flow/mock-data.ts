export interface ReportingUnitFigures {
  code: string;
  name: string;
  region: string;
  medianWeeks: number | 'suppressed';
  percentWithinStandard: number | 'suppressed';
  longWait65Plus: number | 'suppressed';
  totalWaiting: number | 'suppressed';
}

export interface SpecialtyItem {
  slug: string;
  name: string;
  description: string;
  waitingCountEngland: number;
}

export interface NationItem {
  id: string;
  name: string;
  systemName: string;
  standardDescription: string;
  periodNotice: string;
}

export const NATIONS: NationItem[] = [
  {
    id: 'england',
    name: 'England',
    systemName: 'Consultant-led Referral to Treatment (RTT)',
    standardDescription:
      'Legal right to start non-urgent treatment within 18 weeks (92% standard).',
    periodNotice: 'Latest release: January 2025 (Published 13 March 2025)',
  },
  {
    id: 'wales',
    name: 'Wales',
    systemName: 'Referral to Treatment (RTT)',
    standardDescription: 'Target of 95% starting treatment within 26 weeks; zero over 52 weeks.',
    periodNotice: 'Latest release: December 2024 (Published 20 February 2025)',
  },
  {
    id: 'scotland',
    name: 'Scotland',
    systemName: 'Treatment Time Guarantee & Outpatient Stage',
    standardDescription:
      '12-week Treatment Time Guarantee (inpatient/day case) and 12-week Outpatient standard.',
    periodNotice: 'Latest release: Quarter ending December 2024 (Published 25 February 2025)',
  },
];

export const SPECIALTIES_ENGLAND: SpecialtyItem[] = [
  {
    slug: 'trauma-and-orthopaedics',
    name: 'Trauma & Orthopaedics',
    description: 'Bones, joints, ligaments, and tendons (including hip and knee replacements).',
    waitingCountEngland: 824300,
  },
  {
    slug: 'cardiology',
    name: 'Cardiology',
    description: 'Heart conditions, circulation, and non-surgical cardiac investigations.',
    waitingCountEngland: 412500,
  },
  {
    slug: 'ophthalmology',
    name: 'Ophthalmology',
    description: 'Eye diseases, vision surgery, and cataract procedures.',
    waitingCountEngland: 641800,
  },
  {
    slug: 'ear-nose-and-throat',
    name: 'Ear, Nose & Throat (ENT)',
    description: 'Hearing, sinus conditions, throat disorders, and neck surgery.',
    waitingCountEngland: 519200,
  },
  {
    slug: 'dermatology',
    name: 'Dermatology',
    description: 'Skin lesions, inflammatory dermatoses, and specialist skin diagnostics.',
    waitingCountEngland: 389100,
  },
];

export const REPORTING_UNITS_ORTHO: ReportingUnitFigures[] = [
  // Grouped by region, strictly alphabetical within region (never ranked)
  {
    code: 'RTH',
    name: 'Oxford University Hospitals NHS Foundation Trust',
    region: 'South East',
    medianWeeks: 14.8,
    percentWithinStandard: 58.2,
    longWait65Plus: 41,
    totalWaiting: 8420,
  },
  {
    code: 'RHW',
    name: 'Royal Berkshire NHS Foundation Trust',
    region: 'South East',
    medianWeeks: 12.1,
    percentWithinStandard: 67.4,
    longWait65Plus: 12,
    totalWaiting: 4110,
  },
  {
    code: 'RTD',
    name: 'The Newcastle Upon Tyne Hospitals NHS Foundation Trust',
    region: 'North East and Yorkshire',
    medianWeeks: 16.4,
    percentWithinStandard: 54.1,
    longWait65Plus: 78,
    totalWaiting: 9250,
  },
  {
    code: 'RTR',
    name: 'South Tees Hospitals NHS Foundation Trust',
    region: 'North East and Yorkshire',
    medianWeeks: 13.5,
    percentWithinStandard: 62.0,
    longWait65Plus: 18,
    totalWaiting: 5600,
  },
  {
    code: 'RN7',
    name: 'Dartford and Gravesham NHS Trust',
    region: 'South East',
    medianWeeks: 'suppressed',
    percentWithinStandard: 'suppressed',
    longWait65Plus: 'suppressed',
    totalWaiting: 'suppressed',
  },
];

export const SNAPSHOT_METADATA = {
  reportingPeriod: '31 January 2025',
  publicationDate: '13 March 2025',
  sourceName: 'NHS England Consultant-led Referral to Treatment (RTT)',
  caption:
    'Figures describe people already waiting on 31 January 2025. Source: NHS England Consultant-led Referral to Treatment (RTT), published 13 March 2025.',
  legalRightEngland:
    'Under the NHS Constitution for England, you have the legal right to start non-urgent consultant-led treatment within 18 weeks of referral, or for the NHS to take all reasonable steps to offer you a range of suitable alternative providers if this is not possible.',
};
