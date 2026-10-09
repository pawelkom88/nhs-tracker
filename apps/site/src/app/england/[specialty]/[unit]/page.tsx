import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPublished,
  getReference,
  getSpecialtyBySlug,
  getUnitDetail,
} from '../../../../data/england';
import { UnitDetail } from '../../../../nations/england/UnitDetail';
import { BorderNotice } from '../../../../components/BorderNotice';
import { t } from '../../../../i18n';

export interface EnglandUnitPageProps {
  readonly params: Promise<{
    specialty: string;
    unit: string;
  }>;
}

export async function generateStaticParams() {
  const [published, reference] = await Promise.all([getPublished(), getReference()]);

  const specialtyMap = new Map(reference.specialties.map((s) => [s.id as string, s.slug]));
  const unitMap = new Map(
    reference.reportingUnits.map((u) => [u.id as string, u.officialCode.toLowerCase()]),
  );

  const params: { specialty: string; unit: string }[] = [];

  for (const entry of published.entries) {
    const specialtySlug = specialtyMap.get(entry.specialty);
    const unitCode = unitMap.get(entry.reportingUnit);

    if (specialtySlug && unitCode) {
      params.push({
        specialty: specialtySlug,
        unit: unitCode,
      });
    }
  }

  return params;
}

export default async function EnglandUnitPage({ params }: EnglandUnitPageProps) {
  const { specialty: specialtySlug, unit: unitParam } = await params;

  const specialty = await getSpecialtyBySlug(specialtySlug);
  if (!specialty) {
    notFound();
  }

  const reference = await getReference();
  const unit = reference.reportingUnits.find(
    (u) =>
      u.officialCode.toLowerCase() === unitParam.toLowerCase() ||
      (u.id as string).toLowerCase() === unitParam.toLowerCase(),
  );

  if (!unit) {
    notFound();
  }

  const detail = await getUnitDetail(unit.id, specialty.id);
  if (!detail) {
    notFound();
  }

  const specialtyDisplayName = specialty.isAllSpecialties
    ? t('england-lists', 'allSpecialties')
    : specialty.officialName;

  return (
    <div className="england-unit-page">
      <nav aria-label={t('common', 'navigation')} className="breadcrumb-nav">
        <Link href={`/england/${specialty.slug}`} className="back-link">
          {t('england-detail', 'backToSpecialty', { specialtyName: specialtyDisplayName })}
        </Link>
      </nav>

      <div>
        <UnitDetail detail={detail} />
      </div>

      <BorderNotice current="england" />
    </div>
  );
}
