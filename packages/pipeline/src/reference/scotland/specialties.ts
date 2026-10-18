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
 * Scottish Stage of Treatment Waiting Times specialties plus "All specialties" (Z9).
 * Slugs are hand-written and immutable to ensure stable URLs.
 *
 * Sourced from PHS Stage of Treatment Waiting Times and Specialty Codes lookup (resource 6f2e3da0-…).
 *
 * @see GLOSSARY.md Specialty
 * @see ADR-0006
 * @see data-sources.md § Scotland
 */
export const SCOTLAND_SPECIALTIES: readonly Specialty<'scotland'>[] = [
  {
    id: specialtyId('scotland', 'Z9'),
    officialCode: 'Z9',
    officialName: 'All specialties',
    slug: 'all-specialties',
    descriptionKey: 'scotland/all-specialties',
    isAllSpecialties: true,
  },
  {
    id: specialtyId('scotland', 'A1'),
    officialCode: 'A1',
    officialName: 'General Medicine',
    slug: 'general-medicine',
    descriptionKey: 'scotland/general-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A11'),
    officialCode: 'A11',
    officialName: 'Acute Medicine',
    slug: 'acute-medicine',
    descriptionKey: 'scotland/acute-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A2'),
    officialCode: 'A2',
    officialName: 'Cardiology',
    slug: 'cardiology',
    descriptionKey: 'scotland/cardiology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A3'),
    officialCode: 'A3',
    officialName: 'Clinical Genetics',
    slug: 'clinical-genetics',
    descriptionKey: 'scotland/clinical-genetics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A5'),
    officialCode: 'A5',
    officialName: 'Clinical Pharmacology & Therapeutics',
    slug: 'clinical-pharmacology-and-therapeutics',
    descriptionKey: 'scotland/clinical-pharmacology-and-therapeutics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A6'),
    officialCode: 'A6',
    officialName: 'Infectious Diseases',
    slug: 'infectious-diseases',
    descriptionKey: 'scotland/infectious-diseases',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A7'),
    officialCode: 'A7',
    officialName: 'Dermatology',
    slug: 'dermatology',
    descriptionKey: 'scotland/dermatology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A8'),
    officialCode: 'A8',
    officialName: 'Endocrinology & Diabetes',
    slug: 'endocrinology-and-diabetes',
    descriptionKey: 'scotland/endocrinology-and-diabetes',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A81'),
    officialCode: 'A81',
    officialName: 'Endocrinology',
    slug: 'endocrinology',
    descriptionKey: 'scotland/endocrinology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A82'),
    officialCode: 'A82',
    officialName: 'Diabetes',
    slug: 'diabetes',
    descriptionKey: 'scotland/diabetes',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'A9'),
    officialCode: 'A9',
    officialName: 'Gastroenterology',
    slug: 'gastroenterology',
    descriptionKey: 'scotland/gastroenterology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AA'),
    officialCode: 'AA',
    officialName: 'Genito-Urinary Medicine',
    slug: 'genito-urinary-medicine',
    descriptionKey: 'scotland/genito-urinary-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AB'),
    officialCode: 'AB',
    officialName: 'Geriatric Medicine',
    slug: 'geriatric-medicine',
    descriptionKey: 'scotland/geriatric-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AD'),
    officialCode: 'AD',
    officialName: 'Medical Oncology',
    slug: 'medical-oncology',
    descriptionKey: 'scotland/medical-oncology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AF'),
    officialCode: 'AF',
    officialName: 'Paediatrics',
    slug: 'paediatrics',
    descriptionKey: 'scotland/paediatrics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AFA'),
    officialCode: 'AFA',
    officialName: 'Community Child Health',
    slug: 'community-child-health',
    descriptionKey: 'scotland/community-child-health',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AG'),
    officialCode: 'AG',
    officialName: 'Renal Medicine',
    slug: 'renal-medicine',
    descriptionKey: 'scotland/renal-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AH'),
    officialCode: 'AH',
    officialName: 'Neurology',
    slug: 'neurology',
    descriptionKey: 'scotland/neurology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AK'),
    officialCode: 'AK',
    officialName: 'Occupational Medicine',
    slug: 'occupational-medicine',
    descriptionKey: 'scotland/occupational-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AM'),
    officialCode: 'AM',
    officialName: 'Palliative Medicine',
    slug: 'palliative-medicine',
    descriptionKey: 'scotland/palliative-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AN'),
    officialCode: 'AN',
    officialName: 'Public Health Medicine',
    slug: 'public-health-medicine',
    descriptionKey: 'scotland/public-health-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AP'),
    officialCode: 'AP',
    officialName: 'Rehabilitation Medicine',
    slug: 'rehabilitation-medicine',
    descriptionKey: 'scotland/rehabilitation-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AQ'),
    officialCode: 'AQ',
    officialName: 'Respiratory Medicine',
    slug: 'respiratory-medicine',
    descriptionKey: 'scotland/respiratory-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AR'),
    officialCode: 'AR',
    officialName: 'Rheumatology',
    slug: 'rheumatology',
    descriptionKey: 'scotland/rheumatology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AV'),
    officialCode: 'AV',
    officialName: 'Clinical Neurophysiology',
    slug: 'clinical-neurophysiology',
    descriptionKey: 'scotland/clinical-neurophysiology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'AW'),
    officialCode: 'AW',
    officialName: 'Allergy',
    slug: 'allergy',
    descriptionKey: 'scotland/allergy',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C1'),
    officialCode: 'C1',
    officialName: 'General Surgery',
    slug: 'general-surgery',
    descriptionKey: 'scotland/general-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C11'),
    officialCode: 'C11',
    officialName: 'General Surgery (excl Vascular)',
    slug: 'general-surgery-excl-vascular',
    descriptionKey: 'scotland/general-surgery-excl-vascular',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C12'),
    officialCode: 'C12',
    officialName: 'Vascular Surgery',
    slug: 'vascular-surgery',
    descriptionKey: 'scotland/vascular-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C13'),
    officialCode: 'C13',
    officialName: 'Oral and Maxillofacial Surgery',
    slug: 'oral-and-maxillofacial-surgery',
    descriptionKey: 'scotland/oral-and-maxillofacial-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C2'),
    officialCode: 'C2',
    officialName: 'Accident & Emergency',
    slug: 'accident-and-emergency',
    descriptionKey: 'scotland/accident-and-emergency',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C3'),
    officialCode: 'C3',
    officialName: 'Anaesthetics',
    slug: 'anaesthetics',
    descriptionKey: 'scotland/anaesthetics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C31'),
    officialCode: 'C31',
    officialName: 'Pain Management',
    slug: 'pain-management',
    descriptionKey: 'scotland/pain-management',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C4'),
    officialCode: 'C4',
    officialName: 'Cardiothoracic Surgery',
    slug: 'cardiothoracic-surgery',
    descriptionKey: 'scotland/cardiothoracic-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C41'),
    officialCode: 'C41',
    officialName: 'Cardiac Surgery',
    slug: 'cardiac-surgery',
    descriptionKey: 'scotland/cardiac-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C42'),
    officialCode: 'C42',
    officialName: 'Thoracic Surgery',
    slug: 'thoracic-surgery',
    descriptionKey: 'scotland/thoracic-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C5'),
    officialCode: 'C5',
    officialName: 'Ear, Nose & Throat (ENT)',
    slug: 'ent',
    descriptionKey: 'scotland/ent',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C51'),
    officialCode: 'C51',
    officialName: 'Audiological Medicine',
    slug: 'audiological-medicine',
    descriptionKey: 'scotland/audiological-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C6'),
    officialCode: 'C6',
    officialName: 'Neurosurgery',
    slug: 'neurosurgery',
    descriptionKey: 'scotland/neurosurgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C7'),
    officialCode: 'C7',
    officialName: 'Ophthalmology',
    slug: 'ophthalmology',
    descriptionKey: 'scotland/ophthalmology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C8'),
    officialCode: 'C8',
    officialName: 'Trauma and Orthopaedic Surgery',
    slug: 'trauma-and-orthopaedics',
    descriptionKey: 'scotland/trauma-and-orthopaedics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C9'),
    officialCode: 'C9',
    officialName: 'Plastic Surgery',
    slug: 'plastic-surgery',
    descriptionKey: 'scotland/plastic-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'C91'),
    officialCode: 'C91',
    officialName: 'Cleft Lip and Palate Surgery',
    slug: 'cleft-lip-and-palate-surgery',
    descriptionKey: 'scotland/cleft-lip-and-palate-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'CA'),
    officialCode: 'CA',
    officialName: 'Paediatric Surgery',
    slug: 'paediatric-surgery',
    descriptionKey: 'scotland/paediatric-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'CB'),
    officialCode: 'CB',
    officialName: 'Urology',
    slug: 'urology',
    descriptionKey: 'scotland/urology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'CC'),
    officialCode: 'CC',
    officialName: 'Intensive Care Medicine',
    slug: 'intensive-care-medicine',
    descriptionKey: 'scotland/intensive-care-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'D1'),
    officialCode: 'D1',
    officialName: 'Community Dental Practice',
    slug: 'community-dental-practice',
    descriptionKey: 'scotland/community-dental-practice',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'D3'),
    officialCode: 'D3',
    officialName: 'Oral Surgery',
    slug: 'oral-surgery',
    descriptionKey: 'scotland/oral-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'D4'),
    officialCode: 'D4',
    officialName: 'Oral Medicine',
    slug: 'oral-medicine',
    descriptionKey: 'scotland/oral-medicine',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'D5'),
    officialCode: 'D5',
    officialName: 'Orthodontics',
    slug: 'orthodontics',
    descriptionKey: 'scotland/orthodontics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'D6'),
    officialCode: 'D6',
    officialName: 'Restorative Dentistry',
    slug: 'restorative-dentistry',
    descriptionKey: 'scotland/restorative-dentistry',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'D8'),
    officialCode: 'D8',
    officialName: 'Paediatric Dentistry',
    slug: 'paediatric-dentistry',
    descriptionKey: 'scotland/paediatric-dentistry',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'DE'),
    officialCode: 'DE',
    officialName: 'Special Care Dentistry',
    slug: 'special-care-dentistry',
    descriptionKey: 'scotland/special-care-dentistry',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'E12'),
    officialCode: 'E12',
    officialName: 'GP Other than Obstetrics',
    slug: 'gp-other-than-obstetrics',
    descriptionKey: 'scotland/gp-other-than-obstetrics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'F2'),
    officialCode: 'F2',
    officialName: 'Gynaecology',
    slug: 'gynaecology',
    descriptionKey: 'scotland/gynaecology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'G1'),
    officialCode: 'G1',
    officialName: 'General Psychiatry',
    slug: 'general-psychiatry',
    descriptionKey: 'scotland/general-psychiatry',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'G5'),
    officialCode: 'G5',
    officialName: 'Learning Disability',
    slug: 'learning-disability',
    descriptionKey: 'scotland/learning-disability',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'H1'),
    officialCode: 'H1',
    officialName: 'Clinical Radiology',
    slug: 'clinical-radiology',
    descriptionKey: 'scotland/clinical-radiology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'H1A'),
    officialCode: 'H1A',
    officialName: 'Breast Screening Service',
    slug: 'breast-screening-service',
    descriptionKey: 'scotland/breast-screening-service',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'H2'),
    officialCode: 'H2',
    officialName: 'Clinical Oncology',
    slug: 'clinical-oncology',
    descriptionKey: 'scotland/clinical-oncology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'J3'),
    officialCode: 'J3',
    officialName: 'Chemical Pathology',
    slug: 'chemical-pathology',
    descriptionKey: 'scotland/chemical-pathology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'J4'),
    officialCode: 'J4',
    officialName: 'Haematology',
    slug: 'haematology',
    descriptionKey: 'scotland/haematology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'J5'),
    officialCode: 'J5',
    officialName: 'Immunology',
    slug: 'immunology',
    descriptionKey: 'scotland/immunology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'R2'),
    officialCode: 'R2',
    officialName: 'Clinical psychology',
    slug: 'clinical-psychology',
    descriptionKey: 'scotland/clinical-psychology',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'R3'),
    officialCode: 'R3',
    officialName: 'Dietetics',
    slug: 'dietetics',
    descriptionKey: 'scotland/dietetics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'RE'),
    officialCode: 'RE',
    officialName: 'Physiological Measurement',
    slug: 'physiological-measurement',
    descriptionKey: 'scotland/physiological-measurement',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'RK2'),
    officialCode: 'RK2',
    officialName: 'Electrocardiography',
    slug: 'electrocardiography',
    descriptionKey: 'scotland/electrocardiography',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'T1'),
    officialCode: 'T1',
    officialName: 'General nursing',
    slug: 'general-nursing',
    descriptionKey: 'scotland/general-nursing',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'T5'),
    officialCode: 'T5',
    officialName: 'Community nursing (district nursing)',
    slug: 'community-nursing-district-nursing',
    descriptionKey: 'scotland/community-nursing-district-nursing',
    isAllSpecialties: false,
  },
] as const;

const SPECIALTY_BY_CODE = new Map<string, Specialty<'scotland'>>();
const SPECIALTY_BY_SLUG = new Map<string, Specialty<'scotland'>>();

for (const specialty of SCOTLAND_SPECIALTIES) {
  SPECIALTY_BY_CODE.set(specialty.officialCode, specialty);
  SPECIALTY_BY_SLUG.set(specialty.slug, specialty);
}

/**
 * Resolves a Scottish specialty definition by code (e.g. "C8", "Z9"), ID ("scotland:C8"), or slug ("trauma-and-orthopaedics").
 * Throws SchemaChangeError on unknown specialty.
 */
export function specialtyForScotland(codeOrSlug: string): Specialty<'scotland'> {
  const clean = codeOrSlug.startsWith('scotland:')
    ? codeOrSlug.slice('scotland:'.length)
    : codeOrSlug;

  const found = SPECIALTY_BY_CODE.get(clean) ?? SPECIALTY_BY_SLUG.get(clean);

  if (!found) {
    throw new SchemaChangeError(
      `Unknown Scotland specialty "${codeOrSlug}". All Scottish specialties must be registered in reference definitions.`,
      {
        requested: codeOrSlug,
        knownCodes: Array.from(SPECIALTY_BY_CODE.keys()),
      },
    );
  }

  return found;
}

/**
 * Asserts that all provided specialty codes are known in the Scottish reference dataset.
 * Throws SchemaChangeError on the first unrecognised code.
 */
export function assertKnownScotlandSpecialties(codes: readonly string[]): void {
  for (const code of codes) {
    specialtyForScotland(code);
  }
}
