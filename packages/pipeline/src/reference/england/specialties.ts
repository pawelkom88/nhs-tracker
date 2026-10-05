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
 * England's 24 official Referral to Treatment (RTT) treatment functions and slugs.
 * Slugs are hand-written and immutable (URL stability).
 *
 * @see GLOSSARY.md Specialty
 * @see ADR-0006
 * @see data-sources.md § England codes
 */
export const ENGLAND_SPECIALTIES: readonly Specialty<'england'>[] = [
  {
    id: specialtyId('england', 'C_100'),
    officialCode: 'C_100',
    officialName: 'General Surgery Service',
    slug: 'general-surgery',
    descriptionKey: 'england/general-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_101'),
    officialCode: 'C_101',
    officialName: 'Urology Service',
    slug: 'urology',
    descriptionKey: 'england/urology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_110'),
    officialCode: 'C_110',
    officialName: 'Trauma and Orthopaedic Service',
    slug: 'trauma-and-orthopaedics',
    descriptionKey: 'england/trauma-and-orthopaedics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_120'),
    officialCode: 'C_120',
    officialName: 'Ear Nose and Throat Service',
    slug: 'ear-nose-and-throat',
    descriptionKey: 'england/ear-nose-and-throat',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_130'),
    officialCode: 'C_130',
    officialName: 'Ophthalmology Service',
    slug: 'ophthalmology',
    descriptionKey: 'england/ophthalmology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_140'),
    officialCode: 'C_140',
    officialName: 'Oral Surgery Service',
    slug: 'oral-surgery',
    descriptionKey: 'england/oral-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_150'),
    officialCode: 'C_150',
    officialName: 'Neurosurgical Service',
    slug: 'neurosurgery',
    descriptionKey: 'england/neurosurgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_160'),
    officialCode: 'C_160',
    officialName: 'Plastic Surgery Service',
    slug: 'plastic-surgery',
    descriptionKey: 'england/plastic-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_170'),
    officialCode: 'C_170',
    officialName: 'Cardiothoracic Surgery Service',
    slug: 'cardiothoracic-surgery',
    descriptionKey: 'england/cardiothoracic-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_300'),
    officialCode: 'C_300',
    officialName: 'General Internal Medicine Service',
    slug: 'general-internal-medicine',
    descriptionKey: 'england/general-internal-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_301'),
    officialCode: 'C_301',
    officialName: 'Gastroenterology Service',
    slug: 'gastroenterology',
    descriptionKey: 'england/gastroenterology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_320'),
    officialCode: 'C_320',
    officialName: 'Cardiology Service',
    slug: 'cardiology',
    descriptionKey: 'england/cardiology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_330'),
    officialCode: 'C_330',
    officialName: 'Dermatology Service',
    slug: 'dermatology',
    descriptionKey: 'england/dermatology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_340'),
    officialCode: 'C_340',
    officialName: 'Respiratory Medicine Service',
    slug: 'respiratory-medicine',
    descriptionKey: 'england/respiratory-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_400'),
    officialCode: 'C_400',
    officialName: 'Neurology Service',
    slug: 'neurology',
    descriptionKey: 'england/neurology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_410'),
    officialCode: 'C_410',
    officialName: 'Rheumatology Service',
    slug: 'rheumatology',
    descriptionKey: 'england/rheumatology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_430'),
    officialCode: 'C_430',
    officialName: 'Elderly Medicine Service',
    slug: 'elderly-medicine',
    descriptionKey: 'england/elderly-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_502'),
    officialCode: 'C_502',
    officialName: 'Gynaecology Service',
    slug: 'gynaecology',
    descriptionKey: 'england/gynaecology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'X02'),
    officialCode: 'X02',
    officialName: 'Other - Medical Services',
    slug: 'other-medical-services',
    descriptionKey: 'england/other-medical-services',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'X03'),
    officialCode: 'X03',
    officialName: 'Other - Mental Health Services',
    slug: 'other-mental-health-services',
    descriptionKey: 'england/other-mental-health-services',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'X04'),
    officialCode: 'X04',
    officialName: 'Other - Paediatric Services',
    slug: 'other-paediatric-services',
    descriptionKey: 'england/other-paediatric-services',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'X05'),
    officialCode: 'X05',
    officialName: 'Other - Surgical Services',
    slug: 'other-surgical-services',
    descriptionKey: 'england/other-surgical-services',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'X06'),
    officialCode: 'X06',
    officialName: 'Other - Other Services',
    slug: 'other-services',
    descriptionKey: 'england/other-services',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_999'),
    officialCode: 'C_999',
    officialName: 'Total',
    slug: 'all-specialties',
    descriptionKey: 'england/all-specialties',
    isAllSpecialties: true,
  },
] as const;

const SPECIALTY_BY_CODE = new Map<string, Specialty<'england'>>();
const SPECIALTY_BY_SLUG = new Map<string, Specialty<'england'>>();

for (const specialty of ENGLAND_SPECIALTIES) {
  SPECIALTY_BY_CODE.set(specialty.officialCode, specialty);
  SPECIALTY_BY_CODE.set(specialty.id, specialty);
  SPECIALTY_BY_SLUG.set(specialty.slug, specialty);
}

/**
 * Looks up an England Specialty by official code (e.g. 'C_100'), ID ('england:C_100'), or slug ('general-surgery').
 * Throws SchemaChangeError on unknown keys to block downstream publishing.
 */
export function specialtyForEngland(codeOrIdOrSlug: string): Specialty<'england'> {
  const specialty = SPECIALTY_BY_CODE.get(codeOrIdOrSlug) ?? SPECIALTY_BY_SLUG.get(codeOrIdOrSlug);
  if (!specialty) {
    throw new SchemaChangeError(
      `Unknown England treatment function code or slug "${codeOrIdOrSlug}". A new treatment function requires manual configuration.`,
      {
        requested: codeOrIdOrSlug,
        knownCodes: ENGLAND_SPECIALTIES.map((s) => s.officialCode),
      },
    );
  }
  return specialty;
}

/**
 * Validates that all provided England treatment function codes are recognized.
 * Throws SchemaChangeError if any unknown code is encountered.
 */
export function assertKnownTreatmentFunctions(codes: Iterable<string>): void {
  for (const code of codes) {
    if (!SPECIALTY_BY_CODE.has(code)) {
      throw new SchemaChangeError(
        `Unknown England treatment function code "${code}". A new treatment function requires manual configuration and slug assignment.`,
        {
          unknownCode: code,
          knownCodes: ENGLAND_SPECIALTIES.map((s) => s.officialCode),
        },
      );
    }
  }
}
