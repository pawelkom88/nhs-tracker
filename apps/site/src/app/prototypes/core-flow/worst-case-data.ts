import type { NationItem, SpecialtyItem, ReportingUnitFigures } from './mock-data';

export type DatasetMode = 'demo' | 'worst-case' | 'all-suppressed' | 'empty' | 'huge';

export const WORST_CASE_NATIONS: NationItem[] = [
  {
    id: 'england',
    name: 'England (National Health Service Commissioning Board / NHS England and Improvement)',
    systemName: 'Consultant-led Referral to Treatment (RTT) Waiting Times Standard Framework',
    standardDescription:
      'Statutory legal right under the NHS Constitution to commence consultant-led non-urgent elective care pathway within 18 weeks of referral (national operational threshold 92.0%).',
    periodNotice: 'Latest release: January 2025 (Published 13 March 2025 at 09:30 GMT)',
  },
  {
    id: 'wales',
    name: 'Wales / Cymru (Gwasanaeth Iechyd Gwladol Cymru - NHS Wales Delivery Unit)',
    systemName: 'Referral to Treatment (RTT) Elective Waiting Times and Open Pathways Protocol',
    standardDescription:
      'National access standard of 95% of patients waiting less than 26 weeks from referral to definitive treatment; zero patients waiting greater than 52 weeks (1 year).',
    periodNotice: 'Latest release: December 2024 (Published 20 February 2025 at 09:30 GMT)',
  },
  {
    id: 'scotland',
    name: 'Scotland (NHS Scotland / Public Health Scotland - National Elective Waiting Times)',
    systemName:
      'Treatment Time Guarantee (Inpatient/Day Case) and Stage of Treatment Standard (New Outpatient)',
    standardDescription:
      '12-week statutory Treatment Time Guarantee for eligible inpatient/day case admissions; 12-week national waiting standard for new outpatient consultations. Figures are strictly reported as separate stages and never summed.',
    periodNotice:
      'Latest release: Quarter ending December 2024 (Published 25 February 2025 at 09:30 GMT)',
  },
];

export const WORST_CASE_SPECIALTIES: SpecialtyItem[] = [
  {
    slug: 'trauma-and-orthopaedic-surgery-including-complex-spinal-and-arthroplasty',
    name: 'Trauma & Orthopaedic Surgery (including Complex Revision Arthroplasty and Spinal Reconstruction)',
    description:
      'Comprehensive elective and emergency management of bones, joint arthroplasty (hip, knee, shoulder), ligamentous repair, complex spinal deformity correction, and tertiary musculoskeletal reconstruction.',
    waitingCountEngland: 1482930,
  },
  {
    slug: 'cardiology-and-interventional-electrophysiology',
    name: 'Cardiology, Structural Heart Interventions & Electrophysiology',
    description:
      'Complex adult congenital heart disease, electrophysiological ablation, structural valve interventions, coronary angiography, and heart failure management.',
    waitingCountEngland: 842100,
  },
  {
    slug: 'ophthalmology-and-vitreoretinal-surgery',
    name: 'Ophthalmology, Vitreoretinal Surgery & Corneal Transplantation',
    description:
      'Cataract extraction, corneal transplantation, complex vitreoretinal micro-surgery, glaucoma filtration, and ocular oncology assessment.',
    waitingCountEngland: 981250,
  },
];

export const WORST_CASE_UNITS: ReportingUnitFigures[] = [
  {
    code: 'R1A-EXTREME-ODS-CODE-99',
    name: 'Manchester University NHS Foundation Trust & Northern Care Alliance NHS Foundation Trust Collaborative Arthroplasty and Musculoskeletal Center',
    region: 'North West',
    medianWeeks: 48.7,
    percentWithinStandard: 21.4,
    longWait65Plus: 4912,
    totalWaiting: 148920,
  },
  {
    code: 'R0A',
    name: 'Manchester University NHS Foundation Trust',
    region: 'North West',
    medianWeeks: 18.0,
    percentWithinStandard: 99.9,
    longWait65Plus: 1,
    totalWaiting: 1,
  },
  {
    code: 'RRK',
    name: 'University Hospitals Birmingham NHS Foundation Trust - Queen Elizabeth Hospital & Heartlands Hospital',
    region: 'Midlands',
    medianWeeks: 'suppressed',
    percentWithinStandard: 42.8,
    longWait65Plus: 1205,
    totalWaiting: 89400,
  },
  {
    code: 'R1K',
    name: 'London North West University Healthcare NHS Trust & The Hillingdon Hospitals NHS Foundation Trust Joint Elective Orthopaedic Surgical Hub',
    region: 'London',
    medianWeeks: 24.2,
    percentWithinStandard: 'suppressed',
    longWait65Plus: 'suppressed',
    totalWaiting: 34100,
  },
  {
    code: 'RA9',
    name: 'Torbay and South Devon NHS Foundation Trust',
    region: 'South West',
    medianWeeks: 11.2,
    percentWithinStandard: 74.9,
    longWait65Plus: 0,
    totalWaiting: 4820,
  },
];

export const ALL_SUPPRESSED_UNITS: ReportingUnitFigures[] = [
  {
    code: 'RN7',
    name: 'Dartford and Gravesham NHS Trust',
    region: 'South East',
    medianWeeks: 'suppressed',
    percentWithinStandard: 'suppressed',
    longWait65Plus: 'suppressed',
    totalWaiting: 'suppressed',
  },
  {
    code: 'R1J',
    name: 'Gloucestershire Hospitals NHS Foundation Trust',
    region: 'South West',
    medianWeeks: 'suppressed',
    percentWithinStandard: 'suppressed',
    longWait65Plus: 'suppressed',
    totalWaiting: 'suppressed',
  },
  {
    code: 'RCF',
    name: 'Airedale NHS Foundation Trust',
    region: 'North East and Yorkshire',
    medianWeeks: 'suppressed',
    percentWithinStandard: 'suppressed',
    longWait65Plus: 'suppressed',
    totalWaiting: 'suppressed',
  },
];

const ENGLISH_REGIONS: readonly string[] = [
  'East of England',
  'London',
  'Midlands',
  'North East and Yorkshire',
  'North West',
  'South East',
  'South West',
] as const;

export const HUGE_UNITS_LIST: ReportingUnitFigures[] = Array.from({ length: 56 })
  .map((_, i) => {
    const region: string = ENGLISH_REGIONS[i % ENGLISH_REGIONS.length] ?? 'London';
    const trustNumber = String(i + 1).padStart(2, '0');
    const codes = ['RTH', 'RHW', 'RTD', 'RTR', 'RN7', 'R1A', 'RRK', 'RA9'];
    const code = `${codes[i % codes.length] ?? 'RTH'}${trustNumber}`;

    return {
      code,
      name: `NHS Foundation Trust ${trustNumber} of ${region} Specialized Care Network`,
      region,
      medianWeeks: 10 + (i % 18) + (i % 10) / 10,
      percentWithinStandard: Math.max(30, Math.min(95, 85 - ((i * 1.1) % 50))),
      longWait65Plus: (i * 7) % 120,
      totalWaiting: 2400 + i * 420,
    };
  })
  .sort((a, b) => {
    if (a.region !== b.region) return a.region.localeCompare(b.region);
    return a.name.localeCompare(b.name);
  });
