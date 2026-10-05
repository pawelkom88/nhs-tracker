import { specialtyId } from '@kyw/model/ids';
import type { Specialty } from '@kyw/model/reference';
import { SchemaChangeError } from '../../errors.js';

/**
 * Reserved explainer routes in site routing that must never collide with specialty slugs.
 *
 * @see MASTER-PLAN.md A-21
 * @see ADR-0006
 */
export const RESERVED_SPECIALTY_SLUGS: readonly string[] = [
  'about-the-figures',
  'your-rights',
] as const;

/**
 * Welsh Referral to Treatment (RTT) 51 official treatment functions plus "All specialties".
 * Slugs are hand-written and immutable to ensure stable URLs.
 *
 * Sourced from StatsWales RTT datasets (filters dimension endpoint).
 *
 * @see GLOSSARY.md Specialty
 * @see ADR-0006
 * @see data-sources.md § Wales
 */
export const WALES_SPECIALTIES: readonly Specialty<'wales'>[] = [
  {
    id: specialtyId('wales', 'all'),
    officialCode: 'all',
    officialName: 'All specialties',
    slug: 'all-specialties',
    descriptionKey: 'wales/all-specialties',
    isAllSpecialties: true,
  },
  {
    id: specialtyId('wales', '100'),
    officialCode: '100',
    officialName: 'General Surgery',
    slug: 'general-surgery',
    descriptionKey: 'wales/general-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '101'),
    officialCode: '101',
    officialName: 'Urology',
    slug: 'urology',
    descriptionKey: 'wales/urology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '103'),
    officialCode: '103',
    officialName: 'Breast Surgery',
    slug: 'breast-surgery',
    descriptionKey: 'wales/breast-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '104'),
    officialCode: '104',
    officialName: 'Colorectal Surgery',
    slug: 'colorectal-surgery',
    descriptionKey: 'wales/colorectal-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '105'),
    officialCode: '105',
    officialName: 'Hepatobiliary and Pancreatic Surgery',
    slug: 'hepatobiliary-and-pancreatic-surgery',
    descriptionKey: 'wales/hepatobiliary-and-pancreatic-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '106'),
    officialCode: '106',
    officialName: 'Upper Gastrointestinal Surgery',
    slug: 'upper-gastrointestinal-surgery',
    descriptionKey: 'wales/upper-gastrointestinal-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '107'),
    officialCode: '107',
    officialName: 'Vascular Surgery',
    slug: 'vascular-surgery',
    descriptionKey: 'wales/vascular-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '110'),
    officialCode: '110',
    officialName: 'Trauma and Orthopaedic',
    slug: 'trauma-and-orthopaedics',
    descriptionKey: 'wales/trauma-and-orthopaedics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '120'),
    officialCode: '120',
    officialName: 'ENT',
    slug: 'ear-nose-and-throat',
    descriptionKey: 'wales/ear-nose-and-throat',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '130'),
    officialCode: '130',
    officialName: 'Ophthalmology',
    slug: 'ophthalmology',
    descriptionKey: 'wales/ophthalmology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '140'),
    officialCode: '140',
    officialName: 'Oral Surgery',
    slug: 'oral-surgery',
    descriptionKey: 'wales/oral-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '141'),
    officialCode: '141',
    officialName: 'Restorative Dentistry',
    slug: 'restorative-dentistry',
    descriptionKey: 'wales/restorative-dentistry',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '142'),
    officialCode: '142',
    officialName: 'Paediatric Dentistry',
    slug: 'paediatric-dentistry',
    descriptionKey: 'wales/paediatric-dentistry',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '143'),
    officialCode: '143',
    officialName: 'Orthodontics',
    slug: 'orthodontics',
    descriptionKey: 'wales/orthodontics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '150'),
    officialCode: '150',
    officialName: 'Neurosurgery',
    slug: 'neurosurgery',
    descriptionKey: 'wales/neurosurgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '160'),
    officialCode: '160',
    officialName: 'Plastic Surgery',
    slug: 'plastic-surgery',
    descriptionKey: 'wales/plastic-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '170'),
    officialCode: '170',
    officialName: 'Cardiothoracic Surgery',
    slug: 'cardiothoracic-surgery',
    descriptionKey: 'wales/cardiothoracic-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '171'),
    officialCode: '171',
    officialName: 'Paediatric Surgery',
    slug: 'paediatric-surgery',
    descriptionKey: 'wales/paediatric-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '180'),
    officialCode: '180',
    officialName: 'Emergency Medicine',
    slug: 'emergency-medicine',
    descriptionKey: 'wales/emergency-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '190'),
    officialCode: '190',
    officialName: 'Anaesthetics',
    slug: 'anaesthetics',
    descriptionKey: 'wales/anaesthetics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '191'),
    officialCode: '191',
    officialName: 'Pain Management',
    slug: 'pain-management',
    descriptionKey: 'wales/pain-management',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '300'),
    officialCode: '300',
    officialName: 'General Internal Medicine',
    slug: 'general-internal-medicine',
    descriptionKey: 'wales/general-internal-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '301'),
    officialCode: '301',
    officialName: 'Gastroenterology',
    slug: 'gastroenterology',
    descriptionKey: 'wales/gastroenterology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '302'),
    officialCode: '302',
    officialName: 'Endocrinology',
    slug: 'endocrinology',
    descriptionKey: 'wales/endocrinology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '303'),
    officialCode: '303',
    officialName: 'Clinical Haematology',
    slug: 'clinical-haematology',
    descriptionKey: 'wales/clinical-haematology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '304'),
    officialCode: '304',
    officialName: 'Clinical Immunology and Allergy',
    slug: 'clinical-immunology-and-allergy',
    descriptionKey: 'wales/clinical-immunology-and-allergy',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '305'),
    officialCode: '305',
    officialName: 'Clinical Pharmacology',
    slug: 'clinical-pharmacology',
    descriptionKey: 'wales/clinical-pharmacology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '310'),
    officialCode: '310',
    officialName: 'Audio Vestibular Medicine',
    slug: 'audio-vestibular-medicine',
    descriptionKey: 'wales/audio-vestibular-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '311'),
    officialCode: '311',
    officialName: 'Clinical Genetics',
    slug: 'clinical-genetics',
    descriptionKey: 'wales/clinical-genetics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '313'),
    officialCode: '313',
    officialName: 'Clinical Oncology',
    slug: 'clinical-oncology',
    descriptionKey: 'wales/clinical-oncology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '314'),
    officialCode: '314',
    officialName: 'Rehabilitation Medicine',
    slug: 'rehabilitation-medicine',
    descriptionKey: 'wales/rehabilitation-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '315'),
    officialCode: '315',
    officialName: 'Palliative Medicine',
    slug: 'palliative-medicine',
    descriptionKey: 'wales/palliative-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '320'),
    officialCode: '320',
    officialName: 'Cardiology',
    slug: 'cardiology',
    descriptionKey: 'wales/cardiology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '325'),
    officialCode: '325',
    officialName: 'Sport and Exercise Medicine',
    slug: 'sport-and-exercise-medicine',
    descriptionKey: 'wales/sport-and-exercise-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '330'),
    officialCode: '330',
    officialName: 'Dermatology',
    slug: 'dermatology',
    descriptionKey: 'wales/dermatology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '340'),
    officialCode: '340',
    officialName: 'Respiratory Medicine',
    slug: 'respiratory-medicine',
    descriptionKey: 'wales/respiratory-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '350'),
    officialCode: '350',
    officialName: 'Infectious Diseases',
    slug: 'infectious-diseases',
    descriptionKey: 'wales/infectious-diseases',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '360'),
    officialCode: '360',
    officialName: 'Genitourinary Medicine',
    slug: 'genitourinary-medicine',
    descriptionKey: 'wales/genitourinary-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '361'),
    officialCode: '361',
    officialName: 'Nephrology',
    slug: 'nephrology',
    descriptionKey: 'wales/nephrology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '370'),
    officialCode: '370',
    officialName: 'Medical Oncology',
    slug: 'medical-oncology',
    descriptionKey: 'wales/medical-oncology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '400'),
    officialCode: '400',
    officialName: 'Neurology',
    slug: 'neurology',
    descriptionKey: 'wales/neurology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '410'),
    officialCode: '410',
    officialName: 'Rheumatology',
    slug: 'rheumatology',
    descriptionKey: 'wales/rheumatology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '420'),
    officialCode: '420',
    officialName: 'Paediatrics',
    slug: 'paediatrics',
    descriptionKey: 'wales/paediatrics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '430'),
    officialCode: '430',
    officialName: 'Geriatric Medicine',
    slug: 'geriatric-medicine',
    descriptionKey: 'wales/geriatric-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '502'),
    officialCode: '502',
    officialName: 'Gynaecology',
    slug: 'gynaecology',
    descriptionKey: 'wales/gynaecology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '710'),
    officialCode: '710',
    officialName: 'Adult Mental Health',
    slug: 'adult-mental-health',
    descriptionKey: 'wales/adult-mental-health',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '711'),
    officialCode: '711',
    officialName: 'Child and Adolescent Mental Health Services',
    slug: 'child-and-adolescent-mental-health',
    descriptionKey: 'wales/child-and-adolescent-mental-health',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '712'),
    officialCode: '712',
    officialName: 'Forensic Psychiatry',
    slug: 'forensic-psychiatry',
    descriptionKey: 'wales/forensic-psychiatry',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '810'),
    officialCode: '810',
    officialName: 'Radiology',
    slug: 'radiology',
    descriptionKey: 'wales/radiology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '998'),
    officialCode: '998',
    officialName: 'Diagnostic Services',
    slug: 'diagnostic-services',
    descriptionKey: 'wales/diagnostic-services',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '999'),
    officialCode: '999',
    officialName: 'Allied Health Profession Services',
    slug: 'allied-health-profession-services',
    descriptionKey: 'wales/allied-health-profession-services',
    isAllSpecialties: false,
  },
] as const;

const SPECIALTY_BY_CODE = new Map<string, Specialty<'wales'>>();
const SPECIALTY_BY_SLUG = new Map<string, Specialty<'wales'>>();

for (const specialty of WALES_SPECIALTIES) {
  SPECIALTY_BY_CODE.set(specialty.officialCode, specialty);
  SPECIALTY_BY_CODE.set(specialty.id, specialty);
  SPECIALTY_BY_SLUG.set(specialty.slug, specialty);
}

// Map StatsWales dimension representations for "All specialties":
// '1' in acd9529c dataset, 'T' in 3ef3a1d8 dataset
const allSpecialty = WALES_SPECIALTIES.find((s) => s.isAllSpecialties);
if (allSpecialty) {
  SPECIALTY_BY_CODE.set('1', allSpecialty);
  SPECIALTY_BY_CODE.set('T', allSpecialty);
}

/**
 * Looks up a Wales Specialty by official code (e.g. '110', '1', 'T', 'all'), ID ('wales:110'), or slug ('trauma-and-orthopaedics').
 * Throws SchemaChangeError on unknown keys to block downstream publishing.
 */
export function specialtyForWales(codeOrIdOrSlug: string): Specialty<'wales'> {
  const specialty = SPECIALTY_BY_CODE.get(codeOrIdOrSlug) ?? SPECIALTY_BY_SLUG.get(codeOrIdOrSlug);
  if (!specialty) {
    throw new SchemaChangeError(
      `Unknown Wales treatment function code or slug "${codeOrIdOrSlug}". A new treatment function requires manual configuration.`,
      {
        requested: codeOrIdOrSlug,
        knownCodes: WALES_SPECIALTIES.map((s) => s.officialCode),
      },
    );
  }
  return specialty;
}

/**
 * Validates that all provided Wales treatment function codes are recognised.
 * Throws SchemaChangeError if any unknown code is encountered.
 */
export function assertKnownWalesSpecialties(codes: Iterable<string>): void {
  for (const code of codes) {
    if (!SPECIALTY_BY_CODE.has(code)) {
      throw new SchemaChangeError(
        `Unknown Wales treatment function code "${code}". A new treatment function requires manual configuration and slug assignment.`,
        {
          unknownCode: code,
          knownCodes: WALES_SPECIALTIES.map((s) => s.officialCode),
        },
      );
    }
  }
}
